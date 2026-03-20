import { ChevronLeft, Calendar, MapPin, Clock, Users, Trophy, MessageCircle, Star, Navigation, CheckCircle, Award, Shield } from 'lucide-react';
import { useState } from 'react';

interface AvailableSessionViewProps {
  session: {
    id: number;
    title: string;
    seeking: string;
    level: string;
    distance: string;
    date: string;
    time: string;
    sport: string;
  };
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
  onOpenChat?: (athlete: { 
    id: number; 
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

export function AvailableSessionView({ session, onBack, onNavigate, onOpenChat }: AvailableSessionViewProps) {
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // Mock data for the athlete who posted the session
  const poster = {
    name: 'Marcus Rodriguez',
    avatar: 'MR',
    position: 'Pitcher (RHP)',
    level: 'NCAA D1',
    rating: 4.9,
    sessionsCompleted: 78,
    school: 'UCLA',
    isVerified: true,
    bio: 'D1 pitcher looking to work on breaking ball mechanics and velocity training.'
  };

  // Mock session details
  const sessionDetails = {
    fullAddress: 'Jackie Robinson Ballpark, 2500 S Atlantic Ave, Daytona Beach, FL',
    duration: '1.5 hours',
    skillLevelRequested: session.level,
    notes: 'Looking for a catcher to help with bullpen work. Focus on fastball command and developing my slider. I have all equipment, just need someone behind the plate with experience framing pitches.',
    equipment: ['Baseball glove', 'Cleats', 'Water bottle'],
    preferences: ['Experienced with framing', 'Comfortable giving feedback', 'Available for warmup']
  };

  const handleAccept = () => {
    setShowAcceptConfirmation(true);
  };

  const confirmAccept = () => {
    setIsAccepted(true);
    setShowAcceptConfirmation(false);
    // In production, this would send an acceptance request
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
            <h2 className="text-white">{session.title}</h2>
            <p className="text-blue-200 text-sm">{session.sport} • {session.distance}</p>
          </div>
        </div>

        {/* Seeking Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
            <Users className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-medium text-blue-200">
              Seeking: {session.seeking}
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
              {poster.avatar}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-slate-900 font-medium">{poster.name}</h3>
                {poster.isVerified && (
                  <Shield className="w-4 h-4 text-green-600 fill-green-100" />
                )}
              </div>
              <p className="text-sm text-slate-600 mb-1">{poster.position}</p>
              <p className="text-xs text-slate-500 mb-2">{poster.school}</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm text-slate-700 font-medium">{poster.rating}</span>
                </div>
                <span className="text-sm text-slate-400">•</span>
                <span className="text-sm text-slate-600">{poster.sessionsCompleted} sessions</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
              <Trophy className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">{poster.level}</span>
            </div>
          </div>

          {/* Quick Action - Message */}
          <button 
            onClick={() => onOpenChat && onOpenChat({
              id: 1,
              name: poster.name,
              avatar: poster.avatar,
              sport: session.sport,
              position: poster.position,
              level: poster.level,
              sessionContext: {
                sessionTitle: session.title,
                date: session.date,
                time: session.time,
                location: sessionDetails.fullAddress
              }
            })}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">Message First</span>
          </button>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-4">Session Details</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Date & Time</p>
                <p className="text-slate-900 font-medium">{session.date}</p>
                <p className="text-slate-700">{session.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-0.5">Location</p>
                <p className="text-slate-900 font-medium mb-2">{sessionDetails.fullAddress}</p>
                <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Duration</p>
                <p className="text-slate-900 font-medium">{sessionDetails.duration}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-0.5">Skill Level Requested</p>
                <p className="text-slate-900 font-medium">{sessionDetails.skillLevelRequested}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session Goals & Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-3">Session Goals & Notes</h3>
          <p className="text-sm text-slate-700 leading-relaxed">{sessionDetails.notes}</p>
        </div>

        {/* Partner Preferences */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-3">Looking For</h3>
          <div className="space-y-2">
            {sessionDetails.preferences.map((pref, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-700">{pref}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What to Bring */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-4">
          <h3 className="text-slate-900 font-medium mb-3">What to Bring</h3>
          <div className="space-y-2">
            {sessionDetails.equipment.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success State */}
        {isAccepted && (
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-2xl p-5 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-green-900 font-medium mb-1">Request Sent!</h3>
                <p className="text-sm text-green-700 mb-3">
                  Your request to join this session has been sent to {poster.name}. They'll be notified and can accept your request.
                </p>
                <button 
                  onClick={() => {/* Navigate to chat */}}
                  className="text-sm text-green-700 font-medium underline hover:text-green-800"
                >
                  Send them a message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isAccepted && (
          <div className="space-y-3 mb-6">
            <button 
              onClick={handleAccept}
              className="w-full py-4 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-green-600/20 active:scale-[0.98]"
            >
              ACCEPT SESSION
            </button>
            
            <button 
              onClick={() => onOpenChat && onOpenChat({
                id: 1,
                name: poster.name,
                avatar: poster.avatar,
                sport: session.sport,
                position: poster.position,
                level: poster.level,
                sessionContext: {
                  sessionTitle: session.title,
                  date: session.date,
                  time: session.time,
                  location: sessionDetails.fullAddress
                }
              })}
              className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 rounded-xl font-medium transition-all"
            >
              Ask a Question
            </button>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-6"></div>
      </div>

      {/* Confirmation Modal */}
      {showAcceptConfirmation && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 px-6 pb-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">Accept Session Request?</h3>
              <p className="text-sm text-slate-600">
                By accepting, you're committing to join this session with {poster.name} on {session.date}.
              </p>
            </div>

            {/* Session Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Date:</span>
                  <span className="text-sm text-slate-900 font-medium">{session.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Time:</span>
                  <span className="text-sm text-slate-900 font-medium">{session.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Duration:</span>
                  <span className="text-sm text-slate-900 font-medium">{sessionDetails.duration}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={confirmAccept}
                className="w-full py-3.5 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all shadow-sm active:scale-[0.98]"
              >
                Confirm & Accept
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