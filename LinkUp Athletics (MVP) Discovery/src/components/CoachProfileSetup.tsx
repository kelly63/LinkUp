import { ArrowLeft, DollarSign, Award, Users, X } from 'lucide-react';
import { useState } from 'react';

interface CoachProfileSetupProps {
  onBack: () => void;
}

export function CoachProfileSetup({ onBack }: CoachProfileSetupProps) {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [certifications, setCertifications] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  const availableSports = [
    'Baseball',
    'Softball',
    'Soccer',
    'Basketball',
    'Volleyball',
    'Football',
    'Lacrosse',
    'Field Hockey',
    'Track and Field',
    'Golf',
    'Tennis'
  ];

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header with Back Arrow */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-slate-900">Coach/Trainer Profile Setup</h2>
      </div>

      <div className="p-6">
        <div className="max-w-md mx-auto space-y-5">
          {/* Sports Specialization */}
          <div>
            <label className="text-sm text-slate-700 mb-3 block flex items-center gap-2">
              <Award className="w-4 h-4" />
              Sports You Coach
            </label>
            <p className="text-xs text-slate-500 mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {availableSports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => toggleSport(sport)}
                  className={`px-4 py-2.5 rounded-xl transition-all ${
                    selectedSports.includes(sport)
                      ? 'bg-blue-900 text-white border-2 border-blue-800 shadow-lg shadow-blue-900/20'
                      : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Hourly Rate
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5 ml-1">Set your hourly coaching rate</p>
          </div>

          {/* Years of Experience */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block">
              Years of Experience
            </label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g., 5"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Certifications */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block">
              Certifications & Credentials
            </label>
            <textarea
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="e.g., NASM Certified, Former D1 Coach, USA Baseball Certified..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm text-slate-700 mb-2 block">
              Coaching Philosophy & Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell athletes about your coaching style, experience, and what makes you unique..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Save Button */}
          <button className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-[0.98]">
            SAVE COACH PROFILE
          </button>
        </div>
      </div>
    </div>
  );
}