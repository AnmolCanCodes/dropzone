import { GAME_CONFIG } from '@dropzone/shared/constants';
import { applyMovement } from '../systems/movement.js';

const { WORLD_WIDTH, WORLD_HEIGHT } = GAME_CONFIG;
const SPAWN_MARGIN = 200;

const IDLE_INPUT = Object.freeze({
  sequence: 0,
  movement: { up: false, down: false, left: false, right: false },
  aimAngle: 0,
  fire: false,
});

function round2(n) {
  return Math.round(n * 100) / 100;
}

function createPlayer(id) {
  return {
    id,
    x: SPAWN_MARGIN + Math.random() * (WORLD_WIDTH - SPAWN_MARGIN * 2),
    y: SPAWN_MARGIN + Math.random() * (WORLD_HEIGHT - SPAWN_MARGIN * 2),
    aimAngle: 0,
    health: 100,
    input: IDLE_INPUT,
  };
}

export class Match {
  constructor() {
    this.players = new Map();
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
      applyMovement(player, dt);
    }
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
      })),
    };
  }
}