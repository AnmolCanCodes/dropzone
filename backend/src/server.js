import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';

const server = createServer(app);

server.listen(env.PORT, env.HOST, () => {
  console.log(`DropZone API listening at http://${env.HOST}:${env.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);

  server.close((error) => {
    if (error) {
      console.error('Error while closing server:', error);
      process.exit(1);
    }

    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));