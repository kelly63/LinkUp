import { MapPin, Clock, Award, Users } from 'lucide-react';

interface Need {
  id: number;
  title: string;
  seeking: string;
  level: string;
  distance: string;
  date: string;
  time: string;
}

interface NeedCardProps {
  need: Need;
  onClick: () => void;
}

export function NeedCard({ need, onClick }: NeedCardProps) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 hover:border-blue-400 transition-all shadow-sm hover:shadow-md">
      {/* Title */}
      <h4 className="text-slate-900 mb-3">{need.title}</h4>

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
            <p className="text-sm text-slate-900">{need.level}</p>
          </div>
        </div>

        {/* Distance */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Distance</p>
            <p className="text-sm text-slate-900">{need.distance}</p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-sm text-slate-900">{need.date}</p>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Time</p>
            <p className="text-sm text-slate-900">{need.time}</p>
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