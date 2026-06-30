import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(token: string): Socket {
  // Reuse the existing socket as long as it's for the same user, regardless
  // of its current connected/reconnecting state — socket.io already retries
  // drops on its own. Tearing it down here just because it's mid-handshake
  // or mid-backoff (e.g. a second caller invoking getSocket() before the
  // first connection settles) destroys in-flight connections and any
  // listeners already attached to them.
  if (socket && socketToken === token) return socket;
  if (socket) socket.disconnect();

  socketToken = token;
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
  socketToken = null;
}

export function getActiveSocket(): Socket | null {
  return socket;
}

export function reconnectSocket() {
  if (socket && !socket.connected) {
    socket.connect();
  }
}
