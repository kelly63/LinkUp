import { useState, useEffect } from 'react';
import { X, ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { reports as reportsApi, SessionWithReport, avatarThumb } from '../lib/api';
import { useAuth } from '../lib/auth';
import { SessionReportView } from './SessionReportView';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  if (!d || d === 'Flexible') return 'Flexible';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface MySessionsViewProps {
  onClose: () => void;
}

export function MySessionsView({ onClose }: MySessionsViewProps) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<SessionWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [writingReport, setWritingReport] = useState<SessionWithReport | null>(null);

  const load = () => {
    if (!token) return;
    setLoading(true);
    reportsApi.getMySessions(token)
      .then(r => setSessions(r.sessions))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  if (writingReport) {
    return (
      <SessionReportView
        session={writingReport}
        onClose={() => setWritingReport(null)}
        onSaved={() => { setWritingReport(null); load(); }}
      />
    );
  }

  const pending = sessions.filter(s => s.status === 'completed' && !s.hasReport);
  const completed = sessions.filter(s => s.hasReport);
  const upcoming = sessions.filter(s => s.status === 'confirmed');

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div>
          <h2 className="text-white font-bold text-xl">My Sessions</h2>
          <p className="text-emerald-300 text-sm">Completed sessions and reports</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-200">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No sessions yet</p>
            <p className="text-slate-400 text-sm mt-1">Your completed and upcoming sessions will appear here</p>
          </div>
        ) : (
          <>
            {/* Pending reports */}
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <p className="font-bold text-slate-900 text-sm">Report Needed ({pending.length})</p>
                </div>
                <div className="space-y-2">
                  {pending.map(s => (
                    <SessionCard key={s._id} session={s} onWriteReport={() => setWritingReport(s)} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming confirmed */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <p className="font-bold text-slate-900 text-sm">Upcoming ({upcoming.length})</p>
                </div>
                <div className="space-y-2">
                  {upcoming.map(s => (
                    <SessionCard key={s._id} session={s} onWriteReport={() => setWritingReport(s)} />
                  ))}
                </div>
              </div>
            )}

            {/* Reported sessions */}
            {completed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="font-bold text-slate-900 text-sm">Reports Written ({completed.length})</p>
                </div>
                <div className="space-y-2">
                  {completed.map(s => (
                    <SessionCard key={s._id} session={s} onWriteReport={() => setWritingReport(s)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onWriteReport }: { session: SessionWithReport; onWriteReport: () => void }) {
  const label = session.title || session.sport;
  const partner = session.partner;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
            {session.hasReport && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Report Written</span>
            )}
            {session.status === 'confirmed' && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Confirmed</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{formatDate(session.date)}</p>
          {partner && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white text-[8px] font-bold overflow-hidden flex-shrink-0">
                {partner.avatar
                  ? <img src={avatarThumb(partner.avatar, 40)!} alt={partner.name} className="w-full h-full object-cover" />
                  : getInitials(partner.name)}
              </div>
              <p className="text-xs text-slate-500">{partner.name}</p>
            </div>
          )}
        </div>
        <button
          onClick={onWriteReport}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex-shrink-0 transition-colors ${
            session.hasReport
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {session.hasReport ? 'Edit Report' : 'Write Report'}
        </button>
      </div>
    </div>
  );
}
