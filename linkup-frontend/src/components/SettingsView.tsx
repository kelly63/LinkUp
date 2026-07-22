import { ArrowLeft, Shield, KeyRound, LogOut, Eye, EyeOff, Trash2, Mail, Ban, FileText, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { auth as authApi } from '../lib/api';
import { toast } from 'sonner';
import { isBiometricAvailable, getBiometricEnabled, BiometryType } from '../lib/biometric';
import { Capacitor } from '@capacitor/core';

interface SettingsViewProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

export function SettingsView({ onBack, onNavigate, onLogout }: SettingsViewProps) {
  const { token, enableBiometric, disableBiometric } = useAuth();

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount(token);
      toast.success('Account deleted');
      onLogout?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete account');
    } finally {
      setDeleting(false);
    }
  };

  // Change password
  const [showChangePw, setShowChangePw] = useState(false);
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!cpCurrent || !cpNew || !cpConfirm) { toast.error('Please fill in all fields'); return; }
    if (cpNew !== cpConfirm) { toast.error('New passwords do not match'); return; }
    if (cpNew.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(cpNew)) { toast.error('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(cpNew)) { toast.error('Password must contain at least one number'); return; }
    if (!/[^A-Za-z0-9]/.test(cpNew)) { toast.error('Password must contain at least one special character'); return; }
    if (!token) return;
    setCpSaving(true);
    try {
      await authApi.changePassword(token, cpCurrent, cpNew);
      toast.success('Password updated');
      setShowChangePw(false);
      setCpCurrent(''); setCpNew(''); setCpConfirm('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update password');
    } finally {
      setCpSaving(false);
    }
  };

  // Biometric / Face ID
  // Always visible on native — show on iOS regardless of the async availability check.
  // Errors are surfaced at tap time rather than hiding the setting entirely.
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const isNative = Capacitor.isNativePlatform();
  const [biometricType, setBiometricType] = useState<BiometryType>(BiometryType.NONE);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    isBiometricAvailable().then(({ type }) => {
      if (type !== BiometryType.NONE) setBiometricType(type);
    });
    getBiometricEnabled().then(setBiometricEnabledState);
  }, []);

  const biometricLabel = biometricType === BiometryType.FACE_ID ? 'Face ID'
    : biometricType === BiometryType.TOUCH_ID ? 'Touch ID'
    : 'Face ID';

  const handleToggleBiometric = async () => {
    setBiometricLoading(true);
    try {
      if (biometricEnabled) {
        await disableBiometric();
        setBiometricEnabledState(false);
        toast.success(`${biometricLabel} disabled`);
      } else {
        await enableBiometric();
        setBiometricEnabledState(true);
        toast.success(`${biometricLabel} enabled`);
      }
    } catch (err: any) {
      const msg = (err?.message || err?.errorMessage || '').toLowerCase();
      if (msg.includes('not available') || msg.includes('not enrolled') || msg.includes('no identities')) {
        toast.error('Face ID is not set up on this device. Enable it in iOS Settings → Face ID & Passcode.');
      } else if (!msg.includes('cancel')) {
        toast.error('Face ID verification failed. Try again.');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-slate-900">Settings</h2>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-md mx-auto">

        {/* Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
          </div>

          <button
            onClick={() => setShowChangePw(true)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Change Password</h4>
              <p className="text-sm text-slate-500">Update your account password</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </button>
        </div>

        {/* Face ID / Biometric — always shown on native iOS */}
        {isNative && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-slate-900">{biometricLabel}</h4>
                <p className="text-sm text-slate-500">Require {biometricLabel} to open the app</p>
              </div>
              <button
                onClick={handleToggleBiometric}
                disabled={biometricLoading}
                className={`relative rounded-full overflow-hidden transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                  biometricEnabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                style={{ width: 52, height: 32 }}
              >
                <span
                  className="absolute bg-white rounded-full shadow transition-transform duration-200"
                  style={{
                    width: 26, height: 26,
                    top: 3, left: 3,
                    transform: biometricEnabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Blocked Users */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => onNavigate('blockedUsers')}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Blocked Users</h4>
              <p className="text-sm text-slate-500">Manage who you've blocked</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </button>
        </div>

        {/* Legal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legal</p>
          </div>
          <button
            onClick={() => setShowTerms(true)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Terms of Service</h4>
              <p className="text-sm text-slate-500">Read our terms</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </button>
          <button
            onClick={() => setShowPrivacy(true)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Privacy Policy</h4>
              <p className="text-sm text-slate-500">How we handle your data</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </button>
        </div>

        {/* Support */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <a
            href="mailto:support@linkupathletics.com"
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Contact Support</h4>
              <p className="text-sm text-slate-500">support@linkupathletics.com</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </a>
        </div>

        {/* Sign Out */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={onLogout}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-red-50 transition-colors"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-red-600">Sign Out</h4>
              <p className="text-sm text-slate-500">Sign out of your account</p>
            </div>
          </button>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-red-50 transition-colors"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-red-600">Delete Account</h4>
              <p className="text-sm text-slate-500">Permanently delete your account and all data</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 pb-2">LinkUp Athletics · Build 2026.07.14</p>
      </div>

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-red-600">Delete Account</h3>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium mb-1">This cannot be undone.</p>
                <p className="text-sm text-red-600">Your profile, sessions, connections, messages, and posts will be permanently deleted.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type <span className="font-bold">DELETE</span> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Permanently Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-slate-900">Terms of Service</h3>
              <button onClick={() => setShowTerms(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <div><h4 className="font-semibold text-slate-900 mb-1">1. Acceptance</h4><p>By creating an account, you agree to these Terms. If you do not agree, do not use LinkUp Athletics.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">2. Eligibility</h4><p>You must be at least 18 years old to use this platform.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">3. Our Role</h4><p>LinkUp Athletics is a connection platform. Our sole purpose is to help athletes find each other for training. We do not organize, supervise, or participate in any in-person sessions.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">4. Accurate Information</h4><p>You agree to provide truthful, accurate information about yourself. Misrepresentation may result in immediate account termination.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">5. Content Standards</h4><p>All content must be respectful and sports-related. No explicit content, harassment, threats, or spam.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">6. Prohibited Conduct</h4><ul className="list-disc list-inside space-y-1 ml-2 text-slate-600"><li>No harassment, threats, or bullying</li><li>No impersonation or false profiles</li><li>No solicitation or scams</li><li>No sharing others' personal information without consent</li></ul></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">7. In-Person Meetings — Your Risk</h4><p>Any in-person meeting arranged through LinkUp Athletics is entirely at your own risk. We do not verify identities, conduct background checks, or supervise sessions. Always meet in public places and tell someone where you're going.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">8. No Background Checks</h4><p>LinkUp Athletics does not perform criminal background checks. You accept full responsibility for exercising personal judgment when interacting with other users.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">9. Limitation of Liability</h4><p>LinkUp Athletics is not liable for any injuries, losses, or harm resulting from use of the platform or from meetings arranged through it.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">10. Termination</h4><p>We reserve the right to suspend or terminate any account that violates these Terms, at our sole discretion.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">11. Governing Law</h4><p>These Terms are governed by the laws of the State of New York.</p></div>
              <p className="text-xs text-slate-400 pt-2">Questions? Email support@linkupathletics.com</p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-slate-900">Privacy Policy</h3>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
              <div><h4 className="font-semibold text-slate-900 mb-1">Information We Collect</h4><p>We collect information you provide: name, email, location, profile photo, athletic background, and messages sent through the platform.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">How We Use Your Information</h4><ul className="list-disc list-inside space-y-1 ml-2 text-slate-600"><li>To display your profile to other users</li><li>To facilitate connections and messaging</li><li>To send notifications about account activity</li><li>To improve the platform</li></ul></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">What We Do NOT Do</h4><ul className="list-disc list-inside space-y-1 ml-2 text-slate-600"><li>We do not sell your personal information</li><li>We do not share your contact information without consent</li><li>We do not use your data for advertising</li></ul></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">Profile Visibility</h4><p>Your profile information is visible to other users according to your privacy settings, which you can update at any time.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">Messages</h4><p>Messages are stored on our servers. We may review them if needed to investigate reports of abuse.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">Data Retention</h4><p>Your data is retained as long as your account is active. Upon deletion, your personal data will be removed within 30 days.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">Security</h4><p>We use industry-standard security practices including encrypted passwords and secure connections.</p></div>
              <div><h4 className="font-semibold text-slate-900 mb-1">Contact</h4><p>Questions about your privacy? Email support@linkupathletics.com.</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Change Password</h3>
              <button onClick={() => { setShowChangePw(false); setCpCurrent(''); setCpNew(''); setCpConfirm(''); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <input type={cpShowCurrent ? 'text' : 'password'} value={cpCurrent} onChange={e => setCpCurrent(e.target.value)} placeholder="Enter current password"
                    autoComplete="current-password"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button type="button" onClick={() => setCpShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {cpShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={cpShowNew ? 'text' : 'password'} value={cpNew} onChange={e => setCpNew(e.target.value)} placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button type="button" onClick={() => setCpShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {cpNew.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {[
                      { ok: cpNew.length >= 8, label: '8+ characters' },
                      { ok: /[A-Z]/.test(cpNew), label: 'One uppercase letter' },
                      { ok: /[0-9]/.test(cpNew), label: 'One number' },
                      { ok: /[^A-Za-z0-9]/.test(cpNew), label: 'One special character (!@#$…)' },
                    ].map(({ ok, label }) => (
                      <div key={label} className="flex items-center gap-2 text-xs">
                        <span className={ok ? 'text-emerald-500' : 'text-slate-400'}>{ok ? '✓' : '○'}</span>
                        <span className={ok ? 'text-emerald-600' : 'text-slate-400'}>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button onClick={handleChangePassword} disabled={cpSaving}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60">
                {cpSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
