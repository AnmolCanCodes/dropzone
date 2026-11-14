import { GAME_CONFIG, MATCH_STATE } from '@dropzone/shared/constants';
import { randomPointInCircle, round2 } from '../physics/geometry.js';
import { applyMovement } from '../systems/movement.js';
import { createWeaponState, updateWeapon, stepProjectile } from '../systems/combat.js';
import {
  createZone,
  updateZone,
  isOutsideZone,
  getZoneDamagePerSecond,
  getZoneSnapshot,
} from '../systems/zone.js';
import { spawnLoot, findPickupTarget, applyPickup } from '../systems/loot.js';
import { DEFAULT_WEAPON } from '../weapons/definitions.js';
import { RULES, ISLAND } from '../rules.js';
import { canTransition } from './matchStates.js';

const { PLAYER_MAX_HEALTH } = GAME_CONFIG;
const EPSILON = 1e-9;

const IDLE_INPUT = Object.freeze({
  sequence: 0,
  movement: { up: false, down: false, left: false, right: false },
  aimAngle: 0,
  fire: false,
  reload: false,
  pickup: false,
});

function randomSpawn() {
  return randomPointInCircle(ISLAND.x, ISLAND.y, ISLAND.radius - RULES.SPAWN_INSET);
}

function createPlayer(id, userId = null, username = 'anonymous') {
  return {
    id, // socket id: identifies this connection inside the match
    userId, // account id: identifies the person, used for saving results
    username,
    ...randomSpawn(),
    aimAngle: 0,
    health: PLAYER_MAX_HEALTH,
    alive: true,
    spectator: false, // joined mid-match: watches until the next round
    kills: 0,
    eliminatedAt: null, // seconds into the ACTIVE phase when they died
    weapon: createWeaponState(DEFAULT_WEAPON),
    input: IDLE_INPUT,
  };
}

export class Match {
  /**
   * onMatchFinished(result) is called once per finished match with plain data.
   * The engine never touches the database; whoever creates the Match decides what to do with it.
   */
  constructor({ onMatchFinished } = {}) {
    this.onMatchFinished = onMatchFinished ?? null;

    this.state = MATCH_STATE.WAITING;
    this.stateTimer = 0;
    this.winnerId = null;

    this.players = new Map();
    this.projectiles = [];
    this.nextProjectileId = 1;

    this.loot = [];
    this.nextLootId = 1;
    this.lootVersion = 0; // bumps whenever loot changes, so the server knows when to resend it

    this.zone = createZone();
    this.tick = 0;

    // Bookkeeping for the result of the current ACTIVE phase
    this.startedAt = null; // real clock time when the match went live
    this.activeElapsed = 0; // simulated seconds since it went live
    this.departed = []; // players who disconnected mid-match
  }

  // ---------- roster ----------

  addPlayer(id, userId = null, username = 'anonymous') {
    const player = createPlayer(id, userId, username);
    if (this.state === MATCH_STATE.ACTIVE) {
      // Roster is locked once the match is live
      player.alive = false;
      player.spectator = true;
    }
    this.players.set(id, player);
    return player;
  }

  removePlayer(id) {
    const player = this.players.get(id);

    if (player && this.state === MATCH_STATE.ACTIVE && !player.spectator) {
      // Leaving mid-match counts as being eliminated right now
      this.departed.push({
        userId: player.userId,
        kills: player.kills,
        eliminatedAt: player.alive ? this.activeElapsed : player.eliminatedAt,
      });
    }

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

  // ---------- state machine ----------

  transitionTo(next, timerSeconds = 0) {
    if (!canTransition(this.state, next)) {
      console.error(`Invalid match transition ${this.state} -> ${next}`);
      return false;
    }
    console.log(`Match: ${this.state} -> ${next}`);
    this.state = next;
    this.stateTimer = timerSeconds;
    return true;
  }

  startCountdown() {
    if (!this.transitionTo(MATCH_STATE.COUNTDOWN, RULES.COUNTDOWN_SECONDS)) return;
    this.prepareRound();
  }

  /** Fresh spawns, fresh zone, fresh loot. Runs when the countdown begins. */
  prepareRound() {
    this.resetPlayers();
    this.projectiles = [];
    this.zone = createZone();
    this.setLoot(spawnLoot(() => this.nextLootId++));
    this.winnerId = null;
  }

  returnToWaiting() {
    if (this.state !== MATCH_STATE.WAITING && !this.transitionTo(MATCH_STATE.WAITING)) return;
    this.projectiles = [];
    this.setLoot([]);
    this.zone = createZone();
    this.winnerId = null;
    this.resetPlayers();
  }

  resetPlayers() {
    for (const player of this.players.values()) {
      Object.assign(player, randomSpawn(), {
        health: PLAYER_MAX_HEALTH,
        alive: true,
        spectator: false,
        kills: 0,
        eliminatedAt: null,
        weapon: createWeaponState(DEFAULT_WEAPON),
      });
    }
  }

  setLoot(items) {
    this.loot = items;
    this.lootVersion += 1;
  }

  // ---------- simulation ----------

  /** Advances the simulation by one fixed step. */
  update(dt) {
    this.tick += 1;

    switch (this.state) {
      case MATCH_STATE.WAITING:
        this.updateWaiting(dt);
        break;
      case MATCH_STATE.COUNTDOWN:
        this.updateCountdown(dt);
        break;
      case MATCH_STATE.ACTIVE:
        this.updateActive(dt);
        break;
      default: // FINISHED and CANCELLED
        this.updateResult(dt);
    }
  }

  updateWaiting(dt) {
    // Warm-up: free movement, no combat
    for (const player of this.players.values()) applyMovement(player, dt);

    if (this.players.size >= RULES.MIN_PLAYERS_TO_START) this.startCountdown();
  }

  updateCountdown(dt) {
    if (this.players.size < RULES.MIN_PLAYERS_TO_START) {
      this.returnToWaiting();
      return;
    }

    this.stateTimer -= dt;
    if (this.stateTimer <= EPSILON && this.transitionTo(MATCH_STATE.ACTIVE)) {
      this.startedAt = new Date();
      this.activeElapsed = 0;
      this.departed = [];
    }
  }

  updateActive(dt) {
    this.activeElapsed += dt;
    updateZone(this.zone, dt);
    const zoneDamage = getZoneDamagePerSecond(this.zone) * dt;

    for (const player of this.players.values()) {
      if (!player.alive) continue;

      applyMovement(player, dt);

      if (isOutsideZone(this.zone, player.x, player.y)) {
        this.applyDamage(player, zoneDamage, null);
        if (!player.alive) continue;
      }

      const shot = updateWeapon(player, dt);
      if (shot) this.projectiles.push({ id: this.nextProjectileId++, ...shot });

      if (player.input.pickup) this.tryPickup(player);
    }

    this.updateProjectiles(dt);
    this.checkMatchEnd();
  }

  updateResult(dt) {
    this.stateTimer -= dt;
    if (this.stateTimer <= EPSILON) this.returnToWaiting();
  }

  tryPickup(player) {
    const item = findPickupTarget(player, this.loot);
    if (!item) return;

    applyPickup(player, item);
    this.setLoot(this.loot.filter((l) => l.id !== item.id));
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

  /** attackerId is null for environmental damage (the zone). */
  applyDamage(victim, amount, attackerId) {
    if (!victim.alive) return;

    victim.health = Math.max(0, victim.health - amount);
    if (victim.health > 0) return;

    victim.alive = false;
    victim.eliminatedAt = this.activeElapsed;

    const attacker = attackerId ? this.players.get(attackerId) : null;
    if (attacker) attacker.kills += 1;
    console.log(`Player ${victim.id} eliminated by ${attackerId ?? 'the zone'}`);
  }

  checkMatchEnd() {
    if (this.players.size === 0) {
      this.transitionTo(MATCH_STATE.CANCELLED, 0); // cancelled matches are not recorded
      return;
    }

    const survivors = [...this.players.values()].filter((p) => p.alive);
    if (survivors.length > 1) return;

    this.winnerId = survivors[0]?.id ?? null; // null = nobody left (a draw)

    // Only reached once per match: the transition out of ACTIVE happens exactly once
    if (this.transitionTo(MATCH_STATE.FINISHED, RULES.RESULT_SECONDS)) this.reportResult();
  }

  // ---------- results ----------

  reportResult() {
    if (!this.onMatchFinished) return;

    const result = this.buildResult();
    if (result.participants.length === 0) return;

    try {
      this.onMatchFinished(result);
    } catch (error) {
      console.error('Match result callback failed:', error);
    }
  }

  /** Plain data only. Placement is decided by who lasted longest; equal times share a placement. */
  buildResult() {
    const entries = [
      ...[...this.players.values()]
        .filter((p) => !p.spectator)
        .map((p) => ({
          userId: p.userId,
          kills: p.kills,
          eliminatedAt: p.alive ? Infinity : p.eliminatedAt,
        })),
      ...this.departed,
    ].filter((entry) => entry.userId); // only real accounts can be saved

    entries.sort((a, b) => {
      if (a.eliminatedAt === b.eliminatedAt) return 0;
      return b.eliminatedAt > a.eliminatedAt ? 1 : -1;
    });

    let placement = 0;
    let previous = null;
    const participants = entries.map((entry, index) => {
      if (entry.eliminatedAt !== previous) {
        placement = index + 1;
        previous = entry.eliminatedAt;
      }
      return {
        userId: entry.userId,
        placement,
        kills: entry.kills,
        survivedSeconds: Math.round(Math.min(entry.eliminatedAt, this.activeElapsed)),
      };
    });

    const winner = this.players.get(this.winnerId);
    return {
      winnerUserId: winner?.userId ?? null,
      startedAt: this.startedAt,
      endedAt: new Date(),
      participants,
    };
  }

  // ---------- network views ----------

  getLoot() {
    return this.loot.map(({ id, type, x, y }) => ({ id, type, x, y }));
  }

  /** Only data the clients are allowed to see. Never send raw internal objects. */
  getSnapshot() {
    const players = [...this.players.values()];
    const showTimer = this.state === MATCH_STATE.COUNTDOWN || this.state === MATCH_STATE.FINISHED;

    return {
      tick: this.tick,
      match: {
        state: this.state,
        timer: showTimer ? Math.ceil(Math.max(0, this.stateTimer)) : 0,
        winnerId: this.winnerId,
        aliveCount: players.filter((p) => p.alive).length,
        playerCount: players.length,
        minPlayers: RULES.MIN_PLAYERS_TO_START,
      },
      zone: getZoneSnapshot(this.zone),
      players: players.map((p) => ({
        id: p.id,
        x: round2(p.x),
        y: round2(p.y),
        aimAngle: round2(p.aimAngle),
        health: Math.ceil(p.health),
        alive: p.alive,
        spectator: p.spectator,
        kills: p.kills,
        ammo: p.weapon.ammo,
        reloading: p.weapon.reloadRemaining > 0,
      })),
      projectiles: this.projectiles.map((b) => ({ id: b.id, x: round2(b.x), y: round2(b.y) })),
    };
  }
}