import {
  encodeMessage,
  type GameSnapshot,
  type PlayerInput,
  type ScoreboardEntry,
  type ServerMessage,
  type WorldConfig
} from "@astro-game/shared";
import "./style.css";

interface ClientState {
  socket: WebSocket | undefined;
  connected: boolean;
  joined: boolean;
  playerId: string | undefined;
  roomId: string;
  nickname: string;
  world: WorldConfig;
  snapshot: GameSnapshot | undefined;
  input: PlayerInput;
  inputSeq: number;
  lastPongMs: number;
  showDebug: boolean;
  lastFrameAt: number;
  fps: number;
}

interface TouchJoystickState {
  pointerId: number | undefined;
  centerX: number;
  centerY: number;
  angle: number;
  strength: number;
}

const defaultWorld: WorldConfig = {
  width: 5_000,
  height: 5_000,
  tickRate: 20
};

const state: ClientState = {
  socket: undefined,
  connected: false,
  joined: false,
  playerId: undefined,
  roomId: "default",
  nickname: "",
  world: defaultWorld,
  snapshot: undefined,
  input: {
    left: false,
    right: false,
    thrust: false,
    shoot: false
  },
  inputSeq: 0,
  lastPongMs: 0,
  showDebug: true,
  lastFrameAt: performance.now(),
  fps: 0
};

const appCandidate = document.querySelector<HTMLDivElement>("#app");
if (!appCandidate) throw new Error("Missing #app");
const app: HTMLDivElement = appCandidate;

app.innerHTML = `
  <main class="game-shell">
    <canvas aria-label="Astro Game canvas"></canvas>
    <section class="join-panel">
      <form class="join-card">
        <h1>Astro Game</h1>
        <label>
          Ник
          <input name="nickname" autocomplete="nickname" maxlength="20" value="Pilot" />
        </label>
        <label>
          Комната
          <input name="room" maxlength="32" value="default" />
        </label>
        <button type="submit">Подключиться</button>
        <div class="status-line"></div>
      </form>
    </section>
    <aside class="hud"></aside>
    <pre class="debug"></pre>
    <div class="touch-controls">
      <div class="touch-joystick">
        <div class="touch-joystick-knob"></div>
      </div>
      <button class="touch-fire" type="button" aria-label="Shoot"></button>
    </div>
  </main>
`;

const gameShell = mustQuery<HTMLElement>(".game-shell");
const canvas = mustQuery<HTMLCanvasElement>("canvas");
const form = mustQuery<HTMLFormElement>("form");
const joinPanel = mustQuery<HTMLElement>(".join-panel");
const statusLine = mustQuery<HTMLElement>(".status-line");
const hud = mustQuery<HTMLElement>(".hud");
const debug = mustQuery<HTMLElement>(".debug");
const touchControls = mustQuery<HTMLElement>(".touch-controls");
const touchJoystick = mustQuery<HTMLElement>(".touch-joystick");
const touchJoystickKnob = mustQuery<HTMLElement>(".touch-joystick-knob");
const touchFire = mustQuery<HTMLButtonElement>(".touch-fire");
const contextValue = canvas.getContext("2d");
if (!contextValue) throw new Error("Canvas 2D context is unavailable");
const ctx: CanvasRenderingContext2D = contextValue;

const keys = new Set<string>();
const keyboardInput: PlayerInput = {
  left: false,
  right: false,
  thrust: false,
  shoot: false
};
const touchInput: PlayerInput = {
  left: false,
  right: false,
  thrust: false,
  shoot: false
};
const joystick: TouchJoystickState = {
  pointerId: undefined,
  centerX: 0,
  centerY: 0,
  angle: 0,
  strength: 0
};
const firePointers = new Set<number>();

function mustQuery<T extends Element>(selector: string): T {
  const element = app.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const nickname = String(data.get("nickname") ?? "Pilot").trim() || "Pilot";
  const roomId = String(data.get("room") ?? "default").trim() || "default";
  connect(nickname, roomId);
});

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyP" || event.code === "F3") {
    state.showDebug = !state.showDebug;
    event.preventDefault();
  }
  keys.add(event.code);
  updateKeyboardInput();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  updateKeyboardInput();
});

window.addEventListener("blur", () => {
  keys.clear();
  resetTouchInput();
  updateKeyboardInput();
});

touchJoystick.addEventListener("pointerdown", (event) => {
  if (joystick.pointerId !== undefined) return;
  event.preventDefault();
  joystick.pointerId = event.pointerId;
  const rect = touchJoystick.getBoundingClientRect();
  joystick.centerX = rect.left + rect.width / 2;
  joystick.centerY = rect.top + rect.height / 2;
  touchJoystick.setPointerCapture(event.pointerId);
  touchJoystick.classList.add("is-active");
  updateTouchJoystick(event);
});

touchJoystick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== joystick.pointerId) return;
  event.preventDefault();
  updateTouchJoystick(event);
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
  touchJoystick.addEventListener(eventName, (event) => {
    if (event.pointerId !== joystick.pointerId) return;
    event.preventDefault();
    resetJoystick();
  });
}

touchFire.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  firePointers.add(event.pointerId);
  touchFire.setPointerCapture(event.pointerId);
  touchFire.classList.add("is-active");
  touchInput.shoot = true;
  syncInput();
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
  touchFire.addEventListener(eventName, (event) => {
    if (!firePointers.has(event.pointerId)) return;
    event.preventDefault();
    firePointers.delete(event.pointerId);
    touchInput.shoot = firePointers.size > 0;
    touchFire.classList.toggle("is-active", touchInput.shoot);
    syncInput();
  });
}

touchControls.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(frame);

setInterval(() => {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN || !state.joined) return;
  syncInput();
  state.inputSeq += 1;
  state.socket.send(
    encodeMessage({
      type: "input",
      seq: state.inputSeq,
      input: state.input
    })
  );
}, 50);

setInterval(() => {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return;
  state.socket.send(encodeMessage({ type: "ping", sentAt: performance.now() }));
}, 1_000);

function connect(nickname: string, roomId: string): void {
  const serverUrl = resolveWebSocketUrl(roomId);

  state.socket?.close();
  state.connected = false;
  state.joined = false;
  state.nickname = nickname;
  state.roomId = roomId;
  state.snapshot = undefined;
  statusLine.textContent = `Подключение к ${serverUrl}`;

  const socket = new WebSocket(serverUrl);
  state.socket = socket;

  socket.addEventListener("open", () => {
    if (state.socket !== socket) return;
    state.connected = true;
    socket.send(encodeMessage({ type: "joinRoom", nickname, roomId }));
  });

  socket.addEventListener("message", (event) => {
    if (state.socket !== socket) return;
    const message = parseServerMessage(event.data);
    if (!message) return;
    handleServerMessage(message);
  });

  socket.addEventListener("close", () => {
    if (state.socket !== socket) return;
    const wasJoined = state.joined;
    state.connected = false;
    state.joined = false;
    statusLine.textContent = wasJoined ? "Соединение закрыто" : "Не удалось подключиться к серверу";
    joinPanel.style.display = "grid";
    gameShell.classList.remove("is-playing");
    resetTouchInput();
  });

  socket.addEventListener("error", () => {
    if (state.socket !== socket || state.joined) return;
  });
}

function resolveWebSocketUrl(roomId: string): string {
  const pageUrl = new URL(window.location.href);
  const configured = import.meta.env.VITE_WS_URL;
  const fallback = window.location.protocol === "https:" ? "/ws" : `ws://${window.location.hostname}:8787`;
  const base = pageUrl.searchParams.get("server") ?? (configured && configured.trim() ? configured : fallback);
  const wsUrl = new URL(base, window.location.href);

  if (wsUrl.protocol === "http:") wsUrl.protocol = "ws:";
  if (wsUrl.protocol === "https:") wsUrl.protocol = "wss:";

  wsUrl.searchParams.set("room", roomId);
  return wsUrl.toString();
}

function handleServerMessage(message: ServerMessage): void {
  if (message.type === "joinedRoom") {
    state.joined = true;
    state.playerId = message.playerId;
    state.roomId = message.roomId;
    state.world = message.world;
    joinPanel.style.display = "none";
    gameShell.classList.add("is-playing");
    return;
  }

  if (message.type === "snapshot") {
    state.snapshot = message.snapshot;
    return;
  }

  if (message.type === "pong") {
    state.lastPongMs = Math.max(0, performance.now() - message.sentAt);
    return;
  }

  if (message.type === "error") {
    statusLine.textContent = message.message;
  }
}

function parseServerMessage(data: unknown): ServerMessage | undefined {
  if (typeof data !== "string") return undefined;
  try {
    const value = JSON.parse(data) as ServerMessage;
    if (typeof value !== "object" || value === null || typeof value.type !== "string") {
      return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}

function updateKeyboardInput(): void {
  keyboardInput.left = keys.has("KeyA") || keys.has("ArrowLeft");
  keyboardInput.right = keys.has("KeyD") || keys.has("ArrowRight");
  keyboardInput.thrust = keys.has("KeyW") || keys.has("ArrowUp");
  keyboardInput.shoot = keys.has("Space");
  syncInput();
}

function syncInput(): void {
  updateTouchSteering();
  state.input = {
    left: keyboardInput.left || touchInput.left,
    right: keyboardInput.right || touchInput.right,
    thrust: keyboardInput.thrust || touchInput.thrust,
    shoot: keyboardInput.shoot || touchInput.shoot
  };
}

function updateTouchJoystick(event: PointerEvent): void {
  const radius = Math.max(36, touchJoystick.clientWidth * 0.34);
  const rawX = event.clientX - joystick.centerX;
  const rawY = event.clientY - joystick.centerY;
  const distanceValue = Math.hypot(rawX, rawY);
  const limit = distanceValue > radius ? radius / distanceValue : 1;
  const x = rawX * limit;
  const y = rawY * limit;

  touchJoystickKnob.style.transform = `translate(${x}px, ${y}px)`;
  joystick.angle = Math.atan2(y, x);
  joystick.strength = Math.min(1, distanceValue / radius);
  syncInput();
}

function updateTouchSteering(): void {
  if (joystick.pointerId === undefined || joystick.strength < 0.12) {
    touchInput.left = false;
    touchInput.right = false;
    touchInput.thrust = false;
    return;
  }

  const self = state.snapshot?.players.find((player) => player.id === state.playerId);
  const delta = self ? angularDelta(joystick.angle, self.rotation) : 0;
  const turnDeadZone = 0.12;

  touchInput.left = delta < -turnDeadZone;
  touchInput.right = delta > turnDeadZone;
  touchInput.thrust = joystick.strength > 0.4;
}

function angularDelta(target: number, current: number): number {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

function resetJoystick(): void {
  joystick.pointerId = undefined;
  joystick.strength = 0;
  joystick.angle = 0;
  touchJoystick.classList.remove("is-active");
  touchJoystickKnob.style.transform = "translate(0, 0)";
  touchInput.left = false;
  touchInput.right = false;
  touchInput.thrust = false;
  syncInput();
}

function resetTouchInput(): void {
  firePointers.clear();
  touchFire.classList.remove("is-active");
  touchInput.shoot = false;
  resetJoystick();
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * ratio);
  const height = Math.floor(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function frame(now: number): void {
  const delta = now - state.lastFrameAt;
  state.lastFrameAt = now;
  state.fps = state.fps * 0.9 + (1_000 / Math.max(1, delta)) * 0.1;
  draw();
  renderHud();
  requestAnimationFrame(frame);
}

function draw(): void {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width;
  const height = canvas.height;
  const viewWidth = width / ratio;
  const viewHeight = height / ratio;

  ctx.save();
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  drawBackground(viewWidth, viewHeight);

  const snapshot = state.snapshot;
  const self = snapshot?.players.find((player) => player.id === state.playerId);
    const camera = self?.position ?? { x: state.world.width / 2, y: state.world.height / 2 };

  if (snapshot) {
    drawWorldGrid(camera, viewWidth, viewHeight);
    for (const asteroid of snapshot.asteroids) drawAsteroid(camera, asteroid.position, asteroid.radius, asteroid.id);
    for (const projectile of snapshot.projectiles) drawProjectile(camera, projectile.position);
    for (const player of snapshot.players) drawShip(camera, player, player.id === state.playerId);
    for (const player of snapshot.players) {
      if (player.id !== state.playerId) drawPlayerIndicator(camera, player, viewWidth, viewHeight);
    }
  } else {
    drawWaiting(viewWidth, viewHeight);
  }

  ctx.restore();
}

function worldToScreen(camera: { x: number; y: number }, position: { x: number; y: number }) {
  const ratio = window.devicePixelRatio || 1;
  const viewWidth = canvas.width / ratio;
  const viewHeight = canvas.height / ratio;
  const zoom = getWorldZoom();
  return {
    x: (position.x - camera.x) * zoom + viewWidth / 2,
    y: (position.y - camera.y) * zoom + viewHeight / 2
  };
}

function getWorldZoom(): number {
  const touchLike = window.matchMedia("(hover: none), (pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const narrowSide = Math.min(window.innerWidth, window.innerHeight);
  return touchLike && narrowSide <= 720 ? 1.35 : 1;
}

function drawBackground(width: number, height: number): void {
  ctx.fillStyle = "#08090d";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let index = 0; index < 110; index += 1) {
    const x = (index * 137.5) % width;
    const y = (index * 241.7) % height;
    const size = index % 7 === 0 ? 1.6 : 1;
    ctx.fillRect(x, y, size, size);
  }
}

function drawWorldGrid(camera: { x: number; y: number }, width: number, height: number): void {
  ctx.strokeStyle = "rgba(129, 174, 213, 0.11)";
  ctx.lineWidth = 1;
  const grid = 500;
  const zoom = getWorldZoom();
  const worldWidth = width / zoom;
  const worldHeight = height / zoom;
  const left = camera.x - worldWidth / 2;
  const top = camera.y - worldHeight / 2;
  const startX = Math.floor(left / grid) * grid;
  const startY = Math.floor(top / grid) * grid;

  for (let x = startX; x < left + worldWidth + grid; x += grid) {
    const screen = worldToScreen(camera, { x, y: camera.y });
    ctx.beginPath();
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, height);
    ctx.stroke();
  }

  for (let y = startY; y < top + worldHeight + grid; y += grid) {
    const screen = worldToScreen(camera, { x: camera.x, y });
    ctx.beginPath();
    ctx.moveTo(0, screen.y);
    ctx.lineTo(width, screen.y);
    ctx.stroke();
  }
}

function drawShip(
  camera: { x: number; y: number },
  player: NonNullable<GameSnapshot["players"][number]>,
  isSelf: boolean
): void {
  const screen = worldToScreen(camera, player.position);
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(player.rotation);
  const zoom = getWorldZoom();
  ctx.scale(zoom, zoom);
  ctx.globalAlpha = player.alive ? 1 : 0.35;
  if (player.thrusting && player.alive) {
    const pulse = 0.76 + Math.sin(performance.now() / 70) * 0.18;
    ctx.fillStyle = "rgba(255, 211, 91, 0.9)";
    ctx.beginPath();
    ctx.moveTo(-15, -7);
    ctx.lineTo(-15 - 28 * pulse, 0);
    ctx.lineTo(-15, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 112, 67, 0.72)";
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-14 - 16 * pulse, 0);
    ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = isSelf ? "#d8f063" : "#78c7ff";
  ctx.strokeStyle = player.color;
  ctx.fillStyle = hexToRgba(player.color, 0.16);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-16, -13);
  ctx.lineTo(-9, 0);
  ctx.lineTo(-16, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = player.color;
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(player.nickname, screen.x, screen.y - 26 * zoom);

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(screen.x - 22 * zoom, screen.y + 25 * zoom, 44 * zoom, 4 * zoom);
  ctx.fillStyle = player.health > 40 ? "#7ae582" : "#ff8b6b";
  ctx.fillRect(screen.x - 22 * zoom, screen.y + 25 * zoom, 44 * Math.max(0, player.health / 100) * zoom, 4 * zoom);
}

function drawPlayerIndicator(
  camera: { x: number; y: number },
  player: NonNullable<GameSnapshot["players"][number]>,
  width: number,
  height: number
): void {
  if (!player.alive) return;

  const screen = worldToScreen(camera, player.position);
  const margin = 34;
  const onScreen = screen.x >= margin && screen.x <= width - margin && screen.y >= margin && screen.y <= height - margin;
  if (onScreen) return;

  const center = { x: width / 2, y: height / 2 };
  const dx = screen.x - center.x;
  const dy = screen.y - center.y;
  const angle = Math.atan2(dy, dx);
  const edge = edgePoint(center, angle, width, height, margin);

  ctx.save();
  ctx.translate(edge.x, edge.y);
  ctx.rotate(angle);
  ctx.fillStyle = player.color;
  ctx.strokeStyle = "rgba(8, 9, 13, 0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -9);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, 9);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = player.color;
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(player.nickname.slice(0, 10), edge.x, edge.y + 24);
}

function edgePoint(
  center: { x: number; y: number },
  angle: number,
  width: number,
  height: number,
  margin: number
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfWidth = width / 2 - margin;
  const halfHeight = height / 2 - margin;
  const scaleX = Math.abs(cos) > 0.001 ? halfWidth / Math.abs(cos) : Number.POSITIVE_INFINITY;
  const scaleY = Math.abs(sin) > 0.001 ? halfHeight / Math.abs(sin) : Number.POSITIVE_INFINITY;
  const scale = Math.min(scaleX, scaleY);
  return {
    x: center.x + cos * scale,
    y: center.y + sin * scale
  };
}

function drawAsteroid(camera: { x: number; y: number }, position: { x: number; y: number }, radius: number, id: string) {
  const screen = worldToScreen(camera, position);
  const points = asteroidPoints(id, radius * getWorldZoom());
  ctx.strokeStyle = "#c7b9a0";
  ctx.fillStyle = "rgba(168, 149, 119, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = screen.x + point.x;
    const y = screen.y + point.y;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawProjectile(camera: { x: number; y: number }, position: { x: number; y: number }): void {
  const screen = worldToScreen(camera, position);
  const zoom = getWorldZoom();
  ctx.fillStyle = "#ffec7a";
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 3 * zoom, 0, Math.PI * 2);
  ctx.fill();
}

function drawWaiting(width: number, height: number): void {
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Подключись к комнате, чтобы начать", width / 2, height / 2);
}

function renderHud(): void {
  const snapshot = state.snapshot;
  const self = snapshot?.players.find((player) => player.id === state.playerId);
  const scoreboard = snapshot?.scoreboard ?? [];

  hud.innerHTML = `
    <div class="hud-row"><span>Комната</span><strong>${escapeHtml(state.roomId)}</strong></div>
    <div class="hud-row"><span>Статус</span><strong>${state.connected ? "online" : "offline"}</strong></div>
    <div class="hud-row"><span>Здоровье</span><strong>${self ? Math.max(0, Math.round(self.health)) : "-"}</strong></div>
    <div class="hud-row"><span>Очки</span><strong>${self ? self.score : "-"}</strong></div>
    <div class="scoreboard">${renderScoreboard(scoreboard)}</div>
  `;

  debug.style.display = state.showDebug ? "block" : "none";
  if (state.showDebug) {
    debug.textContent = [
      `fps: ${Math.round(state.fps)}`,
      `ping: ${Math.round(state.lastPongMs)}ms`,
      `tick: ${snapshot?.tick ?? "-"}`,
      `players: ${snapshot?.players.length ?? 0}`,
      `asteroids: ${snapshot?.asteroids.length ?? 0}`,
      `projectiles: ${snapshot?.projectiles.length ?? 0}`,
      `server: ${state.socket?.url ?? "-"}`
    ].join("\n");
  }
}

function renderScoreboard(scoreboard: ScoreboardEntry[]): string {
  if (scoreboard.length === 0) return `<div class="score-row"><span>Рейтинг пуст</span><span>0</span></div>`;
  return scoreboard
    .slice(0, 8)
    .map((entry) => {
      const selfClass = entry.playerId === state.playerId ? " self" : "";
      const dead = entry.alive ? "" : " x";
      const player = state.snapshot?.players.find((item) => item.id === entry.playerId);
      const swatch = player ? `<i style="background:${escapeHtml(player.color)}"></i>` : "";
      return `<div class="score-row${selfClass}"><span>${swatch}${escapeHtml(entry.nickname)}${dead}</span><span>${entry.score}</span></div>`;
    })
    .join("");
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value) || normalized.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function asteroidPoints(id: string, radius: number) {
  const seed = hash(id);
  const count = 9 + (seed % 5);
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const wobble = 0.78 + (((seed >> (index % 12)) & 7) / 20);
    return {
      x: Math.cos(angle) * radius * wobble,
      y: Math.sin(angle) * radius * wobble
    };
  });
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
