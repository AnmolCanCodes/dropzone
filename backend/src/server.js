import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { registerSocketHandlers } from './sockets/index.js';

const server = createServer(app);
const io = new Server(server);
registerSocketHandlers(io);

server.listen(env.PORT, env.HOST, () => {
  console.log(`DropZone API listening at http://${env.HOST}:${env.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);

  // io.close() also closes the underlying HTTP server
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