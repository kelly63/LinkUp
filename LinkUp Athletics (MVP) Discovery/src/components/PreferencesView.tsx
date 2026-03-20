import { ArrowLeft, Eye, Shield, Users, Bell, Map } from 'lucide-react';
import { useState } from 'react';

interface PreferencesViewProps {
  onBack: () => void;
}

export function PreferencesView({ onBack }: PreferencesViewProps) {
  const [visibilityMode, setVisibilityMode] = useState<'everyone' | 'filtered'>('filtered');
  const [allowedLevels, setAllowedLevels] = useState<string[]>(['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other']);
  const [allowedSports, setAllowedSports] = useState<string[]>(['Baseball']);
  const [searchRadius, setSearchRadius] = useState('25');
  const [allowCoaches, setAllowCoaches] = useState(true);

  const skillLevels = [
    'NCAA D1',
    'NCAA D2',
    'NCAA D3',
    'College - Other',
    'Pro',
  ];

  const sports = [
    'Baseball',
    'Softball',
    'Basketball',
    'Volleyball',
    'Football',
    'Soccer',
    'Lacrosse',
    'Field Hockey'
  ];

  const toggleLevel = (level: string) => {
    if (allowedLevels.includes(level)) {
      setAllowedLevels(allowedLevels.filter(l => l !== level));
    } else {
      setAllowedLevels([...allowedLevels, level]);
    }
  };

  const toggleSport = (sport: string) => {
    if (allowedSports.includes(sport)) {
      setAllowedSports(allowedSports.filter(s => s !== sport));
    } else {
      setAllowedSports([...allowedSports, sport]);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Privacy & Visibility</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Profile Visibility Section */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-900" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Profile Visibility</h3>
                <p className="text-xs text-slate-500">Control who can find you</p>
              </div>
            </div>

            {/* Visibility Mode Toggle */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibilityMode === 'everyone'}
                    onChange={() => setVisibilityMode('everyone')}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {visibilityMode === 'everyone' && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900 group-hover:text-blue-900 transition-colors">
                    Visible to Everyone
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All athletes can search for you
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibilityMode === 'filtered'}
                    onChange={() => setVisibilityMode('filtered')}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    {visibilityMode === 'filtered' && (
                      <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-900 group-hover:text-blue-900 transition-colors">
                    Filtered Visibility
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Only specific levels and sports can find you
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Skill Level Filters */}
          {visibilityMode === 'filtered' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-900" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Allowed Skill Levels</h3>
                  <p className="text-xs text-slate-500">Who can search for you</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {skillLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      allowedLevels.includes(level)
                        ? 'bg-purple-900 text-white border-2 border-purple-800 shadow-lg shadow-purple-900/20'
                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {allowedLevels.length === 0 && (
                <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  ⚠️ No levels selected - your profile won't be visible to anyone
                </p>
              )}
            </div>
          )}

          {/* Sport Filters */}
          {visibilityMode === 'filtered' && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-900" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Allowed Sports</h3>
                  <p className="text-xs text-slate-500">Which sports can find you</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => toggleSport(sport)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      allowedSports.includes(sport)
                        ? 'bg-green-900 text-white border-2 border-green-800 shadow-lg shadow-green-900/20'
                        : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>

              {allowedSports.length === 0 && (
                <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  ⚠️ No sports selected - your profile won't be visible to anyone
                </p>
              )}
            </div>
          )}

         

          {/* Search Radius */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <Map className="w-5 h-5 text-teal-900" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-slate-900">Search Radius</h3>
                <p className="text-xs text-slate-500">Maximum distance for visibility</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value)}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                />
                <div className="w-16 text-right">
                  <span className="text-lg font-semibold text-slate-900">{searchRadius}</span>
                  <span className="text-sm text-slate-500 ml-0.5">mi</span>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Only athletes within {searchRadius} miles can see your profile
              </p>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-[0.98]">
            Save Preferences
          </button>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>Privacy Note:</strong> These settings control who can search for and view your athletic profile. Your posted sessions are always visible to athletes who meet the session criteria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}