import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi } from '../lib/api';
import { toast } from 'sonner';

function formatDateWindow(session: any): string {
  if (session.dateWindowStart && session.dateWindowEnd) {
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(session.dateWindowStart)} – ${fmt(session.dateWindowEnd)}`;
  }
  return session.date || 'Flexible';
}

export function ExpiredSessionsModal() {
  const { token } = useAuth();
  const [expired, setExpired] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    sessionsApi.getExpired(token).then(({ sessions }) => setExpired(sessions)).catch(() => {});
  }, [token]);

  if (!token || expired.length === 0 || dismissed) return null;

  const handleRepost = async (session: any) => {
    if (!token) return;
    setActing(session._id);
    try {
      // Cancel the old session then create a new one with the same details
      await sessionsApi.cancel(token, session._id);
      await sessionsApi.create(token, {
        sport: session.sport,
        posterRole: session.posterRole,
        partnerRole: session.partnerRole,
        title: session.title,
        date: 'Flexible',
        time: session.time,
        duration: session.duration,
        location: session.location,
        goals: session.goals,
        notes: session.notes,
        skillLevelRequired: session.skillLevelRequired,
        sessionType: session.sessionType,
        // New window: today through 2 weeks from now
        dateWindowStart: new Date().toISOString(),
        dateWindowEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast.success('Session reposted with a new two-week window');
      setExpired(prev => prev.filter(s => s._id !== session._id));
    } catch (err: any) {
      toast.error(err?.message || 'Could not repost session');
    } finally {
      setActing(null);
    }
  };

  const handleRemove = async (session: any) => {
    if (!token) return;
    setActing(session._id);
    try {
      await sessionsApi.cancel(token, session._id);
      toast.success('Session removed');
      setExpired(prev => prev.filter(s => s._id !== session._id));
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove session');
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Expired Sessions</h3>
              <p className="text-xs text-slate-500">These sessions have passed their date</p>
            </div>
          </div>
          <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Session list */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {expired.map(session => (
            <div key={session._id} className="px-6 py-4">
              <p className="font-medium text-slate-900 text-sm">{session.title || session.sport}</p>
              <p className="text-xs text-slate-500 mt-0.5">{formatDateWindow(session)} · {session.location || 'No location'}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleRepost(session)}
                  disabled={acting === session._id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Repost
                </button>
                <button
                  onClick={() => handleRemove(session)}
                  disabled={acting === session._id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={() => setDismissed(true)} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors">
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
