import test from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_STATE } from '@dropzone/shared/constants';
import { Match } from '../src/game/engine/Match.js';
import { RULES } from '../src/game/rules.js';
import { DT, idleInput, runTicks, startMatch } from './helpers.js';

test('stays WAITING with a single player', () => {
  const match = new Match();
  match.addPlayer('a');
  runTicks(match, 20);
  assert.equal(match.state, MATCH_STATE.WAITING);
});

test('countdown starts when enough players have joined', () => {
  const match = new Match();
  match.addPlayer('a');
  match.addPlayer('b');
  runTicks(match, 1);
  assert.equal(match.state, MATCH_STATE.COUNTDOWN);
});

test('countdown is aborted if the roster drops below the minimum', () => {
  const match = new Match();
  match.addPlayer('a');
  match.addPlayer('b');
  runTicks(match, 5);
  match.removePlayer('b');
  runTicks(match, 1);
  assert.equal(match.state, MATCH_STATE.WAITING);
});

test('players are frozen during the countdown', () => {
  const match = new Match();
  const a = match.addPlayer('a');
  match.addPlayer('b');
  runTicks(match, 2);
  assert.equal(match.state, MATCH_STATE.COUNTDOWN);

  const startX = a.x;
  match.setInput('a', { ...idleInput, sequence: 1, movement: { ...idleInput.movement, right: true } });
  runTicks(match, 10);
  assert.equal(a.x, startX);
});

test('last player alive wins, then the next round resets everything', () => {
  const match = startMatch();
  match.applyDamage(match.players.get('b'), 999, 'a');
  runTicks(match, 1);

  assert.equal(match.state, MATCH_STATE.FINISHED);
  assert.equal(match.winnerId, 'a');

  runTicks(match, Math.ceil(RULES.RESULT_SECONDS / DT) + 5);
  // With two players connected the next countdown begins automatically
  assert.ok([MATCH_STATE.WAITING, MATCH_STATE.COUNTDOWN].includes(match.state));
  assert.equal(match.winnerId, null);
  assert.equal(match.players.get('b').alive, true);
  assert.equal(match.players.get('b').health, 100);
});

test('everyone leaving an ACTIVE match cancels it', () => {
  const match = startMatch();
  match.removePlayer('a');
  match.removePlayer('b');
  runTicks(match, 1);
  assert.equal(match.state, MATCH_STATE.CANCELLED);
});

test('players joining mid-match become spectators', () => {
  const match = startMatch();
  const late = match.addPlayer('c');
  assert.equal(late.spectator, true);
  assert.equal(late.alive, false);

  runTicks(match, 5);
  assert.equal(match.state, MATCH_STATE.ACTIVE); // spectators don't end or count in the match
});

test('players outside the zone take damage', () => {
  const match = startMatch();
  const a = match.players.get('a');
  Object.assign(a, { x: 5, y: 5 }); // far outside the island circle

  runTicks(match, 20);
  assert.ok(a.health < 100);
});

test('medkit is not consumed at full health', () => {
  const match = startMatch();
  const a = match.players.get('a');
  match.loot = [{ id: 1, type: 'medkit', x: a.x, y: a.y }];

  match.setInput('a', { ...idleInput, sequence: 1, pickup: true });
  runTicks(match, 1);

  assert.equal(match.loot.length, 1);
});

test('medkit heals a hurt player and is consumed', () => {
  const match = startMatch();
  const a = match.players.get('a');
  a.health = 50;
  match.loot = [{ id: 1, type: 'medkit', x: a.x, y: a.y }];

  match.setInput('a', { ...idleInput, sequence: 1, pickup: true });
  runTicks(match, 1);

  assert.equal(a.health, 90);
  assert.equal(match.loot.length, 0);
});

test('cannot pick up loot that is out of reach', () => {
  const match = startMatch();
  const a = match.players.get('a');
  a.health = 50;
  match.loot = [{ id: 1, type: 'medkit', x: a.x + 500, y: a.y }];

  match.setInput('a', { ...idleInput, sequence: 1, pickup: true });
  runTicks(match, 1);

  assert.equal(a.health, 50);
  assert.equal(match.loot.length, 1);
});

test('picking up a rifle swaps the weapon', () => {
  const match = startMatch();
  const a = match.players.get('a');
  match.loot = [{ id: 1, type: 'rifle', x: a.x, y: a.y }];

  match.setInput('a', { ...idleInput, sequence: 1, pickup: true });
  runTicks(match, 1);

  assert.equal(a.weapon.weaponId, 'rifle');
});