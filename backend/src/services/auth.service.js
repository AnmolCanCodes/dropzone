import { prisma } from '../db/prisma.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { tokens } from '../auth/index.js';
import { AppError } from '../utils/AppError.js';

// Used when the email doesn't exist, so "unknown email" and "wrong password" take the same time
const dummyHash = hashPassword('dropzone-dummy-password');

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  createdAt: user.createdAt,
}); // never include passwordHash

export async function register({ username, email, password }) {
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { username, email, passwordHash, stats: { create: {} } },
    });
    return { token: tokens.sign(user), user: publicUser(user) };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'That username or email is already registered.');
    }
    throw error;
  }
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));

  if (!user || !passwordOk) {
    // Same message either way, so attackers can't discover which emails are registered
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }
  return { token: tokens.sign(user), user: publicUser(user) };
}

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { stats: true } });
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Account no longer exists.');

  return {
    ...publicUser(user),
    stats: {
      matchesPlayed: user.stats?.matchesPlayed ?? 0,
      wins: user.stats?.wins ?? 0,
      kills: user.stats?.kills ?? 0,
    },
  };
}