import { MapPin, Clock, Award, Users, Shield } from 'lucide-react';

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
}

interface NeedCardProps {
  need: Need;
  onClick: () => void;
}

export function NeedCard({ need, onClick }: NeedCardProps) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
      {/* Title + poster */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-slate-900">{need.title}</h4>
        {need.isOnRoster && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 flex-shrink-0 mt-0.5">
            <Shield className="w-2.5 h-2.5" />
            Roster
          </span>
        )}
      </div>

      {need.posterName && (
        <p className="text-xs text-slate-500 -mt-2 mb-3">Posted by {need.posterName}</p>
      )}

      {/* Seeking Status */}
      <div className="flex items-center gap-2 mb-4 bg-blue-50 rounded-xl p-3">
        <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-xs text-blue-600">Seeking</p>
          <p className="text-sm text-blue-900">{need.seeking}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Level */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Level</p>
            <p className="text-sm text-slate-900">{need.level || '—'}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Location</p>
            <p className="text-sm text-slate-900 truncate">{need.distance}</p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-sm text-slate-900">{need.date || '—'}</p>
          </div>
        </div>

        {/* Time */}
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

      {/* Action Button */}
      <button
        onClick={onClick}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition-colors active:scale-[0.98]"
      >
        VIEW & ACCEPT
      </button>
    </div>
  );
}
