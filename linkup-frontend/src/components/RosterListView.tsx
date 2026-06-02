import { ArrowLeft, Users, Star, MapPin, Calendar, MessageSquare, ChevronRight, Clock, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { connections as connectionsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { avatarThumb } from '../lib/api';
import { UserAvatar } from './UserAvatar';
import { toast } from 'sonner';

interface RosterListViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: {
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
  }) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function RosterListView({ onBack, onNavigate, onOpenChat }: RosterListViewProps) {
  const { token } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      connectionsApi.getAll(token).then(d => d.connections || []),
      connectionsApi.getPending(token).then(d => d.requests || []),
    ])
      .then(([conns, reqs]) => { setConnections(conns); setPending(reqs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (req: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    setActingOn(req._id);
    try {
      const { connection } = await connectionsApi.accept(token, req._id);
      setPending(prev => prev.filter(r => r._id !== req._id));
      setConnections(prev => [...prev, connection]);
      toast.success('Connection accepted');
    } catch {
      toast.error('Could not accept request');
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (req: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    setActingOn(req._id);
    try {
      await connectionsApi.reject(token, req._id);
      setPending(prev => prev.filter(r => r._id !== req._id));
      toast.success('Request declined');
    } catch {
      toast.error('Could not decline request');
    } finally {
      setActingOn(null);
    }
  };

  const handleViewProfile = (connection: any) => {
    if (onNavigate) {
      onNavigate('userProfile', {
        id: connection.user._id,
        type: connection.user.role,
        name: connection.user.name,
        avatar: connection.user.avatar || getInitials(connection.user.name),
        sport: connection.user.sport || connection.user.sportsCoached?.[0] || '',
        position: connection.user.position || '',
        level: connection.user.skillLevel || '',
      });
    }
  };

  const handleMessage = (connection: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenChat) {
      onOpenChat({
        id: connection.user._id,
        name: connection.user.name,
        avatar: connection.user.avatar || getInitials(connection.user.name),
        sport: connection.user.sport || connection.user.sportsCoached?.[0] || '',
        position: connection.user.position || '',
        level: connection.user.skillLevel || '',
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-slate-900">My Roster</h2>
      </div>

      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-white text-xl font-semibold">{connections.length} Connections</h3>
            <p className="text-emerald-200 text-sm">Your practice partners & coaches</p>
          </div>
          {pending.length > 0 && (
            <div className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
              {pending.length} pending
            </div>
          )}
        </div>
      </div>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div className="px-6 pt-6">
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">Pending Requests ({pending.length})</p>
            </div>
            <div className="divide-y divide-slate-100">
              {pending.map((req) => {
                const u = req.requester || req.user || {};
                const initials = getInitials(u.name || '?');
                const sport = u.sport || u.sportsCoached?.[0] || '';
                const position = u.role === 'coach' ? 'Coach' : (u.position || '');
                const isActing = actingOn === req._id;
                return (
                  <div
                    key={req._id}
                    onClick={() => onNavigate?.('userProfile', { id: u._id, name: u.name, avatar: u.avatar, sport, position, level: u.skillLevel, type: u.role })}
                    className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                      {u.avatar
                        ? <img src={avatarThumb(u.avatar, 80)!} alt={u.name} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[sport, position, u.skillLevel].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleAccept(req, e)}
                        disabled={isActing}
                        className="w-9 h-9 bg-green-100 hover:bg-green-200 text-green-700 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleReject(req, e)}
                        disabled={isActing}
                        className="w-9 h-9 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Roster List */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : connections.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-semibold mb-2">No Roster Connections Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Start building your team by connecting with athletes and coaches
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => {
              const u = connection.user;
              const initials = getInitials(u.name);
              const sport = u.sport || u.sportsCoached?.[0] || '';
              const position = u.role === 'coach' ? 'Coach' : (u.position || '');
              const level = u.skillLevel || '';
              const addedDate = connection.connectedAt
                ? new Date(connection.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

              return (
                <div
                  key={connection.connectionId}
                  onClick={() => handleViewProfile(connection)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-md overflow-hidden">
                      <UserAvatar avatar={u.avatar} name={u.name} size={56} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-slate-900 font-semibold truncate">{u.name}</h4>
                        {u.averageRating > 0 && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-semibold text-slate-900">{u.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {sport && <span className="text-sm text-slate-600">{sport}</span>}
                        {sport && position && <span className="text-slate-400">•</span>}
                        {position && <span className="text-sm text-slate-600">{position}</span>}
                      </div>
                      {level && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-medium border border-emerald-200">
                          {level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {u.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3 h-3 text-slate-600" />
                        </div>
                        <span className="text-slate-700 truncate">{u.location}</span>
                      </div>
                    )}
                    {u.ratingCount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-slate-700">{u.ratingCount} sessions</span>
                      </div>
                    )}
                  </div>

                  {addedDate && <p className="text-xs text-slate-500 mb-3">Connected {addedDate}</p>}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleMessage(connection, e)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm font-semibold">Message</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewProfile(connection); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-6"></div>
    </div>
  );
}
