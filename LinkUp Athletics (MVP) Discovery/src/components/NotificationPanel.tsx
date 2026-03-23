import { useEffect, useState, useCallback } from 'react';
import { X, Bell, UserPlus, UserCheck, CalendarCheck, MessageSquare, CheckCheck } from 'lucide-react';
import { notifications as notificationsApi, StoredNotification } from '../lib/api';

interface NotificationPanelProps {
  token: string;
  open: boolean;
  onClose: () => void;
  /** Live notifications pushed via socket since the panel last opened */
  liveQueue: StoredNotification[];
  onAllRead: () => void;
}

const TYPE_META: Record<
  StoredNotification['type'],
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  roster_request: {
    label: 'Connection Request',
    Icon: UserPlus,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  roster_accepted: {
    label: 'Connection Accepted',
    Icon: UserCheck,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  session_accepted: {
    label: 'Session Accepted',
    Icon: CalendarCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  message_new: {
    label: 'New Message',
    Icon: MessageSquare,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
};

function notificationBody(n: StoredNotification): string {
  const d = n.data || {};
  switch (n.type) {
    case 'roster_request':
      return `${d.requesterName || 'Someone'} wants to connect with you`;
    case 'roster_accepted':
      return `${d.accepterName || 'Someone'} accepted your connection request`;
    case 'session_accepted':
      return d.sessionTitle
        ? `"${d.sessionTitle}" has a new partner`
        : 'Someone accepted your session';
    case 'message_new':
      return d.senderName ? `Message from ${d.senderName}` : 'You have a new message';
    default:
      return 'New notification';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationPanel({ token, open, onClose, liveQueue, onAllRead }: NotificationPanelProps) {
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch persisted notifications when panel opens
  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    notificationsApi
      .getAll(token)
      .then(({ notifications }) => setItems(notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, token]);

  // Prepend any live socket notifications that arrived while panel was open
  useEffect(() => {
    if (!liveQueue.length) return;
    setItems((prev) => {
      const existingIds = new Set(prev.map((n) => n._id));
      const fresh = liveQueue.filter((n) => n._id && !existingIds.has(n._id));
      return fresh.length ? [...fresh, ...prev] : prev;
    });
  }, [liveQueue]);

  const handleMarkAllRead = useCallback(async () => {
    await notificationsApi.markAllRead(token).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onAllRead();
  }, [token, onAllRead]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      await notificationsApi.markRead(token, id).catch(() => {});
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    },
    [token]
  );

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      {/* Panel — slides down from the header */}
      <div
        style={open ? undefined : { display: 'none' }}
        className="absolute top-[88px] left-0 right-0 z-40 bg-white rounded-b-2xl shadow-2xl flex flex-col max-h-[70%] overflow-y-auto"
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-sm text-slate-800">Notifications</span>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            items.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.message_new;
              const { Icon, color, bg } = meta;
              return (
                <button
                  key={n._id}
                  onClick={() => !n.read && n._id && handleMarkRead(n._id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-slate-50
                    text-left transition-colors hover:bg-slate-50
                    ${!n.read ? 'bg-blue-50/40' : 'bg-white'}`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {notificationBody(n)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
