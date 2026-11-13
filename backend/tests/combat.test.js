import test from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_STATE } from '@dropzone/shared/constants';
import { segmentCircleHit } from '../src/game/physics/collision.js';
import { WEAPONS } from '../src/game/weapons/definitions.js';
import { idleInput, runTicks, startMatch } from './helpers.js';

test('fast segment is detected through a small circle (no tunnelling)', () => {
  assert.notEqual(segmentCircleHit(0, 0, 45, 0, 22, 0, 23), null);
});

test('segment that misses returns null', () => {
  assert.equal(segmentCircleHit(0, 0, 45, 0, 22, 100, 23), null);
});

test('fire cooldown limits rate of fire', () => {
  const match = startMatch();
  const a = match.players.get('a');
  Object.assign(a, { x: 1600, y: 1600 });
  Object.assign(match.players.get('b'), { x: 1600, y: 1000 }); // out of the line of fire

  match.setInput('a', { ...idleInput, sequence: 1, fire: true });
  runTicks(match, 20); // shots on ticks 1, 6, 11, 16

  assert.equal(a.weapon.ammo, WEAPONS.pistol.magazineSize - 4);
});

test('empty magazine reloads automatically', () => {
  const match = startMatch();
  const a = match.players.get('a');
  Object.assign(a, { x: 1600, y: 1600 });
  Object.assign(match.players.get('b'), { x: 1600, y: 1000 });
  a.weapon.ammo = 1;

  match.setInput('a', { ...idleInput, sequence: 1, fire: true });
  runTicks(match, 1);
  match.setInput('a', { ...idleInput, sequence: 2 });
  assert.equal(a.weapon.ammo, 0);

  runTicks(match, 40); // reload takes 1.5s = 30 ticks
  assert.equal(a.weapon.ammo, WEAPONS.pistol.magazineSize);
  assert.equal(a.weapon.reloadRemaining, 0);
});

test('shooter eliminates a target and wins the match', () => {
  const match = startMatch();
  const shooter = match.players.get('a');
  const target = match.players.get('b');
  Object.assign(shooter, { x: 500, y: 1600 });
  Object.assign(target, { x: 700, y: 1600 });

  match.setInput('a', { ...idleInput, sequence: 1, fire: true });
  runTicks(match, 40);

  assert.equal(target.alive, false);
  assert.equal(shooter.kills, 1);
  assert.equal(match.state, MATCH_STATE.FINISHED);
  assert.equal(match.winnerId, 'a');
});

test('a player cannot hurt themselves', () => {
  const match = startMatch();
  const a = match.players.get('a');
  Object.assign(a, { x: 1600, y: 1600 });
  Object.assign(match.players.get('b'), { x: 1600, y: 1000 });

  match.setInput('a', { ...idleInput, sequence: 1, fire: true });
  runTicks(match, 30);

  assert.equal(a.health, 100);
});