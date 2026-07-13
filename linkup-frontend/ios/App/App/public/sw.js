// LinkUp Push Notification Service Worker

const NOTIFICATION_TITLES = {
  roster_request: 'New Connection Request',
  roster_accepted: 'Connection Accepted',
  session_accepted: 'Session Accepted',
  message_new: 'New Message',
};

function getNotificationBody(type, data) {
  switch (type) {
    case 'roster_request':
      return `${data.requesterName || 'Someone'} wants to connect with you`;
    case 'roster_accepted':
      return `${data.accepterName || 'Someone'} accepted your connection request`;
    case 'session_accepted':
      return data.sessionTitle
        ? `Your session "${data.sessionTitle}" has a new partner`
        : 'Someone accepted your session';
    case 'message_new':
      return data.senderName
        ? `New message from ${data.senderName}`
        : 'You have a new message';
    default:
      return 'You have a new notification';
  }
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { type: 'generic', data: {} };
  }

  const { type, data = {} } = payload;
  const title = NOTIFICATION_TITLES[type] || 'LinkUp';
  const body = getNotificationBody(type, data);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: type, // collapse same-type notifications
      renotify: true,
      data: { url: '/', type, ...data },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow(event.notification.data?.url || '/');
      })
  );
});
