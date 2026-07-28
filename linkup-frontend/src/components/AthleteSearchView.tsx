import { Search, Filter, MapPin, Star, Award, Users, Calendar, ArrowLeft, ChevronDown, ChevronUp, X, Shield, UserPlus, UserCheck, Clock } from 'lucide-react';
import { SPORTS } from '../lib/sports';
import { useState, useEffect, useCallback } from 'react';
import { QrCode, Camera } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { users as usersApi, connections as connectionsApi, User, avatarThumb } from '../lib/api';
import { LocationAutocomplete } from './LocationAutocomplete';
import { toast } from 'sonner';

interface AthleteSearchViewProps {
  onBack?: () => void;
  onOpenChat?: (athlete: { id: string; name: string; avatar: string; sport: string; position: string; level: string }) => void;
  onViewProfile?: (userId: string, userType: 'athlete' | 'coach') => void;
}

export function AthleteSearchView({ onBack, onOpenChat, onViewProfile }: AthleteSearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanningState, setScanningState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedUser, setScannedUser] = useState<{ name: string; sport: string; userId: string } | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchRadius, setSearchRadius] = useState(25);
  const [searchNorthAmerica, setSearchNorthAmerica] = useState(true);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<'all' | 'on_roster' | 'not_on_roster'>('all');

  const { token, user: me } = useAuth();
  const [athletes, setAthletes] = useState<User[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  // Map of userId -> roster status
  const [rosterStatus, setRosterStatus] = useState<Record<string, 'accepted' | 'pending' | 'none'>>({});
  const [sendingRequest, setSendingRequest] = useState<Record<string, boolean>>({});

  const fetchAthletes = useCallback(async () => {
    if (!token) return;
    setLoadingAthletes(true);
    try {
      const { users } = await usersApi.search(token, {
        search: searchQuery || undefined,
        sport: selectedSport !== 'All Sports' ? selectedSport : undefined,
        skillLevel: selectedLevels.length > 0 ? selectedLevels[0] : undefined,
        location: (!searchNorthAmerica && searchLocation) ? searchLocation : undefined,
        limit: 20,
      });
      setAthletes(users);
    } catch (err) {
      console.error('Failed to fetch athletes:', err);
    } finally {
      setLoadingAthletes(false);
    }
  }, [token, searchQuery, selectedSport, selectedLevels, searchLocation, searchNorthAmerica]);

  useEffect(() => {
    const t = setTimeout(fetchAthletes, 300);
    return () => clearTimeout(t);
  }, [fetchAthletes]);

  // Load roster statuses once on mount
  useEffect(() => {
    if (!token) return;
    Promise.all([
      connectionsApi.getAll(token),
      connectionsApi.getPending(token),
    ]).then(([{ connections: accepted }, { requests: pending }]) => {
      const map: Record<string, 'accepted' | 'pending'> = {};
      // accepted connections: shape is { user: { _id, ... } }
      accepted.forEach((c) => { if (c.user?._id) map[c.user._id.toString()] = 'accepted'; });
      // pending requests: shape is { requester: { _id, ... } } (incoming) or { user: { _id } }
      pending.forEach((c) => {
        const uid = (c as any).requester?._id || c.user?._id;
        if (uid) map[uid.toString()] = 'pending';
      });
      setRosterStatus(map);
    }).catch(() => {});
  }, [token]);

  const handleAddToRoster = async (athleteId: string) => {
    if (!token) return;
    setSendingRequest((prev) => ({ ...prev, [athleteId]: true }));
    try {
      await connectionsApi.sendRequest(token, athleteId);
      setRosterStatus((prev) => ({ ...prev, [athleteId]: 'pending' }));
      toast.success('Roster request sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send request');
    } finally {
      setSendingRequest((prev) => ({ ...prev, [athleteId]: false }));
    }
  };


  const sports = ['All Sports', ...SPORTS];
  const levels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro'];

  const toggleLevel = (level: string) => {
    if (selectedLevels.includes(level)) {
      setSelectedLevels(selectedLevels.filter(l => l !== level));
    } else {
      setSelectedLevels([...selectedLevels, level]);
    }
  };

  // Apply roster filter client-side on top of server results
  const filteredAthletes = athletes.filter((a) => {
    if (rosterFilter === 'on_roster') return rosterStatus[a._id] === 'accepted';
    if (rosterFilter === 'not_on_roster') return rosterStatus[a._id] !== 'accepted';
    return true;
  });

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
    setScanningState('idle');
    setScannedUser(null);
  };

  const handleStartScan = () => {
    setScanningState('scanning');
    // QR scanning requires a native device camera — show idle after 2s
    setTimeout(() => {
      setScanningState('idle');
    }, 2000);
  };

  const handleViewScannedProfile = () => {
    if (scannedUser) {
      // Navigate to the scanned user's profile
      onViewProfile && onViewProfile(scannedUser.userId, 'athlete');
      setShowQRScanner(false);
    }
  };

  const handleCloseScanner = () => {
    setShowQRScanner(false);
    setScanningState('idle');
    setScannedUser(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <h2 className="text-slate-900">Search Athletes</h2>
          </div>
          
          {/* Invite Athlete Button */}
          <button
            onClick={handleOpenQRScanner}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4" />
            <span className="text-sm">Scan QR</span>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Location Search Section */}
        <div className="mt-3">
          <button
            onClick={() => setShowLocationSearch(!showLocationSearch)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-300 rounded-xl transition-all"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-700" />
              <div className="text-left">
                <p className="text-xs text-purple-600 font-medium">Searching in</p>
                <p className="text-sm text-purple-900 font-semibold">
                  {searchNorthAmerica
                    ? 'All of North America'
                    : `${searchLocation || 'Everywhere'} • ${searchRadius} mi radius`}
                </p>
              </div>
            </div>
            {showLocationSearch ? (
              <ChevronUp className="w-5 h-5 text-purple-700" />
            ) : (
              <ChevronDown className="w-5 h-5 text-purple-700" />
            )}
          </button>

          {/* Expanded Location Search */}
          {showLocationSearch && (
            <div className="mt-2 p-4 bg-white border-2 border-purple-200 rounded-xl space-y-3">
              {/* North America toggle */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchNorthAmerica}
                  onChange={(e) => setSearchNorthAmerica(e.target.checked)}
                  className="w-5 h-5 mt-0.5 flex-shrink-0 accent-purple-600 cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Search throughout all of North America</p>
                  <p className="text-xs text-slate-500 mt-0.5">Find athletes anywhere in North America</p>
                </div>
              </label>

              {/* Location + radius — only when North America is off */}
              {!searchNorthAmerica && (
                <>
                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs text-slate-600 font-medium mb-1.5 block">Search Location</label>
                    <LocationAutocomplete
                      value={searchLocation}
                      onChange={setSearchLocation}
                      placeholder="Enter city or address (e.g., Naples, FL)"
                      className="text-sm py-2.5"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Perfect for finding partners when you travel</p>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-medium mb-1.5 block">Search Radius</label>
                    <div className="flex gap-2 flex-wrap">
                      {[5, 10, 25, 50, 100].map((radius) => (
                        <button
                          key={radius}
                          onClick={() => setSearchRadius(radius)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            searchRadius === radius
                              ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md border-2 border-purple-600'
                              : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {radius} mi
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowLocationSearch(false)}
                className="w-full py-2.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-sm"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-sm text-slate-700 focus:border-emerald-500 focus:outline-none flex-1 mr-3"
          >
            {sports.map(sport => (
              <option key={sport}>{sport}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
              selectedLevels.length > 0
                ? 'bg-emerald-500 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Levels{selectedLevels.length > 0 ? ` (${selectedLevels.length})` : ''}</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Expandable Level Filters */}
        {showFilters && (
          <div className="px-6 pb-4 border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-600">Select skill levels</p>
              {selectedLevels.length > 0 && (
                <button
                  onClick={() => setSelectedLevels([])}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleLevel(level)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedLevels.includes(level)
                      ? 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Roster Filter Pills */}
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-2">
        {(['all', 'on_roster', 'not_on_roster'] as const).map((f) => {
          const labels = { all: 'All', on_roster: 'On Roster', not_on_roster: 'Not Added' };
          const active = rosterFilter === f;
          return (
            <button
              key={f}
              onClick={() => setRosterFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                active
                  ? f === 'on_roster'
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-slate-500">
          {filteredAthletes.filter(a => a._id !== me?._id).length} found
        </span>
      </div>

      {/* Athletes List */}
      <div className="p-4 space-y-3">
        {loadingAthletes && (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loadingAthletes && filteredAthletes.filter(a => a._id !== me?._id).map((athlete) => {
          const status = rosterStatus[athlete._id] ?? 'none';
          const isSending = sendingRequest[athlete._id] ?? false;
          const thumb = avatarThumb(athlete.avatar, 56);
          return (
            <div
              key={athlete._id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
                  {thumb
                    ? <img src={thumb} alt={athlete.name} className="w-full h-full object-cover" />
                    : (athlete.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>

                {/* Athlete Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-slate-900 font-semibold">{athlete.name}</h3>
                      <p className="text-sm text-slate-600">{athlete.position}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'accepted' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          Roster
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                      {athlete.averageRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-slate-900">
                            {athlete.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sport & Level Badge */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {athlete.skillLevel && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-lg">
                        <Award className="w-3 h-3" />
                        {athlete.skillLevel}
                      </span>
                    )}
                    {athlete.sport && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg">
                        {athlete.sport}
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  {athlete.location && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="w-3 h-3" />
                      <span>{athlete.location}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {status === 'accepted' ? (
                      <>
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 border-2 border-emerald-300 text-emerald-700 py-2.5 rounded-xl text-sm cursor-default"
                        >
                          <Shield className="w-4 h-4" />
                          On Roster
                        </button>
                        <button
                          className="px-4 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98]"
                          onClick={() => onOpenChat && onOpenChat({
                            id: athlete._id,
                            name: athlete.name,
                            avatar: athlete.avatar || '',
                            sport: athlete.sport,
                            position: athlete.position,
                            level: athlete.skillLevel,
                          })}
                        >
                          Message
                        </button>
                      </>
                    ) : status === 'pending' ? (
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border-2 border-amber-200 text-amber-600 py-2.5 rounded-xl text-sm cursor-default"
                      >
                        <Clock className="w-4 h-4" />
                        Request Sent
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToRoster(athlete._id)}
                        disabled={isSending}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
                      >
                        <UserPlus className="w-4 h-4" />
                        {isSending ? 'Sending…' : 'Add to Roster'}
                      </button>
                    )}
                    <button
                      className="px-4 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 py-2.5 rounded-xl text-sm transition-all"
                      onClick={() => onViewProfile && onViewProfile(athlete._id, athlete.role)}
                    >
                      Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAthletes.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No athletes found matching your criteria</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* QR Scanner */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={handleCloseScanner}>
          <div className="bg-white rounded-3xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-slate-900 font-semibold">Scan QR Code</h3>
              <button
                onClick={handleCloseScanner}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scanner Content */}
            <div className="p-6">
              {scanningState === 'idle' && (
                <div className="text-center">
                  <div className="bg-slate-100 rounded-2xl p-8 mb-4">
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      {/* QR Code Frame */}
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-xl">
                        {/* Corner decorations */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-600 rounded-tl-xl"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-600 rounded-tr-xl"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-600 rounded-bl-xl"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-600 rounded-br-xl"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-slate-400" />
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">Position the QR code within the frame</p>
                  </div>
                  <button
                    onClick={handleStartScan}
                    className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Start Scanning
                  </button>
                </div>
              )}
              
              {scanningState === 'scanning' && (
                <div className="text-center">
                  <div className="bg-slate-900 rounded-2xl p-8 mb-4 relative overflow-hidden">
                    {/* Simulated camera view */}
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      {/* Animated scanning line */}
                      <div className="absolute inset-0 border-4 border-indigo-500 rounded-xl animate-pulse">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-indigo-400 shadow-lg shadow-indigo-400/50 animate-pulse"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-white/30" />
                      </div>
                    </div>
                    <p className="text-sm text-white">Scanning...</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              
              {scanningState === 'success' && scannedUser && (
                <div className="text-center">
                  <div className="bg-emerald-50 rounded-2xl p-6 mb-4">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-emerald-700 font-semibold mb-1">QR Code Scanned!</p>
                    <p className="text-xs text-emerald-600">Profile found</p>
                  </div>
                  
                  {/* Scanned User Info */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-semibold text-xl">
                      {(scannedUser.name || '').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <h4 className="text-slate-900 font-semibold mb-1">{scannedUser.name}</h4>
                    <p className="text-sm text-slate-600">{scannedUser.sport}</p>
                    <p className="text-xs text-slate-400 mt-1">ID: {scannedUser.userId}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleCloseScanner}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleViewScannedProfile}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white transition-all shadow-sm"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}