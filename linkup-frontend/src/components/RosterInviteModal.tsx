import { useState, useEffect } from 'react';
import { X, Search, UserCheck, Loader } from 'lucide-react';
import { connections as connectionsApi, sessions as sessionsApi, User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { avatarThumb } from '../lib/api';
import { toast } from 'sonner';

interface Props {
  sessionId: string;
  alreadyInvited: string[]; // user IDs already in the session
  onClose: () => void;
  onInvited: (updatedSession: any) => void;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function RosterInviteModal({ sessionId, alreadyInvited, onClose, onInvited }: Props) {
  const { token } = useAuth();
  const [roster, setRoster] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    connectionsApi.getAll(token)
      .then(({ connections }) => {
        setRoster(connections.map(c => c.user));
      })
      .catch(() => toast.error('Could not load roster'))
      .finally(() => setLoading(false));
  }, [token]);

  const alreadySet = new Set(alreadyInvited);

  const filtered = roster.filter(u => {
    if (alreadySet.has(u._id)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) ||
      (u.sport || '').toLowerCase().includes(q) ||
      (u.position || '').toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInvite = async () => {
    if (!token || selected.size === 0) return;
    setSubmitting(true);
    try {
      const { session } = await sessionsApi.invite(token, sessionId, Array.from(selected));
      toast.success(`Invited ${selected.size} athlete${selected.size > 1 ? 's' : ''}!`);
      onInvited(session);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not send invites');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-sm rounded-t-3xl flex flex-col" style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Invite Athletes</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select from your roster</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, sport, position…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Roster list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader className="w-5 h-5 text-emerald-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              {roster.length === 0 ? 'No athletes on your roster yet.' : 'No matches.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(athlete => {
                const isSelected = selected.has(athlete._id);
                const thumb = avatarThumb(athlete.avatar, 80);
                return (
                  <button
                    key={athlete._id}
                    onClick={() => toggle(athlete._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                      {thumb
                        ? <img src={thumb} alt={athlete.name} className="w-full h-full object-cover" />
                        : getInitials(athlete.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{athlete.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[athlete.sport, athlete.position].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-2 pb-8 flex-shrink-0 border-t border-slate-100">
          <button
            onClick={handleInvite}
            disabled={selected.size === 0 || submitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                {selected.size === 0
                  ? 'Select athletes to invite'
                  : `Invite ${selected.size} Athlete${selected.size > 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
