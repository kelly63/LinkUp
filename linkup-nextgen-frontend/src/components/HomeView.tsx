import { useState, useEffect } from 'react';
import { Search, Star, MapPin, ChevronRight, CalendarDays, Users, Sparkles } from 'lucide-react';
import { coaches as coachesApi, clinics as clinicsApi, Coach, Clinic, avatarThumb } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d: string) {
  if (!d || d === 'Flexible') return 'Flexible';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface HomeViewProps {
  onViewCoach: (id: string) => void;
  onOpenChat: (userId: string) => void;
}

export function HomeView({ onViewCoach }: HomeViewProps) {
  const { token, user } = useAuth();
  const [featuredCoaches, setFeaturedCoaches] = useState<Coach[]>([]);
  const [upcomingClinics, setUpcomingClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  const parentUser = user?.role === 'parent' ? user as any : null;
  const childSports: string[] = parentUser?.children?.flatMap((c: any) => c.sports || []) ?? [];
  const uniqueSports = [...new Set(childSports)];

  useEffect(() => {
    if (!token) return;
    Promise.all([
      coachesApi.search(token, { page: 1 }).then(r => r.coaches.slice(0, 6)).catch(() => []),
      clinicsApi.getAvailable(token, { page: 1 }).then(r => r.sessions.slice(0, 4)).catch(() => []),
    ]).then(([c, cl]) => {
      setFeaturedCoaches(c);
      setUpcomingClinics(cl);
    }).finally(() => setLoading(false));
  }, [token]);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hasChildren = parentUser?.children?.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-8">
        <p className="text-emerald-300 text-sm mb-1">Welcome back,</p>
        <h2 className="text-white text-xl font-bold mb-1">{firstName} 👋</h2>
        {hasChildren ? (
          <p className="text-emerald-200 text-sm">
            Find coaches for {parentUser.children.map((c: any) => c.name).join(', ')}
          </p>
        ) : (
          <p className="text-emerald-200 text-sm">Find the perfect coach or clinic for your child</p>
        )}

        {/* Quick search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search coaches, sports, locations..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
            readOnly
            onClick={() => toast.info('Use the Coaches tab to search')}
          />
        </div>
      </div>

      {/* Sports quick-filter pills (if parent has kids) */}
      {uniqueSports.length > 0 && (
        <div className="px-6 pt-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Your kids play</p>
          <div className="flex gap-2 flex-wrap">
            {uniqueSports.map(s => (
              <span key={s} className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add children prompt if none */}
      {user?.role === 'parent' && !hasChildren && (
        <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Get personalized recommendations</p>
            <p className="text-xs text-amber-700 mt-0.5">Add your child's profile to see coaches and clinics tailored to their sport and age.</p>
          </div>
        </div>
      )}

      {/* Featured Coaches */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Featured Coaches</h3>
          <button className="text-xs text-emerald-700 font-medium flex items-center gap-0.5">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-44 bg-white rounded-2xl p-3 animate-pulse">
                <div className="w-14 h-14 bg-slate-200 rounded-full mx-auto mb-2" />
                <div className="h-3 bg-slate-200 rounded mb-1" />
                <div className="h-2 bg-slate-100 rounded w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        ) : featuredCoaches.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-500 text-sm border border-slate-200">
            No coaches available yet
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
            {featuredCoaches.map(coach => (
              <button
                key={coach._id}
                onClick={() => onViewCoach(coach._id)}
                className="flex-shrink-0 w-44 bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3 overflow-hidden">
                  {coach.avatar
                    ? <img src={avatarThumb(coach.avatar, 80)!} alt={coach.name} className="w-full h-full object-cover" />
                    : getInitials(coach.name)}
                </div>
                <p className="font-semibold text-slate-900 text-sm text-center truncate">{coach.name}</p>
                <p className="text-xs text-slate-500 text-center truncate">{coach.sportsCoached.slice(0, 2).join(', ')}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {coach.averageRating > 0 ? (
                    <>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-semibold text-slate-700">{coach.averageRating.toFixed(1)}</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">New coach</span>
                  )}
                </div>
                {coach.hourlyRate != null && (
                  <p className="text-xs text-emerald-700 font-semibold text-center mt-1">${coach.hourlyRate}/hr</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Clinics */}
      <div className="px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900">Upcoming Clinics</h3>
          <button className="text-xs text-emerald-700 font-medium flex items-center gap-0.5">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-slate-200">
                <div className="h-4 bg-slate-200 rounded mb-2 w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : upcomingClinics.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-slate-500 text-sm border border-slate-200">
            No upcoming clinics yet
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingClinics.map(clinic => (
              <div key={clinic._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-emerald-300 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{clinic.title || clinic.sport}</p>
                    <p className="text-xs text-slate-500">{clinic.sport}</p>
                  </div>
                  {clinic.pricePerAthlete != null && (
                    <span className="text-emerald-700 font-bold text-sm flex-shrink-0">${clinic.pricePerAthlete}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-emerald-600" />
                    {formatDate(clinic.date)}
                  </span>
                  {clinic.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{clinic.location}</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onViewCoach((clinic.postedBy as any)?._id)}
                  className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
