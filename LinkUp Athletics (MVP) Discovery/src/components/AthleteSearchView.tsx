import { Search, Filter, MapPin, Star, Award, Users, Calendar, ArrowLeft, ChevronDown, ChevronUp, X, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, UserPlus } from 'lucide-react';

interface Athlete {
  id: number;
  name: string;
  avatar: string;
  sport: string;
  position: string;
  level: string;
  location: string;
  distance: string;
  rating: number;
  sessionsCompleted: number;
  lookingFor: string[];
  onRoster?: boolean;
}

interface AthleteSearchViewProps {
  onBack?: () => void;
  onOpenChat?: (athlete: { id: number; name: string; avatar: string; sport: string; position: string; level: string }) => void;
  onViewProfile?: (userId: number, userType: 'athlete' | 'coach') => void;
}

export function AthleteSearchView({ onBack, onOpenChat, onViewProfile }: AthleteSearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanningState, setScanningState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedUser, setScannedUser] = useState<{ name: string; sport: string; userId: string } | null>(null);
  const [searchLocation, setSearchLocation] = useState('Los Angeles, CA');
  const [searchRadius, setSearchRadius] = useState(25);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Mock US cities database for autocomplete
  const usCities = [
    'Los Angeles, CA', 'San Diego, CA', 'San Francisco, CA', 'Sacramento, CA', 'Fresno, CA',
    'San Jose, CA', 'Oakland, CA', 'Santa Barbara, CA', 'Riverside, CA', 'Anaheim, CA',
    'New York, NY', 'Buffalo, NY', 'Rochester, NY', 'Albany, NY', 'Syracuse, NY',
    'Chicago, IL', 'Aurora, IL', 'Naperville, IL', 'Rockford, IL', 'Joliet, IL',
    'Houston, TX', 'San Antonio, TX', 'Dallas, TX', 'Austin, TX', 'Fort Worth, TX',
    'Phoenix, AZ', 'Tucson, AZ', 'Mesa, AZ', 'Scottsdale, AZ', 'Chandler, AZ',
    'Philadelphia, PA', 'Pittsburgh, PA', 'Allentown, PA', 'Erie, PA', 'Reading, PA',
    'Miami, FL', 'Orlando, FL', 'Tampa, FL', 'Jacksonville, FL', 'Fort Lauderdale, FL',
    'Naples, FL', 'Sarasota, FL', 'Tallahassee, FL', 'Gainesville, FL', 'West Palm Beach, FL',
    'Seattle, WA', 'Spokane, WA', 'Tacoma, WA', 'Vancouver, WA', 'Bellevue, WA',
    'Boston, MA', 'Worcester, MA', 'Springfield, MA', 'Cambridge, MA', 'Lowell, MA',
    'Denver, CO', 'Colorado Springs, CO', 'Aurora, CO', 'Fort Collins, CO', 'Boulder, CO',
    'Atlanta, GA', 'Savannah, GA', 'Columbus, GA', 'Augusta, GA', 'Macon, GA',
    'Detroit, MI', 'Grand Rapids, MI', 'Ann Arbor, MI', 'Lansing, MI', 'Flint, MI',
    'Portland, OR', 'Eugene, OR', 'Salem, OR', 'Bend, OR', 'Medford, OR',
    'Las Vegas, NV', 'Reno, NV', 'Henderson, NV', 'North Las Vegas, NV', 'Sparks, NV',
    'Nashville, TN', 'Memphis, TN', 'Knoxville, TN', 'Chattanooga, TN', 'Clarksville, TN',
    'Charlotte, NC', 'Raleigh, NC', 'Greensboro, NC', 'Durham, NC', 'Winston-Salem, NC',
    'Indianapolis, IN', 'Fort Wayne, IN', 'Evansville, IN', 'South Bend, IN', 'Carmel, IN',
    'Columbus, OH', 'Cleveland, OH', 'Cincinnati, OH', 'Toledo, OH', 'Akron, OH',
    'Milwaukee, WI', 'Madison, WI', 'Green Bay, WI', 'Kenosha, WI', 'Racine, WI',
    'Baltimore, MD', 'Frederick, MD', 'Rockville, MD', 'Gaithersburg, MD', 'Annapolis, MD',
    'Minneapolis, MN', 'St. Paul, MN', 'Rochester, MN', 'Duluth, MN', 'Bloomington, MN',
    'Kansas City, MO', 'St. Louis, MO', 'Springfield, MO', 'Columbia, MO', 'Independence, MO',
    'Salt Lake City, UT', 'West Valley City, UT', 'Provo, UT', 'West Jordan, UT', 'Orem, UT'
  ];

  // Handle location input change with autocomplete
  const handleLocationChange = (value: string) => {
    setSearchLocation(value);
    
    if (value.length > 0) {
      // Filter cities based on input
      const filtered = usCities.filter(city => 
        city.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8); // Limit to 8 suggestions
      
      setLocationSuggestions(filtered);
      setShowLocationSuggestions(filtered.length > 0);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  // Handle selecting a location suggestion
  const handleSelectLocation = (location: string) => {
    setSearchLocation(location);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock athlete data
  const athletes: Athlete[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      avatar: 'SJ',
      sport: 'Baseball',
      position: 'Pitcher (RHP)',
      level: 'NCAA D1',
      location: 'Los Angeles, CA',
      distance: '2.3 mi',
      rating: 4.9,
      sessionsCompleted: 34,
      lookingFor: ['Pitching Mechanics', 'Velocity Training'],
      onRoster: true
    },
    {
      id: 2,
      name: 'Marcus Williams',
      avatar: 'MW',
      sport: 'Basketball',
      position: 'Point Guard',
      level: 'HS Varsity',
      location: 'Los Angeles, CA',
      distance: '3.7 mi',
      rating: 4.8,
      sessionsCompleted: 28,
      lookingFor: ['Ball Handling', 'Shooting Form'],
      onRoster: false
    },
    {
      id: 3,
      name: 'Emily Chen',
      avatar: 'EC',
      sport: 'Soccer',
      position: 'Midfielder',
      level: 'NCAA D2',
      location: 'Los Angeles, CA',
      distance: '5.1 mi',
      rating: 5.0,
      sessionsCompleted: 41,
      lookingFor: ['Technical Skills', 'Tactical Awareness'],
      onRoster: true
    },
    {
      id: 4,
      name: 'David Martinez',
      avatar: 'DM',
      sport: 'Football',
      position: 'QB',
      level: 'NCAA D1',
      location: 'Los Angeles, CA',
      distance: '4.2 mi',
      rating: 4.7,
      sessionsCompleted: 22,
      lookingFor: ['Footwork', 'Decision Making'],
      onRoster: false
    },
    {
      id: 5,
      name: 'Jessica Taylor',
      avatar: 'JT',
      sport: 'Volleyball',
      position: 'Setter',
      level: 'HS Varsity',
      location: 'Los Angeles, CA',
      distance: '6.8 mi',
      rating: 4.9,
      sessionsCompleted: 37,
      lookingFor: ['Setting Technique', 'Court Vision'],
      onRoster: false
    }
  ];

  const sports = ['All Sports', 'Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis'];
  const levels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro'];

  const toggleLevel = (level: string) => {
    if (selectedLevels.includes(level)) {
      setSelectedLevels(selectedLevels.filter(l => l !== level));
    } else {
      setSelectedLevels([...selectedLevels, level]);
    }
  };

  const filteredAthletes = athletes.filter(athlete => {
    const matchesSearch = athlete.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         athlete.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport === 'All Sports' || athlete.sport === selectedSport;
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(athlete.level);
    return matchesSearch && matchesSport && matchesLevel;
  });

  const handleOpenQRScanner = () => {
    setShowQRScanner(true);
    setScanningState('idle');
    setScannedUser(null);
  };

  const handleStartScan = () => {
    setScanningState('scanning');
    // Simulate scanning process
    setTimeout(() => {
      // Mock successful scan
      setScannedUser({
        name: 'Alex Rodriguez',
        sport: 'Baseball',
        userId: 'user456'
      });
      setScanningState('success');
    }, 2000);
  };

  const handleViewScannedProfile = () => {
    if (scannedUser) {
      // Navigate to the scanned user's profile
      onViewProfile && onViewProfile(456, 'athlete');
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
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                <p className="text-sm text-purple-900 font-semibold">{searchLocation} • {searchRadius} mi radius</p>
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
              <div>
                <label className="text-xs text-slate-600 font-medium mb-1.5 block">Search Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <input
                    type="text"
                    placeholder="Enter city, state (e.g., Naples, FL)"
                    value={searchLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                    ref={locationInputRef}
                  />
                  {/* Location Suggestions Dropdown */}
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectLocation(suggestion)}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-purple-50 transition-colors flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                        >
                          <MapPin className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

              <button
                onClick={() => setShowLocationSearch(false)}
                className="w-full py-2.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition-all shadow-sm"
              >
                Apply Location
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
            className="px-3 py-2 rounded-lg border-2 border-slate-300 bg-white text-sm text-slate-700 focus:border-blue-500 focus:outline-none flex-1 mr-3"
          >
            {sports.map(sport => (
              <option key={sport}>{sport}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors text-sm ${
              selectedLevels.length > 0
                ? 'bg-blue-600 text-white border-blue-600'
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
                  className="text-xs text-blue-600 hover:text-blue-700"
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
                      ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-sm'
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

      {/* Results Count */}
      <div className="px-6 py-3 bg-slate-100 border-b border-slate-200">
        <p className="text-sm text-slate-600">
          {filteredAthletes.length} athlete{filteredAthletes.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Athletes List */}
      <div className="p-4 space-y-3">
        {filteredAthletes.map((athlete) => (
          <div
            key={athlete.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="relative w-14 h-14 flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {athlete.avatar}
                </div>
                {/* On Roster Badge */}
                {athlete.onRoster && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Shield className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                )}
              </div>

              {/* Athlete Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="text-slate-900 font-semibold">{athlete.name}</h3>
                      <p className="text-sm text-slate-600">{athlete.position}</p>
                    </div>
                    {/* On My Roster Label */}
                    {athlete.onRoster && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs rounded-full font-medium shadow-sm">
                        <Shield className="w-3 h-3 fill-white" />
                        On Roster
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-slate-900">{athlete.rating}</span>
                  </div>
                </div>

                {/* Sport & Level Badge */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                    <Award className="w-3 h-3" />
                    {athlete.level}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-lg">
                    {athlete.sport}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{athlete.distance} away</span>
                </div>

                {/* Looking For */}
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Looking for help with:</p>
                  <div className="flex flex-wrap gap-1">
                    {athlete.lookingFor.map((item, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{athlete.sessionsCompleted} sessions</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98]"
                    onClick={() => onOpenChat && onOpenChat({ id: athlete.id, name: athlete.name, avatar: athlete.avatar, sport: athlete.sport, position: athlete.position, level: athlete.level })}
                  >
                    Contact Athlete
                  </button>
                  <button
                    className="px-4 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 py-2.5 rounded-xl text-sm transition-all"
                    onClick={() => onViewProfile && onViewProfile(athlete.id, 'athlete')}
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

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
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-semibold text-xl">
                      {scannedUser.name.split(' ').map(n => n[0]).join('')}
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