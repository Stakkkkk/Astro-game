import { RoomEngine } from "@astro-game/game-core";
import { DurableObject } from "cloudflare:workers";
import {
  NICKNAME_MAX_LENGTH,
  ROOM_ID_MAX_LENGTH,
  SERVER_TICK_MS,
  SERVER_TICK_RATE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  encodeMessage,
  parseClientMessage,
  sanitizeText,
  type ClientMessage,
  type ServerMessage
} from "@astro-game/shared";

export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  ASSETS: Fetcher;
}

const HTML_ASSET_VERSION = "2026-07-04-flight-physics";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        name: "astro-game-worker",
        status: "ok",
        tickRate: SERVER_TICK_RATE
      });
    }

    if (url.pathname === "/ws") {
      const roomId = sanitizeText(url.searchParams.get("room") ?? "default", "default", ROOM_ID_MAX_LENGTH).toLowerCase();
      const id = env.GAME_ROOM.idFromName(roomId);
      return env.GAME_ROOM.get(id).fetch(request);
    }

    return fetchStaticAsset(request, env);
  }
} satisfies ExportedHandler<Env>;

async function fetchStaticAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const isHtmlRequest =
    request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.endsWith(".html"));

  const assetRequest = isHtmlRequest ? withHtmlCacheBuster(request, url) : request;
  const response = await env.ASSETS.fetch(assetRequest);
  if (!isHtmlRequest) return response;

  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function withHtmlCacheBuster(request: Request, url: URL): Request {
  const assetUrl = new URL(url);
  assetUrl.searchParams.set("__astro_build", HTML_ASSET_VERSION);
  return new Request(assetUrl, request);
}

export class GameRoom extends DurableObject<Env> {
  private readonly engine: RoomEngine;
  private readonly sockets = new Map<WebSocket, string>();
  private intervalId: number | undefined;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.engine = new RoomEngine({
      roomId: state.id.toString(),
      createId: () => crypto.randomUUID()
    });
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, 426);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.attachSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  private attachSocket(socket: WebSocket): void {
    socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : "";
      const message = parseClientMessage(raw);

      if (!message) {
        this.send(socket, { type: "error", message: "Invalid message" });
        return;
      }

      this.handleMessage(socket, message);
    });

    socket.addEventListener("close", () => this.detachSocket(socket));
    socket.addEventListener("error", () => this.detachSocket(socket));
  }

  private handleMessage(socket: WebSocket, message: ClientMessage): void {
    if (message.type === "joinRoom") {
      const nickname = sanitizeText(message.nickname, "Pilot", NICKNAME_MAX_LENGTH);
      const { playerId } = this.engine.addPlayer(nickname);
      this.sockets.set(socket, playerId);
      this.ensureLoop();
      this.send(socket, {
        type: "joinedRoom",
        roomId: sanitizeText(message.roomId, "default", ROOM_ID_MAX_LENGTH).toLowerCase(),
        playerId,
        world: {
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          tickRate: SERVER_TICK_RATE
        }
      });
      return;
    }

    if (message.type === "ping") {
      this.send(socket, {
        type: "pong",
        sentAt: message.sentAt,
        serverTime: Date.now()
      });
      return;
    }

    const playerId = this.sockets.get(socket);
    if (!playerId) {
      this.send(socket, { type: "error", message: "Join a room before sending input" });
      return;
    }

    if (message.type === "input") {
      this.engine.setInput(playerId, message.seq, message.input);
      return;
    }

    if (message.type === "leaveRoom") {
      this.detachSocket(socket);
      socket.close();
    }
  }

  private ensureLoop(): void {
    if (this.intervalId !== undefined) return;

    this.intervalId = setInterval(() => {
      const now = Date.now();
      this.engine.update(SERVER_TICK_MS / 1_000, now);
      this.broadcast({
        type: "snapshot",
        snapshot: this.engine.createSnapshot(now)
      });

      if (this.sockets.size === 0 && this.intervalId !== undefined) {
        clearInterval(this.intervalId);
        this.intervalId = undefined;
      }
    }, SERVER_TICK_MS);
  }

  private detachSocket(socket: WebSocket): void {
    const playerId = this.sockets.get(socket);
    if (playerId) this.engine.markDisconnected(playerId);
    this.sockets.delete(socket);
  }

  private broadcast(message: ServerMessage): void {
    const encoded = encodeMessage(message);
    for (const socket of this.sockets.keys()) {
      try {
        socket.send(encoded);
      } catch {
        this.detachSocket(socket);
      }
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    socket.send(encodeMessage(message));
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*"
    }
  });
}
