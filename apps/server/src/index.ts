import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { RoomEngine } from "@astro-game/game-core";
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
import { WebSocketServer, type WebSocket } from "ws";

interface NodeRoom {
  engine: RoomEngine;
  sockets: Map<string, WebSocket>;
}

const rooms = new Map<string, NodeRoom>();
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
  let room: NodeRoom | undefined;

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
      room.engine.setInput(playerId, message.seq, message.input);
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
    room.engine.update(SERVER_TICK_MS / 1_000, now);
    broadcastSnapshot(room, now);
  }
}, SERVER_TICK_MS);

function joinRoom(socket: WebSocket, message: Extract<ClientMessage, { type: "joinRoom" }>) {
  const roomId = sanitizeText(message.roomId, "default", ROOM_ID_MAX_LENGTH).toLowerCase();
  const nickname = sanitizeText(message.nickname, "Pilot", NICKNAME_MAX_LENGTH);
  const room = getOrCreateRoom(roomId);
  const { playerId } = room.engine.addPlayer(nickname);

  room.sockets.set(playerId, socket);
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

function getOrCreateRoom(roomId: string): NodeRoom {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  const room: NodeRoom = {
    engine: new RoomEngine({
      roomId,
      createId: randomUUID
    }),
    sockets: new Map()
  };

  rooms.set(roomId, room);
  return room;
}

function markDisconnected(room: NodeRoom, playerId: string): void {
  room.engine.markDisconnected(playerId);
  room.sockets.delete(playerId);
}

function broadcastSnapshot(room: NodeRoom, now: number): void {
  const message = encodeMessage({
    type: "snapshot",
    snapshot: room.engine.createSnapshot(now)
  });

  for (const socket of room.sockets.values()) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(encodeMessage(message));
}
