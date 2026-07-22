import { ChevronLeft, Calendar, MapPin, ChevronRight, Trophy, Clock, AlertCircle, PenLine, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, Session } from '../lib/api';
import { toast } from 'sonner';

function isSessionPast(session: Session): boolean {
  if (!session.date || session.date === 'Flexible') return false;
  if (session.status === 'completed' || session.status === 'cancelled') return false;
  // Parse YYYY-MM-DD in local time (not UTC) to avoid off-by-one on iOS/WebKit
  const [y, m, d] = session.date.split('-').map(Number);
  if (!y || !m || !d) return false;
  let dateTime: Date;
  if (session.time && session.time !== 'Flexible') {
    const [h, min] = session.time.split(':').map(Number);
    dateTime = new Date(y, m - 1, d, h || 0, min || 0);
  } else {
    dateTime = new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  return !isNaN(dateTime.getTime()) && dateTime < new Date();
}

interface MySessionsViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

type Filter = 'upcoming' | 'past';

const PAGE_SIZE = 10;

export function MySessionsView({ onBack, onNavigate }: MySessionsViewProps) {
  const { token, user } = useAuth();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [items, setItems] = useState<Session[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const statusParam = filter === 'upcoming' ? 'open,confirmed' : 'completed,cancelled';

  const fetchPage = async (p: number, replace: boolean) => {
    if (!token) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const data = await sessionsApi.getMine(token, statusParam);
      const all: Session[] = data.sessions || [];
      // Client-side pagination since getMine doesn't accept page yet
      const start = (p - 1) * PAGE_SIZE;
      const slice = all.slice(start, start + PAGE_SIZE);
      setHasMore(start + PAGE_SIZE < all.length);
      setItems((prev) => (replace ? slice : [...prev, ...slice]));
      setPage(p);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load sessions');
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(1, true);
  }, [filter, token]);

  const handleComplete = async (sessionId: string) => {
    if (!token) return;
    setActionLoading(sessionId);
    try {
      await sessionsApi.complete(token, sessionId);
      setItems((prev) => prev.map((s) => s._id === sessionId ? { ...s, status: 'completed' } : s));
      toast.success('Session marked as completed');
    } catch (err: any) {
      toast.error(err?.message || 'Could not complete session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!token) return;
    setActionLoading(sessionId);
    try {
      await sessionsApi.cancel(token, sessionId);
      setItems((prev) => prev.filter((s) => s._id !== sessionId));
      toast.success('Session cancelled');
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel session');
    } finally {
      setActionLoading(null);
      setCancellingId(null);
    }
  };

  const statusBadge = (session: Session) => {
    const map: Record<string, { label: string; cls: string }> = {
      open: { label: 'Open', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
      pending: { label: 'Pending', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
      confirmed: { label: 'Confirmed', cls: 'bg-green-100 text-green-700 border-green-200' },
      completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600 border-red-200' },
    };
    const effectiveStatus = session.status === 'open' && session.pendingPartners?.length ? 'pending' : session.status;
    const cfg = map[effectiveStatus] ?? map.open;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs border ${cfg.cls}`}>{cfg.label}</span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white">My Sessions</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-white/10 rounded-xl p-1 gap-1">
          {(['upcoming', 'past'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                filter === f ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Trophy className="w-10 h-10 opacity-30" />
            <p className="text-sm">No {filter} sessions</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((session) => {
                const firstPending = session.pendingPartners?.[0];
                const isPendingRequester =
                  !!firstPending &&
                  typeof firstPending === 'object' &&
                  (firstPending as any)._id === user?._id;
                const hasPendingRequester =
                  !!firstPending &&
                  typeof firstPending === 'object' &&
                  (firstPending as any)._id !== user?._id;
                const hasPendingChange =
                  !!session.pendingChange &&
                  String(session.pendingChange.proposedBy) !== String(user?._id);

                return (
                <div
                  key={session._id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                    isPendingRequester || hasPendingRequester || hasPendingChange
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-slate-900 text-sm font-medium">
                          {session.title || session.sport}
                        </h4>
                        {statusBadge(session)}
                        {isPendingRequester && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Pending Approval
                          </span>
                        )}
                        {hasPendingRequester && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Approve Request
                          </span>
                        )}
                        {hasPendingChange && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200">
                            <PenLine className="w-2.5 h-2.5" />
                            Review Changes
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{session.posterRole || session.position}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      {session.date}{session.time ? ` at ${session.time}` : ''}
                    </div>
                    {session.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        {session.location}
                      </div>
                    )}
                    {session.duration && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                        {session.duration}
                      </div>
                    )}
                  </div>

                  {/* Past-session actions */}
                  {isSessionPast(session) && (
                    <div className="mb-2 space-y-1.5">
                      <p className="text-[11px] text-slate-500 text-center">This session's time has passed</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          disabled={actionLoading === session._id}
                          onClick={() => handleComplete(session._id)}
                          className="py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {actionLoading === session._id ? 'Saving…' : 'Session Completed'}
                        </button>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => onNavigate && onNavigate('editSession', session)}
                            className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs flex items-center justify-center gap-1 border border-emerald-200 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Reschedule
                          </button>
                          <button
                            disabled={actionLoading === session._id}
                            onClick={() => setCancellingId(session._id)}
                            className="py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 rounded-lg text-xs flex items-center justify-center gap-1 border border-red-200 transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => onNavigate && onNavigate('sessionDetails', session)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs flex items-center justify-center gap-1 border border-slate-200 transition-colors"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {session.status === 'completed' && onNavigate && (
                      <button
                        onClick={() => {
                          const partner = session.partner as any;
                          if (partner) {
                            onNavigate('rating', {
                              _id: partner._id,
                              name: partner.name,
                              avatar: partner.avatar,
                              sport: session.sport,
                              position: partner.position,
                              type: partner.role,
                              date: session.date,
                              location: session.location,
                              duration: session.duration,
                              sessionId: session._id,
                            });
                          }
                        }}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs border border-indigo-200 transition-colors"
                      >
                        Rate
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => fetchPage(page + 1, false)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
        <div className="h-4" />
      </div>

      {/* Cancel confirmation modal */}
      {cancellingId && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-slate-900 font-semibold text-center mb-2">Cancel Session?</h3>
            <p className="text-slate-600 text-sm text-center mb-6">
              This will cancel the session and notify anyone involved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancellingId(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Keep It
              </button>
              <button
                disabled={!!actionLoading}
                onClick={() => handleCancel(cancellingId)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl font-medium transition-colors"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
