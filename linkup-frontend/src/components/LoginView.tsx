import { Mail, Lock, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth as authApi, users as usersApi } from '../lib/api';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Preferences } from '@capacitor/preferences';
import logo from '/logo.png';

interface LoginViewProps {
  onLogin: (token?: string, user?: any) => void;
  onSignUp: () => void;
}

const IOS_CLIENT_ID = '432112410961-39m83q270cgj7q5140nl5kghnn8es4qd.apps.googleusercontent.com';
const WEB_CLIENT_ID = '432112410961-q9da62ss2fb94ipb7h6e5ige1v0eaoni.apps.googleusercontent.com';

export function LoginView({ onLogin, onSignUp }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);

  useEffect(() => {
    Preferences.get({ key: 'linkup_remember_email' }).then(({ value }) => {
      if (value === 'true') {
        setRememberEmail(true);
        Preferences.get({ key: 'linkup_saved_email' }).then(({ value: saved }) => {
          if (saved) setEmail(saved);
        });
      }
    });
  }, []);

  useEffect(() => {
    SocialLogin.initialize({
      google: {
        iOSClientId: IOS_CLIENT_ID,
        iOSServerClientId: WEB_CLIENT_ID,
        webClientId: WEB_CLIENT_ID,
        mode: 'online',
      },
    }).catch(() => {});
  }, []);

  // Google new-user terms acceptance state
  // Forgot-password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotDone(true);
    } catch (err: any) {
      setForgotError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotDone(false);
    setForgotError('');
  };

  const [googlePendingToken, setGooglePendingToken] = useState<string | null>(null);
  const [googlePendingUser, setGooglePendingUser] = useState<any>(null);
  const [gtAgreedTerms, setGtAgreedTerms] = useState(false);
  const [gtAgreedPrivacy, setGtAgreedPrivacy] = useState(false);
  const [gtAgeVerified, setGtAgeVerified] = useState(false);
  const [gtSignature, setGtSignature] = useState('');
  const [gtSaving, setGtSaving] = useState(false);

  const [appleLoading, setAppleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, user } = await authApi.login(email, password);
      if (rememberEmail) {
        await Preferences.set({ key: 'linkup_remember_email', value: 'true' });
        await Preferences.set({ key: 'linkup_saved_email', value: email });
      } else {
        await Preferences.remove({ key: 'linkup_remember_email' });
        await Preferences.remove({ key: 'linkup_saved_email' });
      }
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
      const result = await SocialLogin.login({
        provider: 'google',
        options: { scopes: ['email', 'profile'] },
      });
      const idToken = (result.result as any)?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');

      const { token, user, isNewUser } = await authApi.googleLogin(idToken);
      if (!isNewUser) {
        onLogin(token, user);
      } else {
        setGooglePendingToken(token);
        setGooglePendingUser(user);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('cancel') && !msg.includes('Cancel') && !msg.includes('dismiss')) {
        setError(msg || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setAppleLoading(true);
    try {
      const result = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] },
      });
      const r = result.result as any;
      const idToken = r?.idToken;
      if (!idToken) throw new Error('No identity token from Apple');

      const name = r?.givenName && r?.familyName
        ? `${r.givenName} ${r.familyName}`.trim()
        : r?.givenName || r?.displayName || undefined;
      const email = r?.email || undefined;

      const { token, user, isNewUser } = await authApi.appleLogin(idToken, name, email);
      if (!isNewUser) {
        onLogin(token, user);
      } else {
        setGooglePendingToken(token);
        setGooglePendingUser(user);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        setError(msg || 'Apple sign-in failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
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
              <img src={logo} alt="LinkUp Athletics Logo" className="w-10 h-10 object-contain" />
            </div>
          </div>
          
          <h1 className="text-white text-3xl mb-2 font-[Magra]">LinkUp Athletics</h1>
          <p className="text-emerald-200">LinkUp. Level Up.</p>
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
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors font-[Magra]"
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
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors font-[Magra]"
              />
            </div>

            {/* Remember me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
                <span className="text-sm text-slate-600 font-[Magra]">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-[Magra] bg-transparent border-none cursor-pointer p-0"
              >
                Forgot password?
              </button>
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
              className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 text-white py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-xl active:scale-[0.98] font-[Magra] flex items-center justify-center gap-2"
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

            {/* Apple Sign-In Button — required by App Store Guideline 4.8; must be at least as prominent as other third-party login buttons */}
            {Capacitor.isNativePlatform() && (
              <button
                onClick={handleAppleSignIn}
                disabled={googleLoading || appleLoading}
                className="w-full bg-black hover:bg-slate-900 disabled:opacity-60 text-white py-4 rounded-xl transition-all shadow-md active:scale-[0.98] font-[Magra] flex items-center justify-center gap-3"
              >
                {appleLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                )}
                Sign in with Apple
              </button>
            )}

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || appleLoading}
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

      {/* Forgot Password modal */}
      {showForgot && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-[Magra]">Reset Password</h3>
              <p className="text-sm text-slate-500 mt-1">
                {forgotDone
                  ? "Check your email for a reset link."
                  : "Enter your email and we'll send you a link to reset your password."}
              </p>
            </div>

            {!forgotDone && (
              <>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors font-[Magra]"
                  autoFocus
                />

                {forgotError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                    {forgotError}
                  </p>
                )}

                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center font-[Magra]"
                >
                  {forgotLoading
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : 'Send Reset Link'}
                </button>
              </>
            )}

            {forgotDone && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
                <p className="text-sm text-emerald-700">
                  If an account with that email exists, a reset link has been sent. Check your inbox (and spam folder).
                </p>
              </div>
            )}

            <button onClick={closeForgot} className="w-full py-3 text-sm text-slate-500 font-[Magra]">
              {forgotDone ? 'Back to Sign In' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

        {/* Google new-user terms modal */}
      {googlePendingToken && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
              <p className="text-sm text-slate-700">I agree to the <a href={`${import.meta.env.VITE_API_URL || 'https://linkup-swpu.onrender.com'}/terms.html`} target="_blank" rel="noreferrer" className="text-emerald-600 font-medium underline">Terms of Service</a> — including the no background check disclosure and in-person meeting liability waiver</p>
            </label>

            <label className="flex items-start gap-3 cursor-pointer bg-slate-50 rounded-xl p-3">
              <input type="checkbox" checked={gtAgreedPrivacy} onChange={(e) => setGtAgreedPrivacy(e.target.checked)} className="w-5 h-5 mt-0.5 flex-shrink-0 accent-blue-600" />
              <p className="text-sm text-slate-700">I agree to the <a href={`${import.meta.env.VITE_API_URL || 'https://linkup-swpu.onrender.com'}/privacy.html`} target="_blank" rel="noreferrer" className="text-emerald-600 font-medium underline">Privacy Policy</a></p>
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
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none font-serif text-lg"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{error}</p>}

            <button
              onClick={handleGoogleTermsSubmit}
              disabled={!gtAgreedTerms || !gtAgreedPrivacy || !gtAgeVerified || !gtSignature.trim() || gtSaving}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                gtAgreedTerms && gtAgreedPrivacy && gtAgeVerified && gtSignature.trim()
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
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
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 text-emerald-600" />
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