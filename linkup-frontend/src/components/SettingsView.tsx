import { ArrowLeft, Shield, KeyRound, LogOut, Eye, EyeOff, Trash2 } from 'lucide-react';
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType>(BiometryType.NONE);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    isBiometricAvailable().then(({ available, type }) => {
      setBiometricAvailable(available);
      setBiometricType(type);
    });
    getBiometricEnabled().then(setBiometricEnabledState);
  }, []);

  const biometricLabel = biometricType === BiometryType.FACE_ID ? 'Face ID' : 'Biometric Login';

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
      const msg = err?.message || '';
      if (!msg.includes('cancel') && !msg.includes('Cancel')) {
        toast.error('Biometric verification failed');
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

        {/* Security — Face ID / Biometric (native only, when available) */}
        {biometricAvailable && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security</p>
            </div>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-slate-900">{biometricLabel}</h4>
                <p className="text-sm text-slate-500">Require {biometricLabel} when opening the app</p>
              </div>
              <button
                onClick={handleToggleBiometric}
                disabled={biometricLoading}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                  biometricEnabled ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    biometricEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

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
