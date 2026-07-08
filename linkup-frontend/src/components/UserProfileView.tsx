import { ArrowLeft, MapPin, Star, Award, Calendar, MessageSquare, Users, TrendingUp, Target, Zap, CheckCircle, ExternalLink, Instagram, Link as LinkIcon, UserPlus, Clock, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RatingModal } from './RatingModal';
import { useAuth } from '../lib/auth';
import { users as usersApi, connections as connectionsApi, ratings as ratingsApi, User } from '../lib/api';
import { toast } from 'sonner';

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
  onSendMessage?: () => void;
  onSendPracticeRequest?: () => void;
  userType?: 'athlete' | 'coach';
  isRosterRequest?: boolean;
  onAcceptRoster?: () => void;
  onDeclineRoster?: () => void;
  isOnRoster?: boolean;
  onAddToRoster?: () => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function UserProfileView({
  userId,
  onBack,
  onSendMessage,
  onSendPracticeRequest,
  userType = 'athlete',
  isRosterRequest = false,
  onAcceptRoster,
  onDeclineRoster,
  isOnRoster = false,
  onAddToRoster,
}: UserProfileViewProps) {
  const { token } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  useEffect(() => {
    if (!token || !userId) return;
    setLoading(true);
    Promise.all([
      usersApi.getById(token, userId),
      connectionsApi.getStatus(token, userId),
    ])
      .then(([{ user }, statusData]) => {
        setProfileUser(user);
        setConnStatus(statusData.status);
        setConnectionId(statusData.connectionId ?? null);
      })
      .catch((err: any) => toast.error(err?.message || 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [token, userId]);

  const handleSendPracticeRequest = async () => {
    if (!token || !userId) return;
    setSendingRequest(true);
    try {
      await connectionsApi.sendRequest(token, userId);
      setConnStatus('pending');
      toast.success('Roster request sent!');
      onSendPracticeRequest?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRoster = async () => {
    if (!token || !connectionId) return;
    try {
      await connectionsApi.accept(token, connectionId);
      setConnStatus('accepted');
      toast.success('Connection accepted!');
      onAcceptRoster?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not accept request');
    }
  };

  const handleDeclineRoster = async () => {
    if (!token || !connectionId) return;
    try {
      await connectionsApi.reject(token, connectionId);
      toast.success('Request declined');
      onDeclineRoster?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not decline request');
    }
  };

  const handleCancelRosterRequest = async () => {
    if (!token || !connectionId) return;
    try {
      await connectionsApi.remove(token, connectionId);
      setConnStatus('none');
      setConnectionId(null);
      toast.success('Request cancelled');
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel request');
    }
  };

  const handleRatingSubmit = async (rating: number, review: string) => {
    if (!token || !profileUser) return;
    try {
      await ratingsApi.submit(token, {
        rateeId: profileUser._id,
        overallRating: rating,
        feedback: review,
        sport: profileUser.sport,
      });
      toast.success(`${profileUser.name} rated successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit rating');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <span className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <p className="text-slate-600">Profile not found.</p>
        <button onClick={onBack} className="text-emerald-600 text-sm">Go back</button>
      </div>
    );
  }

  const isAthlete = (profileUser.role || userType) === 'athlete';

  const stats = isAthlete
    ? [
        { label: 'Sport', value: profileUser.sport || '—', icon: Zap },
        { label: 'Position', value: profileUser.position || '—', icon: Target },
        { label: 'Level', value: profileUser.skillLevel || '—', icon: TrendingUp },
        { label: 'Rating', value: profileUser.averageRating ? profileUser.averageRating.toFixed(1) : '—', icon: Star },
      ]
    : [
        { label: 'Experience', value: profileUser.yearsExperience || '—', icon: Award },
        { label: 'Sport(s)', value: (profileUser.sportsCoached || []).join(', ') || '—', icon: Users },
        { label: 'Rate', value: profileUser.hourlyRate ? `$${profileUser.hourlyRate}/hr` : '—', icon: TrendingUp },
        { label: 'Rating', value: profileUser.averageRating ? profileUser.averageRating.toFixed(1) : '—', icon: Star },
      ];

  const bio = isAthlete ? profileUser.bio : (profileUser.coachingPhilosophy || profileUser.bio);
  const hasAnySocial = profileUser.instagramUrl || profileUser.hudlUrl || profileUser.linkedinUrl || profileUser.twitterUrl;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h2 className="text-slate-900">Profile</h2>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 pt-6 pb-8">
        <div className="text-center">
          {/* Avatar */}
          <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-slate-700 shadow-lg font-semibold overflow-hidden">
            {profileUser.avatar
              ? <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
              : getInitials(profileUser.name)}
          </div>

          <h1 className="text-white text-2xl mb-2">{profileUser.name}</h1>

          {isAthlete && profileUser.position && (
            <div className="flex items-center justify-center gap-2 text-emerald-200 mb-2">
              <span className="text-sm">{profileUser.sport}</span>
              <span className="text-emerald-400">•</span>
              <span className="text-sm">{profileUser.position}</span>
            </div>
          )}

          {!isAthlete && profileUser.sportsCoached?.length > 0 && (
            <div className="text-emerald-200 mb-2">
              <span className="text-sm">{profileUser.sportsCoached.join(' • ')}</span>
            </div>
          )}

          {(profileUser.skillLevel || (isAthlete && (profileUser as any).teamType)) && (
            <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
              {profileUser.skillLevel && (
                <div className="bg-emerald-600/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-semibold">{profileUser.skillLevel}</span>
                </div>
              )}
              {isAthlete && (profileUser as any).teamType === 'mens' && (
                <div className="bg-emerald-400/70 backdrop-blur-sm px-3 py-1 rounded-full border border-emerald-300/40">
                  <span className="text-white text-xs font-semibold">Men's</span>
                </div>
              )}
              {isAthlete && (profileUser as any).teamType === 'womens' && (
                <div className="bg-pink-500/70 backdrop-blur-sm px-3 py-1 rounded-full border border-pink-300/40">
                  <span className="text-white text-xs font-semibold">Women's</span>
                </div>
              )}
              {!isAthlete && profileUser.hourlyRate && (
                <div className="bg-emerald-700/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-xs font-semibold">${profileUser.hourlyRate}/hr</span>
                </div>
              )}
            </div>
          )}

          {profileUser.location && (
            <div className="flex items-center justify-center gap-1.5 text-emerald-200 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{profileUser.location}</span>
            </div>
          )}

          {isAthlete && ((profileUser as any).school || (profileUser as any).year) && (
            <div className="flex items-center justify-center gap-1.5 text-emerald-200 text-sm mt-1">
              <span>🎓</span>
              <span>
                {(profileUser as any).school}
                {(profileUser as any).school && (profileUser as any).year ? ' · ' : ''}
                {(profileUser as any).year}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Athlete Profile Card */}
      {isAthlete ? (
        <div className="px-6 -mt-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Dark header — school + badges */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 pt-5 pb-4">
              <div className="header-eyebrow text-slate-400 text-xs uppercase tracking-widest mb-1 font-semibold">College</div>
              <div className="text-white font-extrabold text-lg leading-tight tracking-tight">
                {(profileUser as any).school || '—'}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {profileUser.skillLevel && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                    {profileUser.skillLevel}
                  </span>
                )}
                {(profileUser as any).year && (
                  <span className="bg-white/10 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {(profileUser as any).year}
                  </span>
                )}
              </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              <div className="px-4 py-3 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Sport</div>
                <div className="text-sm font-bold text-slate-900 truncate">{profileUser.sport || '—'}</div>
              </div>
              <div className="px-4 py-3 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Position</div>
                <div className="text-sm font-bold text-slate-900 truncate">{profileUser.position || '—'}</div>
              </div>
              <div className="px-4 py-3 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Rating</div>
                <div className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {profileUser.averageRating ? profileUser.averageRating.toFixed(1) : '—'}
                </div>
              </div>
            </div>

            {/* Roster link */}
            {(profileUser as any).rosterUrl && (
              <a
                href={(profileUser as any).rosterUrl.startsWith('http') ? (profileUser as any).rosterUrl : `https://${(profileUser as any).rosterUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">View College Roster</span>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-500" />
              </a>
            )}
          </div>
        </div>
      ) : (
        /* Coach stats grid */
        <div className="px-6 -mt-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="grid grid-cols-4 gap-3">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-base font-semibold text-slate-900 truncate">{stat.value}</div>
                  <div className="text-xs text-slate-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 mb-6 space-y-3">
        {isRosterRequest ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-semibold text-emerald-900">Roster Request</h4>
              </div>
              <p className="text-xs text-emerald-700">
                {profileUser.name} wants to add you to their team. Review their profile and choose your response.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAcceptRoster}
                className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-semibold">Accept</span>
              </button>
              <button
                onClick={handleDeclineRoster}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-slate-200"
              >
                <span className="font-semibold">Decline</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Connection status row */}
            {connStatus === 'accepted' ? (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl py-3 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-900">Connected</span>
              </div>
            ) : connStatus === 'pending' ? (
              <div className="flex flex-col gap-2">
                <div className="bg-slate-100 border-2 border-slate-200 rounded-xl py-3 flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-600">Request Sent</span>
                </div>
                <button
                  onClick={handleCancelRosterRequest}
                  className="w-full bg-white hover:bg-red-50 text-red-600 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-red-200 text-sm font-semibold"
                >
                  Cancel Request
                </button>
              </div>
            ) : (
              <button
                onClick={handleSendPracticeRequest}
                disabled={sendingRequest}
                className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-60 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {sendingRequest
                  ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <UserPlus className="w-5 h-5" />}
                <span className="font-semibold">Add to Roster</span>
              </button>
            )}

            {/* Message button — always available */}
            <button
              onClick={onSendMessage}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-semibold">Message</span>
            </button>

            {/* Rate button */}
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="w-full bg-white hover:bg-slate-50 text-slate-900 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-slate-200 shadow-sm"
            >
              <Star className="w-5 h-5" />
              <span className="font-semibold">Rate</span>
            </button>
          </>
        )}
      </div>

      {/* About / Bio */}
      {bio ? (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              {isAthlete ? 'About' : 'Coaching Philosophy'}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{bio}</p>
          </div>
        </div>
      ) : null}

      {/* Certifications (coaches) */}
      {!isAthlete && profileUser.certifications ? (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Certifications
            </h3>
            <p className="text-sm text-slate-700">{profileUser.certifications}</p>
          </div>
        </div>
      ) : null}

      {/* Social Links */}
      {hasAnySocial ? (
        <div className="px-6 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <h3 className="text-slate-900 font-semibold mb-3">Connect</h3>
            <div className="space-y-2">
              {profileUser.instagramUrl && (
                <a
                  href={profileUser.instagramUrl.startsWith('http') ? profileUser.instagramUrl : `https://instagram.com/${profileUser.instagramUrl.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">{profileUser.instagramUrl}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </a>
              )}
              {profileUser.hudlUrl && (
                <a
                  href={profileUser.hudlUrl.startsWith('http') ? profileUser.hudlUrl : `https://${profileUser.hudlUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">Hudl Highlights</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </a>
              )}
              {profileUser.linkedinUrl && (
                <a
                  href={profileUser.linkedinUrl.startsWith('http') ? profileUser.linkedinUrl : `https://${profileUser.linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-900">LinkedIn</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </a>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Rating Modal */}
      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        userName={profileUser.name}
        onSubmit={handleRatingSubmit}
      />
    </div>
  );
}
