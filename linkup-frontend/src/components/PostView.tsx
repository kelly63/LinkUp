import { Award, MapPin, Clock, ArrowLeft, Users, Search, Filter, Plane, ChevronDown, Share2 } from 'lucide-react';
import { SPORTS } from '../lib/sports';
import { useState, useEffect, useRef, useMemo } from 'react';
import { NeedCard } from './NeedCard';
import { AvailableSessionView } from './AvailableSessionView';
import { UserProfileView } from './UserProfileView';
import { LocationAutocomplete } from './LocationAutocomplete';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, connections as connectionsApi, Session } from '../lib/api';
import { toast } from 'sonner';
import { hapticMedium } from '../lib/haptics';

function firstLastInitial(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface PostViewProps {
  onNavigateToDashboard?: (target: string) => void;
  userSports?: string[];
  requestedViewMode?: 'post' | 'find';
  onViewModeApplied?: () => void;
  onOpenChat?: (athlete: {
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: {
      sessionTitle: string;
      date: string;
      time: string;
      location: string;
    };
  }) => void;
}

// Generate date dropdown options: 2-Week Window + today through 30 days out
function buildDateOptions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + 14);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const opts: { val: string; label: string }[] = [
    { val: 'Flexible', label: `2-Week Window (${fmt(today)} – ${fmt(windowEnd)})` },
  ];
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label =
      i === 0 ? `Today — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
      i === 1 ? `Tomorrow — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
      d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    opts.push({ val, label });
  }
  return opts;
}

function buildTimeOptions() {
  const opts: { val: string; label: string }[] = [
    { val: 'Flexible', label: 'Flexible — open to discuss' },
  ];
  for (let h = 6; h <= 22; h++) {
    const val = `${String(h).padStart(2, '0')}:00`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 === 0 ? 12 : h % 12;
    opts.push({ val, label: `${display}:00 ${ampm}` });
  }
  return opts;
}

const TIME_OPTIONS = buildTimeOptions();

function SelectField({ label, icon, value, onChange, children }: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm text-slate-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// Kept for potential future use — not rendered in the post form anymore
function _MonthCalendarUnused({
  selectedDates,
  onToggle,
}: {
  selectedDates: string[];
  onToggle: (date: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const canGoPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} disabled={!canGoPrev} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30">
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} className="mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }} className="gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const val = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const isPast = date < today;
          const isToday = date.getTime() === today.getTime();
          const isSelected = selectedDates.includes(val);
          return (
            <button
              key={val}
              type="button"
              disabled={isPast}
              onClick={() => onToggle(val)}
              className={`mx-auto w-9 h-9 rounded-full text-sm font-medium transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : isToday
                    ? 'border-2 border-emerald-400 text-emerald-700 font-bold'
                    : isPast
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-100 active:bg-emerald-100'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PostView({ onNavigateToDashboard, userSports = [], onOpenChat, requestedViewMode, onViewModeApplied }: PostViewProps) {
  const { token, user } = useAuth();
  const DATE_OPTIONS = useMemo(() => buildDateOptions(), []);
  const [viewMode, setViewMode] = useState<'post' | 'find'>('find');

  useEffect(() => {
    if (requestedViewMode) {
      setViewMode(requestedViewMode);
      onViewModeApplied?.();
    }
  }, [requestedViewMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState(userSports.length > 0 ? userSports[0] : 'Baseball');
  const [selectedPartnerRoles, setSelectedPartnerRoles] = useState<string[]>([]);
  const [posterRole, setPosterRole] = useState('');
  const [selectedTeamType, setSelectedTeamType] = useState<string>(user?.teamType || '');
  useEffect(() => { const t = user?.teamType; if (t) setSelectedTeamType(t); }, [user?.teamType]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('Flexible');
  const [allLevels, setAllLevels] = useState(true);
  const [duration, setDuration] = useState('1 hr');
  const [showSavePrefsModal, setShowSavePrefsModal] = useState(false);

  // Find Sessions filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterSport, setFilterSport] = useState<string[]>([]);
  const [filterPositions, setFilterPositions] = useState<string[]>([]);
  const [filterSkillLevels, setFilterSkillLevels] = useState<string[]>([]);
  const [filterDistance, setFilterDistance] = useState('10');
  const [isFindTraveling, setIsFindTraveling] = useState(false);
  const [findTravelLocation, setFindTravelLocation] = useState('');
  
  // Post form fields
  const [locationValue, setLocationValue] = useState('');
  const [isPostTraveling, setIsPostTraveling] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef<boolean>(false);

  // Find sessions API data
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [totalSessionCount, setTotalSessionCount] = useState<number | null>(null);
  const [loadingFind, setLoadingFind] = useState(false);
  const [findPage, setFindPage] = useState(1);
  const [findTotalPages, setFindTotalPages] = useState(1);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [rosterIds, setRosterIds] = useState<Set<string>>(new Set());

  // Session detail view
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [selectedSessionIsOnRoster, setSelectedSessionIsOnRoster] = useState(false);
  // Profile overlay — viewed on top of a session or the list
  const [viewingPosterId, setViewingPosterId] = useState<string | null>(null);
  
  const skillLevels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro', 'Adult Athlete (18-45yo)', 'Adult Athlete (45+yo)'];
  
  const sportPartnerRoles: Record<string, string[]> = {
    'Baseball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'Live Batter', 'Infielder', 'Outfielder', 'Utility', 'Lifting Partner', 'Conditioning Partner'],
    'Softball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'Live Batter', 'Infielder', 'Outfielder', 'Utility', 'Lifting Partner', 'Conditioning Partner'],
    'Soccer': ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Volleyball': ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'Special Teams', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Lacrosse': ['Attack', 'Midfield', 'Defense', 'Goalie', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Field Hockey': ['Forward', 'Midfielder', 'Defender', 'Goalkeeper', 'Any Position', 'Lifting Partner', 'Conditioning Partner'],
    'Track and Field': ['Sprinter', 'Distance Runner', 'Hurdler', 'Long Jumper', 'High Jumper', 'Triple Jumper', 'Pole Vaulter', 'Shot Putter', 'Discus Thrower', 'Javelin Thrower', 'Decathlete/Heptathlete', 'Any Event', 'Training Partner', 'Conditioning Partner'],
    'Golf': ['Driver', 'Irons', 'Short Game', 'Putting', 'Course Management', 'Any Area', 'Practice Partner', 'Conditioning Partner'],
    'Tennis': ['Singles', 'Doubles', 'Serve & Volley', 'Baseline', 'Net Play', 'Any Style', 'Practice Partner', 'Conditioning Partner'],
    'Conditioning / Lifting': ['Lifting Partner', 'Conditioning Partner', 'Strength & Conditioning', 'Sprint Partner', 'Agility Partner', 'Any'],
  };

  const partnerRoles = sportPartnerRoles[selectedSport] || sportPartnerRoles['Baseball'];

  const togglePartnerRole = (role: string) => {
    if (selectedPartnerRoles.includes(role)) {
      setSelectedPartnerRoles(selectedPartnerRoles.filter(r => r !== role));
    } else {
      setSelectedPartnerRoles([...selectedPartnerRoles, role]);
    }
  };
  
  const toggleSkillLevel = (level: string) => {
    if (selectedSkillLevels.includes(level)) {
      setSelectedSkillLevels(selectedSkillLevels.filter(l => l !== level));
    } else {
      setSelectedSkillLevels([...selectedSkillLevels, level]);
    }
  };
  
  const toggleFilterSport = (sport: string) => {
    if (filterSport.includes(sport)) {
      setFilterSport(filterSport.filter(s => s !== sport));
    } else {
      setFilterSport([...filterSport, sport]);
    }
  };
  
  const toggleFilterPosition = (position: string) => {
    if (filterPositions.includes(position)) {
      setFilterPositions(filterPositions.filter(p => p !== position));
    } else {
      setFilterPositions([...filterPositions, position]);
    }
  };
  
  const toggleFilterSkillLevel = (level: string) => {
    if (filterSkillLevels.includes(level)) {
      setFilterSkillLevels(filterSkillLevels.filter(l => l !== level));
    } else {
      setFilterSkillLevels([...filterSkillLevels, level]);
    }
  };
  
  const clearFilters = () => {
    setFilterSport([]);
    setFilterPositions([]);
    setFilterSkillLevels([]);
    setFilterDistance('10');
    setIsFindTraveling(false);
    setFindTravelLocation('');
  };

  const handlePostSession = async () => {
    if (!token) return;
    if (!locationValue.trim()) { toast.error('Please enter a location for your session'); return; }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const resolvedPosterRole = posterRole || user?.position || '';
    const notes = notesRef.current?.value || '';
    try {
      const isFlexible = !selectedDate || selectedDate === 'Flexible';
      const sessionDate = isFlexible ? 'Flexible' : selectedDate;
      const now = new Date();
      const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const skillLevelValue = allLevels ? 'All Levels' : selectedSkillLevels.join(', ');

      await sessionsApi.create(token, {
        teamType: selectedTeamType,
        sport: selectedSport,
        posterRole: resolvedPosterRole,
        partnerRole: selectedPartnerRoles.join(', '),
        title: selectedPartnerRoles.length > 0
          ? `${selectedSport} – ${selectedPartnerRoles.join(' / ')} needed`
          : `${selectedSport} – Training partner needed`,
        date: sessionDate,
        ...(isFlexible && {
          dateWindowStart: now.toISOString(),
          dateWindowEnd: twoWeeksOut.toISOString(),
        }),
        time: selectedTime,
        duration,
        location: locationValue,
        skillLevelRequired: skillLevelValue,
        notes,
        goals: notes,
        sessionType: 'need',
        status: 'open',
        isTraveler: isPostTraveling,
      });
      hapticMedium();
      toast.success('Session posted! It\'s now visible to other athletes.');
      setSelectedPartnerRoles([]);
      setPosterRole('');
      setSelectedTeamType(user?.teamType || '');
      setSelectedDate('');
      setSelectedTime('Flexible');
      setAllLevels(true);
      setSelectedSkillLevels([]);
      setLocationValue('');
      setIsPostTraveling(false);
      if (notesRef.current) notesRef.current.value = '';
      setShowSavePrefsModal(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to post session.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleInviteShare = async () => {
    const appStoreUrl = 'https://apps.apple.com/app/linkup-athletics/id6748965199';
    const shareText = 'Train smarter, find better training partners. I use LinkUp Athletics to find athletes in my area — you should too!';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'LinkUp Athletics', text: shareText, url: appStoreUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${appStoreUrl}`);
        toast.success('Link copied! Share it with your teammates.');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(appStoreUrl);
          toast.success('Link copied to clipboard!');
        } catch {
          toast.error('Could not share. Visit the App Store to copy the link.');
        }
      }
    }
  };

  const activeFilterCount = filterSport.length + filterPositions.length + filterSkillLevels.length + (filterDistance !== '10' ? 1 : 0) + (isFindTraveling && findTravelLocation.trim() ? 1 : 0);

  // Fetch available sessions when switching to find tab or filters change (resets to page 1)
  useEffect(() => {
    if (viewMode !== 'find' || !token) return;
    setFindPage(1);
    setLoadingFind(true);
    sessionsApi.getAvailable(token, {
      sport: filterSport.length === 1 ? filterSport[0] : undefined,
      skillLevel: filterSkillLevels.length === 1 ? filterSkillLevels[0] : undefined,
      location: isFindTraveling && findTravelLocation.trim() ? findTravelLocation.trim() : undefined,
      page: 1,
    }).then(({ sessions, total, pages }) => {
      setAvailableSessions(sessions);
      setTotalSessionCount(total ?? sessions.length);
      setFindTotalPages(pages ?? 1);
    }).catch((err: any) => {
      toast.error(err?.message || 'Could not load sessions');
    }).finally(() => setLoadingFind(false));
  }, [viewMode, token, filterSport, filterSkillLevels, isFindTraveling, findTravelLocation]);

  // Fetch accepted connections once when entering find mode
  useEffect(() => {
    if (viewMode !== 'find' || !token) return;
    connectionsApi.getAll(token)
      .then(({ connections }) => {
        // getAll only returns accepted connections — no status filter needed
        const ids = new Set(connections.map((c) => c.user._id));
        setRosterIds(ids);
      })
      .catch(() => {});
  }, [viewMode, token]);

  const handleLoadMoreSessions = () => {
    if (!token || loadingMoreSessions) return;
    const nextPage = findPage + 1;
    setLoadingMoreSessions(true);
    sessionsApi.getAvailable(token, {
      sport: filterSport.length === 1 ? filterSport[0] : undefined,
      skillLevel: filterSkillLevels.length === 1 ? filterSkillLevels[0] : undefined,
      location: isFindTraveling && findTravelLocation.trim() ? findTravelLocation.trim() : undefined,
      page: nextPage,
    }).then(({ sessions }) => {
      setAvailableSessions((prev) => [...prev, ...sessions]);
      setFindPage(nextPage);
    }).catch(() => {}).finally(() => setLoadingMoreSessions(false));
  };

  const filteredNeeds = availableSessions.filter(session => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (session.title || '').toLowerCase().includes(q) ||
             (session.partnerRole || '').toLowerCase().includes(q) ||
             (session.sport || '').toLowerCase().includes(q);
    }
    return true;
  }).map(session => {
    const posterId = (session.postedBy as any)?._id ?? '';
    return {
      id: session._id,
      title: session.title || session.sport,
      seeking: session.partnerRole || session.position,
      level: session.skillLevelRequired || '',
      distance: session.location || 'See details',
      date: session.date || '',
      time: session.time || '',
      posterName: firstLastInitial((session.postedBy as any)?.name || ''),
      isOnRoster: posterId ? rosterIds.has(posterId) : false,
      isTraveler: (session as any).isTraveler ?? false,
      teamType: (session as any).teamType || '',
      _session: session,
    };
  });
  
  // Set default sport filters based on user's sports when switching to find view
  useEffect(() => {
    if (viewMode === 'find' && userSports.length > 0 && filterSport.length === 0) {
      setFilterSport(userSports);
    }
  }, [viewMode, userSports]);
  
  // Clear position filters when sport selection changes to invalid positions
  useEffect(() => {
    if (filterSport.length === 0) {
      // No sports selected, clear positions
      setFilterPositions([]);
      return;
    }
    
    // Get all available positions for selected sports
    const availablePositions = new Set<string>();
    filterSport.forEach(sport => {
      const positions = sportPartnerRoles[sport] || [];
      positions.forEach(pos => availablePositions.add(pos));
    });
    
    // Remove positions that are no longer valid
    setFilterPositions(prev => prev.filter(pos => availablePositions.has(pos)));
  }, [filterSport]);
  
  // Get available positions based on selected sports
  const getAvailablePositions = (): string[] => {
    if (filterSport.length === 0) {
      // No sports selected - show only general training partner roles
      return ['Lifting Partner', 'Conditioning Partner'];
    }
    
    // Return positions for selected sports
    const availablePositions = new Set<string>();
    filterSport.forEach(sport => {
      const positions = sportPartnerRoles[sport] || [];
      positions.forEach(pos => availablePositions.add(pos));
    });
    return Array.from(availablePositions).sort();
  };
  
  const availableFilterPositions = getAvailablePositions();

  // Load saved posting prefs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('linkup_session_prefs');
      if (!saved) return;
      const prefs = JSON.parse(saved);
      if (prefs.sport && userSports.includes(prefs.sport)) setSelectedSport(prefs.sport);
      if (prefs.location) setLocationValue(prefs.location);
      if (prefs.teamType && !user?.teamType) setSelectedTeamType(prefs.teamType);
      if (prefs.duration) setDuration(prefs.duration);
      if (prefs.posterRole) setPosterRole(prefs.posterRole);
    } catch {}
  }, []);

  // Profile overlay — shown on top of a session or the list; back returns to previous context
  if (viewingPosterId) {
    return (
      <UserProfileView
        userId={viewingPosterId}
        onBack={() => setViewingPosterId(null)}
        onSendMessage={() => {
          const poster = selectedSession?.postedBy as any;
          if (poster && onOpenChat) {
            onOpenChat({
              id: poster._id,
              name: poster.name,
              avatar: poster.avatar || '',
              sport: poster.sport || '',
              position: poster.position || '',
              level: poster.skillLevel || '',
            });
          }
          setViewingPosterId(null);
        }}
      />
    );
  }

  // If viewing a specific session, show the detail view
  if (selectedSession) {
    return (
      <AvailableSessionView
        session={selectedSession}
        isOnRoster={selectedSessionIsOnRoster}
        onBack={() => setSelectedSession(null)}
        onOpenChat={onOpenChat as any}
        onViewProfile={(userId) => setViewingPosterId(userId)}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => onNavigateToDashboard?.('upcoming-sessions')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Sessions</h2>
        </div>

        {/* Segmented Control Toggle */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setViewMode('post')}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              viewMode === 'post'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Post a Session
          </button>
          <button
            onClick={() => setViewMode('find')}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              viewMode === 'find'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Find Sessions
          </button>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'post' ? (
        // POST A NEED VIEW
        <div className="p-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Sport for Session */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Sport for Session
              </label>
              <select
                value={selectedSport}
                onChange={(e) => {
                  setSelectedSport(e.target.value);
                  setSelectedPartnerRoles([]);
                  setPosterRole('');
                }}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              >
                {userSports.length > 0 ? (
                  <>
                    {userSports.map((sport) => (
                      <option key={sport} value={sport}>{sport}</option>
                    ))}
                    <option disabled>──────────</option>
                    <option value="Conditioning / Lifting">Conditioning / Lifting</option>
                  </>
                ) : (
                  <>
                    <option>Baseball</option>
                    <option>Softball</option>
                    <option>Soccer</option>
                    <option>Basketball</option>
                    <option>Volleyball</option>
                    <option>Football</option>
                    <option>Lacrosse</option>
                    <option>Field Hockey</option>
                    <option>Track and Field</option>
                    <option>Golf</option>
                    <option>Tennis</option>
                    <option disabled>──────────</option>
                    <option value="Conditioning / Lifting">Conditioning / Lifting</option>
                  </>
                )}
              </select>
            </div>

            {/* Team Type */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">Team Type</label>
              <div className="grid grid-cols-2 gap-2">
                {([['mens', "Men's"], ['womens', "Women's"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelectedTeamType(selectedTeamType === val ? '' : val)}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedTeamType === val
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* My Position / Role */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedSport === 'Conditioning / Lifting' ? 'My Role' : 'My Position'}
              </label>
              <select
                value={posterRole || (selectedSport !== 'Conditioning / Lifting' ? user?.position || '' : '')}
                onChange={(e) => setPosterRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="">
                  {selectedSport === 'Conditioning / Lifting' ? 'Select your role…' : 'Select your position…'}
                </option>
                {(sportPartnerRoles[selectedSport] || []).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-700">Date</label>
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    !selectedDate
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  2-Week Window
                </button>
              </div>
              <div className="relative">
                <select
                  value={selectedDate || 'Flexible'}
                  onChange={(e) => setSelectedDate(e.target.value === 'Flexible' ? '' : e.target.value)}
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  {DATE_OPTIONS.map((o) => (
                    <option key={o.val} value={o.val}>{o.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Time */}
            <SelectField
              label="Time"
              icon={<Clock className="w-4 h-4" />}
              value={selectedTime}
              onChange={setSelectedTime}
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </SelectField>

            <SelectField
              label="Duration"
              icon={<Clock className="w-4 h-4" />}
              value={duration}
              onChange={setDuration}
            >
              <option value="1 hr">1 hour</option>
              <option value="90 mins">90 minutes</option>
              <option value="2 hr">2 hours</option>
              <option value="Flexible">Flexible</option>
            </SelectField>

            {/* Location */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {isPostTraveling ? 'Destination / Field Name' : 'Field Name/Address'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsPostTraveling(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    isPostTraveling
                      ? 'bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Plane className="w-3 h-3" />
                  {isPostTraveling ? 'Traveling ✓' : 'Traveling?'}
                </button>
              </div>
              {isPostTraveling && (
                <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                  <Plane className="w-3 h-3" />
                  Your session will be marked as a traveler post so local athletes know you're visiting
                </p>
              )}
              <LocationAutocomplete
                value={locationValue}
                onChange={setLocationValue}
                placeholder={isPostTraveling ? "Where are you traveling to?" : "Search for a field or address..."}
              />
            </div>

            {/* Partner Skill Level */}
            <div>
              <label className="text-sm text-slate-700 mb-3 block flex items-center gap-2">
                <Award className="w-4 h-4" />
                Partner Skill Level
              </label>
              {/* All Levels toggle */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={allLevels}
                    onChange={() => {
                      setAllLevels(!allLevels);
                      if (!allLevels) setSelectedSkillLevels([]);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                    {allLevels && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                  All Levels
                </span>
              </label>
              {!allLevels && (
                <>
                  <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
                  <div className="flex flex-wrap gap-2">
                    {skillLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => toggleSkillLevel(level)}
                        className={`px-4 py-2.5 rounded-xl transition-all ${
                          selectedSkillLevels.includes(level)
                            ? 'bg-blue-900 text-white border-2 border-blue-800 shadow-lg shadow-blue-900/20'
                            : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Partner Role Needed — optional */}
            <div>
              <label className="text-sm text-slate-700 mb-1 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedSport === 'Conditioning / Lifting' ? 'Training Partner Needed' : 'Partner Role Needed'}
                <span className="text-xs text-slate-400 font-normal">— optional</span>
              </label>
              <p className="text-xs text-slate-400 mb-2">Skip this or describe what you need in the notes below</p>
              <div className="flex flex-wrap gap-2">
                {partnerRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => togglePartnerRole(role)}
                    className={`px-4 py-2.5 rounded-xl transition-all ${
                      selectedPartnerRoles.includes(role)
                        ? 'bg-blue-900 text-white border-2 border-blue-800 shadow-lg shadow-blue-900/20'
                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Goal/Notes */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Session Goal/Notes
              </label>
              <textarea
                ref={notesRef}
                placeholder="e.g., Need frame and block work, or focusing on curveball mechanics..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Primary Action Button */}
            <button
              disabled={submitting}
              onClick={handlePostSession}
              onTouchEnd={(e) => { e.preventDefault(); handlePostSession(); }}
              className="w-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-60 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-red-500/20 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 touch-manipulation"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'POST SESSION'}
            </button>
          </div>
        </div>
      ) : (
        // FIND SESSIONS VIEW
        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Traveling Toggle */}
            <button
              onClick={() => { setIsFindTraveling(v => !v); if (isFindTraveling) setFindTravelLocation(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                isFindTraveling
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <Plane className={`w-4 h-4 flex-shrink-0 ${isFindTraveling ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className="font-medium text-sm">{isFindTraveling ? 'Traveling mode on' : 'Traveling? Find sessions at your destination'}</span>
              <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                isFindTraveling ? 'bg-amber-400 border-amber-400' : 'border-slate-300'
              }`}>
                {isFindTraveling && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>

            {/* Travel destination input */}
            {isFindTraveling && (
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <input
                  type="text"
                  placeholder="Enter city or location (e.g. Miami, FL)"
                  value={findTravelLocation}
                  onChange={(e) => setFindTravelLocation(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-slate-900 placeholder-amber-400 focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                showFilters
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-5">
                {/* Sport Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-700 font-medium">Sport</label>
                    {filterSport.length > 0 && (
                      <button 
                        onClick={() => setFilterSport([])}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map((sport) => (
                      <button
                        key={sport}
                        onClick={() => toggleFilterSport(sport)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          filterSport.includes(sport)
                            ? 'bg-emerald-500 text-white border-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Position Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-700 font-medium">Position</label>
                    {filterPositions.length > 0 && (
                      <button 
                        onClick={() => setFilterPositions([])}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableFilterPositions.map((position) => (
                      <button
                        key={position}
                        onClick={() => toggleFilterPosition(position)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          filterPositions.includes(position)
                            ? 'bg-emerald-500 text-white border-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skill Level Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-700 font-medium">Skill Level</label>
                    {filterSkillLevels.length > 0 && (
                      <button 
                        onClick={() => setFilterSkillLevels([])}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {skillLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => toggleFilterSkillLevel(level)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          filterSkillLevels.includes(level)
                            ? 'bg-emerald-500 text-white border-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance Filter */}
                <div>
                  <label className="text-sm text-slate-700 font-medium mb-3 block">
                    Max Distance: {filterDistance} miles
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={filterDistance}
                    onChange={(e) => setFilterDistance(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>

                {/* Clear All Button */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Session Count */}
            <div className="py-2">
              <p className="text-sm text-slate-600">
                {loadingFind ? 'Loading...' : `${filteredNeeds.length} session${filteredNeeds.length !== 1 ? 's' : ''} available`}
              </p>
            </div>

            {/* Sessions List */}
            <div className="space-y-3 pb-20">
              {loadingFind && (
                <div className="flex justify-center py-8">
                  <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loadingFind && filteredNeeds.length === 0 && (
                <div className="flex flex-col items-center py-10 px-4 text-center space-y-5">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                    <MapPin className="w-10 h-10 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-semibold text-lg mb-2">
                      {searchQuery ? 'No sessions match your search' : activeFilterCount > 0 ? 'No sessions match your filters' : 'No sessions nearby yet'}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-xs">
                      {searchQuery
                        ? 'Try a different keyword, or clear your search to browse all sessions.'
                        : activeFilterCount > 0
                        ? 'Try clearing your filters — or invite teammates to grow the community!'
                        : 'Your area is just getting started. Be the first to post or invite athletes you know!'}
                    </p>
                  </div>
                  <div className="w-full space-y-2.5">
                    {searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
                      >
                        Clear Search
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleInviteShare}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm shadow-emerald-500/20"
                        >
                          <Share2 className="w-4 h-4" />
                          Invite Athletes to LinkUp
                        </button>
                        <button
                          onClick={() => setViewMode('post')}
                          className="w-full bg-white border-2 border-slate-200 hover:border-emerald-400 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                        >
                          Post My Own Session
                        </button>
                        {activeFilterCount > 0 && (
                          <button
                            onClick={() => { clearFilters(); setShowFilters(false); }}
                            className="w-full text-sm text-emerald-600 underline underline-offset-2 py-1"
                          >
                            Clear filters to see all sessions
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {!loadingFind && filteredNeeds.map((need) => (
                <NeedCard
                  key={need.id}
                  need={need}
                  onClick={() => {
                    setSelectedSession(need._session);
                    setSelectedSessionIsOnRoster(need.isOnRoster ?? false);
                  }}
                  onPosterClick={() => {
                    const posterId = (need._session?.postedBy as any)?._id;
                    if (posterId) setViewingPosterId(posterId);
                  }}
                />
              ))}
            </div>

            {/* Spread the word — shown when 1 or 2 sessions visible and not a search-filtered result */}
            {!loadingFind && !searchQuery && filteredNeeds.length >= 1 && filteredNeeds.length <= 2 && (
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 mt-1">
                <p className="font-semibold text-sm mb-1">
                  Only {filteredNeeds.length} session{filteredNeeds.length !== 1 ? 's' : ''} in your area right now
                </p>
                <p className="text-emerald-100 text-sm mb-4">
                  Help grow your local training community — invite teammates to download LinkUp!
                </p>
                <button
                  onClick={handleInviteShare}
                  className="w-full bg-white text-emerald-700 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Invite Athletes
                </button>
              </div>
            )}

            {/* Load more */}
            {!loadingFind && findPage < findTotalPages && (
              <div className="flex justify-center mt-1 mb-3">
                <button
                  onClick={handleLoadMoreSessions}
                  disabled={loadingMoreSessions}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  {loadingMoreSessions ? 'Loading…' : 'Load more sessions'}
                </button>
              </div>
            )}

            {/* Expand Search CTA — only shown when filters are hiding sessions */}
            {activeFilterCount > 0 && totalSessionCount !== null && totalSessionCount > filteredNeeds.length && (
              <button
                onClick={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                className="w-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-emerald-200 hover:border-emerald-300 text-emerald-900 py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex flex-col items-center gap-1"
              >
                <span className="font-medium">
                  Unlock {totalSessionCount - filteredNeeds.length} more session{totalSessionCount - filteredNeeds.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm text-emerald-700">Clear filters to see all available sessions</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Preferences Modal */}
      {showSavePrefsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl p-6 pb-10 space-y-4">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-slate-900 text-center">Save Preferences?</h3>
            <p className="text-sm text-slate-500 text-center">
              Save your sport, location, and duration as defaults for future sessions.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('linkup_session_prefs', JSON.stringify({
                    sport: selectedSport,
                    location: locationValue,
                    teamType: selectedTeamType,
                    duration,
                    posterRole,
                  }));
                  toast.success('Preferences saved!');
                } catch {}
                setShowSavePrefsModal(false);
                onNavigateToDashboard?.('upcoming-sessions');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-semibold transition-colors"
            >
              Save Preferences
            </button>
            <button
              onClick={() => {
                setShowSavePrefsModal(false);
                onNavigateToDashboard?.('upcoming-sessions');
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold transition-colors"
            >
              No Thanks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}