import assert from 'node:assert/strict';
import { MATCH_STATE } from '@dropzone/shared/constants';
import { Match } from '../src/game/engine/Match.js';
import { RULES } from '../src/game/rules.js';

export const DT = 0.05;

export const idleInput = {
  movement: { up: false, down: false, left: false, right: false },
  aimAngle: 0,
  fire: false,
  reload: false,
  pickup: false,
};

export function runTicks(match, count) {
  for (let i = 0; i < count; i++) match.update(DT);
}

/** Returns a match that is already ACTIVE with the given players. */
export function startMatch(ids = ['a', 'b']) {
  const match = new Match();
  for (const id of ids) match.addPlayer(id);
  runTicks(match, Math.ceil(RULES.COUNTDOWN_SECONDS / DT) + 5);
  assert.equal(match.state, MATCH_STATE.ACTIVE);
  return match;
}