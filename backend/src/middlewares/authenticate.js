import { tokens } from '../auth/index.js';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, _res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  const user = scheme === 'Bearer' && token ? tokens.verify(token) : null;

  if (!user) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));

  req.user = user; // { id, username }, taken from the signed token, never from the request body
  next();
}