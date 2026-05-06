import { useState } from 'react';
import { Eye, EyeOff, Users, GraduationCap } from 'lucide-react';
import { auth as authApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const SPORTS = ['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis', 'Swimming', 'Wrestling', 'Cross Country'];
const AGE_GROUPS = ['Under 8', '8–10', '11–13', '14–17', '18+', 'All Ages'];
const TRAINING_TYPES = ['Agility', 'Strength', 'Conditioning', 'Speed', 'Flexibility', 'Plyometrics', 'Mental Coaching', 'Nutrition'];

export function AuthView() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [accountType, setAccountType] = useState<'parent' | 'coach'>('parent');

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // register only
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [kidSports, setKidSports] = useState<string[]>([]);

  // coach register
  const [sportsCoached, setSportsCoached] = useState<string[]>([]);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  const toggleSport = (s: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(s) ? list.filter(x => x !== s) : [...list, s]);
  };

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setSubmitting(true);
    try {
      const { token, user } = await authApi.login(email, password, accountType);
      login(token, user as any);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) { toast.error('Please fill in all fields'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { name, email, password, role: accountType, location };
      if (accountType === 'coach') {
        body.sportsCoached = sportsCoached;
        body.ageGroupsCoached = ageGroups;
        body.trainingTypes = trainingTypes;
        body.hourlyRate = hourlyRate ? Number(hourlyRate) : null;
        body.yearsExperience = yearsExp;
      }
      const { token, user } = await authApi.register(body);
      login(token, user as any);
      toast.success(`Welcome to LinkUp NextGen, ${name}!`);
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Logo */}
      <div className="pt-14 pb-6 px-8 text-center">
        <div className="w-20 h-20 bg-emerald-500/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
          <span className="text-white font-bold text-2xl">NG</span>
        </div>
        <h1 className="text-white text-2xl font-bold">LinkUp NextGen</h1>
        <p className="text-emerald-300 text-sm mt-1">Find the right coach for your child</p>
      </div>

      {/* Tab switcher */}
      <div className="mx-6 mb-6 bg-white/10 rounded-2xl p-1 flex">
        {(['login', 'register'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === m ? 'bg-white text-emerald-900 shadow-sm' : 'text-white/70'
            }`}
          >
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <div className="px-6 pb-8 space-y-4">
        {mode === 'register' && (
          <>
            {/* Account type */}
            <div className="flex gap-3">
              {([
                { type: 'parent', label: 'Parent / Guardian', Icon: Users, desc: 'Find coaches for my child' },
                { type: 'coach', label: 'Coach / Trainer', Icon: GraduationCap, desc: 'Offer my coaching services' },
              ] as const).map(({ type, label, Icon, desc }) => (
                <button
                  key={type}
                  onClick={() => setAccountType(type)}
                  className={`flex-1 p-3 rounded-2xl border-2 text-left transition-all ${
                    accountType === type
                      ? 'border-emerald-400 bg-emerald-500/20'
                      : 'border-white/20 bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${accountType === type ? 'text-emerald-400' : 'text-white/50'}`} />
                  <p className={`text-xs font-semibold ${accountType === type ? 'text-white' : 'text-white/60'}`}>{label}</p>
                  <p className={`text-[10px] mt-0.5 ${accountType === type ? 'text-emerald-300' : 'text-white/40'}`}>{desc}</p>
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
        />

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister(); }}
            className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors pr-12"
          />
          <button onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {mode === 'register' && (
          <>
            <input
              type="text"
              placeholder="City, State (e.g. Austin, TX)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
            />

            {accountType === 'parent' && (
              <div>
                <p className="text-white/70 text-sm mb-2">What sports do your kids play? (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSport(s, kidSports, setKidSports)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        kidSports.includes(s)
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-white/10 border-white/20 text-white/60'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accountType === 'coach' && (
              <>
                <div>
                  <p className="text-white/70 text-sm mb-2">Sports you coach</p>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleSport(s, sportsCoached, setSportsCoached)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          sportsCoached.includes(s)
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-white/10 border-white/20 text-white/60'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-2">Age groups you coach</p>
                  <div className="flex flex-wrap gap-2">
                    {AGE_GROUPS.map(ag => (
                      <button
                        key={ag}
                        onClick={() => toggleSport(ag, ageGroups, setAgeGroups)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          ageGroups.includes(ag)
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-white/10 border-white/20 text-white/60'
                        }`}
                      >
                        {ag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-white/70 text-sm mb-2">Training specialties (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {TRAINING_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => toggleSport(t, trainingTypes, setTrainingTypes)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          trainingTypes.includes(t)
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'bg-white/10 border-white/20 text-white/60'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Hourly rate ($)"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(e.target.value)}
                    className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Years experience"
                    value={yearsExp}
                    onChange={e => setYearsExp(e.target.value)}
                    className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </>
            )}
          </>
        )}

        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={submitting}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {submitting
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : mode === 'login' ? 'Sign In' : 'Create Account'
          }
        </button>
      </div>
    </div>
  );
}
