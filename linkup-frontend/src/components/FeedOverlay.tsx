import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { NeedCard } from './NeedCard';
import { sessions as sessionsApi, connections as connectionsApi } from '../lib/api';
import { useAuth } from '../lib/auth';

function firstLastInitial(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface FeedOverlayProps {
  filters: {
    skillLevel: string;
    dateTime: string;
  };
  onCardClick: () => void;
}

function formatSessionDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSessionTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function FeedOverlay({ filters, onCardClick }: FeedOverlayProps) {
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [rosterIds, setRosterIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const params: Record<string, string> = {};
    if (filters.skillLevel && filters.skillLevel !== 'all') params.skillLevel = filters.skillLevel;
    Promise.all([
      sessionsApi.getAvailable(token, params),
      connectionsApi.getAll(token),
    ]).then(([sessionData, connData]) => {
      setAvailableSessions(sessionData.sessions || []);
      const ids = new Set(
        (connData.connections || [])
          .filter((c: any) => c.status === 'accepted')
          .map((c: any) => c.user._id)
      );
      setRosterIds(ids);
    }).catch(() => setAvailableSessions([]))
      .finally(() => setLoading(false));
  }, [token, filters.skillLevel]);

  const needs = availableSessions.map((s) => {
    const posterId = s.postedBy?._id ?? '';
    return {
      id: s._id,
      title: s.title || s.sport || 'Session',
      seeking: s.partnerRole || s.seekingPosition || s.position || 'Partner',
      level: s.skillLevelRequired || s.skillLevel || s.level || '',
      distance: s.location || 'Nearby',
      date: s.date && s.date !== 'Flexible' ? formatSessionDate(s.date) : (s.date || ''),
      time: s.time && s.time !== 'Flexible' ? s.time : (s.time || ''),
      posterName: firstLastInitial(s.postedBy?.name || ''),
      isOnRoster: posterId ? rosterIds.has(posterId) : false,
    };
  });

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 z-20 ${
        expanded ? 'h-[70%]' : 'h-[35%]'
      }`}
    >
      {/* Drag Handle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full pt-3 pb-2 flex justify-center"
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
      </button>

      {/* Header */}
      <div className="px-6 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-slate-900">Available Sessions</h3>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading...' : `${needs.length} nearby opportunities`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronUp className={`w-5 h-5 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Scrollable Card List */}
      <div className="overflow-y-auto px-6 pb-6 space-y-3" style={{ maxHeight: 'calc(100% - 80px)' }}>
        {!loading && needs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No sessions available nearby</div>
        ) : (
          needs.map((need) => (
            <NeedCard key={need.id} need={need} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}
