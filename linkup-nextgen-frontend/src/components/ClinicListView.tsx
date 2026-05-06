import { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Users, SlidersHorizontal, X, Plus, Check } from 'lucide-react';
import { clinics as clinicsApi, Clinic } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const SPORTS = ['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis', 'Swimming'];
const AGE_GROUPS = ['Under 8', '8–10', '11–13', '14–17', '18+', 'All Ages'];
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

function formatDate(d: string, ws?: string, we?: string) {
  if (!d || d === 'Flexible') {
    if (ws && we) {
      const fmt = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(ws)} – ${fmt(we)}`;
    }
    return 'Flexible';
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Create clinic form ───────────────────────────────────────────────────────

interface CreateClinicFormProps {
  onCreated: (clinic: Clinic) => void;
  onCancel: () => void;
}

function CreateClinicForm({ onCreated, onCancel }: CreateClinicFormProps) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [skillLevel, setSkillLevel] = useState('All Levels');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!sport) { toast.error('Sport is required'); return; }
    if (!date) { toast.error('Date is required'); return; }
    if (!location) { toast.error('Location is required'); return; }
    if (!token) return;
    setSaving(true);
    try {
      const { session } = await clinicsApi.create(token, {
        sessionType: 'clinic',
        title: title.trim() || sport,
        sport,
        date,
        time,
        duration,
        location: location.trim(),
        skillLevelRequired: skillLevel,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        pricePerAthlete: price ? Number(price) : undefined,
        notes: notes.trim(),
      });
      toast.success('Clinic posted!');
      onCreated(session);
    } catch (err: any) {
      toast.error(err.message || 'Could not post clinic');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3 flex-shrink-0">
        <button onClick={onCancel} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-white" />
        </button>
        <div>
          <h2 className="text-white font-bold text-xl">Post a Clinic</h2>
          <p className="text-emerald-300 text-sm">Fill in the details below</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Title */}
        <input
          type="text"
          placeholder="Clinic title (e.g. Summer Baseball Camp)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none transition-colors"
        />

        {/* Sport */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Sport *</p>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(s => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sport === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Date *</p>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Time</p>
            <input
              type="text"
              placeholder="e.g. 9:00 AM"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Duration + Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Duration</p>
            <input
              type="text"
              placeholder="e.g. 2 hours"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Max Athletes</p>
            <input
              type="number"
              placeholder="e.g. 20"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:border-emerald-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Location */}
        <input
          type="text"
          placeholder="Location *"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
        />

        {/* Skill level */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Skill Level</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_LEVELS.map(sl => (
              <button
                key={sl}
                onClick={() => setSkillLevel(sl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  skillLevel === sl ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {sl}
              </button>
            ))}
          </div>
        </div>

        {/* Price */}
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Price per Athlete ($)</p>
          <input
            type="number"
            placeholder="Leave blank if free"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <textarea
          placeholder="Additional details (equipment needed, what to bring, etc.)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:border-emerald-400 focus:outline-none resize-none"
        />

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Check className="w-4 h-4" /> Post Clinic</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

interface ClinicListViewProps {
  onViewCoach: (id: string) => void;
}

export function ClinicListView({ onViewCoach }: ClinicListViewProps) {
  const { token, user } = useAuth();
  const isCoach = (user as any)?.role === 'coach';
  const [clinicList, setClinicList] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [filterSport, setFilterSport] = useState('');
  const [filterAge, setFilterAge] = useState('');

  const activeFilterCount = [filterSport, filterAge].filter(Boolean).length;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    clinicsApi.getAvailable(token, {
      sport: filterSport || undefined,
      ageGroup: filterAge || undefined,
    })
      .then(r => setClinicList(r.sessions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, filterSport, filterAge]);

  if (showCreate) {
    return (
      <CreateClinicForm
        onCreated={clinic => {
          setClinicList(prev => [clinic, ...prev]);
          setShowCreate(false);
        }}
        onCancel={() => setShowCreate(false)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">
            {isCoach ? 'My Clinics & Camps' : 'Clinics & Camps'}
          </h2>
          <p className="text-emerald-300 text-sm mt-1">
            {isCoach
              ? 'Post and manage your group training sessions'
              : 'Group training sessions for all levels'}
          </p>
        </div>
        {isCoach && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 text-slate-600'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={() => { setFilterSport(''); setFilterAge(''); }} className="text-xs text-slate-500 hover:text-slate-700">
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{clinicList.length} clinic{clinicList.length !== 1 ? 's' : ''}</span>
      </div>

      {showFilters && (
        <div className="bg-white border-b border-slate-100 px-6 py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Sport</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSport(filterSport === s ? '' : s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filterSport === s ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Age Group</p>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag}
                  onClick={() => setFilterAge(filterAge === ag ? '' : ag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filterAge === ag ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clinic list */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-200">
              <div className="h-4 bg-slate-200 rounded mb-3 w-2/3" />
              <div className="h-3 bg-slate-100 rounded mb-2 w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))
        ) : clinicList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            {isCoach ? (
              <>
                <p className="text-slate-600 font-medium">No clinics posted yet</p>
                <p className="text-slate-400 text-sm mt-1">Tap + to post your first clinic</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus className="w-4 h-4" /> Post a Clinic
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 font-medium">No clinics posted yet</p>
                <p className="text-slate-400 text-sm mt-1">Check back soon or adjust your filters</p>
              </>
            )}
          </div>
        ) : (
          clinicList.map(clinic => (
            <div key={clinic._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      {clinic.sport}
                    </span>
                    {clinic.sessionType === 'clinic' && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        Group Clinic
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900">{clinic.title || clinic.sport}</p>
                </div>
                {clinic.pricePerAthlete != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-emerald-700">${clinic.pricePerAthlete}</p>
                    <p className="text-xs text-slate-400">per athlete</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>{formatDate(clinic.date, clinic.dateWindowStart, clinic.dateWindowEnd)}</span>
                </div>
                {clinic.location && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{clinic.location}</span>
                  </div>
                )}
                {clinic.time && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="text-slate-400">🕐</span>
                    <span>{clinic.time}</span>
                  </div>
                )}
                {clinic.maxParticipants != null && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Max {clinic.maxParticipants} athletes</span>
                  </div>
                )}
              </div>

              {clinic.notes && (
                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{clinic.notes}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onViewCoach((clinic.postedBy as any)?._id)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => onViewCoach((clinic.postedBy as any)?._id)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Coach
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
