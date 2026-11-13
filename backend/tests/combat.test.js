import test from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../src/game/engine/Match.js';
import { segmentCircleHit } from '../src/game/physics/collision.js';
import { WEAPONS } from '../src/game/weapons/definitions.js';

const DT = 0.05;
const idle = { movement: { up: false, down: false, left: false, right: false }, aimAngle: 0, fire: false, reload: false };

function runTicks(match, count) {
  for (let i = 0; i < count; i++) match.update(DT);
}

test('fast segment is detected through a small circle (no tunnelling)', () => {
  // 45px step straight through a circle of radius 23 centred in the middle
  assert.notEqual(segmentCircleHit(0, 0, 45, 0, 22, 0, 23), null);
});

test('segment that misses returns null', () => {
  assert.equal(segmentCircleHit(0, 0, 45, 0, 22, 100, 23), null);
});

test('fire cooldown limits rate of fire', () => {
  const match = new Match();
  const p = match.addPlayer('a');
  match.setInput('a', { ...idle, sequence: 1, fire: true });

  runTicks(match, 20); // 1 second at 4 shots/second → shots on ticks 1, 6, 11, 16

  assert.equal(p.weapon.ammo, WEAPONS.pistol.magazineSize - 4);
});

test('empty magazine reloads automatically', () => {
  const match = new Match();
  const p = match.addPlayer('a');
  p.weapon.ammo = 1;

  match.setInput('a', { ...idle, sequence: 1, fire: true });
  match.update(DT); // fires the last bullet
  match.setInput('a', { ...idle, sequence: 2 });
  assert.equal(p.weapon.ammo, 0);

  runTicks(match, 40); // reload takes 1.5s = 30 ticks
  assert.equal(p.weapon.ammo, WEAPONS.pistol.magazineSize);
  assert.equal(p.weapon.reloadRemaining, 0);
});

test('shooter eliminates a target in front of them and gets the kill', () => {
  const match = new Match();
  const shooter = match.addPlayer('a');
  const target = match.addPlayer('b');
  Object.assign(shooter, { x: 500, y: 500 });
  Object.assign(target, { x: 700, y: 500 });

  match.setInput('a', { ...idle, sequence: 1, fire: true, aimAngle: 0 });
  runTicks(match, 40);

  assert.equal(target.alive, false);
  assert.equal(target.health, 0);
  assert.equal(shooter.kills, 1);
});

test('a player cannot hurt themselves', () => {
  const match = new Match();
  const p = match.addPlayer('a');
  Object.assign(p, { x: 500, y: 500 });

  match.setInput('a', { ...idle, sequence: 1, fire: true });
  runTicks(match, 30);

  assert.equal(p.health, 100);
});