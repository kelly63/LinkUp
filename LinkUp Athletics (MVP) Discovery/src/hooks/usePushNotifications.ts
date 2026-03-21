import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  currentPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications';

export function usePushNotifications(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (isPushSupported() ? currentPermission() : 'denied')
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-subscribe when permission is already granted (e.g. returning user)
  useEffect(() => {
    if (!token || permission !== 'granted' || subscribed) return;
    subscribeToPush(token)
      .then((ok) => setSubscribed(ok))
      .catch(() => {});
  }, [token, permission]);

  const enable = useCallback(async () => {
    if (!isPushSupported() || !token) return;
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        const ok = await subscribeToPush(token);
        setSubscribed(ok);
      }
    } catch (err) {
      console.error('[push] enable error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const disable = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      await unsubscribeFromPush(token);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return {
    supported: isPushSupported(),
    permission,
    subscribed,
    loading,
    enable,
    disable,
  };
}
