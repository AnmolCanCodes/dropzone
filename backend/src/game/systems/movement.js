import { GAME_CONFIG } from '@dropzone/shared/constants';

const { WORLD_WIDTH, WORLD_HEIGHT, PLAYER_SPEED, PLAYER_RADIUS } = GAME_CONFIG;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Moves one player according to their current input. Mutates player. */
export function applyMovement(player, dt) {
  const { up, down, left, right } = player.input.movement;

  let dx = (right ? 1 : 0) - (left ? 1 : 0);
  let dy = (down ? 1 : 0) - (up ? 1 : 0);

  if (dx !== 0 && dy !== 0) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
  }

  player.x = clamp(player.x + dx * PLAYER_SPEED * dt, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
  player.y = clamp(player.y + dy * PLAYER_SPEED * dt, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  player.aimAngle = player.input.aimAngle;
}