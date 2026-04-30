import { Calendar, Award, MapPin, Clock, ArrowLeft, Users, X, Search, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { NeedCard } from './NeedCard';
import { AvailableSessionView } from './AvailableSessionView';
import { UserProfileView } from './UserProfileView';
import { LocationAutocomplete } from './LocationAutocomplete';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, connections as connectionsApi, Session } from '../lib/api';
import { toast } from 'sonner';

function firstLastInitial(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface PostViewProps {
  onNavigateToDashboard?: (target: string) => void;
  userSports?: string[];
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

export function PostView({ onNavigateToDashboard, userSports = [], onOpenChat }: PostViewProps) {
  const { token, user } = useAuth();
  const [viewMode, setViewMode] = useState<'post' | 'find'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState(userSports.length > 0 ? userSports[0] : 'Baseball');
  const [selectedPartnerRoles, setSelectedPartnerRoles] = useState<string[]>([]);
  const [posterRole, setPosterRole] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [isDateFlexible, setIsDateFlexible] = useState(false);
  const [isTimeFlexible, setIsTimeFlexible] = useState(false);
  
  // Find Sessions filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterSport, setFilterSport] = useState<string[]>([]);
  const [filterPositions, setFilterPositions] = useState<string[]>([]);
  const [filterSkillLevels, setFilterSkillLevels] = useState<string[]>([]);
  const [filterDistance, setFilterDistance] = useState('10');
  
  // Post form fields
  const [locationValue, setLocationValue] = useState('');
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const durationRef = useRef<HTMLSelectElement>(null);
  const [submitting, setSubmitting] = useState(false);

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
  };
  
  const activeFilterCount = filterSport.length + filterPositions.length + filterSkillLevels.length + (filterDistance !== '10' ? 1 : 0);

  const handleDateAdd = (date: string) => {
    if (date && !selectedDates.includes(date)) {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleDateRemove = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(date => date !== dateToRemove));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleTimeAdd = (time: string) => {
    if (time && !selectedTimes.includes(time)) {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const handleTimeRemove = (timeToRemove: string) => {
    setSelectedTimes(selectedTimes.filter(time => time !== timeToRemove));
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Fetch available sessions when switching to find tab or filters change (resets to page 1)
  useEffect(() => {
    if (viewMode !== 'find' || !token) return;
    setFindPage(1);
    setLoadingFind(true);
    sessionsApi.getAvailable(token, {
      sport: filterSport.length === 1 ? filterSport[0] : undefined,
      skillLevel: filterSkillLevels.length === 1 ? filterSkillLevels[0] : undefined,
      page: 1,
    }).then(({ sessions, total, pages }) => {
      setAvailableSessions(sessions);
      setTotalSessionCount(total ?? sessions.length);
      setFindTotalPages(pages ?? 1);
    }).catch((err: any) => {
      toast.error(err?.message || 'Could not load sessions');
    }).finally(() => setLoadingFind(false));
  }, [viewMode, token, filterSport, filterSkillLevels]);

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
            Post a Need
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
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

            {/* My Position / Role */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedSport === 'Conditioning / Lifting' ? 'My Role' : 'My Position'}
              </label>
              <select
                value={posterRole || (selectedSport !== 'Conditioning / Lifting' ? user?.position || '' : '')}
                onChange={(e) => setPosterRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">
                  {selectedSport === 'Conditioning / Lifting' ? 'Select your role…' : 'Select your position…'}
                </option>
                {(sportPartnerRoles[selectedSport] || []).map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Partner Role Needed */}
            <div>
              <label className="text-sm text-slate-700 mb-3 block flex items-center gap-2">
                <Users className="w-4 h-4" />
                {selectedSport === 'Conditioning / Lifting' ? 'Training Partner Needed' : 'Partner Role Needed'}
              </label>
              <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
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

            {/* Date & Time & Duration */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                onChange={(e) => handleDateAdd(e.target.value)}
              />
              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDates.map((date) => (
                    <div
                      key={date}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-900 rounded-lg border border-blue-200"
                    >
                      <span className="text-sm font-medium">{formatDate(date)}</span>
                      <button
                        onClick={() => handleDateRemove(date)}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Flexible Date Option */}
              <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isDateFlexible}
                    onChange={() => setIsDateFlexible(!isDateFlexible)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {isDateFlexible && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Flexible on date <span className="text-xs text-slate-400">(Will discuss with partner)</span>
                </span>
              </label>
            </div>

            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </label>
              <input
                type="time"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                onChange={(e) => handleTimeAdd(e.target.value)}
              />
              {selectedTimes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedTimes.map((time) => (
                    <div
                      key={time}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-900 rounded-lg border border-blue-200"
                    >
                      <span className="text-sm font-medium">{formatTime(time)}</span>
                      <button
                        onClick={() => handleTimeRemove(time)}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Flexible Time Option */}
              <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isTimeFlexible}
                    onChange={() => setIsTimeFlexible(!isTimeFlexible)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {isTimeFlexible && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                  Flexible on time <span className="text-xs text-slate-400">(Will discuss with partner)</span>
                </span>
              </label>
            </div>

            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <select ref={durationRef} className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors">
                <option>1 hr</option>
                <option>90 mins</option>
                <option>2 hr</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Field Name/Address
              </label>
              <LocationAutocomplete
                value={locationValue}
                onChange={setLocationValue}
                placeholder="Search for a field or address..."
              />
            </div>

            {/* Partner Skill Level */}
            <div>
              <label className="text-sm text-slate-700 mb-3 block flex items-center gap-2">
                <Award className="w-4 h-4" />
                Partner Skill Level
              </label>
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Primary Action Button */}
            <button
              disabled={submitting}
              onClick={async () => {
                if (!token) return;
                if (selectedPartnerRoles.length === 0) {
                  toast.error('Please select at least one partner role.');
                  return;
                }
                if (selectedDates.length === 0 && !isDateFlexible) {
                  toast.error('Please add a date or mark as flexible.');
                  return;
                }
                setSubmitting(true);
                const resolvedPosterRole = posterRole || user?.position || '';
                const notes = notesRef.current?.value || '';
                try {
                  await sessionsApi.create(token, {
                    sport: selectedSport,
                    posterRole: resolvedPosterRole,
                    partnerRole: selectedPartnerRoles.join(', '),
                    title: `${selectedSport} – ${selectedPartnerRoles.join(' / ')} needed`,
                    date: selectedDates[0] || 'Flexible',
                    time: selectedTimes[0] || (isTimeFlexible ? 'Flexible' : ''),
                    duration: durationRef.current?.value || '1 hr',
                    location: locationValue,
                    skillLevelRequired: selectedSkillLevels.join(', '),
                    notes,
                    goals: notes,
                    sessionType: 'need',
                    status: 'open',
                  });
                  toast.success('Session posted! It\'s now visible to other athletes.');
                  // Reset form
                  setSelectedPartnerRoles([]);
                  setPosterRole('');
                  setSelectedDates([]);
                  setSelectedTimes([]);
                  setSelectedSkillLevels([]);
                  setLocationValue('');
                  if (notesRef.current) notesRef.current.value = '';
                  onNavigateToDashboard?.('upcoming-sessions');
                } catch (err: any) {
                  toast.error(err.message || 'Failed to post session.');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-60 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-red-500/20 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
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
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Filter Button */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                showFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
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
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis'].map((sport) => (
                      <button
                        key={sport}
                        onClick={() => toggleFilterSport(sport)}
                        className={`px-3 py-2 rounded-lg text-sm transition-all ${
                          filterSport.includes(sport)
                            ? 'bg-blue-600 text-white border-2 border-blue-500'
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
                        className="text-xs text-blue-600 hover:text-blue-700"
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
                            ? 'bg-blue-600 text-white border-2 border-blue-500'
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
                        className="text-xs text-blue-600 hover:text-blue-700"
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
                            ? 'bg-blue-600 text-white border-2 border-blue-500'
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
            <div className="space-y-3 pb-4">
              {loadingFind && (
                <div className="flex justify-center py-8">
                  <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                className="w-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:border-blue-300 text-blue-900 py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex flex-col items-center gap-1"
              >
                <span className="font-medium">
                  Unlock {totalSessionCount - filteredNeeds.length} more session{totalSessionCount - filteredNeeds.length !== 1 ? 's' : ''}
                </span>
                <span className="text-sm text-blue-700">Clear filters to see all available sessions</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}