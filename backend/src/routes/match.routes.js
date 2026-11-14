import { Router } from 'express';

import * as controller from '../controllers/match.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

export const matchRouter = Router();

matchRouter.get('/history', authenticate, controller.getHistory);
