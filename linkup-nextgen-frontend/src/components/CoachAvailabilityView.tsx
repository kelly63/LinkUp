import { useState } from 'react';
import { X, Check, Clock, Plus, Trash2 } from 'lucide-react';
import { coaches as coachesApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const TIMES = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${m === 0 ? '00' : m} ${ampm}`;
}

export interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface CoachAvailabilityViewProps {
  onClose: () => void;
}

export function CoachAvailabilityView({ onClose }: CoachAvailabilityViewProps) {
  const { token, user, updateUser } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>((user as any)?.availability || []);
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState('09:00');
  const [draftEnd, setDraftEnd] = useState('17:00');

  const hasDay = (day: string) => slots.some(s => s.day === day);

  const toggleDay = (day: string) => {
    if (hasDay(day)) {
      setSlots(prev => prev.filter(s => s.day !== day));
    } else {
      setEditingDay(day);
      setDraftStart('09:00');
      setDraftEnd('17:00');
    }
  };

  const confirmDay = (day: string) => {
    setSlots(prev => {
      const without = prev.filter(s => s.day !== day);
      return [...without, { day, startTime: draftStart, endTime: draftEnd }];
    });
    setEditingDay(null);
  };

  const editSlot = (slot: AvailabilitySlot) => {
    setDraftStart(slot.startTime);
    setDraftEnd(slot.endTime);
    setEditingDay(slot.day);
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const { user: u } = await coachesApi.updateProfile(token, { availability: slots } as any);
      updateUser(u);
      toast.success('Availability saved');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const orderedSlots = DAYS
    .map(d => slots.find(s => s.day === d))
    .filter(Boolean) as AvailabilitySlot[];

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div>
          <h2 className="text-white font-bold text-xl">My Availability</h2>
          <p className="text-emerald-300 text-sm">Set your weekly schedule</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Day toggles */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Available days</p>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  hasDay(day)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>

        {/* Time editor */}
        {editingDay && (
          <div className="bg-white rounded-2xl p-4 border-2 border-emerald-300 shadow-md">
            <p className="text-sm font-semibold text-slate-900 mb-3 capitalize">
              {editingDay} — set hours
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1.5">From</p>
                <select
                  value={draftStart}
                  onChange={e => setDraftStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  {TIMES.map(t => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Until</p>
                <select
                  value={draftEnd}
                  onChange={e => setDraftEnd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
                >
                  {TIMES.filter(t => t > draftStart).map(t => (
                    <option key={t} value={t}>{formatTime(t)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => confirmDay(editingDay)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" /> Confirm
              </button>
              <button
                onClick={() => { setEditingDay(null); if (!hasDay(editingDay)) return; }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Schedule summary */}
        {orderedSlots.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-3 pb-2">Your schedule</p>
            {orderedSlots.map(slot => (
              <div key={slot.day} className="flex items-center justify-between px-4 py-3 border-t border-slate-100 first:border-t-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm capitalize">{slot.day}</p>
                    <p className="text-xs text-slate-500">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editSlot(slot)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </button>
                  <button onClick={() => setSlots(prev => prev.filter(s => s.day !== slot.day))} className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {slots.length === 0 && !editingDay && (
          <div className="text-center py-6">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No availability set</p>
            <p className="text-slate-400 text-xs mt-1">Tap a day above to add hours</p>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save Availability</>}
        </button>
      </div>
    </div>
  );
}
