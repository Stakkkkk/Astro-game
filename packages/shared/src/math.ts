import type { Vector2 } from "./types";

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(vector: Vector2, scalar: number): Vector2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

export function length(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}

export function clampMagnitude(vector: Vector2, max: number): Vector2 {
  const current = length(vector);
  if (current <= max || current === 0) return vector;
  const factor = max / current;
  return scale(vector, factor);
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function wrap(value: number, max: number): number {
  if (value < 0) return value + max;
  if (value >= max) return value - max;
  return value;
}

export function wrapPosition(position: Vector2, width: number, height: number): Vector2 {
  return {
    x: wrap(position.x, width),
    y: wrap(position.y, height)
  };
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function sanitizeText(value: string, fallback: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
}
