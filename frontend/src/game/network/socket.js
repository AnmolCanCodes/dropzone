import { io } from 'socket.io-client';
import { TOKEN_KEY } from '../../services/session';

export function createSocket() {
  const token = window.localStorage.getItem(TOKEN_KEY);

  return io({
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });
}