import { Settings, Star, Award, Shield, ChevronRight, Link, Instagram, ExternalLink, Users2, FileText, Camera, KeyRound, Eye, EyeOff, Bell } from 'lucide-react';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { users as usersApi, auth as authApi } from '../lib/api';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { ImageCropModal } from './ImageCropModal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function compressImage(file: File, maxDim = 800, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
        else { width = Math.round((width * maxDim) / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], 'avatar.jpg', { type: 'image/jpeg' })),
        'image/jpeg',
        quality,
      );
    };
    img.src = url;
  });
}

function LinkRow({ icon, bg, label, value, placeholder }: { icon: ReactNode; bg: string; label: string; value: string; placeholder: string }) {
  if (!value) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-200 text-slate-400">
        <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center flex-shrink-0 opacity-50`}>{icon}</div>
        <div className="flex-1"><p className="text-sm text-slate-400">{placeholder}</p></div>
      </div>
    );
  }
  const href = value.startsWith('http') ? value : `https://${value}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
      <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{value}</p></div>
      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </a>
  );
}

interface ProfileViewProps {
  userRole: 'athlete' | 'coach';
  onRoleChange: (role: 'athlete' | 'coach') => void;
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

export function ProfileView({ userRole, onRoleChange, onNavigate, onLogout }: ProfileViewProps) {
  const { token, user, updateUser } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  // Push notification toggle
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    PushNotifications.checkPermissions().then(async (s) => {
      if (s.receive === 'granted') {
        setPushEnabled(true);
        // Re-register every mount to ensure the token is always saved
        const listener = await PushNotifications.addListener('registration', async (tokenData) => {
          listener.remove();
          if (token) {
            try {
              await fetch(`${API}/api/notifications/device-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ token: tokenData.value }),
              });
            } catch {}
          }
        });
        PushNotifications.register().catch(() => {});
      }
    }).catch(() => {});
  }, [isNative, token]);

  const togglePush = async () => {
    if (pushEnabled) {
      toast.info('To disable, go to iPhone Settings → Notifications → LinkUp');
      return;
    }
    setPushLoading(true);
    try {
      const status = await PushNotifications.requestPermissions();
      if (status.receive === 'granted') {
        const errListener = await PushNotifications.addListener('registrationError', (err: any) => {
          errListener.remove();
          toast.error(`APNs registration failed: ${JSON.stringify(err)}`);
          setPushLoading(false);
        });
        const listener = await PushNotifications.addListener('registration', async (tokenData) => {
          listener.remove();
          errListener.remove();
          setPushEnabled(true);
          setPushLoading(false);
          if (token) {
            try {
              const res = await fetch(`${API}/api/notifications/device-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ token: tokenData.value }),
              });
              if (res.ok) {
                toast.success('Push notifications enabled!');
              } else {
                toast.error(`Token save failed: ${res.status}`);
              }
            } catch (e: any) {
              toast.error(`Token save error: ${e?.message}`);
            }
          }
        });
        await PushNotifications.register();
      } else {
        toast.error('Enable in iPhone Settings → Notifications → LinkUp');
        setPushLoading(false);
      }
    } catch (e: any) {
      toast.error(`Error: ${e?.message}`);
      setPushLoading(false);
    } finally {
      setPushLoading(false);
    }
  };

  // Edit modal states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrentPw, setCpCurrentPw] = useState('');
  const [cpNewPw, setCpNewPw] = useState('');
  const [cpConfirmPw, setCpConfirmPw] = useState('');
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!cpCurrentPw || !cpNewPw || !cpConfirmPw) {
      toast.error('Please fill in all fields');
      return;
    }
    if (cpNewPw !== cpConfirmPw) {
      toast.error('New passwords do not match');
      return;
    }
    if (cpNewPw.length < 8 || !/[A-Z]/.test(cpNewPw) || !/[0-9]/.test(cpNewPw) || !/[^A-Za-z0-9]/.test(cpNewPw)) {
      toast.error('Password must be 8+ characters with an uppercase letter, number, and special character');
      return;
    }
    if (!token) return;
    setCpSaving(true);
    try {
      await authApi.changePassword(token, cpCurrentPw, cpNewPw);
      toast.success('Password updated');
      setShowChangePassword(false);
      setCpCurrentPw(''); setCpNewPw(''); setCpConfirmPw('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update password');
    } finally {
      setCpSaving(false);
    }
  };

  const [showAthleteProfileEdit, setShowAthleteProfileEdit] = useState(false);
  const [showAboutMeEdit, setShowAboutMeEdit] = useState(false);
  const [showPhilosophyEdit, setShowPhilosophyEdit] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Keep preview in sync if the auth user's avatar changes from outside
  useEffect(() => {
    if (user?.avatar) setProfileImage(user.avatar);
  }, [user?.avatar]);

  // Athlete profile data — initialised from auth context
  const [athleteSport, setAthleteSport] = useState(user?.sport || '');
  const [athletePosition, setAthletePosition] = useState(user?.position || '');
  const [athleteLevel, setAthleteLevel] = useState(user?.skillLevel || '');
  const [aboutMe, setAboutMe] = useState(user?.bio || '');

  // Coach philosophy data
  const [philosophy, setPhilosophy] = useState(user?.coachingPhilosophy || '');
  
  // Temporary edit states
  const [tempTeamType, setTempTeamType] = useState('');
  const [tempSport, setTempSport] = useState('');
  const [tempPosition, setTempPosition] = useState('');
  const [tempLevel, setTempLevel] = useState('');
  const [tempLocation, setTempLocation] = useState('');
  const [tempAboutMe, setTempAboutMe] = useState('');
  const [tempPhilosophy, setTempPhilosophy] = useState('');
  
  const sports = ['Baseball', 'Softball', 'Soccer', 'Basketball', 'Volleyball', 'Football', 'Lacrosse', 'Wrestling', 'Field Hockey', 'Track and Field', 'Golf', 'Tennis', 'Swimming'];
  const levels = ['NCAA D1', 'NCAA D2', 'NCAA D3', 'College - Other', 'Pro'];
  
  const sportPositions: Record<string, string[]> = {
    'Baseball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Softball': ['Pitcher (LHP)', 'Pitcher (RHP)', 'Catcher', 'Infielder', 'Outfielder', 'Utility'],
    'Soccer': ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger'],
    'Basketball': ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    'Volleyball': ['Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite'],
    'Football': ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'Special Teams'],
    'Lacrosse': ['Attack', 'Midfield', 'Defense', 'Goalie'],
    'Field Hockey': ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'],
    'Track and Field': ['Sprinter', 'Distance Runner', 'Hurdler', 'Long Jumper', 'High Jumper', 'Triple Jumper', 'Pole Vaulter', 'Shot Putter', 'Discus Thrower', 'Javelin Thrower', 'Decathlete/Heptathlete'],
    'Golf': ['Driver', 'Irons', 'Short Game', 'Putting', 'Course Management'],
    'Tennis': ['Singles', 'Doubles', 'Serve & Volley', 'Baseline', 'Net Play']
  };
  
  const handleOpenAthleteEdit = () => {
    setTempTeamType(user?.teamType || '');
    setTempSport(athleteSport);
    setTempPosition(athletePosition);
    setTempLevel(athleteLevel);
    setTempLocation(user?.location || '');
    setShowAthleteProfileEdit(true);
  };
  
  const handleSaveAthleteProfile = async () => {
    setAthleteSport(tempSport);
    setAthletePosition(tempPosition);
    setAthleteLevel(tempLevel);
    setShowAthleteProfileEdit(false);
    if (token) {
      setSavingProfile(true);
      try {
        const { user: updated } = await usersApi.updateProfile(token, {
          teamType: tempTeamType,
          sport: tempSport,
          position: tempPosition,
          skillLevel: tempLevel,
          location: tempLocation,
        });
        updateUser(updated);
        toast.success('Profile updated');
      } catch (err: any) {
        toast.error(err?.message || 'Could not save profile');
      } finally {
        setSavingProfile(false);
      }
    }
  };
  
  const handleOpenAboutMeEdit = () => {
    setTempAboutMe(aboutMe);
    setShowAboutMeEdit(true);
  };
  
  const handleSaveAboutMe = async () => {
    setAboutMe(tempAboutMe);
    setShowAboutMeEdit(false);
    if (token) {
      try {
        const { user: updated } = await usersApi.updateProfile(token, { bio: tempAboutMe });
        updateUser(updated);
        toast.success('Bio saved');
      } catch (err: any) {
        toast.error(err?.message || 'Could not save bio');
      }
    }
  };
  
  const handleOpenPhilosophyEdit = () => {
    setTempPhilosophy(philosophy);
    setShowPhilosophyEdit(true);
  };
  
  const handleSavePhilosophy = async () => {
    setPhilosophy(tempPhilosophy);
    setShowPhilosophyEdit(false);
    if (token) {
      try {
        const { user: updated } = await usersApi.updateProfile(token, { coachingPhilosophy: tempPhilosophy });
        updateUser(updated);
        toast.success('Philosophy saved');
      } catch (err: any) {
        toast.error(err?.message || 'Could not save philosophy');
      }
    }
  };
  
  // Social / external link state
  const [hudlUrl, setHudlUrl] = useState(user?.hudlUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl || '');
  const [twitterUrl, setTwitterUrl] = useState(user?.twitterUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || '');
  const [rosterUrl, setRosterUrl] = useState(user?.rosterUrl || '');
  const [showLinksEdit, setShowLinksEdit] = useState(false);
  const [tempLinks, setTempLinks] = useState({ hudlUrl: '', instagramUrl: '', twitterUrl: '', linkedinUrl: '', rosterUrl: '' });
  const [savingLinks, setSavingLinks] = useState(false);

  const handleOpenLinksEdit = () => {
    setTempLinks({ hudlUrl, instagramUrl, twitterUrl, linkedinUrl, rosterUrl });
    setShowLinksEdit(true);
  };

  const handleSaveLinks = async () => {
    setHudlUrl(tempLinks.hudlUrl);
    setInstagramUrl(tempLinks.instagramUrl);
    setTwitterUrl(tempLinks.twitterUrl);
    setLinkedinUrl(tempLinks.linkedinUrl);
    setRosterUrl(tempLinks.rosterUrl);
    setShowLinksEdit(false);
    if (!token) return;
    setSavingLinks(true);
    try {
      const { user: updated } = await usersApi.updateProfile(token, tempLinks);
      updateUser(updated);
      toast.success('Links saved');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save links');
    } finally {
      setSavingLinks(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    if (!token) return;
    setUploadingAvatar(true);
    try {
      const { user: updated } = await usersApi.uploadAvatar(token, file);
      updateUser(updated);
      setProfileImage(updated.avatar || null);
      toast.success('Profile photo updated');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo');
      setProfileImage(user?.avatar || null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCropConfirm = async (file: File) => {
    setCropImageUrl(null);
    await doUpload(file);
  };

  const handleCameraButtonClick = async () => {
    if (uploadingAvatar) return;
    if (Capacitor.isNativePlatform()) {
      try {
        const perms = await CapCamera.requestPermissions({ permissions: ['camera', 'photos'] });
        if (perms.camera === 'denied' && perms.photos === 'denied') {
          toast.error('Please allow camera or photo access in iPhone Settings → LinkUp Athletics');
          return;
        }
        const photo = await CapCamera.getPhoto({
          quality: 90,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          correctOrientation: true,
        });
        if (!photo.dataUrl) return;
        setCropImageUrl(photo.dataUrl);
      } catch (err: any) {
        if (err?.message !== 'User cancelled photos app') {
          toast.error(err?.message || 'Could not access camera');
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleProfileImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;
    event.target.value = '';
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setCropImageUrl(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-slate-900">My Profile</h2>
        
      </div>

      {/* Profile Display */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-8">
        <div className="text-center">
          {/* Profile Photo */}
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-2xl text-slate-700 shadow-lg overflow-hidden">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'MP'}</span>
              )}
            </div>
            {/* Upload Button */}
            <button
              onClick={handleCameraButtonClick}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors border-2 border-white disabled:opacity-60"
            >
              {uploadingAvatar
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-4 h-4 text-white" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              disabled={uploadingAvatar}
              onChange={handleProfileImageUpload}
              className="hidden"
            />
          </div>
          
          {/* User Name */}
          <h3 className="text-white mb-2">{user?.name || 'Athlete'}</h3>
          
          {/* Role Toggle */}
          <div className="flex justify-center gap-2 mb-3">
            
            
          </div>
          
          {/* Primary Role Badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-white text-sm">{userRole === 'athlete' ? (user?.position || 'Athlete') : (user?.sportsCoached?.[0] ? `${user.sportsCoached[0]} Coach` : 'Coach')}</span>
          </div>
        </div>
      </div>

      {userRole === 'athlete' ? (
        <>
          {/* Athlete Profile Section */}
          <div className="px-6 -mt-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900">Athlete Profile</h4>
                <button className="text-sm text-emerald-600 hover:text-emerald-700" onClick={handleOpenAthleteEdit}>Edit</button>
              </div>
              
              {/* Athlete Info Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Primary Sport</span>
                  <span className="text-slate-900">{athleteSport}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Primary Position</span>
                  <span className="text-slate-900">{athletePosition}</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Athletic Level</span>
                  <span className="text-slate-900">{athleteLevel || '—'}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Location</span>
                  <span className="text-slate-900">{user?.location || '—'}</span>
                </div>
              </div>
              
              {/* Verification Badge — driven by user.verificationStatus */}
              {user?.verificationStatus === 'approved' && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs text-emerald-800">
                    <span className="font-semibold">✓ Verified Athlete:</span> Identity confirmed by LinkUp Athletics
                  </p>
                </div>
              )}
              {user?.verificationStatus === 'pending' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">⏳ Verification Pending:</span> We're reviewing your credentials
                  </p>
                </div>
              )}
              {user?.verificationStatus === 'rejected' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-800">
                    <span className="font-semibold">Verification Not Approved.</span> Contact kelly@linkupathlethics.com for help.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Performance & Stats Section - Trust Building */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h4 className="text-slate-900 mb-4">Performance & Stats</h4>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Total Sessions */}
                <div className="text-center bg-slate-50 rounded-xl p-4">
                  <div className="text-2xl text-slate-900 mb-1">{user?.ratingCount ?? '—'}</div>
                  <div className="text-xs text-slate-600">Completed Sessions</div>
                </div>

                {/* User Rating */}
                <div
                  onClick={() => onNavigate('receivedRatings')}
                  className="text-center bg-slate-50 rounded-xl p-4 cursor-pointer hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl text-slate-900">{user?.averageRating ? user.averageRating.toFixed(1) : '—'}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                    User Rating
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* My Roster Button */}
          <div className="px-6 mb-6">
            <button 
              onClick={() => onNavigate('roster')}
              className="w-full bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-5 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Users2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">My Roster</h4>
                  <p className="text-sm text-indigo-100">View your connections</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* External Profiles & Media Section */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900">External Profiles & Media</h4>
                <button onClick={handleOpenLinksEdit} className="text-sm text-emerald-600 hover:text-emerald-700">Edit</button>
              </div>
              <div className="space-y-3">
                <LinkRow icon={<Shield className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-100" label="College Roster Page" value={rosterUrl} placeholder="Add your team roster link" />
                <LinkRow icon={<ExternalLink className="w-5 h-5 text-orange-600" />} bg="bg-orange-100" label="Hudl Profile" value={hudlUrl} placeholder="Add your Hudl link" />
                <LinkRow icon={<Instagram className="w-5 h-5 text-pink-600" />} bg="bg-pink-100" label="Instagram" value={instagramUrl} placeholder="Add your Instagram" />
                <LinkRow icon={<Link className="w-5 h-5 text-sky-600" />} bg="bg-sky-100" label="Twitter / X" value={twitterUrl} placeholder="Add your Twitter/X" />
                <LinkRow icon={<Link className="w-5 h-5 text-emerald-700" />} bg="bg-emerald-100" label="LinkedIn" value={linkedinUrl} placeholder="Add your LinkedIn" />
              </div>
            </div>
          </div>

          {/* Athlete Bio & Goals */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-slate-900">About Me</h4>
                <button className="text-sm text-emerald-600 hover:text-emerald-700" onClick={handleOpenAboutMeEdit}>Edit</button>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">
                {aboutMe}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Coach Profile Section */}
          <div className="px-6 -mt-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900">Coach Profile</h4>
                <button 
                  onClick={() => onNavigate('coachSetup')}
                  className="text-sm text-emerald-600 hover:text-emerald-700">
                  Edit
                </button>
              </div>
              
              {/* Coach Info Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Sports Coached</span>
                  <span className="text-slate-900 text-sm">Baseball, Softball</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Hourly Rate</span>
                  <span className="text-slate-900 font-semibold">$75/hr</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-slate-500">Years of Experience</span>
                  <span className="text-slate-900">8 years</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-500">Certifications</span>
                  <span className="text-slate-900 text-sm text-right">NASM, USA Baseball</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance & Stats Section */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h4 className="text-slate-900 mb-4">Coach Stats</h4>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Total Sessions */}
                <div className="text-center bg-slate-50 rounded-xl p-4">
                  <div className="text-2xl text-slate-900 mb-1">127</div>
                  <div className="text-xs text-slate-600">Training Sessions</div>
                </div>

                {/* User Rating */}
                <div 
                  onClick={() => onNavigate('receivedRatings')}
                  className="text-center bg-slate-50 rounded-xl p-4 cursor-pointer hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl text-slate-900">4.9</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center justify-center gap-1">
                    Coach Rating
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action - Search Athletes */}
          <div className="px-6 mb-3">
            <button 
              onClick={() => onNavigate('athleteSearch')}
              className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-5 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Users2 className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">Search Athletes</h4>
                  <p className="text-sm text-blue-100">Find athletes to coach</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Quick Action - Post Clinic Flyer */}
          <div className="px-6 mb-6">
            <button 
              onClick={() => onNavigate('clinicFlyer')}
              className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-5 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="text-white font-semibold">Post Clinic Flyer</h4>
                  <p className="text-sm text-emerald-100">Advertise upcoming clinics</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* External Profiles & Media Section */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900">External Profiles & Media</h4>
                <button onClick={handleOpenLinksEdit} className="text-sm text-emerald-600 hover:text-emerald-700">Edit</button>
              </div>
              <div className="space-y-3">
                <LinkRow icon={<ExternalLink className="w-5 h-5 text-orange-600" />} bg="bg-orange-100" label="Hudl Profile" value={hudlUrl} placeholder="Add your Hudl link" />
                <LinkRow icon={<Instagram className="w-5 h-5 text-pink-600" />} bg="bg-pink-100" label="Instagram" value={instagramUrl} placeholder="Add your Instagram" />
                <LinkRow icon={<Link className="w-5 h-5 text-sky-600" />} bg="bg-sky-100" label="Twitter / X" value={twitterUrl} placeholder="Add your Twitter/X" />
                <LinkRow icon={<Link className="w-5 h-5 text-emerald-700" />} bg="bg-emerald-100" label="LinkedIn" value={linkedinUrl} placeholder="Add your LinkedIn" />
              </div>
            </div>
          </div>

          {/* Coach Bio */}
          <div className="px-6 mb-6">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-slate-900">Coaching Philosophy</h4>
                <button className="text-sm text-emerald-600 hover:text-emerald-700" onClick={handleOpenPhilosophyEdit}>Edit</button>
              </div>
              <p className="text-slate-700 text-sm leading-relaxed">
                {philosophy}
              </p>
            </div>
          </div>
        </>
      )}

      {/* My QR Code Section */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-semibold mb-1">My QR Code</h4>
              <p className="text-sm text-indigo-100">Share your profile instantly</p>
            </div>
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* QR Code Preview */}
          <div className="bg-white rounded-xl p-4 flex items-center gap-4">
            {/* Small QR Code */}
            <div className="flex-shrink-0">
              <QRCodeSVG
                value={`linkupathletics://profile/${user?._id || 'unknown'}`}
                size={80}
                level="H"
                includeMargin={false}
              />
            </div>
            
            {/* Description */}
            <div className="flex-1">
              <p className="text-sm text-slate-700 leading-relaxed">
                Let others scan your code to quickly view your profile and connect with you
              </p>
            </div>
          </div>
          
          {/* View Full Size Button */}
          <button 
            onClick={() => setShowQRCodeModal(true)}
            className="w-full mt-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-3 rounded-xl transition-all border border-white/30"
          >
            View Full Size
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Push notification toggle */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-100">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-slate-900">Push Notifications</h4>
                <p className="text-sm text-slate-500">
                  {pushEnabled ? "Enabled — alerts for messages & requests" : "Tap to enable alerts"}
                </p>
              </div>
              <button
                type="button"
                onClick={togglePush}
                disabled={pushLoading}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: pushEnabled ? '#9333ea' : '#CBD5E1',
                  position: 'relative',
                  flexShrink: 0,
                  opacity: pushLoading ? 0.5 : 1,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 4,
                  left: pushEnabled ? 24 : 4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: 'white',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          <button
            onClick={() => onNavigate('settings')}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-slate-900">Settings</h4>
              <p className="text-sm text-slate-500">Privacy & password</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="h-6"></div>

      {/* Athlete Profile Edit Modal */}
      {showAthleteProfileEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h3 className="text-slate-900 font-semibold">Edit Athlete Profile</h3>
              <button 
                onClick={() => setShowAthleteProfileEdit(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Primary Sport Divider */}
              <div className="pb-3 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900">Primary Sport</h4>
              </div>
              
              {/* Team Type */}
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Team Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['mens', "Men's"], ['womens', "Women's"]] as [string, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTempTeamType(val)}
                      className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        tempTeamType === val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sport Selection */}
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Sport</label>
                <select
                  value={tempSport}
                  onChange={(e) => { setTempSport(e.target.value); setTempPosition(''); }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="">Select sport</option>
                  {sports.map(sport => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
              
              {/* Position Selection */}
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Primary Position</label>
                <select
                  value={tempPosition}
                  onChange={(e) => setTempPosition(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="">Select position</option>
                  {(sportPositions[tempSport] || []).map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>
              
              {/* Level Selection */}
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Athletic Level</label>
                <select
                  value={tempLevel}
                  onChange={(e) => setTempLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="">Select level</option>
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Location</label>
                <input
                  type="text"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  placeholder="e.g. Boston, MA"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAthleteProfileEdit(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAthleteProfile}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* About Me Edit Modal */}
      {showAboutMeEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h3 className="text-slate-900 font-semibold">Edit About Me</h3>
              <button 
                onClick={() => setShowAboutMeEdit(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">About Me</label>
                <textarea
                  value={tempAboutMe}
                  onChange={(e) => setTempAboutMe(e.target.value)}
                  rows={6}
                  placeholder="Tell other athletes about yourself, your goals, and what you're looking for..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{tempAboutMe.length} characters</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAboutMeEdit(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAboutMe}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Coaching Philosophy Edit Modal */}
      {showPhilosophyEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h3 className="text-slate-900 font-semibold">Edit Coaching Philosophy</h3>
              <button 
                onClick={() => setShowPhilosophyEdit(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Coaching Philosophy</label>
                <textarea
                  value={tempPhilosophy}
                  onChange={(e) => setTempPhilosophy(e.target.value)}
                  rows={6}
                  placeholder="Describe your coaching approach, experience, and what athletes can expect working with you..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">{tempPhilosophy.length} characters</p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPhilosophyEdit(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePhilosophy}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Links Edit Modal */}
      {showLinksEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <h3 className="text-slate-900 font-semibold">Edit External Links</h3>
              <button onClick={() => setShowLinksEdit(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-1 block">College Roster Page</label>
                <input
                  type="url"
                  value={tempLinks.rosterUrl}
                  onChange={(e) => setTempLinks(prev => ({ ...prev, rosterUrl: e.target.value }))}
                  placeholder="https://goterps.com/sports/baseball/roster/..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Hudl Profile URL</label>
                <input
                  type="url"
                  value={tempLinks.hudlUrl}
                  onChange={(e) => setTempLinks(prev => ({ ...prev, hudlUrl: e.target.value }))}
                  placeholder="https://www.hudl.com/profile/..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Instagram</label>
                <input
                  type="url"
                  value={tempLinks.instagramUrl}
                  onChange={(e) => setTempLinks(prev => ({ ...prev, instagramUrl: e.target.value }))}
                  placeholder="https://www.instagram.com/username"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Twitter / X</label>
                <input
                  type="url"
                  value={tempLinks.twitterUrl}
                  onChange={(e) => setTempLinks(prev => ({ ...prev, twitterUrl: e.target.value }))}
                  placeholder="https://x.com/username"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1 block">LinkedIn</label>
                <input
                  type="url"
                  value={tempLinks.linkedinUrl}
                  onChange={(e) => setTempLinks(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://www.linkedin.com/in/username"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowLinksEdit(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLinks}
                  disabled={savingLinks}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {savingLinks ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRCodeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowQRCodeModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 font-semibold">My QR Code</h3>
              <button 
                onClick={() => setShowQRCodeModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Large QR Code */}
            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={`linkupathletics://profile/${user?._id || 'unknown'}`}
                  size={220}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="mt-6 text-center">
                <h4 className="text-slate-900 font-semibold mb-2">{user?.name || 'Athlete'}</h4>
                <p className="text-sm text-slate-500 mb-1">{userRole === 'athlete' ? 'Athlete' : 'Coach'} • {userRole === 'athlete' ? athleteSport : (user?.sportsCoached?.join(', ') || 'Coach')}</p>
                <p className="text-xs text-slate-400">ID: {user?._id || 'N/A'}</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 text-center mt-6 leading-relaxed">
              Have other LinkUp Athletics users scan this code to instantly view your profile and connect
            </p>
            
            <button 
              onClick={() => setShowQRCodeModal(false)}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {cropImageUrl && (
        <ImageCropModal
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropImageUrl(null)}
        />
      )}
    </div>
  );
}