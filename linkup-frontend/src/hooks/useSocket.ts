import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '../lib/socket';

export interface Notification {
  type:
    | 'roster_request'
    | 'roster_accepted'
    | 'session_accepted'
    | 'message_new';
  data: any;
  createdAt: string;
}

interface UseSocketOptions {
  token: string | null;
  onNotification?: (notification: Notification) => void;
  onPresenceChange?: (userId: string, isOnline: boolean) => void;
}

export function useSocket({ token, onNotification, onPresenceChange }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = getSocket(token);
    socketRef.current = s;

    s.on('connect', () => {});

    s.on('connect_error', (err) => {
      console.error('[socket] connection error', err.message);
    });

    if (onNotification) {
      s.on('notification', onNotification);
    }

    if (onPresenceChange) {
      s.on('user:presence', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
        onPresenceChange(userId, isOnline);
      });
    }

    return () => {
      if (onNotification) s.off('notification', onNotification);
      if (onPresenceChange) s.off('user:presence');
    };
  }, [token]);

  const queryPresence = useCallback((userIds: string[]): Promise<Record<string, boolean>> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({});
      socketRef.current.emit('presence:query', { userIds }, resolve);
    });
  }, []);

  return { socket: socketRef.current, queryPresence };
}
