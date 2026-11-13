import { GAME_CONFIG } from '@dropzone/shared/constants';
import { applyMovement } from '../systems/movement.js';
import { createWeaponState, updateWeapon, stepProjectile } from '../systems/combat.js';
import { DEFAULT_WEAPON } from '../weapons/definitions.js';

const { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_MAX_HEALTH } = GAME_CONFIG;
const SPAWN_MARGIN = 200;
const EPSILON = 1e-9;

// TEMPORARY: lets you keep testing combat. Milestone 5 replaces this with
// "eliminated = out of the match" plus winner detection.
const DEV_RESPAWN_SECONDS = 3;

const IDLE_INPUT = Object.freeze({
  sequence: 0,
  movement: { up: false, down: false, left: false, right: false },
  aimAngle: 0,
  fire: false,
  reload: false,
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

function randomSpawn() {
  return {
    x: SPAWN_MARGIN + Math.random() * (WORLD_WIDTH - SPAWN_MARGIN * 2),
    y: SPAWN_MARGIN + Math.random() * (WORLD_HEIGHT - SPAWN_MARGIN * 2),
  };
}

function createPlayer(id) {
  return {
    id,
    ...randomSpawn(),
    aimAngle: 0,
    health: PLAYER_MAX_HEALTH,
    alive: true,
    deathTimer: 0,
    kills: 0,
    weapon: createWeaponState(DEFAULT_WEAPON),
    input: IDLE_INPUT,
  };
}

export class Match {
  constructor() {
    this.players = new Map();
    this.projectiles = [];
    this.nextProjectileId = 1;
    this.tick = 0;
  }

  addPlayer(id) {
    const player = createPlayer(id);
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    this.players.delete(id);
  }

  /** Stores the player's latest intent. Stale or out-of-order inputs are ignored. */
  setInput(id, input) {
    const player = this.players.get(id);
    if (!player) return false;
    if (input.sequence <= player.input.sequence) return false;
    player.input = input;
    return true;
  }

  /** Advances the simulation by one fixed step. */
  update(dt) {
    this.tick += 1;

    for (const player of this.players.values()) {
      if (!player.alive) {
        player.deathTimer -= dt;
        if (player.deathTimer <= EPSILON) this.respawn(player);
        continue;
      }

      applyMovement(player, dt);

      const shot = updateWeapon(player, dt);
      if (shot) this.projectiles.push({ id: this.nextProjectileId++, ...shot });
    }

    this.updateProjectiles(dt);
  }

  updateProjectiles(dt) {
    const remaining = [];

    for (const projectile of this.projectiles) {
      const { done, victim } = stepProjectile(projectile, dt, this.players);
      if (victim) this.applyDamage(victim, projectile.damage, projectile.ownerId);
      if (!done) remaining.push(projectile);
    }

    this.projectiles = remaining;
  }

  applyDamage(victim, amount, attackerId) {
    if (!victim.alive) return;

    victim.health = Math.max(0, victim.health - amount);
    if (victim.health > 0) return;

    victim.alive = false;
    victim.deathTimer = DEV_RESPAWN_SECONDS;

    const attacker = this.players.get(attackerId);
    if (attacker) attacker.kills += 1;
    console.log(`Player ${victim.id} eliminated by ${attackerId}`);
  }

  respawn(player) {
    Object.assign(player, randomSpawn(), {
      health: PLAYER_MAX_HEALTH,
      alive: true,
      deathTimer: 0,
      weapon: createWeaponState(DEFAULT_WEAPON),
    });
  }

  /** Only data the clients are allowed to see. Never send raw internal objects. */
  getSnapshot() {
    return {
      tick: this.tick,
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        x: round2(p.x),
        y: round2(p.y),
        aimAngle: round2(p.aimAngle),
        health: p.health,
        alive: p.alive,
        kills: p.kills,
        ammo: p.weapon.ammo,
        reloading: p.weapon.reloadRemaining > 0,
      })),
      projectiles: this.projectiles.map((b) => ({
        id: b.id,
        x: round2(b.x),
        y: round2(b.y),
      })),
    };
  }
}