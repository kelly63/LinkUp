import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Trash2, X, Calendar, Clock } from 'lucide-react';
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

// Today's date in YYYY-MM-DD for the date input min value
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function ExpiredSessionsModal() {
  const { token } = useAuth();
  const [expired, setExpired] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Repost date-picker state
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [dateType, setDateType] = useState<'specific' | 'flexible'>('specific');
  const [specificDate, setSpecificDate] = useState('');

  useEffect(() => {
    if (!token) return;
    sessionsApi.getExpired(token).then(({ sessions }) => setExpired(sessions)).catch(() => {});
  }, [token]);

  if (!token || expired.length === 0 || dismissed) return null;

  const openDatePicker = (sessionId: string) => {
    setRepostingId(sessionId);
    setDateType('specific');
    setSpecificDate('');
  };

  const cancelDatePicker = () => {
    setRepostingId(null);
    setSpecificDate('');
  };

  const confirmRepost = async (session: any) => {
    if (!token) return;
    if (dateType === 'specific' && !specificDate) {
      toast.error('Please select a date');
      return;
    }
    setActing(session._id);
    try {
      await sessionsApi.cancel(token, session._id);
      const isFlexible = dateType === 'flexible';
      await sessionsApi.create(token, {
        sport: session.sport,
        posterRole: session.posterRole,
        partnerRole: session.partnerRole,
        title: session.title,
        date: isFlexible ? 'Flexible' : specificDate,
        time: session.time,
        duration: session.duration,
        location: session.location,
        goals: session.goals,
        notes: session.notes,
        skillLevelRequired: session.skillLevelRequired,
        sessionType: session.sessionType,
        ...(isFlexible ? {
          dateWindowStart: new Date().toISOString(),
          dateWindowEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        } : {}),
      });
      toast.success('Session reposted');
      setExpired(prev => prev.filter(s => s._id !== session._id));
      setRepostingId(null);
      setSpecificDate('');
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

              {/* Inline date picker when reposting this session */}
              {repostingId === session._id ? (
                <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-3">
                  <p className="text-xs font-medium text-slate-700">Select a new date:</p>

                  {/* Date type toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDateType('specific')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        dateType === 'specific'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Specific Date
                    </button>
                    <button
                      onClick={() => setDateType('flexible')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        dateType === 'flexible'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Flexible
                    </button>
                  </div>

                  {/* Date input for specific */}
                  {dateType === 'specific' && (
                    <input
                      type="date"
                      min={todayStr()}
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-900 focus:border-emerald-500 focus:outline-none bg-white"
                    />
                  )}

                  {dateType === 'flexible' && (
                    <p className="text-xs text-slate-500">Will repost with a 2-week open window starting today.</p>
                  )}

                  {/* Confirm / Cancel */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={cancelDatePicker}
                      className="flex-1 py-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmRepost(session)}
                      disabled={acting === session._id || (dateType === 'specific' && !specificDate)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {acting === session._id ? 'Reposting…' : 'Confirm Repost'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openDatePicker(session._id)}
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
              )}
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
