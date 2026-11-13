import { io } from 'socket.io-client';

export function createSocket() {
  return io({ transports: ['websocket'] }); // same origin, goes through the Vite proxy
}