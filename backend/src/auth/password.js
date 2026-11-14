import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const MAX_MEMORY = 64 * 1024 * 1024;
// One of the equivalent-strength scrypt settings from the OWASP Password Storage
// Cheat Sheet (as I know it; worth checking the current version before production).
const PARAMS = Object.freeze({ N: 32768, r: 8, p: 3 });

/** Returns "scrypt$N$r$p$salt$hash". Never store or log the plain password. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEMORY });
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, keyB64] = stored.split('$');
    if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;

    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    });

    return timingSafeEqual(actual, expected); // constant-time comparison
  } catch {
    return false;
  }
}