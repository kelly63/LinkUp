import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function saveToken(token: string, authToken: string) {
  await fetch(`${API}/api/notifications/device-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ token }),
  });
}

async function removeToken(token: string, authToken: string) {
  await fetch(`${API}/api/notifications/device-token`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ token }),
  });
}

export function useNativePush(authToken: string | null) {
  const isNative = Capacitor.isNativePlatform();
  const [enabled, setEnabled] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isNative || !authToken) return;

    const regListener = PushNotifications.addListener('registration', async (token) => {
      setDeviceToken(token.value);
      setEnabled(true);
      try { await saveToken(token.value, authToken); } catch {}
    });

    const errListener = PushNotifications.addListener('registrationError', (err: any) => {
      setEnabled(false);
      fetch(`${API}/api/notifications/device-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token: `DEBUG:registrationError=${JSON.stringify(err)}` }),
      }).catch(() => {});
    });

    // Check current permission state on mount — set enabled immediately if already granted
    PushNotifications.checkPermissions().then((status) => {
      fetch(`${API}/api/notifications/device-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token: `DEBUG:permission=${status.receive}` }),
      }).catch(() => {});
      if (status.receive === 'granted') {
        setEnabled(true);
        PushNotifications.register();
      }
    });

    return () => {
      regListener.then(l => l.remove());
      errListener.then(l => l.remove());
    };
  }, [isNative, authToken]);

  const enable = useCallback(async () => {
    if (!isNative || !authToken) return;
    setLoading(true);
    try {
      const status = await PushNotifications.requestPermissions();
      if (status.receive === 'granted') {
        setEnabled(true);
        await PushNotifications.register();
      }
    } finally {
      setLoading(false);
    }
  }, [isNative, authToken]);

  const disable = useCallback(async () => {
    if (!authToken || !deviceToken) return;
    setLoading(true);
    try {
      await removeToken(deviceToken, authToken);
      setEnabled(false);
      setDeviceToken(null);
    } finally {
      setLoading(false);
    }
  }, [authToken, deviceToken]);

  return { enabled, loading, enable, disable };
}
