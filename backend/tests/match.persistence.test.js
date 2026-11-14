import test from 'node:test';
import assert from 'node:assert/strict';

import { register, getProfile } from '../src/services/auth.service.js';
import { saveMatchResult, getMatchHistory } from '../src/services/match.service.js';

test('register, record a match result, and return match history and stats', async () => {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const username = `player_${suffix}`;
  const email = `${username}@example.com`;

  const user = await register({
    username,
    email,
    password: 'supersecret123',
  });

  const record = await saveMatchResult({
    winnerUserId: user.user.id,
    startedAt: new Date('2026-01-01T00:00:00Z'),
    endedAt: new Date('2026-01-01T00:02:00Z'),
    participants: [
      {
        userId: user.user.id,
        placement: 1,
        kills: 5,
        survivedSeconds: 120,
      },
    ],
  });

  assert.ok(record.matchId);

  const history = await getMatchHistory(user.user.id, { page: 1, limit: 10 });
  assert.equal(history.items.length, 1);
  assert.equal(history.items[0].placement, 1);
  assert.equal(history.items[0].kills, 5);
  assert.equal(history.total, 1);

  const profile = await getProfile(user.user.id);
  assert.equal(profile.stats.matchesPlayed, 1);
  assert.equal(profile.stats.wins, 1);
  assert.equal(profile.stats.kills, 5);
});
