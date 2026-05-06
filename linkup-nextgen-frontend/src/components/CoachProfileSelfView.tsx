import { useState, useRef } from 'react';
import { Camera, LogOut, KeyRound, ChevronRight, FileText, ClipboardList, Eye, EyeOff, Check, X, MapPin, Briefcase, Calendar } from 'lucide-react';
import { coaches as coachesApi, avatarThumb, auth as authApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { CoachDocumentsView } from './CoachDocumentsView';
import { MySessionsView } from './MySessionsView';
import { CoachServicesView } from './CoachServicesView';
import { CoachAvailabilityView } from './CoachAvailabilityView';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function CoachProfileSelfView() {
  const { token, user, updateUser, logout } = useAuth();
  const [view, setView] = useState<'main' | 'documents' | 'sessions' | 'password' | 'services' | 'availability'>('main');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState((user as any)?.location || '');
  const [savingLocation, setSavingLocation] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  if (view === 'documents') return <CoachDocumentsView onClose={() => setView('main')} />;
  if (view === 'sessions') return <MySessionsView onClose={() => setView('main')} />;
  if (view === 'services') return <CoachServicesView onClose={() => setView('main')} />;
  if (view === 'availability') return <CoachAvailabilityView onClose={() => setView('main')} />;

  if (view === 'password') {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-6 flex items-center gap-3">
          <button onClick={() => setView('main')} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-white font-bold text-xl">Change Password</h2>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="relative">
            <input type={showCurrent ? 'text' : 'password'} placeholder="Current password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
              className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none" />
            <button onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} placeholder="New password" value={newPw} onChange={e => setNewPw(e.target.value)}
              className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none" />
            <button onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-400 focus:outline-none" />
          <button
            onClick={async () => {
              if (!token) return;
              if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
              if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
              setSavingPw(true);
              try {
                await authApi.changePassword(token, currentPw, newPw);
                toast.success('Password updated');
                setCurrentPw(''); setNewPw(''); setConfirmPw('');
                setView('main');
              } catch (err: any) {
                toast.error(err.message || 'Could not update password');
              } finally { setSavingPw(false); }
            }}
            disabled={savingPw || !currentPw || !newPw || !confirmPw}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {savingPw ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Update Password</>}
          </button>
        </div>
      </div>
    );
  }

  const coach = user as any;
  const docCount = coach?.documents?.length ?? 0;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingAvatar(true);
    try {
      const { user: updated } = await coachesApi.uploadAvatar(token, file);
      updateUser(updated);
      toast.success('Photo updated');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploadingAvatar(false); e.target.value = ''; }
  };

  const saveLocation = async () => {
    if (!token) return;
    setSavingLocation(true);
    try {
      const { user: updated } = await coachesApi.updateProfile(token, { location: locationDraft.trim() } as any);
      updateUser(updated);
      setEditingLocation(false);
      toast.success('Location saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not save');
    } finally { setSavingLocation(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 px-6 pt-4 pb-10">
        <h2 className="text-white font-bold text-xl mb-5">My Profile</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden border-3 border-white/30">
              {coach?.avatar ? <img src={avatarThumb(coach.avatar, 160)!} alt={coach?.name} className="w-full h-full object-cover" /> : getInitials(coach?.name || 'C')}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200">
              {uploadingAvatar ? <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5 text-emerald-700" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-xl truncate">{coach?.name}</p>
            <p className="text-emerald-300 text-sm">{coach?.email}</p>
            <span className="inline-block mt-1.5 bg-white/15 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">Coach</span>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4 pb-8 space-y-4">
        {/* Location */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <p className="font-semibold text-slate-900 text-sm">Location</p>
            </div>
            {!editingLocation && <button onClick={() => { setLocationDraft(coach?.location || ''); setEditingLocation(true); }} className="text-xs text-emerald-700 font-medium">Edit</button>}
          </div>
          {editingLocation ? (
            <div className="flex gap-2 mt-2">
              <input type="text" value={locationDraft} onChange={e => setLocationDraft(e.target.value)} placeholder="City, State" autoFocus
                className="flex-1 px-3 py-2 rounded-xl border-2 border-emerald-300 text-slate-900 text-sm focus:outline-none" />
              <button onClick={saveLocation} disabled={savingLocation} className="px-3 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-50">
                {savingLocation ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => setEditingLocation(false)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm mt-0.5">{coach?.location || 'Not set'}</p>
          )}
        </div>

        {/* My Availability */}
        <button onClick={() => setView('availability')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-all active:scale-[0.99] text-left">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">My Availability</p>
            <p className="text-sm text-slate-500">Set your weekly schedule</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </button>

        {/* My Services */}
        <button onClick={() => setView('services')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-all active:scale-[0.99] text-left">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">My Services</p>
            <p className="text-sm text-slate-500">1-on-1, group sessions, clinics & more</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </button>

        {/* My Sessions & Reports */}
        <button onClick={() => setView('sessions')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-all active:scale-[0.99] text-left">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">My Sessions</p>
            <p className="text-sm text-slate-500">Write and manage session reports</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </button>

        {/* Documents */}
        <button onClick={() => setView('documents')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 transition-all active:scale-[0.99] text-left">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">My Documents</p>
            <p className="text-sm text-slate-500">{docCount === 0 ? 'Resume, certifications & photos' : `${docCount} document${docCount !== 1 ? 's' : ''} uploaded`}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </button>

        {/* Account settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button onClick={() => setView('password')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-4 h-4 text-slate-600" />
            </div>
            <p className="flex-1 text-left font-medium text-slate-900 text-sm">Change Password</p>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-50 transition-colors">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <p className="flex-1 text-left font-medium text-red-600 text-sm">Sign Out</p>
          </button>
        </div>
      </div>
    </div>
  );
}
