import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';

function normalizeMatchPayload(payload) {
  const participants = payload.participants ?? [];

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new AppError(400, 'INVALID_MATCH_RESULT', 'At least one participant is required.');
  }

  const seen = new Set();
  const normalized = participants.map((participant) => {
    const userId = participant.userId;
    if (!userId || typeof userId !== 'string') {
      throw new AppError(400, 'INVALID_MATCH_RESULT', 'Each participant must include a userId.');
    }

    if (seen.has(userId)) {
      throw new AppError(400, 'INVALID_MATCH_RESULT', 'Each user can appear once per match.');
    }
    seen.add(userId);

    const placement = Number(participant.placement ?? 0);
    const kills = Number(participant.kills ?? 0);
    const survivedSeconds = Number(participant.survivedSeconds ?? 0);

    if (!Number.isInteger(placement) || placement < 1) {
      throw new AppError(400, 'INVALID_MATCH_RESULT', 'Participant placement must be a positive integer.');
    }

    if (!Number.isInteger(kills) || kills < 0) {
      throw new AppError(400, 'INVALID_MATCH_RESULT', 'Kills must be a non-negative integer.');
    }

    if (!Number.isInteger(survivedSeconds) || survivedSeconds < 0) {
      throw new AppError(400, 'INVALID_MATCH_RESULT', 'Survived seconds must be a non-negative integer.');
    }

    return {
      userId,
      placement,
      kills,
      survivedSeconds,
    };
  });

  if (payload.winnerUserId && !normalized.some((participant) => participant.userId === payload.winnerUserId)) {
    throw new AppError(400, 'INVALID_MATCH_RESULT', 'winnerUserId must match one of the participants.');
  }

  return normalized;
}

export async function saveMatchResult({ winnerUserId, startedAt, endedAt, participants }) {
  const normalized = normalizeMatchPayload({ winnerUserId, participants });
  const start = new Date(startedAt);
  const end = new Date(endedAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError(400, 'INVALID_MATCH_RESULT', 'Match start and end times must be valid dates.');
  }

  if (end.getTime() < start.getTime()) {
    throw new AppError(400, 'INVALID_MATCH_RESULT', 'Match end time cannot be earlier than the start time.');
  }

  const durationSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));

  return prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        startedAt: start,
        endedAt: end,
        durationSeconds,
        playerCount: normalized.length,
        winnerUserId: winnerUserId ?? null,
        participants: {
          create: normalized.map((participant) => ({
            userId: participant.userId,
            placement: participant.placement,
            kills: participant.kills,
            survivedSeconds: participant.survivedSeconds,
          })),
        },
      },
    });

    await Promise.all(
      normalized.map(async (participant) => {
        const isWinner = participant.userId === winnerUserId;

        await tx.playerStatistics.upsert({
          where: { userId: participant.userId },
          update: {
            matchesPlayed: { increment: 1 },
            wins: { increment: isWinner ? 1 : 0 },
            kills: { increment: participant.kills },
            updatedAt: new Date(),
          },
          create: {
            userId: participant.userId,
            matchesPlayed: 1,
            wins: isWinner ? 1 : 0,
            kills: participant.kills,
          },
        });
      }),
    );

    return {
      matchId: match.id,
      winnerUserId: winnerUserId ?? null,
      playerCount: normalized.length,
    };
  });
}

export async function getMatchHistory(userId, { page = 1, limit = 10 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const [total, rows] = await Promise.all([
    prisma.matchParticipant.count({ where: { userId } }),
    prisma.matchParticipant.findMany({
      where: { userId },
      include: { match: true },
      orderBy: [{ match: { endedAt: 'desc' } }],
      skip,
      take: safeLimit,
    }),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: rows.map((row) => ({
      matchId: row.matchId,
      userId: row.userId,
      placement: row.placement,
      kills: row.kills,
      survivedSeconds: row.survivedSeconds,
      durationSeconds: row.match.durationSeconds,
      startedAt: row.match.startedAt,
      endedAt: row.match.endedAt,
      winnerUserId: row.match.winnerUserId,
    })),
  };
}
