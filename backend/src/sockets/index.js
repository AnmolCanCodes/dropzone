import { z } from 'zod';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';
import { socketAuth } from './auth.js';

const MAX_INPUTS_PER_SECOND = 60;

const inputSchema = z.object({
  sequence: z.number().int().nonnegative(),
  movement: z.object({
    up: z.boolean(),
    down: z.boolean(),
    left: z.boolean(),
    right: z.boolean(),
  }),
  aimAngle: z.number().finite(),
  fire: z.boolean(),
  reload: z.boolean(),
  pickup: z.boolean(),
});

export function registerSocketHandlers(io, match) {
  io.use(socketAuth);

  // userId -> socket. At most one live connection per account.
  const sessions = new Map();

  io.on('connection', (socket) => {
    const { id: userId, username } = socket.user;

    // Newest login wins. This also handles a page refresh, where the old socket lingers briefly.
    const previous = sessions.get(userId);
    if (previous) previous.disconnect(true);
    sessions.set(userId, socket);

    match.addPlayer(socket.id, userId, username);
    socket.emit(SERVER_EVENTS.WELCOME, { selfId: socket.id, userId, username });
    socket.emit(SERVER_EVENTS.LOOT_STATE, match.getLoot());
    console.log(`Player joined: ${socket.id} (${match.players.size} online) [user=${username}]`);

    let windowStart = Date.now();
    let inputsInWindow = 0;

    socket.on(CLIENT_EVENTS.PLAYER_INPUT, (payload) => {
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        inputsInWindow = 0;
      }
      if (++inputsInWindow > MAX_INPUTS_PER_SECOND) return;

      const parsed = inputSchema.safeParse(payload);
      if (!parsed.success) return;

      match.setInput(socket.id, parsed.data);
    });

    socket.on('disconnect', () => {
      if (sessions.get(userId) === socket) sessions.delete(userId);
      match.removePlayer(socket.id);
      console.log(`Player left: ${socket.id} (${match.players.size} online)`);
    });
  });
}