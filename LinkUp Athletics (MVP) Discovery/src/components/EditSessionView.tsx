import { ChevronLeft, Calendar, MapPin, Clock, Save } from 'lucide-react';
import { useState } from 'react';

interface EditSessionViewProps {
  session: {
    id: number;
    sport: string;
    role: string;
    date: string;
    time: string;
    location: string;
    status: string;
  };
  onBack: () => void;
  onSave?: (updatedSession: any) => void;
}

export function EditSessionView({ session, onBack, onSave }: EditSessionViewProps) {
  const [date, setDate] = useState(session.date);
  const [time, setTime] = useState(session.time);
  const [location, setLocation] = useState(session.location);
  const [duration, setDuration] = useState('2 hours');
  const [notes, setNotes] = useState(
    session.sport === 'Baseball' 
      ? 'Focus on fastball and changeup mechanics. Bring your own glove and cleats.'
      : 'Working on shooting form and consistency from 3-point range. Bring basketball shoes.'
  );

  const handleSave = () => {
    const updatedSession = {
      ...session,
      date,
      time,
      location,
      duration,
      notes
    };
    
    console.log('Saving session:', updatedSession);
    if (onSave) {
      onSave(updatedSession);
    }
    onBack();
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h2 className="text-white">Edit Session</h2>
            <p className="text-blue-200 text-sm">{session.sport} Practice</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-4">Session Details</h3>
          
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Mar 15, 2025"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="2:00 PM"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="1 hour">1 hour</option>
                <option value="1.5 hours">1.5 hours</option>
                <option value="2 hours">2 hours</option>
                <option value="2.5 hours">2.5 hours</option>
                <option value="3 hours">3 hours</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Session Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add details about the session..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <button 
            onClick={handleSave}
            className="w-full py-3.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
          
          <button 
            onClick={onBack}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
