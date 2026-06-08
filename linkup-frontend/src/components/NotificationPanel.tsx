import { useEffect, useState, useCallback } from 'react';
import { X, Bell, UserPlus, UserCheck, CalendarCheck, MessageSquare, CheckCheck, Star, CalendarClock, CalendarX, ThumbsUp, ThumbsDown, UserSearch, MapPin } from 'lucide-react';
import { notifications as notificationsApi, StoredNotification } from '../lib/api';

interface NotificationPanelProps {
  token: string;
  open: boolean;
  onClose: () => void;
  liveQueue: StoredNotification[];
  onAllRead: () => void;
  onNavigate?: (type: string, data: any) => void;
  panelTop?: string;
}

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  roster_request: {
    label: 'Connection Request',
    Icon: UserPlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
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
  message_request: {
    label: 'Message Request',
    Icon: MessageSquare,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  rating_new: {
    label: 'New Rating',
    Icon: Star,
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
  },
  session_updated: {
    label: 'Session Updated',
    Icon: CalendarClock,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  change_proposed: {
    label: 'Review Changes',
    Icon: CalendarClock,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  session_cancelled: {
    label: 'Session Cancelled',
    Icon: CalendarX,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  change_approved: {
    label: 'Change Approved',
    Icon: ThumbsUp,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  change_declined: {
    label: 'Change Declined',
    Icon: ThumbsDown,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  session_inquiry: {
    label: 'Session Inquiry',
    Icon: UserSearch,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  partner_approved: {
    label: 'Request Approved',
    Icon: ThumbsUp,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  partner_declined: {
    label: 'Request Declined',
    Icon: ThumbsDown,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  session_nearby: {
    label: 'Session Near You',
    Icon: MapPin,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
};

function notificationBody(n: StoredNotification): string {
  const d = n.data || {};
  switch (n.type) {
    case 'roster_request':
      return `${d.from?.name || 'Someone'} wants to add you to their roster`;
    case 'roster_accepted':
      return `${d.by?.name || 'Someone'} accepted your roster request`;
    case 'session_accepted':
      return d.sessionTitle
        ? `"${d.sessionTitle}" has a new partner`
        : 'Someone accepted your session';
    case 'message_new':
      return d.senderName ? `New message from ${d.senderName}` : 'You have a new message';
    case 'message_request':
      return `${d.from?.name || 'Someone'} sent you a message request`;
    case 'rating_new':
      return d.from?.name
        ? `${d.from.name} gave you a ${d.overallRating}★ rating`
        : 'You received a new rating';
    case 'session_updated':
      return d.updatedBy?.name
        ? `${d.updatedBy.name} updated "${d.sessionTitle || 'your session'}" — ${(d.changedFields || []).join(', ')} changed`
        : 'A session you joined was updated';
    case 'change_proposed':
      return d.proposedBy?.name
        ? `${d.proposedBy.name} proposed changes to "${d.sessionTitle || 'your session'}" — tap to review`
        : 'Your session partner proposed schedule changes';
    case 'session_cancelled':
      return d.cancelledBy?.name
        ? `${d.cancelledBy.name} cancelled "${d.sessionTitle || 'your session'}"`
        : 'A session was cancelled';
    case 'change_approved':
      return d.approvedBy?.name
        ? `${d.approvedBy.name} approved your proposed changes to "${d.sessionTitle || 'your session'}"`
        : 'Your proposed session changes were approved';
    case 'change_declined':
      return d.declinedBy?.name
        ? `${d.declinedBy.name} declined your proposed changes to "${d.sessionTitle || 'your session'}"`
        : 'Your proposed session changes were declined';
    case 'session_inquiry':
      return d.requester?.name
        ? `${d.requester.name} requested to join "${d.sessionTitle || 'your session'}"`
        : 'Someone requested to join your session';
    case 'partner_approved':
      return d.approvedBy?.name
        ? `${d.approvedBy.name} approved your request to join "${d.sessionTitle || 'their session'}"`
        : 'Your join request was approved — session confirmed!';
    case 'partner_declined':
      return d.declinedBy?.name
        ? `${d.declinedBy.name} declined your request to join "${d.sessionTitle || 'their session'}"`
        : 'Your join request was declined';
    case 'session_nearby':
      return d.postedBy?.name
        ? `${d.postedBy.name} posted a ${d.sport || 'training'} session near you`
        : `A ${d.sport || 'training'} session was just posted near you`;
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

export function NotificationPanel({ token, open, onClose, liveQueue, onAllRead, onNavigate, panelTop }: NotificationPanelProps) {
  const [items, setItems] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    notificationsApi
      .getAll(token)
      .then(({ notifications }) => setItems(notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, token]);

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

  const handleClick = useCallback(
    (n: StoredNotification) => {
      if (!n.read && n._id) handleMarkRead(n._id);
      if (onNavigate) {
        onNavigate(n.type, n.data);
        onClose();
      }
    },
    [handleMarkRead, onNavigate, onClose]
  );

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <div
        style={open ? { top: panelTop ?? '100px' } : { display: 'none' }}
        className="absolute left-0 right-0 z-40 bg-white rounded-b-2xl shadow-2xl flex flex-col max-h-[70%] overflow-y-auto"
      >
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
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

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
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-slate-50
                    text-left transition-colors hover:bg-slate-50
                    ${!n.read ? 'bg-emerald-50/40' : 'bg-white'}`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {notificationBody(n)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
          <button
            onClick={onClose}
            className="w-full py-4 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
