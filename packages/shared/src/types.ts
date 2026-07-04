export type EntityId = string;

export interface Vector2 {
  x: number;
  y: number;
}

export interface WorldConfig {
  width: number;
  height: number;
  tickRate: number;
}

export interface PlayerInput {
  left: boolean;
  right: boolean;
  thrust: boolean;
  reverse: boolean;
  shoot: boolean;
}

export interface PlayerState {
  id: EntityId;
  nickname: string;
  position: Vector2;
  velocity: Vector2;
  rotation: number;
  health: number;
  score: number;
  alive: boolean;
  lastInputSequence: number;
  connectionState: "connected" | "disconnected";
}

export interface AsteroidState {
  id: EntityId;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  health: number;
  splitLevel: number;
  scoreValue: number;
}

export interface ProjectileState {
  id: EntityId;
  ownerPlayerId: EntityId;
  position: Vector2;
  velocity: Vector2;
  damage: number;
  ttlMs: number;
}

export interface ScoreboardEntry {
  playerId: EntityId;
  nickname: string;
  score: number;
  alive: boolean;
}

export interface GameSnapshot {
  roomId: string;
  tick: number;
  serverTime: number;
  players: PlayerState[];
  asteroids: AsteroidState[];
  projectiles: ProjectileState[];
  scoreboard: ScoreboardEntry[];
}
