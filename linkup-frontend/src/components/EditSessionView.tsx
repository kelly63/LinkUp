import { ChevronLeft, Calendar, MapPin, Clock, Save } from 'lucide-react';
import { useState } from 'react';

interface EditSessionViewProps {
  session: {
    _id?: string;
    id?: number;
    title?: string;
    sport: string;
    role?: string;
    posterRole?: string;
    date: string;
    time: string;
    duration?: string;
    location: string;
    goals?: string;
    notes?: string;
    status: string;
  };
  onBack: () => void;
  onSave?: (updatedSession: any) => void;
}

// Convert any stored time string to HH:MM for <input type="time">
function toTimeInputValue(t: string): string {
  if (!t || t === 'Flexible') return '';
  // Already HH:MM
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  // Try to parse 12h format like "2:00 PM"
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  return '';
}

// Convert HH:MM → "H:MM AM/PM" for display
function formatTime(t: string): string {
  const [hours, minutes] = t.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${minutes} ${ampm}`;
}

export function EditSessionView({ session, onBack, onSave }: EditSessionViewProps) {
  const isFlexibleDate = session.date === 'Flexible';
  const isFlexibleTime = session.time === 'Flexible';

  const [dateFlexible, setDateFlexible] = useState(isFlexibleDate);
  const [timeFlexible, setTimeFlexible] = useState(isFlexibleTime);
  const [dateValue, setDateValue] = useState(isFlexibleDate ? '' : session.date);
  const [timeValue, setTimeValue] = useState(isFlexibleTime ? '' : toTimeInputValue(session.time));
  const [location, setLocation] = useState(session.location || '');
  const [duration, setDuration] = useState(session.duration || '1 hour');
  const [notes, setNotes] = useState(session.notes || session.goals || '');

  const handleSave = () => {
    const updatedSession = {
      ...session,
      date: dateFlexible ? 'Flexible' : dateValue,
      time: timeFlexible ? 'Flexible' : (timeValue ? formatTime(timeValue) : ''),
      location,
      duration,
      notes,
    };
    if (onSave) onSave(updatedSession);
    onBack();
  };

  const sessionTitle = session.title || session.sport;

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
            <p className="text-blue-200 text-sm">{sessionTitle}</p>
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
              <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </label>
              {!dateFlexible && (
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                />
              )}
              {dateFlexible && (
                <div className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium">
                  Flexible — will discuss with partner
                </div>
              )}
              <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={dateFlexible}
                    onChange={() => setDateFlexible((v) => !v)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {dateFlexible && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Flexible on date
                </span>
              </label>
            </div>

            {/* Time */}
            <div>
              <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </label>
              {!timeFlexible && (
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                />
              )}
              {timeFlexible && (
                <div className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium">
                  Flexible — will discuss with partner
                </div>
              )}
              <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={timeFlexible}
                    onChange={() => setTimeFlexible((v) => !v)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {timeFlexible && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Flexible on time
                </span>
              </label>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="30 minutes">30 minutes</option>
                <option value="1 hour">1 hour</option>
                <option value="1.5 hours">1.5 hours</option>
                <option value="2 hours">2 hours</option>
                <option value="2.5 hours">2.5 hours</option>
                <option value="3 hours">3 hours</option>
                <option value="3+ hours">3+ hours</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
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
