import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import {
  ASTEROID_BASE_SPEED,
  ASTEROID_DESPAWN_DISTANCE,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_SPAWN_MAX_DISTANCE,
  ASTEROID_SPAWN_MIN_DISTANCE,
  ASTEROID_TARGET_COUNT,
  ASTEROIDS_PER_PLAYER,
  NICKNAME_MAX_LENGTH,
  PROJECTILE_DAMAGE,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  PROJECTILE_TTL_MS,
  ROOM_ID_MAX_LENGTH,
  SCORE_DAMAGE,
  SCORE_DEATH,
  SCORE_HIT,
  SERVER_TICK_MS,
  SERVER_TICK_RATE,
  SHIP_DRAG,
  SHIP_MAX_HEALTH,
  SHIP_MAX_SPEED,
  SHIP_RADIUS,
  SHIP_RESPAWN_MS,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHOT_COOLDOWN_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  clampMagnitude,
  distance,
  encodeMessage,
  parseClientMessage,
  randomRange,
  sanitizeText,
  wrapPosition,
  type AsteroidState,
  type ClientMessage,
  type GameSnapshot,
  type PlayerInput,
  type PlayerState,
  type ProjectileState,
  type ServerMessage,
  type Vector2
} from "@astro-game/shared";

interface PlayerRecord extends PlayerState {
  input: PlayerInput;
  socket: WebSocket | undefined;
  lastShotAt: number;
  respawnAt: number;
}

interface ProjectileRecord extends ProjectileState {
  createdAt: number;
}

interface Room {
  id: string;
  tick: number;
  players: Map<string, PlayerRecord>;
  asteroids: Map<string, AsteroidState>;
  projectiles: Map<string, ProjectileRecord>;
}

const emptyInput: PlayerInput = {
  left: false,
  right: false,
  thrust: false,
  shoot: false
};

const playerColors = [
  "#d8f063",
  "#78c7ff",
  "#ff8b6b",
  "#b894ff",
  "#64e2b7",
  "#ffd166",
  "#f76fd7",
  "#8ee3f5"
];

const rooms = new Map<string, Room>();
const port = Number(process.env.PORT ?? 8787);
const httpServer = createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(
    JSON.stringify({
      name: "astro-game-server",
      status: "ok",
      rooms: rooms.size,
      tickRate: SERVER_TICK_RATE
    })
  );
});
const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  let playerId: string | undefined;
  let room: Room | undefined;

  socket.on("message", (data) => {
    const text = typeof data === "string" ? data : data.toString("utf8");
    const message = parseClientMessage(text);

    if (!message) {
      send(socket, { type: "error", message: "Invalid message" });
      return;
    }

    if (message.type === "joinRoom") {
      const result = joinRoom(socket, message);
      playerId = result.playerId;
      room = result.room;
      return;
    }

    if (message.type === "ping") {
      send(socket, {
        type: "pong",
        sentAt: message.sentAt,
        serverTime: Date.now()
      });
      return;
    }

    if (!room || !playerId) {
      send(socket, { type: "error", message: "Join a room before sending input" });
      return;
    }

    if (message.type === "input") {
      const player = room.players.get(playerId);
      if (!player) return;
      player.input = message.input;
      player.lastInputSequence = message.seq;
      return;
    }

    if (message.type === "leaveRoom") {
      markDisconnected(room, playerId);
      socket.close();
    }
  });

  socket.on("close", () => {
    if (room && playerId) markDisconnected(room, playerId);
  });
});

httpServer.listen(port, () => {
  console.log(`Astro game server listening on http://localhost:${port}`);
  console.log(`WebSocket endpoint ws://localhost:${port}`);
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    updateRoom(room, SERVER_TICK_MS / 1_000, now);
    broadcastSnapshot(room, now);
  }
}, SERVER_TICK_MS);

function joinRoom(socket: WebSocket, message: Extract<ClientMessage, { type: "joinRoom" }>) {
  const roomId = sanitizeText(message.roomId, "default", ROOM_ID_MAX_LENGTH).toLowerCase();
  const nickname = sanitizeText(message.nickname, "Pilot", NICKNAME_MAX_LENGTH);
  const room = getOrCreateRoom(roomId);
  const playerId = randomUUID();
  const spawn = randomSpawn();
  const player: PlayerRecord = {
    id: playerId,
    nickname,
    color: pickPlayerColor(room),
    position: spawn,
    velocity: { x: 0, y: 0 },
    rotation: randomRange(0, Math.PI * 2),
    health: SHIP_MAX_HEALTH,
    score: 0,
    alive: true,
    thrusting: false,
    lastInputSequence: 0,
    connectionState: "connected",
    socket,
    input: { ...emptyInput },
    lastShotAt: 0,
    respawnAt: 0
  };

  room.players.set(playerId, player);
  send(socket, {
    type: "joinedRoom",
    roomId,
    playerId,
    world: {
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      tickRate: SERVER_TICK_RATE
    }
  });

  return { room, playerId };
}

function getOrCreateRoom(roomId: string): Room {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const room: Room = {
    id: roomId,
    tick: 0,
    players: new Map(),
    asteroids: new Map(),
    projectiles: new Map()
  };

  rooms.set(roomId, room);
  return room;
}

function updateRoom(room: Room, dt: number, now: number): void {
  room.tick += 1;
  cullDistantAsteroids(room);
  ensureAsteroids(room);
  updateAsteroids(room, dt);
  updatePlayers(room, dt, now);
  updateProjectiles(room, dt);
  resolveProjectileAsteroids(room);
  resolveShipAsteroids(room, now);
}

function pickPlayerColor(room: Room): string {
  const used = new Set([...room.players.values()].map((player) => player.color));
  return playerColors.find((color) => !used.has(color)) ?? playerColors[room.players.size % playerColors.length] ?? "#d8f063";
}

function updateAsteroids(room: Room, dt: number): void {
  for (const asteroid of room.asteroids.values()) {
    asteroid.position = wrapPosition(
      {
        x: asteroid.position.x + asteroid.velocity.x * dt,
        y: asteroid.position.y + asteroid.velocity.y * dt
      },
      WORLD_WIDTH,
      WORLD_HEIGHT
    );
  }
}

function updatePlayers(room: Room, dt: number, now: number): void {
  for (const player of room.players.values()) {
    if (!player.alive) {
      if (player.respawnAt > 0 && now >= player.respawnAt) respawnPlayer(player);
      continue;
    }

    if (player.input.left) player.rotation -= SHIP_ROTATION_SPEED * dt;
    if (player.input.right) player.rotation += SHIP_ROTATION_SPEED * dt;

    const facing = { x: Math.cos(player.rotation), y: Math.sin(player.rotation) };
    if (player.input.thrust) {
      player.velocity.x += facing.x * SHIP_THRUST * dt;
      player.velocity.y += facing.y * SHIP_THRUST * dt;
    }
    player.thrusting = player.input.thrust;

    player.velocity.x *= SHIP_DRAG;
    player.velocity.y *= SHIP_DRAG;
    player.velocity = clampMagnitude(player.velocity, SHIP_MAX_SPEED);
    player.position = wrapPosition(
      {
        x: player.position.x + player.velocity.x * dt,
        y: player.position.y + player.velocity.y * dt
      },
      WORLD_WIDTH,
      WORLD_HEIGHT
    );

    if (player.input.shoot && now - player.lastShotAt >= SHOT_COOLDOWN_MS) {
      player.lastShotAt = now;
      fireProjectile(room, player);
    }
  }
}

function updateProjectiles(room: Room, dt: number): void {
  for (const [id, projectile] of room.projectiles) {
    projectile.ttlMs -= dt * 1_000;
    projectile.position = wrapPosition(
      {
        x: projectile.position.x + projectile.velocity.x * dt,
        y: projectile.position.y + projectile.velocity.y * dt
      },
      WORLD_WIDTH,
      WORLD_HEIGHT
    );

    if (projectile.ttlMs <= 0) room.projectiles.delete(id);
  }
}

function resolveProjectileAsteroids(room: Room): void {
  for (const [projectileId, projectile] of room.projectiles) {
    for (const [asteroidId, asteroid] of room.asteroids) {
      if (distance(projectile.position, asteroid.position) > asteroid.radius + PROJECTILE_RADIUS) continue;

      room.projectiles.delete(projectileId);
      asteroid.health -= projectile.damage;

      const owner = room.players.get(projectile.ownerPlayerId);
      if (owner) owner.score += SCORE_HIT;

      if (asteroid.health <= 0) {
        room.asteroids.delete(asteroidId);
        if (owner) owner.score += asteroid.scoreValue;
        splitAsteroid(room, asteroid);
      }
      break;
    }
  }
}

function resolveShipAsteroids(room: Room, now: number): void {
  for (const player of room.players.values()) {
    if (!player.alive) continue;

    for (const asteroid of room.asteroids.values()) {
      if (distance(player.position, asteroid.position) > asteroid.radius + SHIP_RADIUS) continue;

      player.health -= 32;
      player.score += SCORE_DAMAGE;
      player.velocity.x -= Math.cos(player.rotation) * 220;
      player.velocity.y -= Math.sin(player.rotation) * 220;

      if (player.health <= 0) {
        player.alive = false;
        player.score += SCORE_DEATH;
        player.respawnAt = now + SHIP_RESPAWN_MS;
      }
      break;
    }
  }
}

function fireProjectile(room: Room, player: PlayerRecord): void {
  const facing = { x: Math.cos(player.rotation), y: Math.sin(player.rotation) };
  const projectile: ProjectileRecord = {
    id: randomUUID(),
    ownerPlayerId: player.id,
    position: {
      x: player.position.x + facing.x * (SHIP_RADIUS + 8),
      y: player.position.y + facing.y * (SHIP_RADIUS + 8)
    },
    velocity: {
      x: player.velocity.x + facing.x * PROJECTILE_SPEED,
      y: player.velocity.y + facing.y * PROJECTILE_SPEED
    },
    damage: PROJECTILE_DAMAGE,
    ttlMs: PROJECTILE_TTL_MS,
    createdAt: Date.now()
  };

  room.projectiles.set(projectile.id, projectile);
}

function ensureAsteroids(room: Room): void {
  const activePlayers = getActivePlayers(room);
  const targetCount = Math.max(ASTEROID_TARGET_COUNT, activePlayers.length * ASTEROIDS_PER_PLAYER);

  while (room.asteroids.size < targetCount) {
    const radius = randomRange(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
    room.asteroids.set(randomUUID(), createIncomingAsteroid(radius, activePlayers));
  }
}

function cullDistantAsteroids(room: Room): void {
  const activePlayers = getActivePlayers(room);
  if (activePlayers.length === 0) return;

  for (const [asteroidId, asteroid] of room.asteroids) {
    const isNearAnyPlayer = activePlayers.some(
      (player) => distance(player.position, asteroid.position) <= ASTEROID_DESPAWN_DISTANCE
    );
    if (!isNearAnyPlayer) room.asteroids.delete(asteroidId);
  }
}

function createIncomingAsteroid(radius: number, activePlayers: PlayerRecord[]): AsteroidState {
  const targetPlayer = randomActivePlayer(activePlayers);
  if (!targetPlayer) return createAsteroid(radius, 0);

  const spawnAngle = randomRange(0, Math.PI * 2);
  const spawnDistance = randomRange(ASTEROID_SPAWN_MIN_DISTANCE, ASTEROID_SPAWN_MAX_DISTANCE);
  const position = wrapPosition(
    {
      x: targetPlayer.position.x + Math.cos(spawnAngle) * spawnDistance,
      y: targetPlayer.position.y + Math.sin(spawnAngle) * spawnDistance
    },
    WORLD_WIDTH,
    WORLD_HEIGHT
  );
  const inwardAngle = Math.atan2(targetPlayer.position.y - position.y, targetPlayer.position.x - position.x);
  const driftAngle = inwardAngle + randomRange(-0.55, 0.55);
  const speed = randomRange(ASTEROID_BASE_SPEED * 0.8, ASTEROID_BASE_SPEED * 1.55);

  return createAsteroid(radius, 0, position, {
    x: Math.cos(driftAngle) * speed,
    y: Math.sin(driftAngle) * speed
  });
}

function getActivePlayers(room: Room): PlayerRecord[] {
  return [...room.players.values()].filter((player) => player.connectionState === "connected" && player.alive);
}

function randomActivePlayer(activePlayers: PlayerRecord[]): PlayerRecord | undefined {
  if (activePlayers.length === 0) return undefined;
  return activePlayers[Math.floor(Math.random() * activePlayers.length)];
}

function createAsteroid(
  radius: number,
  splitLevel: number,
  position: Vector2 = randomSpawn(),
  velocity?: Vector2
): AsteroidState {
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(ASTEROID_BASE_SPEED * 0.45, ASTEROID_BASE_SPEED * 1.25);
  return {
    id: randomUUID(),
    position,
    velocity: velocity ?? {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    },
    radius,
    health: Math.max(20, radius * 1.5),
    splitLevel,
    scoreValue: radius >= 48 ? 20 : radius >= 30 ? 10 : 5
  };
}

function splitAsteroid(room: Room, asteroid: AsteroidState): void {
  if (asteroid.splitLevel >= 2 || asteroid.radius <= ASTEROID_MIN_RADIUS * 1.3) return;

  const nextRadius = asteroid.radius * 0.58;
  for (let index = 0; index < 2; index += 1) {
    const child = createAsteroid(nextRadius, asteroid.splitLevel + 1, {
      x: asteroid.position.x + randomRange(-12, 12),
      y: asteroid.position.y + randomRange(-12, 12)
    });
    room.asteroids.set(child.id, child);
  }
}

function respawnPlayer(player: PlayerRecord): void {
  player.position = randomSpawn();
  player.velocity = { x: 0, y: 0 };
  player.rotation = randomRange(0, Math.PI * 2);
  player.health = SHIP_MAX_HEALTH;
  player.alive = true;
  player.thrusting = false;
  player.respawnAt = 0;
  player.input = { ...emptyInput };
}

function markDisconnected(room: Room, playerId: string): void {
  const player = room.players.get(playerId);
  if (!player) return;
  player.connectionState = "disconnected";
  player.socket = undefined;
}

function broadcastSnapshot(room: Room, now: number): void {
  const snapshot: GameSnapshot = {
    roomId: room.id,
    tick: room.tick,
    serverTime: now,
    players: [...room.players.values()].map(stripPlayer),
    asteroids: [...room.asteroids.values()],
    projectiles: [...room.projectiles.values()].map(stripProjectile),
    scoreboard: [...room.players.values()]
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        score: player.score,
        alive: player.alive
      }))
      .sort((a, b) => b.score - a.score)
  };

  const message = encodeMessage({ type: "snapshot", snapshot });
  for (const player of room.players.values()) {
    if (player.connectionState !== "connected" || !player.socket) continue;
    if (player.socket.readyState === player.socket.OPEN) player.socket.send(message);
  }
}

function stripPlayer(player: PlayerRecord): PlayerState {
  return {
    id: player.id,
    nickname: player.nickname,
    color: player.color,
    position: player.position,
    velocity: player.velocity,
    rotation: player.rotation,
    health: player.health,
    score: player.score,
    alive: player.alive,
    thrusting: player.alive && player.input.thrust,
    lastInputSequence: player.lastInputSequence,
    connectionState: player.connectionState
  };
}

function stripProjectile(projectile: ProjectileRecord): ProjectileState {
  return {
    id: projectile.id,
    ownerPlayerId: projectile.ownerPlayerId,
    position: projectile.position,
    velocity: projectile.velocity,
    damage: projectile.damage,
    ttlMs: projectile.ttlMs
  };
}

function randomSpawn(): Vector2 {
  return {
    x: randomRange(0, WORLD_WIDTH),
    y: randomRange(0, WORLD_HEIGHT)
  };
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(encodeMessage(message));
}
