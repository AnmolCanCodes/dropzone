import { z } from 'zod';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';

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
});

export function registerSocketHandlers(io, match) {
  io.on('connection', (socket) => {
    match.addPlayer(socket.id);
    socket.emit(SERVER_EVENTS.WELCOME, { selfId: socket.id });
    console.log(`Player joined: ${socket.id} (${match.players.size} online)`);

    let windowStart = Date.now();
    let inputsInWindow = 0;

    socket.on(CLIENT_EVENTS.PLAYER_INPUT, (payload) => {
      // Rate limit: drop anything above the allowed rate
      const now = Date.now();
      if (now - windowStart >= 1000) {
        windowStart = now;
        inputsInWindow = 0;
      }
      if (++inputsInWindow > MAX_INPUTS_PER_SECOND) return;

      // Validate shape; unknown fields are stripped by Zod
      const parsed = inputSchema.safeParse(payload);
      if (!parsed.success) return;

      match.setInput(socket.id, parsed.data);
    });

    socket.on('disconnect', () => {
      match.removePlayer(socket.id);
      console.log(`Player left: ${socket.id} (${match.players.size} online)`);
    });
  });
}