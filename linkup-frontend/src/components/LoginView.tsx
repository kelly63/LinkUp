import { Mail, Lock, Award } from 'lucide-react';
import { useState } from 'react';
import { auth as authApi, users as usersApi } from '../lib/api';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

interface LoginViewProps {
  onLogin: (token?: string, user?: any) => void;
  onSignUp: () => void;
}

export function LoginView({ onLogin, onSignUp }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Google new-user terms acceptance state
  const [googlePendingToken, setGooglePendingToken] = useState<string | null>(null);
  const [googlePendingUser, setGooglePendingUser] = useState<any>(null);
  const [gtAgreedTerms, setGtAgreedTerms] = useState(false);
  const [gtAgreedPrivacy, setGtAgreedPrivacy] = useState(false);
  const [gtAgeVerified, setGtAgeVerified] = useState(false);
  const [gtSignature, setGtSignature] = useState('');
  const [gtSaving, setGtSaving] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authApi.login(email, password);
      onLogin(token, user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      if (!Capacitor.isNativePlatform()) {
        await GoogleAuth.initialize({
          clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '',
          scopes: ['profile', 'email'],
        });
      }
      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser.authentication?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');

      const { token, user, isNewUser } = await authApi.googleLogin(idToken);
      if (!isNewUser) {
        onLogin(token, user);
      } else {
        setGooglePendingToken(token);
        setGooglePendingUser(user);
      }
    } catch (err: any) {
      if (err?.message !== 'The user canceled the sign-in flow.') {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleTermsSubmit = async () => {
    if (!googlePendingToken) return;
    setGtSaving(true);
    try {
      const { user: updated } = await usersApi.updateProfile(googlePendingToken, {
        agreedToTerms: true,
        agreedToPrivacyPolicy: true,
        ageVerified: true,
        signature: gtSignature,
      } as any);
      onLogin(googlePendingToken, updated);
    } catch (err: any) {
      setError(err.message || 'Could not save agreement');
      setGtSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-12 pb-16">
        <div className="text-center">
          {/* App Logo/Icon */}
          <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            {/* Decorative corner lines */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/40"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/40"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/40"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/40"></div>
            
            {/* Center icon */}
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
              <img src="https://i.imgur.com/LnXJJ04.png" alt="LinkUp Athletics Logo" className="w-10 h-10 object-contain" />
            </div>
          </div>
          
          <h1 className="text-white text-3xl mb-2 font-[Magra]">LinkUp Athletics</h1>
          <p className="text-blue-200">LinkUp. Level Up.</p>
        </div>
      </div>

      {/* Login Form */}
      <div className="px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <h2 className="text-slate-900 text-xl mb-6 text-center font-[Magra]">Welcome Back</h2>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2 font-[Magra]">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors font-[Magra]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block flex items-center gap-2 font-[Magra]">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition-colors font-[Magra]"
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <a 
                href="mailto:support@linkupathletics.com?subject=Password Reset Request&body=Hi LinkUp Athletics Support,%0D%0A%0D%0AI would like to reset my password for my account.%0D%0A%0D%0AThank you"
                className="text-sm text-blue-600 hover:text-blue-700 font-[Magra]"
              >
                Forgot password?
              </a>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-xl active:scale-[0.98] font-[Magra] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-[Magra]">OR</span>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 py-4 rounded-xl transition-all shadow-md border-2 border-slate-300 hover:border-slate-400 active:scale-[0.98] font-[Magra] flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Sign in with Google
            </button>
          </div>
        </div>

        {/* Google new-user terms modal */}
      {googlePendingToken && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">One last step</h3>
              <p className="text-sm text-slate-500 mt-1">Welcome, {googlePendingUser?.name}! Please agree to our terms to continue.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer bg-slate-50 rounded-xl p-3">
              <input type="checkbox" checked={gtAgreedTerms} onChange={(e) => setGtAgreedTerms(e.target.checked)} className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600" />
              <p className="text-sm text-slate-700">I agree to the <span className="text-blue-600 font-medium">Terms of Service</span> — including the no background check disclosure and in-person meeting liability waiver</p>
            </label>

            <label className="flex items-start gap-3 cursor-pointer bg-slate-50 rounded-xl p-3">
              <input type="checkbox" checked={gtAgreedPrivacy} onChange={(e) => setGtAgreedPrivacy(e.target.checked)} className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600" />
              <p className="text-sm text-slate-700">I agree to the <span className="text-blue-600 font-medium">Privacy Policy</span></p>
            </label>

            <label className="flex items-start gap-3 cursor-pointer bg-slate-50 rounded-xl p-3">
              <input type="checkbox" checked={gtAgeVerified} onChange={(e) => setGtAgeVerified(e.target.checked)} className="w-5 h-5 mt-0.5 flex-shrink-0 accent-emerald-600" />
              <p className="text-sm text-slate-700 font-medium">I confirm I am 18 years of age or older</p>
            </label>

            <div>
              <p className="text-xs text-slate-500 mb-2">Type your full legal name as your electronic signature</p>
              <input
                type="text"
                value={gtSignature}
                onChange={(e) => setGtSignature(e.target.value)}
                placeholder="Your full legal name"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-serif text-lg"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>}

            <button
              onClick={handleGoogleTermsSubmit}
              disabled={!gtAgreedTerms || !gtAgreedPrivacy || !gtAgeVerified || !gtSignature.trim() || gtSaving}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                gtAgreedTerms && gtAgreedPrivacy && gtAgeVerified && gtSignature.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {gtSaving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : 'Continue to LinkUp Athletics'}
            </button>

            <button onClick={() => { setGooglePendingToken(null); setGooglePendingUser(null); }} className="w-full py-3 text-sm text-slate-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sign Up Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-slate-900 mb-2 text-center font-[Magra]">New to LinkUp Athletics?</h3>
          <p className="text-sm text-slate-600 text-center mb-4">
            Join thousands of athletes and coaches
          </p>
          
          <button
            onClick={onSignUp}
            className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl active:scale-[0.98]"
          >
            Create Account
          </button>
        </div>

        {/* Features */}
        <div className="space-y-3 pb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-slate-900 text-sm font-semibold">For Athletes</h4>
              <p className="text-xs text-slate-600">Find training partners and maximize your potential</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}