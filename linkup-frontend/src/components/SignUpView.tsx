import { ArrowLeft, Mail, Lock, User, Phone, MapPin, Award, Users, Check, Upload, Shield, FileCheck, Camera, Plus, X, Info, Eye, Map, Bell } from 'lucide-react';
import { useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { auth as authApi, users as usersApi } from '../lib/api';
import { ImageCropModal } from './ImageCropModal';

interface SignUpViewProps {
  onComplete: (token?: string, user?: any) => void;
  onBackToLogin?: () => void;
}

export function SignUpView({ onComplete, onBackToLogin }: SignUpViewProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [userType, setUserType] = useState<'athlete' | 'coach' | null>(null);
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<'license' | 'school_id' | 'passport' | null>(null);
  const [showCustomSportInput, setShowCustomSportInput] = useState(false);
  const [customSport, setCustomSport] = useState('');
  const [customSportSubmitted, setCustomSportSubmitted] = useState(false);
  
  // User Agreement state (Step 3)
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [agreementTab, setAgreementTab] = useState<'terms' | 'privacy'>('terms');

  // Verification state (Step 5)
  const [verificationOption, setVerificationOption] = useState<'roster' | 'other' | null>(null);
  const [verificationRosterUrl, setVerificationRosterUrl] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [ngbMemberId, setNgbMemberId] = useState('');

  // Post-registration state (Steps 7 & 8)
  const [regToken, setRegToken] = useState<string | null>(null);
  const [regUser, setRegUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    // Athlete specific
    teamType: '',
    school: '',
    sport: '',
    position: '',
    skillLevel: '',
    customSportRequest: '', // For storing custom sport
    // Coach specific
    sportsCoached: [] as string[],
    yearsExperience: '',
    certifications: '',
    customSportsRequested: [] as string[], // For storing custom sports for coaches
    // Privacy preferences
    visibilityMode: 'everyone' as 'everyone' | 'filtered',
    allowedLevels: [] as string[],
    allowedSports: [] as string[],
    allowCoaches: true,
    searchRadius: '25',
    searchNorthAmerica: true,
  });

  const availableSports = [
    'Baseball',
    'Softball',
    'Soccer',
    'Basketball',
    'Volleyball',
    'Football',
    'Lacrosse',
    'Wrestling',
    'Field Hockey',
    'Track and Field',
    'Golf',
    'Tennis',
    'Swimming',
  ];

  const skillLevels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro', 'Athlete - Other'];

  // Sports that have NGB (National Governing Body) membership IDs
  const ngbBySport: Record<string, string> = {
    'Wrestling':      'USA Wrestling Membership ID',
    'Lacrosse':       'US Lacrosse Member ID',
    'Swimming':       'USA Swimming Member ID',
    'Track and Field':'USATF Member ID',
    'Volleyball':     'USA Volleyball (USAV) Member ID',
    'Tennis':         'USTA Membership ID',
    'Golf':           'GHIN Number (USGA)',
    'Soccer':         'US Soccer Player ID',
    'Field Hockey':   'USA Field Hockey Member ID',
    'Baseball':       'USA Baseball Player ID',
    'Softball':       'USA Softball Member ID',
  };

  const positionsBySport: Record<string, string[]> = {
    'Baseball': ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Softball': ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Soccer': ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    'Volleyball': ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite'],
    'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'],
    'Lacrosse': ['Attack', 'Midfield', 'Defense', 'Goalie'],
    'Wrestling': ['125 lbs', '133 lbs', '141 lbs', '149 lbs', '157 lbs', '165 lbs', '174 lbs', '184 lbs', '197 lbs', '285 lbs'],
    'Field Hockey': ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
    'Track and Field': ['Sprinter', 'Distance Runner', 'Hurdler', 'Long Jumper', 'High Jumper', 'Triple Jumper', 'Pole Vaulter', 'Shot Putter', 'Discus Thrower', 'Javelin Thrower', 'Decathlete/Heptathlete'],
    'Golf': ['Driver', 'Irons', 'Short Game', 'Putting', 'Course Management'],
    'Tennis': ['Singles', 'Doubles', 'Serve & Volley', 'Baseline', 'Net Play'],
    'Swimming': ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley', 'Diver'],
  };

  const toggleSportCoached = (sport: string) => {
    if (formData.sportsCoached.includes(sport)) {
      setFormData({
        ...formData,
        sportsCoached: formData.sportsCoached.filter(s => s !== sport)
      });
    } else {
      setFormData({
        ...formData,
        sportsCoached: [...formData.sportsCoached, sport]
      });
    }
  };

  const toggleLevel = (level: string) => {
    if (formData.allowedLevels.includes(level)) {
      setFormData({
        ...formData,
        allowedLevels: formData.allowedLevels.filter(l => l !== level)
      });
    } else {
      setFormData({
        ...formData,
        allowedLevels: [...formData.allowedLevels, level]
      });
    }
  };

  const toggleAllLevels = () => {
    if (formData.allowedLevels.length === skillLevels.length) {
      // Deselect all
      setFormData({
        ...formData,
        allowedLevels: []
      });
    } else {
      // Select all
      setFormData({
        ...formData,
        allowedLevels: [...skillLevels]
      });
    }
  };

  const toggleSport = (sport: string) => {
    if (formData.allowedSports.includes(sport)) {
      setFormData({
        ...formData,
        allowedSports: formData.allowedSports.filter(s => s !== sport)
      });
    } else {
      setFormData({
        ...formData,
        allowedSports: [...formData.allowedSports, sport]
      });
    }
  };

  const toggleAllSports = () => {
    if (formData.allowedSports.length === availableSports.length) {
      // Deselect all
      setFormData({
        ...formData,
        allowedSports: []
      });
    } else {
      // Select all
      setFormData({
        ...formData,
        allowedSports: [...availableSports]
      });
    }
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1 && onBackToLogin) {
      onBackToLogin();
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const body: Record<string, unknown> = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        location: formData.location,
        role: userType || 'athlete',
        // Athlete fields
        teamType: formData.teamType,
        school: formData.school,
        sport: formData.sport,
        position: formData.position,
        skillLevel: formData.skillLevel,
        customSportRequest: formData.customSportRequest,
        // Coach fields
        sportsCoached: formData.sportsCoached,
        yearsExperience: formData.yearsExperience,
        certifications: formData.certifications,
        // Privacy
        visibilityMode: formData.visibilityMode,
        allowedLevels: formData.allowedLevels,
        allowedSports: formData.allowedSports,
        allowCoaches: formData.allowCoaches,
        searchNorthAmerica: formData.searchNorthAmerica,
        searchRadius: Number(formData.searchRadius),
        // Terms
        signature,
        agreedToTerms,
        agreedToPrivacyPolicy,
        ageVerified,
        // Verification
        verificationRosterUrl: verificationRosterUrl.trim(),
        verificationNote: verificationNote.trim(),
        ngbMemberId: ngbMemberId.trim(),
      };
      const { token, user } = await authApi.register(body);
      setRegToken(token);
      setRegUser(user);
      setStep(7);
    } catch (err: any) {
      setSubmitError(err.message || 'Registration failed. Please try again.');
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedDocument(file);
    }
  };

  const handlePhotoSelect = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perms = await CapCamera.requestPermissions({ permissions: ['photos'] });
        if (perms.photos === 'denied') return;
        const photo = await CapCamera.getPhoto({
          quality: 85,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          correctOrientation: true,
        });
        if (photo.dataUrl) setCropSource(photo.dataUrl);
      } catch (err: any) {
        if (err?.message !== 'User cancelled photos app') console.error(err);
      }
    } else {
      photoInputRef.current?.click();
    }
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setCropSource(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setAvatarPreview(ev.target.result as string); };
    reader.readAsDataURL(file);
    setCropSource(null);
  };

  const handlePhotoUploadAndContinue = async () => {
    if (!regToken || !avatarPreview) { setStep(8); return; }
    setAvatarUploading(true);
    try {
      const base64 = avatarPreview.split(',')[1];
      const binary = atob(base64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const blob = new Blob([arr], { type: 'image/jpeg' });
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const { user: updatedUser } = await usersApi.uploadAvatar(regToken, file);
      setRegUser(updatedUser);
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setAvatarUploading(false);
      setStep(8);
    }
  };

  // Step 1: Choose User Type
  if (step === 1) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          {onBackToLogin && (
            <button 
              onClick={onBackToLogin}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
          )}
          <h2 className="text-slate-900">Create Account</h2>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-8 pb-12">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/40"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/40"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/40"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/40"></div>
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                <img src="https://i.imgur.com/LnXJJ04.png" alt="LinkUp Athletics Logo" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <h1 className="text-white text-2xl mb-2 font-[Magra]">LinkUp Athletics</h1>
            <p className="text-emerald-200 text-sm">LinkUp. Level Up.</p>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="px-6 -mt-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h3 className="text-slate-900 mb-2 text-center">I am a...</h3>
            <p className="text-sm text-slate-600 text-center mb-6">
              Choose how you want to use LinkUp Athletics
            </p>
            
            <div className="space-y-3">
              {/* Athlete Option */}
              <button
                onClick={() => {
                  setUserType('athlete');
                  handleNext();
                }}
                className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-6 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Award className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-semibold text-lg">Athlete</h4>
                    <p className="text-sm text-blue-100">Find partners and improve my game</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Already have account */}
          {onBackToLogin && (
            <div className="text-center pb-6">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <button onClick={onBackToLogin} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                  Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Basic Information
  if (step === 2) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Basic Information</h2>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-12 h-1 bg-emerald-500 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <div className="w-12 h-1 bg-slate-300 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <div className="w-12 h-1 bg-slate-300 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 2 of 6</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a strong password"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {formData.password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {[
                    { ok: formData.password.length >= 8,        label: '8+ characters' },
                    { ok: /[A-Z]/.test(formData.password),      label: 'One uppercase letter' },
                    { ok: /[0-9]/.test(formData.password),      label: 'One number' },
                    { ok: /[^A-Za-z0-9]/.test(formData.password), label: 'One special character (!@#$…)' },
                  ].map(({ ok, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      <span className={ok ? 'text-emerald-500' : 'text-slate-400'}>
                        {ok ? '✓' : '○'}
                      </span>
                      <span className={ok ? 'text-emerald-600' : 'text-slate-400'}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleNext}
              className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: User Agreement
  if (step === 3) {
    const canContinue = agreedToTerms && agreedToPrivacyPolicy && ageVerified && signature.trim().length > 0;
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Legal Agreements</h2>
        </div>

        {/* Progress */}
        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-12 h-1 bg-emerald-500 rounded" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-12 h-1 bg-emerald-500 rounded" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-12 h-1 bg-slate-300 rounded" />
            <div className="w-2 h-2 bg-slate-300 rounded-full" />
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 3 of 6</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">

            {/* Tab switcher */}
            <div className="bg-slate-200 rounded-xl p-1 flex">
              <button
                onClick={() => setAgreementTab('terms')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${agreementTab === 'terms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Terms of Service {agreedToTerms && <span className="text-emerald-600 ml-1">✓</span>}
              </button>
              <button
                onClick={() => setAgreementTab('privacy')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${agreementTab === 'privacy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Privacy Policy {agreedToPrivacyPolicy && <span className="text-emerald-600 ml-1">✓</span>}
              </button>
            </div>

            {/* Terms of Service */}
            {agreementTab === 'terms' && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-700" />
                  <h3 className="text-slate-900 font-semibold text-sm">Terms of Service</h3>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto space-y-3 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">1. Acceptance</h4>
                    <p>By creating an account, you agree to these Terms. If you do not agree, do not use LinkUp Athletics.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">2. Eligibility</h4>
                    <p>You must be at least 18 years old to use this platform. By registering, you confirm you meet this requirement.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">3. Accurate Information</h4>
                    <p>You agree to provide truthful, accurate information about yourself, including your athletic background, identity, and credentials. Misrepresentation may result in immediate account termination.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">4. Prohibited Conduct</h4>
                    <p className="mb-1">You agree NOT to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-600">
                      <li>Harass, threaten, or harm other users</li>
                      <li>Send unsolicited sexual or offensive content</li>
                      <li>Impersonate another person or create false profiles</li>
                      <li>Use the platform for solicitation, spam, or scams</li>
                      <li>Attempt to circumvent safety or privacy features</li>
                      <li>Share another user's personal information without consent</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">5. In-Person Meetings</h4>
                    <p>LinkUp Athletics facilitates introductions only. We do not verify user identities, conduct background checks, or supervise in-person sessions. You are solely responsible for your safety when meeting other users. Always meet in public locations and inform someone of your plans.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">6. No Background Checks</h4>
                    <p>LinkUp Athletics does not perform criminal background checks on users. You acknowledge this and accept full responsibility for exercising personal judgment and caution.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">7. Limitation of Liability</h4>
                    <p>LinkUp Athletics is not liable for any injuries, losses, or damages resulting from use of the platform or meetings arranged through it. Your use of this platform is at your own risk.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">8. Payments</h4>
                    <p>All financial arrangements between users occur outside the platform. LinkUp Athletics does not process payments and bears no responsibility for payment disputes.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">9. Termination</h4>
                    <p>We reserve the right to suspend or terminate any account that violates these Terms, endangers other users, or engages in fraudulent activity, at our sole discretion.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">10. Governing Law</h4>
                    <p>These Terms are governed by the laws of the State of New York. Any disputes will be resolved in the courts of New York.</p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600 cursor-pointer" />
                    <p className="text-sm text-slate-900">I have read and agree to the Terms of Service</p>
                  </label>
                </div>
              </div>
            )}

            {/* Privacy Policy */}
            {agreementTab === 'privacy' && (
              <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-700" />
                  <h3 className="text-slate-900 font-semibold text-sm">Privacy Policy</h3>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto space-y-3 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Information We Collect</h4>
                    <p>We collect information you provide directly: name, email, phone number, location, profile photo, athletic background, and messages sent through the platform.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">How We Use Your Information</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-600">
                      <li>To display your profile to other users based on your privacy settings</li>
                      <li>To facilitate connections and messaging between users</li>
                      <li>To send notifications about activity on your account</li>
                      <li>To improve the platform and fix issues</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">What We Do NOT Do</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2 text-slate-600">
                      <li>We do not sell your personal information to third parties</li>
                      <li>We do not share your contact information without your consent</li>
                      <li>We do not use your data for advertising purposes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Profile Visibility</h4>
                    <p>Information on your profile (name, sport, position, photo, bio) is visible to other users according to the privacy settings you choose. You can update these settings at any time.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Messages</h4>
                    <p>Messages you send through the platform are stored on our servers. We may review messages if needed to investigate reports of abuse or violations.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Data Retention</h4>
                    <p>Your data is retained as long as your account is active. You may request account deletion by contacting us at kelly@linkupathlethics.com. Upon deletion, your personal data will be removed within 30 days.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Security</h4>
                    <p>We use industry-standard security practices including encrypted passwords and secure connections. However, no platform is 100% secure and we cannot guarantee absolute security.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Contact</h4>
                    <p>Questions about your privacy? Email kelly@linkupathlethics.com.</p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={agreedToPrivacyPolicy} onChange={(e) => setAgreedToPrivacyPolicy(e.target.checked)}
                      className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600 cursor-pointer" />
                    <p className="text-sm text-slate-900">I have read and agree to the Privacy Policy</p>
                  </label>
                </div>
              </div>
            )}

            {/* Age verification */}
            <div className={`bg-white rounded-2xl border-2 p-4 transition-colors ${ageVerified ? 'border-emerald-400' : 'border-slate-200'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={ageVerified} onChange={(e) => setAgeVerified(e.target.checked)}
                  className="w-5 h-5 mt-0.5 flex-shrink-0 accent-emerald-600 cursor-pointer" />
                <p className="text-sm text-slate-900 font-medium">I confirm that I am 18 years of age or older</p>
              </label>
            </div>

            {/* Electronic signature */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
              <label className="text-sm text-slate-700 mb-2 block font-semibold flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Electronic Signature
              </label>
              <p className="text-xs text-slate-500 mb-3">Type your full legal name to sign all agreements above.</p>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Your full legal name"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors font-serif text-lg"
              />
              {signature && (
                <p className="text-xs text-slate-400 mt-2">
                  Signed: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Completion checklist */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-1.5">
              {[
                { done: agreedToTerms, label: 'Agreed to Terms of Service' },
                { done: agreedToPrivacyPolicy, label: 'Agreed to Privacy Policy' },
                { done: ageVerified, label: 'Age confirmed (18+)' },
                { done: signature.trim().length > 0, label: 'Electronic signature provided' },
              ].map(({ done, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`text-sm ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{done ? '✓' : '○'}</span>
                  <span className={`text-xs ${done ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={!canContinue}
              className={`w-full py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] ${
                canContinue
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Sport/Position Details (for Athletes)
  if (step === 4 && userType === 'athlete') {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Athletic Profile</h2>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-16 h-1 bg-emerald-500 rounded"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-16 h-1 bg-emerald-500 rounded"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 4 of 6</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Team Type */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Team Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([['mens', "Men's"], ['womens', "Women's"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData({ ...formData, teamType: val })}
                    className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formData.teamType === val
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* School / College */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                School / College
              </label>
              <input
                type="text"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                placeholder="e.g., University of Maryland"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Primary Sport */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Primary Sport
              </label>
              <select 
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value, position: '' })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="">Select your sport</option>
                {availableSports.map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
                {formData.customSportRequest && (
                  <option value={formData.customSportRequest}>{formData.customSportRequest} (Pending Approval)</option>
                )}
              </select>
              
              {/* Custom Sport Input */}
              {!formData.customSportRequest && (
                <button
                  onClick={() => setShowCustomSportInput(true)}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add New Sport
                </button>
              )}

              {/* Custom Sport Submitted */}
              {formData.customSportRequest && (
                <div className="mt-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-900 font-semibold">Custom Sport Submitted</p>
                      <p className="text-xs text-amber-700 mt-1">
                        "{formData.customSportRequest}" has been sent to admins for review and approval. You can use it immediately, but it may be updated after review.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, customSportRequest: '', sport: '' });
                        setCustomSport('');
                      }}
                      className="p-1 hover:bg-amber-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-amber-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Sport Input Form */}
              {showCustomSportInput && (
                <div className="mt-3 bg-white border-2 border-emerald-300 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-900 font-semibold">Add New Sport</label>
                    <button
                      onClick={() => {
                        setShowCustomSportInput(false);
                        setCustomSport('');
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customSport}
                    onChange={(e) => setCustomSport(e.target.value)}
                    placeholder="e.g., Rugby, Cricket, Tennis..."
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors mb-3"
                  />
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-emerald-900 flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>This will be sent to admins for approval before being added to the official sport list.</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (customSport.trim()) {
                        setFormData({ ...formData, customSportRequest: customSport, sport: customSport });
                        setShowCustomSportInput(false);
                        setCustomSportSubmitted(true);
                      }
                    }}
                    disabled={!customSport.trim()}
                    className={`w-full py-2.5 rounded-lg transition-all ${
                      customSport.trim()
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Submit for Approval
                  </button>
                </div>
              )}
            </div>

            {/* Position */}
        
              
      

            {/* Skill Level */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Skill Level
              </label>
              <select 
                value={formData.skillLevel}
                onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
              >
                <option value="">Select your level</option>
                {skillLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleNext}
              className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Identity Verification
  if (step === 5) {
    const canContinue =
      verificationOption === 'roster'
        ? verificationRosterUrl.trim().length > 0
        : verificationOption === 'other'
        ? verificationNote.trim().length > 0
        : false;

    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Verify Your Identity</h2>
        </div>

        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-10 h-1 bg-emerald-500 rounded" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-10 h-1 bg-emerald-500 rounded" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-10 h-1 bg-emerald-500 rounded" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-10 h-1 bg-slate-300 rounded" />
            <div className="w-2 h-2 bg-slate-300 rounded-full" />
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 5 of 6</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-center mb-2">
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-1">Prove You're an Athlete</h3>
              <p className="text-sm text-slate-600">
                Verified athletes earn a badge on their profile. An admin will review your submission within a few days.
              </p>
            </div>

            {/* NGB Member ID — shown only for sports with an NGB */}
            {ngbBySport[formData.sport] && (
              <div className="bg-white rounded-2xl border-2 border-purple-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-700 font-semibold text-sm">{ngbBySport[formData.sport]}</span>
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Optional</span>
                </div>
                <input
                  type="text"
                  value={ngbMemberId}
                  onChange={(e) => setNgbMemberId(e.target.value)}
                  placeholder="Enter your membership ID"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">If you have one, this helps us verify your team membership faster.</p>
              </div>
            )}

            {/* Option 1: Roster URL */}
            <div
              onClick={() => setVerificationOption('roster')}
              className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                verificationOption === 'roster' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  verificationOption === 'roster' ? 'border-emerald-600' : 'border-slate-300'
                }`}>
                  {verificationOption === 'roster' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                </div>
                <span className="text-sm font-semibold text-slate-900">I have a college or team roster page</span>
              </div>
              {verificationOption === 'roster' && (
                <div className="mt-3 ml-8">
                  <input
                    type="url"
                    value={verificationRosterUrl}
                    onChange={(e) => setVerificationRosterUrl(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="https://goterps.com/roster/player123"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors text-sm"
                  />
                </div>
              )}
            </div>

            {/* Option 2: Free text */}
            <div
              onClick={() => setVerificationOption('other')}
              className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                verificationOption === 'other' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  verificationOption === 'other' ? 'border-emerald-600' : 'border-slate-300'
                }`}>
                  {verificationOption === 'other' && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                </div>
                <span className="text-sm font-semibold text-slate-900">Other — describe your credentials</span>
              </div>
              {verificationOption === 'other' && (
                <div className="mt-3 ml-8">
                  <textarea
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g., I played D1 soccer at University of Maryland (2019–2023). You can verify at goterps.com/soccer."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors text-sm resize-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={!canContinue}
              className={`w-full py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] ${
                canContinue
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              Submit for Review &amp; Continue
            </button>

            <button
              onClick={() => {
                setVerificationRosterUrl('');
                setVerificationNote('');
                setVerificationOption(null);
                handleNext();
              }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              Skip for now — I'll verify later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 6: Privacy & Visibility Settings
  if (step === 6) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Privacy Settings</h2>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-16 h-1 bg-emerald-500 rounded"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <div className="w-16 h-1 bg-emerald-500 rounded"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Final Step!</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Intro */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <Eye className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Control Your Visibility</h3>
              <p className="text-sm text-slate-600">
                Choose who can search for and view your profile
              </p>
            </div>

            {/* Visibility Mode */}
            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
              <label className="text-sm text-slate-700 mb-3 block font-semibold">Who can find you?</label>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-slate-50 {formData.visibilityMode === 'everyone' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}">
                  <div className="relative mt-0.5">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibilityMode === 'everyone'}
                      onChange={() => setFormData({ ...formData, visibilityMode: 'everyone' })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                      {formData.visibilityMode === 'everyone' && (
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">Everyone</span>
                    <p className="text-xs text-slate-500 mt-0.5">All athletes and coaches can see your profile</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-slate-50 {formData.visibilityMode === 'filtered' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}">
                  <div className="relative mt-0.5">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibilityMode === 'filtered'}
                      onChange={() => setFormData({ ...formData, visibilityMode: 'filtered' })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-emerald-600 transition-all flex items-center justify-center">
                      {formData.visibilityMode === 'filtered' && (
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">Filtered (Recommended)</span>
                    <p className="text-xs text-slate-500 mt-0.5">Only specific skill levels and sports</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Filtered Options */}
            {formData.visibilityMode === 'filtered' && (
              <>
                {/* Skill Levels */}
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                  <label className="text-sm text-slate-700 mb-3 block font-semibold">Allowed Skill Levels</label>
                  <p className="text-xs text-slate-500 mb-3">Who can search for you</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {skillLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={`px-3 py-2 rounded-lg text-xs transition-all ${
                          formData.allowedLevels.includes(level)
                            ? 'bg-emerald-500 text-white border-2 border-emerald-500'
                            : 'bg-white text-slate-700 border-2 border-slate-300'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <button
                      onClick={toggleAllLevels}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        formData.allowedLevels.length === skillLevels.length
                          ? 'bg-red-600 text-white border-2 border-red-500'
                          : 'bg-emerald-500 text-white border-2 border-emerald-500'
                      }`}
                    >
                      {formData.allowedLevels.length === skillLevels.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Sports */}
                <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
                  <label className="text-sm text-slate-700 mb-3 block font-semibold">Allowed Sports</label>
                  <p className="text-xs text-slate-500 mb-3">Which sports can find you</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {availableSports.map((sport) => (
                      <button
                        key={sport}
                        onClick={() => toggleSport(sport)}
                        className={`px-3 py-2 rounded-lg text-xs transition-all ${
                          formData.allowedSports.includes(sport)
                            ? 'bg-green-600 text-white border-2 border-green-500'
                            : 'bg-white text-slate-700 border-2 border-slate-300'
                        }`}
                      >
                        {sport}
                      </button>
                    ))}
                    <button
                      onClick={toggleAllSports}
                      className={`px-3 py-2 rounded-lg text-xs transition-all ${
                        formData.allowedSports.length === availableSports.length
                          ? 'bg-red-600 text-white border-2 border-red-500'
                          : 'bg-emerald-500 text-white border-2 border-emerald-500'
                      }`}
                    >
                      {formData.allowedSports.length === availableSports.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

               
                
              </>
            )}

            {/* Search Area */}
            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Map className="w-4 h-4 text-slate-700" />
                <label className="text-sm text-slate-700 font-semibold">Search Area</label>
              </div>

              {/* North America toggle */}
              <label className="flex items-start gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={formData.searchNorthAmerica}
                  onChange={(e) => setFormData({ ...formData, searchNorthAmerica: e.target.checked })}
                  className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600 cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Search throughout all of North America</p>
                  <p className="text-xs text-slate-500 mt-0.5">Athletes anywhere in North America can find your profile</p>
                </div>
              </label>

              {/* Radius slider — only when North America is off */}
              {!formData.searchNorthAmerica && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={formData.searchRadius}
                      onChange={(e) => setFormData({ ...formData, searchRadius: e.target.value })}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="w-14 text-right">
                      <span className="text-lg font-semibold text-slate-900">{formData.searchRadius}</span>
                      <span className="text-sm text-slate-500 ml-0.5">mi</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">Maximum distance for profile visibility</p>
                </div>
              )}
            </div>

            {/* Info Note */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-emerald-900 leading-relaxed">
                <strong>Note:</strong> You can always change these settings later in your profile settings.
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                {submitError}
              </p>
            )}

            {/* Complete Setup Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 text-white py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Check className="w-5 h-5" /> Complete Setup</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 7: Profile Photo
  if (step === 7) {
    return (
      <>
        <div className="h-full overflow-y-auto bg-slate-50">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
            <h2 className="text-slate-900">Profile Photo</h2>
          </div>
          <div className="p-6">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mt-1">Add a photo so other athletes and coaches can recognize you</p>
              </div>

              {/* Avatar preview / picker */}
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handlePhotoSelect}
                  className="relative w-32 h-32 rounded-full overflow-hidden bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-emerald-400" />
                  )}
                </button>
                <button
                  onClick={handlePhotoSelect}
                  className="px-5 py-2 border-2 border-emerald-500 text-emerald-600 rounded-xl text-sm font-medium"
                >
                  {avatarPreview ? 'Change Photo' : 'Choose Photo'}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoInputChange} />
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handlePhotoUploadAndContinue}
                  disabled={avatarUploading}
                  className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {avatarUploading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : avatarPreview ? 'Save Photo & Continue' : 'Skip for Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
        {cropSource && (
          <ImageCropModal
            imageUrl={cropSource}
            onConfirm={handleCropConfirm}
            onCancel={() => setCropSource(null)}
          />
        )}
      </>
    );
  }

  // Step 8: Push Notifications
  if (step === 8) {
    const requestAndFinish = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          await PushNotifications.requestPermissions();
          await PushNotifications.register();
        } else if ('Notification' in window) {
          await Notification.requestPermission();
        }
      } catch {}
      onComplete(regToken ?? undefined, regUser);
    };

    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <h2 className="text-slate-900">Stay in the Loop</h2>
        </div>
        <div className="p-6">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <Bell className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-slate-900 font-semibold text-lg mb-2">Enable Notifications</h3>
              <p className="text-sm text-slate-600">Get notified about connection requests, messages, and session updates</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              {[
                { icon: '🤝', text: 'New connection requests' },
                { icon: '💬', text: 'Messages from teammates & coaches' },
                { icon: '📅', text: 'Session confirmations & updates' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm text-slate-700">{text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={requestAndFinish}
                className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-4 rounded-xl font-medium"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => onComplete(regToken ?? undefined, regUser)}
                className="w-full py-3 text-slate-500 text-sm"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}