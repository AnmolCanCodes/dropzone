import { loginSchema, registerSchema } from '../auth/schemas.js';
import * as authService from '../services/auth.service.js';
import { parseOrThrow } from '../utils/validate.js';

// Express 5 forwards errors from async handlers to your error middleware automatically
export async function register(req, res) {
  const input = parseOrThrow(registerSchema, req.body);
  res.status(201).json(await authService.register(input));
}

export async function login(req, res) {
  const input = parseOrThrow(loginSchema, req.body);
  res.json(await authService.login(input));
}

export async function me(req, res) {
  res.json({ user: await authService.getProfile(req.user.id) });
}