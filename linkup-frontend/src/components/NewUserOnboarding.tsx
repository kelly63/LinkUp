import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { SPORTS } from '../lib/sports';
import { useAuth } from '../lib/auth';
import { users as usersApi } from '../lib/api';
import { toast } from 'sonner';
import { hapticMedium } from '../lib/haptics';
import logo from '/logo.png';

const SKILL_LEVELS = [
  'Pro',
  'NCAA D1',
  'NCAA D2',
  'NCAA D3',
  'College - Other',
  'Adult Athlete (18-45yo)',
  'Adult Athlete (45+yo)',
];

const SPORT_POSITIONS: Record<string, string[]> = {
  'Baseball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field', 'Utility', 'DH'],
  'Softball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field', 'Utility', 'DP/FLEX'],
  'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  'Soccer': ['Goalkeeper', 'Center Back', 'Outside Back / Fullback', 'Defensive Mid', 'Central Mid', 'Attacking Mid', 'Winger', 'Striker / Forward'],
  'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'Safety', 'K/P', 'Athlete'],
  'Volleyball': ['Outside Hitter', 'Opposite / Right Side', 'Middle Blocker', 'Setter', 'Libero', 'Defensive Specialist'],
  'Lacrosse': ['Attack', 'Midfield', 'Defense', 'Goalie', 'FOGO'],
  'Field Hockey': ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
  'Track and Field': ['Sprints (100/200m)', 'Sprints (400m)', 'Middle Distance (800/1500m)', 'Distance (3k–10k)', 'Hurdles', 'Long Jump', 'High Jump', 'Triple Jump', 'Pole Vault', 'Shot Put', 'Discus', 'Javelin', 'Hammer', 'Decathlete / Heptathlete'],
  'Cross Country': ['Distance Runner', 'Middle Distance', 'Steeplechase'],
  'Golf': ['Driver', 'Irons', 'Short Game', 'All-Around'],
  'Tennis': ['Singles', 'Doubles', 'All-Around'],
  'Swimming': ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley', 'Relay Specialist'],
  'Hockey (Ice)': ['Center', 'Left Wing', 'Right Wing', 'Defenseman', 'Goalie'],
  'Rugby': ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8', 'Scrum Half', 'Fly Half', 'Centre', 'Wing', 'Fullback'],
  'Flag Football': ['QB', 'WR', 'Center', 'Rusher', 'DB', 'Safety'],
  'Wrestling': ['Freestyle', 'Greco-Roman', 'Folkstyle'],
};

interface Props {
  onComplete: () => void;
}

export function NewUserOnboarding({ onComplete }: Props) {
  const { token, user, updateUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedTeamType, setSelectedTeamType] = useState<'mens' | 'womens' | ''>('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState('');
  const [saving, setSaving] = useState(false);

  const positions = selectedSport ? (SPORT_POSITIONS[selectedSport] || []) : [];

  const handleSportNext = () => {
    if (!selectedSport) { toast.error('Please select your sport'); return; }
    setSelectedPosition('');
    setStep(2);
  };

  const handleDetailsNext = () => {
    if (!selectedSkillLevel) { toast.error('Please select your skill level'); return; }
    setStep(3);
  };

  const handleFinish = async () => {
    if (!token) return;
    if (saving) return;
    setSaving(true);
    try {
      const { user: updated } = await usersApi.updateProfile(token, {
        sport: selectedSport,
        position: selectedPosition,
        teamType: selectedTeamType,
        skillLevel: selectedSkillLevel,
      } as any);
      updateUser(updated);
      hapticMedium();
      onComplete();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save profile');
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-14 pb-10 text-center">
        <img src={logo} alt="LinkUp" className="w-14 h-14 rounded-2xl mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-1">Set Up Your Profile</h1>
        <p className="text-blue-200 text-sm">
          {step === 1 ? 'What sport do you play?' : step === 2 ? 'Your position and level' : 'Almost done!'}
        </p>
        {/* Step dots */}
        <div className="flex justify-center gap-2 mt-4">
          {([1, 2, 3] as const).map((s) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${step >= s ? 'bg-emerald-400' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">

        {/* ── Step 1: Sport ── */}
        {step === 1 && (
          <>
            <p className="text-sm text-slate-500 mb-2">Select your primary sport</p>
            <div className="grid grid-cols-2 gap-2">
              {SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setSelectedSport(sport)}
                  onTouchEnd={(e) => { e.preventDefault(); setSelectedSport(sport); }}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all text-left touch-manipulation ${
                    selectedSport === sport
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSportNext}
              onTouchEnd={(e) => { e.preventDefault(); handleSportNext(); }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4 touch-manipulation"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* ── Step 2: Position + Skill Level ── */}
        {step === 2 && (
          <>
            {/* Team type */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Team Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['mens', 'womens'] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSelectedTeamType(selectedTeamType === val ? '' : val)}
                    onTouchEnd={(e) => { e.preventDefault(); setSelectedTeamType(selectedTeamType === val ? '' : val); }}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation ${
                      selectedTeamType === val
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {val === 'mens' ? "Men's" : "Women's"}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            {positions.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Position</label>
                <div className="relative">
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="">Select your position…</option>
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Skill level */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Skill Level</label>
              <div className="flex flex-wrap gap-2">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedSkillLevel(level)}
                    onTouchEnd={(e) => { e.preventDefault(); setSelectedSkillLevel(level); }}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all touch-manipulation ${
                      selectedSkillLevel === level
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                onTouchEnd={(e) => { e.preventDefault(); setStep(1); }}
                className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-medium touch-manipulation"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDetailsNext}
                onTouchEnd={(e) => { e.preventDefault(); handleDetailsNext(); }}
                className="flex-2 flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 touch-manipulation"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              <div className="px-5 py-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Name</p>
                <p className="font-semibold text-slate-900">{user?.name || '—'}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Sport</p>
                <p className="font-semibold text-slate-900">{selectedSport}</p>
              </div>
              {selectedPosition && (
                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Position</p>
                  <p className="font-semibold text-slate-900">{selectedPosition}</p>
                </div>
              )}
              {selectedTeamType && (
                <div className="px-5 py-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Team Type</p>
                  <p className="font-semibold text-slate-900">{selectedTeamType === 'mens' ? "Men's" : "Women's"}</p>
                </div>
              )}
              <div className="px-5 py-4">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Skill Level</p>
                <p className="font-semibold text-slate-900">{selectedSkillLevel}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center">You can update these anytime from your profile.</p>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                onTouchEnd={(e) => { e.preventDefault(); setStep(2); }}
                className="flex-1 py-4 rounded-xl border-2 border-slate-200 text-slate-700 font-medium touch-manipulation"
              >
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                onTouchEnd={(e) => { e.preventDefault(); if (!saving) handleFinish(); }}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 disabled:opacity-60 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 touch-manipulation"
              >
                {saving
                  ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : "Let's Go!"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
