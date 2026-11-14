import { io } from 'socket.io-client';

export function createSocket() {
  const token = localStorage.getItem('dropzone_token');

  return io({
    transports: ['websocket'],
    auth: token ? { token: `Bearer ${token}` } : undefined,
  });
}