import { CLIENT_EVENTS, SERVER_EVENTS } from '@dropzone/shared/events';
import { GAME_CONFIG } from '@dropzone/shared/constants';

const { WORLD_WIDTH, WORLD_HEIGHT } = GAME_CONFIG;

// Temporary in-memory state. In Milestone 3 this moves into backend/src/game/.
const players = new Map();

function randomSpawn() {
  const margin = 200;
  return {
    x: margin + Math.random() * (WORLD_WIDTH - margin * 2),
    y: margin + Math.random() * (WORLD_HEIGHT - margin * 2),
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseMove(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const { x, y, aimAngle } = payload;
  if (![x, y, aimAngle].every(Number.isFinite)) return null;
  return {
    x: clamp(x, 0, WORLD_WIDTH),
    y: clamp(y, 0, WORLD_HEIGHT),
    aimAngle,
  };
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const player = { id: socket.id, ...randomSpawn(), aimAngle: 0 };
    players.set(socket.id, player);
    console.log(`Player joined: ${socket.id} (${players.size} online)`);

    socket.emit(SERVER_EVENTS.WORLD_STATE, {
      selfId: socket.id,
      players: [...players.values()],
    });
    socket.broadcast.emit(SERVER_EVENTS.PLAYER_JOINED, player);

    socket.on(CLIENT_EVENTS.PLAYER_MOVE, (payload) => {
      const move = parseMove(payload);
      if (!move) return; // ignore invalid payloads

      Object.assign(player, move);
      socket.broadcast.emit(SERVER_EVENTS.PLAYER_MOVED, { id: socket.id, ...move });
    });

    socket.on('disconnect', () => {
      players.delete(socket.id);
      io.emit(SERVER_EVENTS.PLAYER_LEFT, { id: socket.id });
      console.log(`Player left: ${socket.id} (${players.size} online)`);
    });
  });
}