import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { tokens } from '../src/auth/index.js';
import { socketAuth } from '../src/sockets/auth.js';

const user = { id: 'user-1', username: 'anmol' };

function fakeSocket({ auth = {}, headers = {}, query = {} } = {}) {
  return { handshake: { auth, headers, query } };
}

/** Runs the middleware and returns what it passed to next(). */
function runAuth(socket) {
  let outcome = null;
  socketAuth(socket, (error) => {
    outcome = { error };
  });
  return outcome;
}

test('a valid token connects as the real account', () => {
  const socket = fakeSocket({ auth: { token: tokens.sign(user) } });
  const { error } = runAuth(socket);

  assert.equal(error, undefined);
  assert.deepEqual(socket.user, user);
});

test('no token is rejected (no anonymous play)', () => {
  const socket = fakeSocket();
  const { error } = runAuth(socket);

  assert.equal(error.message, 'UNAUTHENTICATED');
  assert.equal(socket.user, undefined);
});

test('a garbage token is rejected', () => {
  const socket = fakeSocket({ auth: { token: 'not-a-real-token' } });
  const { error } = runAuth(socket);

  assert.equal(error.message, 'UNAUTHENTICATED');
  assert.equal(socket.user, undefined);
});

test('a token signed with the wrong secret is rejected', () => {
  const forged = jwt.sign({ username: 'admin' }, 'z'.repeat(48), { subject: 'admin-id' });
  const socket = fakeSocket({ auth: { token: forged } });
  const { error } = runAuth(socket);

  assert.equal(error.message, 'UNAUTHENTICATED');
});

test('tokens in the URL query or Authorization header are ignored', () => {
  const token = tokens.sign(user);

  const viaQuery = fakeSocket({ query: { token } });
  assert.equal(runAuth(viaQuery).error.message, 'UNAUTHENTICATED');

  const viaHeader = fakeSocket({ headers: { authorization: `Bearer ${token}` } });
  assert.equal(runAuth(viaHeader).error.message, 'UNAUTHENTICATED');
});

test('rejection carries a machine-readable code for the client', () => {
  const { error } = runAuth(fakeSocket());
  assert.deepEqual(error.data, { code: 'UNAUTHENTICATED' });
});