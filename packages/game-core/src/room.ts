import {
  ASTEROID_BASE_SPEED,
  ASTEROID_DESPAWN_DISTANCE,
  ASTEROID_MAX_RADIUS,
  ASTEROID_MIN_RADIUS,
  ASTEROID_SPAWN_MAX_DISTANCE,
  ASTEROID_SPAWN_MIN_DISTANCE,
  ASTEROID_TARGET_COUNT,
  ASTEROIDS_PER_PLAYER,
  PROJECTILE_DAMAGE,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  PROJECTILE_TTL_MS,
  SCORE_DAMAGE,
  SCORE_DEATH,
  SCORE_HIT,
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
  randomRange,
  wrapPosition,
  type AsteroidState,
  type GameSnapshot,
  type PlayerInput,
  type PlayerState,
  type ProjectileState,
  type Vector2
} from "@astro-game/shared";

interface PlayerRecord extends PlayerState {
  input: PlayerInput;
  lastShotAt: number;
  respawnAt: number;
}

type ProjectileRecord = ProjectileState;

export interface RoomEngineOptions {
  roomId: string;
  createId: () => string;
}

export interface JoinResult {
  playerId: string;
}

export const playerColors = [
  "#d8f063",
  "#78c7ff",
  "#ff8b6b",
  "#b894ff",
  "#64e2b7",
  "#ffd166",
  "#f76fd7",
  "#8ee3f5"
];

const emptyInput: PlayerInput = {
  left: false,
  right: false,
  thrust: false,
  shoot: false
};

export class RoomEngine {
  readonly id: string;
  private readonly createId: () => string;
  private tick = 0;
  private readonly players = new Map<string, PlayerRecord>();
  private readonly asteroids = new Map<string, AsteroidState>();
  private readonly projectiles = new Map<string, ProjectileRecord>();

  constructor(options: RoomEngineOptions) {
    this.id = options.roomId;
    this.createId = options.createId;
  }

  addPlayer(nickname: string): JoinResult {
    const playerId = this.createId();
    const spawn = this.randomSpawn();
    const player: PlayerRecord = {
      id: playerId,
      nickname,
      color: this.pickPlayerColor(),
      position: spawn,
      velocity: { x: 0, y: 0 },
      rotation: randomRange(0, Math.PI * 2),
      health: SHIP_MAX_HEALTH,
      score: 0,
      alive: true,
      thrusting: false,
      lastInputSequence: 0,
      connectionState: "connected",
      input: { ...emptyInput },
      lastShotAt: 0,
      respawnAt: 0
    };

    this.players.set(playerId, player);
    return { playerId };
  }

  setInput(playerId: string, seq: number, input: PlayerInput): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.input = input;
    player.lastInputSequence = seq;
  }

  markDisconnected(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    player.connectionState = "disconnected";
    player.thrusting = false;
    player.input = { ...emptyInput };
  }

  update(dt: number, now: number): void {
    this.tick += 1;
    this.cullDistantAsteroids();
    this.ensureAsteroids();
    this.updateAsteroids(dt);
    this.updatePlayers(dt, now);
    this.updateProjectiles(dt);
    this.resolveProjectileAsteroids();
    this.resolveShipAsteroids(now);
  }

  createSnapshot(now: number): GameSnapshot {
    const players = [...this.players.values()].map((player) => this.stripPlayer(player));
    return {
      roomId: this.id,
      tick: this.tick,
      serverTime: now,
      players,
      asteroids: [...this.asteroids.values()],
      projectiles: [...this.projectiles.values()].map((projectile) => this.stripProjectile(projectile)),
      scoreboard: players
        .map((player) => ({
          playerId: player.id,
          nickname: player.nickname,
          score: player.score,
          alive: player.alive
        }))
        .sort((a, b) => b.score - a.score)
    };
  }

  private pickPlayerColor(): string {
    const used = new Set([...this.players.values()].map((player) => player.color));
    return playerColors.find((color) => !used.has(color)) ?? playerColors[this.players.size % playerColors.length] ?? "#d8f063";
  }

  private updateAsteroids(dt: number): void {
    for (const asteroid of this.asteroids.values()) {
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

  private updatePlayers(dt: number, now: number): void {
    for (const player of this.players.values()) {
      if (!player.alive) {
        if (player.respawnAt > 0 && now >= player.respawnAt) this.respawnPlayer(player);
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
        this.fireProjectile(player);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const [id, projectile] of this.projectiles) {
      projectile.ttlMs -= dt * 1_000;
      projectile.position = wrapPosition(
        {
          x: projectile.position.x + projectile.velocity.x * dt,
          y: projectile.position.y + projectile.velocity.y * dt
        },
        WORLD_WIDTH,
        WORLD_HEIGHT
      );

      if (projectile.ttlMs <= 0) this.projectiles.delete(id);
    }
  }

  private resolveProjectileAsteroids(): void {
    for (const [projectileId, projectile] of this.projectiles) {
      for (const [asteroidId, asteroid] of this.asteroids) {
        if (distance(projectile.position, asteroid.position) > asteroid.radius + PROJECTILE_RADIUS) continue;

        this.projectiles.delete(projectileId);
        asteroid.health -= projectile.damage;

        const owner = this.players.get(projectile.ownerPlayerId);
        if (owner) owner.score += SCORE_HIT;

        if (asteroid.health <= 0) {
          this.asteroids.delete(asteroidId);
          if (owner) owner.score += asteroid.scoreValue;
          this.splitAsteroid(asteroid);
        }
        break;
      }
    }
  }

  private resolveShipAsteroids(now: number): void {
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      for (const [asteroidId, asteroid] of this.asteroids) {
        if (distance(player.position, asteroid.position) > asteroid.radius + SHIP_RADIUS) continue;

        this.asteroids.delete(asteroidId);
        player.health -= 32;
        player.score += SCORE_DAMAGE;
        player.velocity.x -= Math.cos(player.rotation) * 220;
        player.velocity.y -= Math.sin(player.rotation) * 220;

        if (player.health <= 0) {
          player.alive = false;
          player.thrusting = false;
          player.score += SCORE_DEATH;
          player.respawnAt = now + SHIP_RESPAWN_MS;
        }
        break;
      }
    }
  }

  private fireProjectile(player: PlayerRecord): void {
    const facing = { x: Math.cos(player.rotation), y: Math.sin(player.rotation) };
    const projectile: ProjectileRecord = {
      id: this.createId(),
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
      ttlMs: PROJECTILE_TTL_MS
    };

    this.projectiles.set(projectile.id, projectile);
  }

  private ensureAsteroids(): void {
    const activePlayers = this.getActivePlayers();
    const targetCount = Math.max(ASTEROID_TARGET_COUNT, activePlayers.length * ASTEROIDS_PER_PLAYER);

    while (this.asteroids.size < targetCount) {
      const radius = randomRange(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);
      this.asteroids.set(this.createId(), this.createIncomingAsteroid(radius, activePlayers));
    }
  }

  private cullDistantAsteroids(): void {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 0) return;

    for (const [asteroidId, asteroid] of this.asteroids) {
      const isNearAnyPlayer = activePlayers.some(
        (player) => distance(player.position, asteroid.position) <= ASTEROID_DESPAWN_DISTANCE
      );
      if (!isNearAnyPlayer) this.asteroids.delete(asteroidId);
    }
  }

  private createIncomingAsteroid(radius: number, activePlayers: PlayerRecord[]): AsteroidState {
    const targetPlayer = this.randomActivePlayer(activePlayers);
    if (!targetPlayer) return this.createAsteroid(radius, 0);

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

    return this.createAsteroid(radius, 0, position, {
      x: Math.cos(driftAngle) * speed,
      y: Math.sin(driftAngle) * speed
    });
  }

  private getActivePlayers(): PlayerRecord[] {
    return [...this.players.values()].filter((player) => player.connectionState === "connected" && player.alive);
  }

  private randomActivePlayer(activePlayers: PlayerRecord[]): PlayerRecord | undefined {
    if (activePlayers.length === 0) return undefined;
    return activePlayers[Math.floor(Math.random() * activePlayers.length)];
  }

  private createAsteroid(radius: number, splitLevel: number, position: Vector2 = this.randomSpawn(), velocity?: Vector2): AsteroidState {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(ASTEROID_BASE_SPEED * 0.45, ASTEROID_BASE_SPEED * 1.25);
    return {
      id: this.createId(),
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

  private splitAsteroid(asteroid: AsteroidState): void {
    if (asteroid.splitLevel >= 2 || asteroid.radius <= ASTEROID_MIN_RADIUS * 1.3) return;

    const nextRadius = asteroid.radius * 0.58;
    for (let index = 0; index < 2; index += 1) {
      const child = this.createAsteroid(nextRadius, asteroid.splitLevel + 1, {
        x: asteroid.position.x + randomRange(-12, 12),
        y: asteroid.position.y + randomRange(-12, 12)
      });
      this.asteroids.set(child.id, child);
    }
  }

  private respawnPlayer(player: PlayerRecord): void {
    player.position = this.randomSpawn();
    player.velocity = { x: 0, y: 0 };
    player.rotation = randomRange(0, Math.PI * 2);
    player.health = SHIP_MAX_HEALTH;
    player.alive = true;
    player.thrusting = false;
    player.respawnAt = 0;
    player.input = { ...emptyInput };
  }

  private stripPlayer(player: PlayerRecord): PlayerState {
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

  private stripProjectile(projectile: ProjectileRecord): ProjectileState {
    return {
      id: projectile.id,
      ownerPlayerId: projectile.ownerPlayerId,
      position: projectile.position,
      velocity: projectile.velocity,
      damage: projectile.damage,
      ttlMs: projectile.ttlMs
    };
  }

  private randomSpawn(): Vector2 {
    return {
      x: randomRange(0, WORLD_WIDTH),
      y: randomRange(0, WORLD_HEIGHT)
    };
  }
}
