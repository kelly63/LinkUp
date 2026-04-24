import { ArrowLeft, Mail, Lock, User, Phone, MapPin, Award, Users, Check, Upload, Shield, FileCheck, Camera, Plus, X, Info, Eye, Map } from 'lucide-react';
import { useState } from 'react';
import { auth as authApi } from '../lib/api';

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
  const [acknowledged, setAcknowledged] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
    // Athlete specific
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
    visibilityMode: 'filtered' as 'everyone' | 'filtered',
    allowedLevels: [] as string[],
    allowedSports: [] as string[],
    allowCoaches: true,
    searchRadius: '25',
  });

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

  const skillLevels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro', 'Athlete - Other'];

  const positionsBySport: Record<string, string[]> = {
    'Baseball': ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Softball': ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Soccer': ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    'Volleyball': ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite'],
    'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'],
    'Lacrosse': ['Attack', 'Midfield', 'Defense', 'Goalie'],
    'Field Hockey': ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
    'Track and Field': ['Sprinter', 'Distance Runner', 'Hurdler', 'Long Jumper', 'High Jumper', 'Triple Jumper', 'Pole Vaulter', 'Shot Putter', 'Discus Thrower', 'Javelin Thrower', 'Decathlete/Heptathlete'],
    'Golf': ['Driver', 'Irons', 'Short Game', 'Putting', 'Course Management'],
    'Tennis': ['Singles', 'Doubles', 'Serve & Volley', 'Baseline', 'Net Play']
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
        searchRadius: Number(formData.searchRadius),
        // Terms
        signature,
        agreedToTerms,
      };
      const { token, user } = await authApi.register(body);
      onComplete(token, user);
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
            <p className="text-blue-200 text-sm">LinkUp. Level Up.</p>
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
                className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-6 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
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
                <button onClick={onBackToLogin} className="text-blue-600 hover:text-blue-700 font-semibold">
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
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-12 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <div className="w-12 h-1 bg-slate-300 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
            <div className="w-12 h-1 bg-slate-300 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 2 of 4</p>
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleNext}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-[0.98]"
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
          <h2 className="text-slate-900">User Agreement</h2>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-12 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-12 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-12 h-1 bg-slate-300 rounded"></div>
            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 3 of 4</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto">
            {/* Info Section */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-slate-900 font-semibold mb-1">LinkUp Athletics User Agreement</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Please read and acknowledge the following terms before continuing.
                  </p>
                </div>
              </div>
            </div>

            {/* Agreement Content */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 mb-6 overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="text-slate-900 font-semibold">Terms & Conditions</h3>
              </div>
              
              <div className="p-4 max-h-80 overflow-y-auto space-y-4 text-sm text-slate-700 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">1. Purpose of Service</h4>
                  <p>
                    LinkUp Athletics is a platform designed to roster athletes with practice partners and coaches. 
                    The service facilitates team building for training purposes only and does not process any monetary transactions.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">2. User Conduct</h4>
                  <p className="mb-2">By using LinkUp Athletics, you agree to:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Provide accurate and truthful information about yourself</li>
                    <li>Maintain respectful communication with all users</li>
                    <li>Honor commitments made through the platform</li>
                    <li>Report any inappropriate behavior or safety concerns</li>
                    <li>Not use the platform for unauthorized commercial purposes</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">3. Safety & Liability</h4>
                  <p>
                    Users acknowledge that all athletic activities carry inherent risks. LinkUp Athletics is not responsible 
                    for any injuries, damages, or losses that may occur during practice sessions or meetings arranged through 
                    the platform. Users are solely responsible for their own safety and should take appropriate precautions.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">4. Privacy & Data</h4>
                  <p>
                    Your personal information will be protected according to our Privacy Policy. We will never share 
                    your contact information or personal details with third parties without your consent. Profile information 
                    you choose to share will be visible to other users based on your privacy settings.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">5. Payment Arrangements</h4>
                  <p>
                    While coaches may advertise their services and rates, all payment arrangements must be made directly 
                    between users outside of the LinkUp Athletics platform. We do not process, facilitate, or take 
                    responsibility for any financial transactions.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">6. Account Termination</h4>
                  <p>
                    LinkUp Athletics reserves the right to suspend or terminate accounts that violate these terms, 
                    engage in fraudulent activity, or pose safety concerns to other users.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">7. Age Requirement</h4>
                  <p>
                    Users must be at least 13 years old to use LinkUp Athletics. Users under 18 should have parental 
                    consent and supervision when arranging and attending practice sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-5 h-5 border-2 border-slate-300 rounded bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    I have read and understand the User Agreement, including all terms regarding safety, liability, and proper use of the platform.
                  </p>
                </div>
              </label>
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-5 h-5 border-2 border-slate-300 rounded bg-white checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    I agree to abide by these terms and conditions while using LinkUp Athletics.
                  </p>
                </div>
              </label>
            </div>

            {/* Signature Section */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 mb-6">
              <label className="text-sm text-slate-700 mb-3 block font-semibold flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Electronic Signature
              </label>
              <p className="text-xs text-slate-600 mb-3">
                By typing your full name below, you are providing your electronic signature to this agreement.
              </p>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors font-serif text-lg"
              />
              {signature && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Signed on: {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Legal Note */}
            <div className="bg-slate-100 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Legal Notice:</strong> This electronic signature has the same legal effect as a handwritten signature. 
                By continuing, you acknowledge that you have read, understood, and agreed to all terms outlined in this User Agreement.
              </p>
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleNext}
              disabled={!acknowledged || !agreedToTerms || !signature.trim()}
              className={`w-full py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] ${
                acknowledged && agreedToTerms && signature.trim()
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-600/20 hover:shadow-xl'
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
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-16 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-16 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Step 4 of 5</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Primary Sport */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">
                Primary Sport
              </label>
              <select 
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value, position: '' })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
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
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
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
                <div className="mt-3 bg-white border-2 border-blue-300 rounded-xl p-4">
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
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors mb-3"
                  />
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-blue-900 flex items-start gap-1">
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
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
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
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-xl transition-all mt-8 shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Privacy & Visibility Settings
  if (step === 5) {
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
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-16 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-16 h-1 bg-blue-600 rounded"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          </div>
          <p className="text-center text-xs text-slate-600 mt-2">Final Step!</p>
        </div>

        <div className="p-6">
          <div className="max-w-md mx-auto space-y-5">
            {/* Intro */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <Eye className="w-8 h-8 text-blue-600" />
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
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-slate-50 {formData.visibilityMode === 'everyone' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}">
                  <div className="relative mt-0.5">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibilityMode === 'everyone'}
                      onChange={() => setFormData({ ...formData, visibilityMode: 'everyone' })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-blue-600 transition-all flex items-center justify-center">
                      {formData.visibilityMode === 'everyone' && (
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-slate-900">Everyone</span>
                    <p className="text-xs text-slate-500 mt-0.5">All athletes and coaches can see your profile</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-slate-50 {formData.visibilityMode === 'filtered' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}">
                  <div className="relative mt-0.5">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.visibilityMode === 'filtered'}
                      onChange={() => setFormData({ ...formData, visibilityMode: 'filtered' })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-slate-300 rounded-full bg-white peer-checked:border-blue-600 transition-all flex items-center justify-center">
                      {formData.visibilityMode === 'filtered' && (
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
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
                            ? 'bg-blue-600 text-white border-2 border-blue-500'
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
                          : 'bg-blue-600 text-white border-2 border-blue-500'
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
                          : 'bg-blue-600 text-white border-2 border-blue-500'
                      }`}
                    >
                      {formData.allowedSports.length === availableSports.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </div>

               
                
              </>
            )}

            {/* Search Radius */}
            <div className="bg-white rounded-2xl p-4 border-2 border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Map className="w-4 h-4 text-slate-700" />
                <label className="text-sm text-slate-700 font-semibold">Search Radius</label>
              </div>
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
              <p className="text-xs text-slate-600 mt-2">
                Maximum distance for profile visibility
              </p>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-900 leading-relaxed">
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

  return null;
}