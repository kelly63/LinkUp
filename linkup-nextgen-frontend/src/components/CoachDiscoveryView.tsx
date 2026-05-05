import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Star, MapPin, X } from 'lucide-react';
import { coaches as coachesApi, Coach, avatarThumb } from '../lib/api';
import { useAuth } from '../lib/auth';

const SPORTS = ['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis', 'Swimming', 'Wrestling'];
const AGE_GROUPS = ['Under 8', '8–10', '11–13', '14–17', '18+', 'All Ages'];
const MAX_RATES = [30, 50, 75, 100, 150, 200];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface CoachDiscoveryViewProps {
  onViewCoach: (id: string) => void;
}

export function CoachDiscoveryView({ onViewCoach }: CoachDiscoveryViewProps) {
  const { token } = useAuth();
  const [coachList, setCoachList] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterSport, setFilterSport] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [filterMaxRate, setFilterMaxRate] = useState<number | undefined>();

  const activeFilterCount = [filterSport, filterAge, filterMaxRate].filter(Boolean).length;

  const fetchCoaches = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { coaches } = await coachesApi.search(token, {
        sport: filterSport || undefined,
        ageGroup: filterAge || undefined,
        maxRate: filterMaxRate,
        search: search.trim() || undefined,
      });
      setCoachList(coaches);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoaches(); }, [token, filterSport, filterAge, filterMaxRate]);

  const handleSearch = () => fetchCoaches();

  const clearFilters = () => {
    setFilterSport('');
    setFilterAge('');
    setFilterMaxRate(undefined);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6">
        <h2 className="text-white font-bold text-xl mb-4">Find a Coach</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Name, sport, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-11 pr-12 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); fetchCoaches(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
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
          <button onClick={clearFilters} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{coachList.length} coach{coachList.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Filters panel */}
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
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Max Hourly Rate</p>
            <div className="flex flex-wrap gap-2">
              {MAX_RATES.map(r => (
                <button
                  key={r}
                  onClick={() => setFilterMaxRate(filterMaxRate === r ? undefined : r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    filterMaxRate === r ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Up to ${r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Coach list */}
      <div className="px-6 py-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-200">
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-slate-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : coachList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No coaches found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          coachList.map(coach => (
            <button
              key={coach._id}
              onClick={() => onViewCoach(coach._id)}
              className="w-full bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                  {coach.avatar
                    ? <img src={avatarThumb(coach.avatar, 80)!} alt={coach.name} className="w-full h-full object-cover" />
                    : getInitials(coach.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900 truncate">{coach.name}</p>
                    {coach.hourlyRate != null && (
                      <span className="text-emerald-700 font-bold text-sm flex-shrink-0">${coach.hourlyRate}/hr</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{coach.sportsCoached.join(', ')}</p>
                  {coach.ageGroupsCoached.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">Ages: {coach.ageGroupsCoached.join(', ')}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {coach.averageRating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-semibold text-slate-700">{coach.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-slate-400">({coach.ratingCount})</span>
                      </span>
                    )}
                    {coach.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{coach.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {coach.bio && (
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">{coach.bio}</p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
