import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { GAME_CONFIG } from '@dropzone/shared/constants';
import { SERVER_EVENTS } from '@dropzone/shared/events';
import { app } from './app.js';
import { env } from './config/env.js';
import { Match } from './game/engine/Match.js';
import { GameLoop } from './game/engine/GameLoop.js';
import { registerSocketHandlers } from './sockets/index.js';

const server = createServer(app);
const io = new Server(server);

// One global match for now. Matchmaking (Milestone 7) will create matches on demand.
const match = new Match();
registerSocketHandlers(io, match);

let lastLootVersion = -1;

const loop = new GameLoop({
  tickRate: GAME_CONFIG.TICK_RATE,
  onTick: (dt) => {
    match.update(dt);

    if (match.lootVersion !== lastLootVersion) {
      lastLootVersion = match.lootVersion;
      io.emit(SERVER_EVENTS.LOOT_STATE, match.getLoot());
    }

    io.emit(SERVER_EVENTS.SNAPSHOT, match.getSnapshot());
  },
});
loop.start();

server.listen(env.PORT, env.HOST, () => {
  console.log(`DropZone API listening at http://${env.HOST}:${env.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  loop.stop();

  io.close((error) => {
    if (error) {
      console.error('Error while closing server:', error);
      process.exit(1);
    }
    console.log('Server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));