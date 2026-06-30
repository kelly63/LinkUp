import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(API_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    // No reconnectionAttempts cap — on mobile, backgrounding the app can pause
    // JS for longer than 5 quick retries would cover. Keep retrying forever
    // (with backoff) so notifications resume once connectivity returns.
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getActiveSocket(): Socket | null {
  return socket;
}

export function reconnectSocket() {
  if (socket && !socket.connected) {
    socket.connect();
  }
}
