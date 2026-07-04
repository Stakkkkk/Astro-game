import type { GameSnapshot, PlayerInput, WorldConfig } from "./types";

export interface JoinRoomMessage {
  type: "joinRoom";
  roomId: string;
  nickname: string;
}

export interface PlayerInputMessage {
  type: "input";
  seq: number;
  input: PlayerInput;
}

export interface PingMessage {
  type: "ping";
  sentAt: number;
}

export interface LeaveRoomMessage {
  type: "leaveRoom";
}

export type ClientMessage =
  | JoinRoomMessage
  | PlayerInputMessage
  | PingMessage
  | LeaveRoomMessage;

export interface JoinedRoomMessage {
  type: "joinedRoom";
  roomId: string;
  playerId: string;
  world: WorldConfig;
}

export interface GameSnapshotMessage {
  type: "snapshot";
  snapshot: GameSnapshot;
}

export interface PongMessage {
  type: "pong";
  sentAt: number;
  serverTime: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export type ServerMessage =
  | JoinedRoomMessage
  | GameSnapshotMessage
  | PongMessage
  | ErrorMessage;

export function encodeMessage(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}

export function parseClientMessage(raw: string): ClientMessage | undefined {
  const value = safeJson(raw);
  if (!isRecord(value) || typeof value.type !== "string") return undefined;

  if (value.type === "joinRoom") {
    if (typeof value.roomId !== "string" || typeof value.nickname !== "string") return undefined;
    return {
      type: "joinRoom",
      roomId: value.roomId,
      nickname: value.nickname
    };
  }

  if (value.type === "input") {
    if (typeof value.seq !== "number" || !isPlayerInput(value.input)) return undefined;
    return {
      type: "input",
      seq: value.seq,
      input: value.input
    };
  }

  if (value.type === "ping") {
    if (typeof value.sentAt !== "number") return undefined;
    return {
      type: "ping",
      sentAt: value.sentAt
    };
  }

  if (value.type === "leaveRoom") {
    return { type: "leaveRoom" };
  }

  return undefined;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayerInput(value: unknown): value is PlayerInput {
  if (!isRecord(value)) return false;
  return (
    typeof value.left === "boolean" &&
    typeof value.right === "boolean" &&
    typeof value.thrust === "boolean" &&
    typeof value.shoot === "boolean"
  );
}
