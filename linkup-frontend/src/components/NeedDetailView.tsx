import { ArrowLeft, Star, Calendar, Clock, Award, MessageCircle, Users } from 'lucide-react';

interface NeedDetailViewProps {
  onBack: () => void;
}

export function NeedDetailView({ onBack }: NeedDetailViewProps) {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header with Back Arrow and Pitcher Name */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div>
          <h2 className="text-slate-900">Bullpen Session</h2>
          <p className="text-xs text-slate-500">Posted by P-Rod</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Detail Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-slate-200">
          <h3 className="text-slate-900 mb-4">Session Details</h3>
          
          <div className="space-y-4">
            {/* Seeking */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Seeking</p>
                <p className="text-slate-900">Catcher</p>
              </div>
            </div>

            {/* Level */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Level</p>
                <p className="text-slate-900">NCAA D1</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Date</p>
                <p className="text-slate-900">Today, December 4</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Time</p>
                <p className="text-slate-900">6:00 PM – 7:30 PM</p>
              </div>
            </div>

            {/* Session Goal/Notes */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-2">Session Goal/Notes</p>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-700 text-sm">Focusing on breaking ball mechanics - curveball and slider. Need consistent framing and feedback on pitch movement.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pitcher Profile Snippet */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-slate-200">
          <h3 className="text-slate-900 mb-4">About the Pitcher</h3>
          
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0 text-xl">
              PR
            </div>
            
            <div className="flex-1">
              <h4 className="text-slate-900 mb-1">P-Rod</h4>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <span className="text-slate-900">4.8</span>
                <span className="text-slate-500 text-sm">(24 sessions)</span>
              </div>
              
              {/* Bio Snippet */}
              <p className="text-sm text-slate-600">
                Varsity RHP working on curveball and slider mechanics. Professional and respectful.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200">
            <div className="text-center">
              <div className="text-slate-900 mb-0.5">24</div>
              <div className="text-xs text-slate-500">Sessions</div>
            </div>
            <div className="text-center border-l border-r border-slate-200">
              <div className="text-slate-900 mb-0.5">100%</div>
              <div className="text-xs text-slate-500">On-Time</div>
            </div>
            <div className="text-center">
              <div className="text-slate-900 mb-0.5">RHP</div>
              <div className="text-xs text-slate-500">Position</div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-slate-200">
          <h4 className="text-slate-900 mb-3">Location</h4>
          <p className="text-slate-700 mb-2">Mission Valley Sports Complex</p>
          <p className="text-sm text-slate-500">Distance: 1.2 miles away</p>
          
          {/* Mock mini map */}
          <div className="mt-3 h-32 bg-slate-100 rounded-xl flex items-center justify-center">
            <p className="text-slate-400 text-sm">Map Preview</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2 pb-6">
          {/* Primary Action - VIEW & ACCEPT */}
          <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]">
            VIEW & ACCEPT
          </button>

          {/* Secondary Action - Message Pitcher */}
          <button className="w-full bg-white hover:bg-slate-50 text-slate-900 py-4 rounded-xl transition-all border-2 border-slate-300 hover:border-slate-400 flex items-center justify-center gap-2 active:scale-[0.98]">
            <MessageCircle className="w-5 h-5" />
            Message Pitcher
          </button>
        </div>
      </div>
    </div>
  );
}