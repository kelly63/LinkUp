import { ArrowLeft, Shield, Bell, KeyRound, LogOut, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../lib/auth';
import { auth as authApi } from '../lib/api';
import { toast } from 'sonner';
import { useNativePush } from '../hooks/useNativePush';
import { usePushNotifications } from '../hooks/usePushNotifications';

interface SettingsViewProps {
  onBack: () => void;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

export function SettingsView({ onBack, onNavigate, onLogout }: SettingsViewProps) {
  const { token } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  // Native push (iOS app)
  const { enabled: nativeEnabled, loading: nativeLoading, enable: enableNative, disable: disableNative } = useNativePush(token);
  // Web push (browser)
  const { supported: webSupported, permission, subscribed, loading: webLoading, enable: enableWeb, disable: disableWeb } = usePushNotifications(token);

  const pushEnabled = isNative ? nativeEnabled : subscribed;
  const pushLoading = isNative ? nativeLoading : webLoading;
  const pushSupported = isNative ? true : webSupported;
  const pushBlocked = !isNative && permission === 'denied';

  const togglePush = () => {
    if (isNative) {
      pushEnabled ? disableNative() : enableNative();
    } else {
      pushEnabled ? disableWeb() : enableWeb();
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
    if (cpNew.length < 6) { toast.error('New password must be at least 6 characters'); return; }
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

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Notifications</p>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-slate-900">Push Notifications</h4>
              <p className="text-sm text-slate-500 mt-0.5">
                {pushBlocked ? 'Blocked — enable in iPhone Settings' :
                 pushEnabled ? 'You\'ll get alerts for messages & requests' :
                 'Get notified about messages & requests'}
              </p>
            </div>
            {pushSupported && !pushBlocked && (
              <button
                onClick={togglePush}
                disabled={pushLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  pushEnabled ? 'bg-purple-600' : 'bg-slate-300'
                } ${pushLoading ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pushEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
          </div>

          <button
            onClick={() => onNavigate('preferences')}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Privacy & Visibility</h4>
              <p className="text-sm text-slate-500">Control who can see your profile</p>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
          </button>

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
      </div>

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
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setCpShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {cpShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input type={cpShowNew ? 'text' : 'password'} value={cpNew} onChange={e => setCpNew(e.target.value)} placeholder="At least 6 characters"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setCpShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {cpShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input type="password" value={cpConfirm} onChange={e => setCpConfirm(e.target.value)} placeholder="Re-enter new password"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleChangePassword} disabled={cpSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-60">
                {cpSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
