import { ChevronLeft, Calendar, MapPin, Clock, Users, Trophy, MessageCircle, Star, Navigation, CheckCircle, Award, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, Session } from '../lib/api';

function firstLastInitial(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface AvailableSessionViewProps {
  session: Session | {
    id: string | number;
    title: string;
    seeking: string;
    level: string;
    distance: string;
    date: string;
    time: string;
    sport: string;
    postedBy?: any;
    duration?: string;
    notes?: string;
    goals?: string;
    equipment?: string[];
    skillLevelRequired?: string;
    location?: string;
  };
  isOnRoster?: boolean;
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: {
    id: string;
    name: string;
    avatar: string;
    sport: string;
    position: string;
    level: string;
    sessionContext?: {
      sessionTitle: string;
      date: string;
      time: string;
      location: string;
    };
  }) => void;
}

export function AvailableSessionView({ session, isOnRoster = false, onBack, onNavigate, onOpenChat }: AvailableSessionViewProps) {
  const { token } = useAuth();
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  // Normalise fields — works whether we got a full Session or the minimal shape
  const sessionId = (session as Session)._id || String((session as any).id || '');
  const poster = (session as Session).postedBy;
  const posterFullName = poster?.name || 'Unknown Athlete';
  const posterName = firstLastInitial(posterFullName);
  const posterInitials = posterFullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const posterPosition = poster?.position || (session as any).seeking || '';
  const posterLevel = poster?.skillLevel || (session as any).level || '';
  const posterRating = poster?.averageRating ?? null;
  const posterRatingCount = poster?.ratingCount ?? 0;

  const location = (session as Session).location || (session as any).distance || '';
  const duration = (session as Session).duration || '—';
  const notes = (session as Session).notes || (session as Session).goals || '';
  const equipment: string[] = (session as Session).equipment || [];
  const skillLevel = (session as Session).skillLevelRequired || (session as any).level || '';
  const seeking = (session as Session).partnerRole || (session as any).seeking || '';

  const confirmAccept = async () => {
    if (!token || !sessionId) return;
    setAccepting(true);
    setAcceptError('');
    try {
      await sessionsApi.accept(token, sessionId);
      setIsRequested(true);
      setShowAcceptConfirmation(false);
    } catch (err: any) {
      setAcceptError(err.message || 'Failed to accept session.');
      setShowAcceptConfirmation(false);
    } finally {
      setAccepting(false);
    }
  };

  const openChat = () => {
    if (!onOpenChat) return;
    onOpenChat({
      id: poster?._id || sessionId,
      name: posterName,
      avatar: poster?.avatar || posterInitials,
      sport: session.sport,
      position: posterPosition,
      level: posterLevel,
      sessionContext: {
        sessionTitle: session.title,
        date: session.date,
        time: session.time,
        location,
      },
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <h2 className="text-white">{session.title || session.sport}</h2>
            <p className="text-blue-200 text-sm">{session.sport}{location ? ` • ${location}` : ''}</p>
          </div>
        </div>

        {/* Seeking Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
            <Users className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-200">
              Seeking: {seeking}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Posted By Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <p className="text-xs text-slate-500 mb-3">POSTED BY</p>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-xl flex-shrink-0">
              {poster?.avatar || posterInitials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-slate-900 font-medium">{posterName}</h3>
                {isOnRoster && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                    <Shield className="w-2.5 h-2.5" />
                    Roster
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mb-2">{posterPosition}</p>
              <div className="flex items-center gap-3">
                {posterRating !== null && (
                  <>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm text-slate-700 font-medium">{posterRating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-sm text-slate-600">{posterRatingCount} rating{posterRatingCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
            {posterLevel && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                <Trophy className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">{posterLevel}</span>
              </div>
            )}
          </div>

          {/* Message Button */}
          {poster && (
            <button
              onClick={openChat}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Message First</span>
            </button>
          )}
        </div>

        {/* Session Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-4">Session Details</h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Date & Time</p>
                <p className="text-slate-900 font-medium">{session.date || 'Flexible'}</p>
                <p className="text-slate-700">{session.time || 'Flexible'}</p>
              </div>
            </div>

            {location && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-0.5">Location</p>
                  <p className="text-slate-900 font-medium mb-2">{location}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Duration</p>
                <p className="text-slate-900 font-medium">{duration}</p>
              </div>
            </div>

            {skillLevel && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-0.5">Skill Level Requested</p>
                  <p className="text-slate-900 font-medium">{skillLevel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session Goals & Notes */}
        {notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-slate-900 font-medium mb-3">Session Goals & Notes</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{notes}</p>
          </div>
        )}

        {/* What to Bring */}
        {equipment.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
            <h3 className="text-slate-900 font-medium mb-3">What to Bring</h3>
            <div className="space-y-2">
              {equipment.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {acceptError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center mb-4">
            {acceptError}
          </p>
        )}

        {/* Pending Request State */}
        {isRequested && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-amber-900 font-medium mb-1">Request Sent — Pending Approval</h3>
                <p className="text-sm text-amber-700 mb-3">
                  Your request has been sent to {posterName}. They'll review it and let you know.
                </p>
                {poster && (
                  <button
                    onClick={openChat}
                    className="text-sm text-amber-700 font-medium underline hover:text-amber-800"
                  >
                    Send them a message
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isRequested && (
          <div className="space-y-3 mb-6">
            <button
              onClick={() => setShowAcceptConfirmation(true)}
              disabled={accepting}
              className="w-full py-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {accepting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'REQUEST TO JOIN'}
            </button>

            {poster && (
              <button
                onClick={openChat}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl font-medium transition-all"
              >
                Ask a Question
              </button>
            )}
          </div>
        )}

        <div className="h-6"></div>
      </div>

      {/* Confirmation Modal */}
      {showAcceptConfirmation && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 px-6 pb-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Request to Join Session?</h3>
              <p className="text-sm text-slate-600">
                Your request will be sent to {posterName} for approval. The session is confirmed once they approve.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Date:</span>
                  <span className="text-sm text-slate-900 font-medium">{session.date || 'Flexible'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Time:</span>
                  <span className="text-sm text-slate-900 font-medium">{session.time || 'Flexible'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Duration:</span>
                  <span className="text-sm text-slate-900 font-medium">{duration}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={confirmAccept}
                disabled={accepting}
                className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-60 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {accepting ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send Request'}
              </button>
              <button
                onClick={() => setShowAcceptConfirmation(false)}
                className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
