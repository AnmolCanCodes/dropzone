import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_CONFIG } from '@dropzone/shared/constants';
import { applyMovement } from '../src/game/systems/movement.js';

const { PLAYER_SPEED, PLAYER_RADIUS } = GAME_CONFIG;

function makePlayer(movement, x = 500, y = 500) {
  const all = { up: false, down: false, left: false, right: false, ...movement };
  return { x, y, aimAngle: 0, input: { movement: all, aimAngle: 0 } };
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('moves right at configured speed', () => {
  const p = makePlayer({ right: true });
  applyMovement(p, 0.05);
  assert.ok(near(p.x, 500 + PLAYER_SPEED * 0.05));
  assert.equal(p.y, 500);
});

test('diagonal movement is not faster', () => {
  const p = makePlayer({ right: true, down: true });
  applyMovement(p, 0.05);
  assert.ok(near(Math.hypot(p.x - 500, p.y - 500), PLAYER_SPEED * 0.05));
});

test('opposite keys cancel out', () => {
  const p = makePlayer({ left: true, right: true });
  applyMovement(p, 0.05);
  assert.equal(p.x, 500);
});

test('cannot leave the world', () => {
  const p = makePlayer({ left: true, up: true }, 5, 5);
  applyMovement(p, 1);
  assert.equal(p.x, PLAYER_RADIUS);
  assert.equal(p.y, PLAYER_RADIUS);
});