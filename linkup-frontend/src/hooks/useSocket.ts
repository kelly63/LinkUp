import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { getSocket, reconnectSocket } from '../lib/socket';

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
  // Fired on every successful connect, including reconnects after a dropped
  // connection — use this to reconcile any state (e.g. unread counts) that
  // may have missed real-time events while disconnected.
  onConnect?: () => void;
}

export function useSocket({ token, onNotification, onPresenceChange, onConnect }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = getSocket(token);
    socketRef.current = s;

    if (onConnect) {
      s.on('connect', onConnect);
      if (s.connected) onConnect();
    }

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
      if (onConnect) s.off('connect', onConnect);
      if (onNotification) s.off('notification', onNotification);
      if (onPresenceChange) s.off('user:presence');
    };
  }, [token]);

  // iOS suspends the WebView's network activity while backgrounded, which can
  // leave the socket disconnected (or mid-backoff) when the app returns to the
  // foreground. Force an immediate reconnect attempt on resume instead of
  // waiting for the next backoff tick.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) reconnectSocket();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  const queryPresence = useCallback((userIds: string[]): Promise<Record<string, boolean>> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({});
      socketRef.current.emit('presence:query', { userIds }, resolve);
    });
  }, []);

  return { socket: socketRef.current, queryPresence };
}
