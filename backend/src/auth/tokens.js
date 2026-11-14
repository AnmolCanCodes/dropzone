import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';

/** A factory instead of a global, so tests can build one without a real .env. */
export function createTokenService({ secret, expiresIn }) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters');
  }

  return {
    sign(user) {
      return jwt.sign({ username: user.username }, secret, {
        algorithm: ALGORITHM,
        subject: user.id,
        expiresIn,
      });
    },

    /** Returns { id, username } or null. Never throws on bad tokens. */
    verify(token) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] }); // pin the algorithm
        return { id: payload.sub, username: payload.username };
      } catch {
        return null;
      }
    },
  };
}