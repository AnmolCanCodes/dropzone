import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../src/auth/password.js';
import { createTokenService } from '../src/auth/tokens.js';

const SECRET = 'a'.repeat(48);
const user = { id: 'user-1', username: 'anmol' };

test('correct password verifies', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('correct horse battery', hash), true);
});

test('wrong password is rejected', async () => {
  const hash = await hashPassword('correct horse battery');
  assert.equal(await verifyPassword('wrong password', hash), false);
});

test('same password produces different hashes (random salt)', async () => {
  assert.notEqual(await hashPassword('same'), await hashPassword('same'));
});

test('hash never contains the plain password', async () => {
  assert.ok(!(await hashPassword('hunter2hunter2')).includes('hunter2'));
});

test('malformed stored hash returns false instead of throwing', async () => {
  assert.equal(await verifyPassword('x', 'garbage'), false);
  assert.equal(await verifyPassword('x', ''), false);
});

test('token round-trips', () => {
  const tokens = createTokenService({ secret: SECRET, expiresIn: '1h' });
  assert.deepEqual(tokens.verify(tokens.sign(user)), user);
});

test('token signed with another secret is rejected', () => {
  const a = createTokenService({ secret: SECRET, expiresIn: '1h' });
  const b = createTokenService({ secret: 'b'.repeat(48), expiresIn: '1h' });
  assert.equal(b.verify(a.sign(user)), null);
});

test('expired token is rejected', () => {
  const tokens = createTokenService({ secret: SECRET, expiresIn: -10 });
  assert.equal(tokens.verify(tokens.sign(user)), null);
});

test('unsigned (alg: none) token is rejected', () => {
  const tokens = createTokenService({ secret: SECRET, expiresIn: '1h' });
  const forged = jwt.sign({ username: 'admin' }, '', { algorithm: 'none', subject: 'admin-id' });
  assert.equal(tokens.verify(forged), null);
});

test('garbage input is rejected', () => {
  const tokens = createTokenService({ secret: SECRET, expiresIn: '1h' });
  assert.equal(tokens.verify('not-a-token'), null);
  assert.equal(tokens.verify(undefined), null);
});

test('short secrets are refused at startup', () => {
  assert.throws(() => createTokenService({ secret: 'short', expiresIn: '1h' }));
});