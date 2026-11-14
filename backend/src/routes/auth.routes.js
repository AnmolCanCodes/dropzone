import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authLimiter } from '../middlewares/rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, controller.register);
authRouter.post('/login', authLimiter, controller.login);
authRouter.get('/me', authenticate, controller.me);