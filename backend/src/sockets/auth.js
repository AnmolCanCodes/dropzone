import { tokens } from '../auth/index.js';

/** Runs once per connection. No valid token means no connection. */
export function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  const user = typeof token === 'string' && token ? tokens.verify(token) : null;

  if (!user) {
    const error = new Error('UNAUTHENTICATED');
    error.data = { code: 'UNAUTHENTICATED' };
    return next(error);
  }

  socket.user = user; // { id, username } from the signed token
  next();
}