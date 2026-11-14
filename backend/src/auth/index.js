import { env } from '../config/env.js';
import { createTokenService } from './tokens.js';

export const tokens = createTokenService({
  secret: env.JWT_ACCESS_SECRET,
  expiresIn: env.JWT_ACCESS_EXPIRES_IN,
});