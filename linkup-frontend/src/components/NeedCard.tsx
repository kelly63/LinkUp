import { MapPin, Clock, Award, Users, Shield, Plane } from 'lucide-react';

interface Need {
  id: string | number;
  title: string;
  seeking: string;
  level: string;
  distance: string;
  date: string;
  time: string;
  posterName?: string;
  isOnRoster?: boolean;
  isTraveler?: boolean;
  teamType?: string;
}

interface NeedCardProps {
  need: Need;
  onClick: () => void;
  onPosterClick?: () => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function NeedCard({ need, onClick, onPosterClick }: NeedCardProps) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-emerald-400 transition-all shadow-sm hover:shadow-md">

      {/* Poster row — tappable to view profile */}
      <button
        onClick={(e) => { e.stopPropagation(); onPosterClick?.(); }}
        className="w-full flex items-center gap-3 mb-3 text-left group"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {need.posterName ? getInitials(need.posterName) : '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
              {need.posterName || 'Unknown'}
            </span>
            {need.isOnRoster && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                <Shield className="w-2.5 h-2.5" />
                Roster
              </span>
            )}
            {need.isTraveler && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                <Plane className="w-2.5 h-2.5" />
                Traveling
              </span>
            )}
            {need.teamType === 'mens' && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                Men's
              </span>
            )}
            {need.teamType === 'womens' && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full border border-pink-200">
                Women's
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-500 group-hover:underline">View profile</p>
        </div>
      </button>

      {/* Seeking Status */}
      <div className="flex items-center gap-2 mb-3 bg-emerald-50 rounded-xl p-3">
        <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-xs text-emerald-600">Seeking</p>
          <p className="text-sm text-emerald-900">{need.seeking}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Level</p>
            <p className="text-sm text-slate-900">{need.level || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Location</p>
            <p className="text-sm text-slate-900 truncate">{need.distance || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-sm text-slate-900">{need.date || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Time</p>
            <p className="text-sm text-slate-900">{need.time || '—'}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onClick}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl transition-colors active:scale-[0.98]"
      >
        VIEW & ACCEPT
      </button>
    </div>
  );
}
