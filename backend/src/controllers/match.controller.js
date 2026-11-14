import { z } from 'zod';

import * as matchService from '../services/match.service.js';
import { parseOrThrow } from '../utils/validate.js';

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const matchResultSchema = z.object({
  winnerUserId: z.string().uuid().nullable().optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  participants: z
    .array(
      z.object({
        userId: z.string().uuid(),
        placement: z.number().int().min(1),
        kills: z.number().int().min(0),
        survivedSeconds: z.number().int().min(0),
      }),
    )
    .min(1),
});

export async function getHistory(req, res) {
  const query = parseOrThrow(historyQuerySchema, req.query);
  const history = await matchService.getMatchHistory(req.user.id, query);
  res.json(history);
}

export async function saveMatchResult(req, res) {
  const payload = parseOrThrow(matchResultSchema, req.body);
  const result = await matchService.saveMatchResult(payload);
  res.status(201).json(result);
}
