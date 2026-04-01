import { ChevronLeft, Star, Trophy, Calendar, MapPin, Clock } from 'lucide-react';

interface SessionReview {
  id: number;
  partner: {
    name: string;
    avatar: string;
    sport: string;
    position: string;
    type: 'athlete' | 'coach';
  };
  session: {
    date: string;
    location: string;
    duration: string;
    type: string;
  };
  rating?: {
    overall: number;
    skillLevel: number;
    punctuality: number;
    communication: number;
    attitude: number;
    wouldTrainAgain: boolean;
    feedback: string;
  };
  hasRating: boolean;
  completedDate: string;
}

interface ReviewsViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

export function ReviewsView({ onBack, onNavigate }: ReviewsViewProps) {
  // Mock data for session reviews
  const sessionReviews: SessionReview[] = [
    {
      id: 1,
      partner: {
        name: 'Sarah Johnson',
        avatar: 'SJ',
        sport: 'Baseball',
        position: 'Pitcher (RHP)',
        type: 'athlete'
      },
      session: {
        date: 'Jan 26, 2026',
        location: 'UCLA Practice Field',
        duration: '2 hours',
        type: 'Pitching Session'
      },
      hasRating: false,
      completedDate: '2 days ago'
    },
    {
      id: 2,
      partner: {
        name: 'Alex Chen',
        avatar: 'AC',
        sport: 'Basketball',
        position: 'Point Guard',
        type: 'athlete'
      },
      session: {
        date: 'Jan 24, 2026',
        location: 'Elite Hoops Gym',
        duration: '1.5 hours',
        type: 'Shooting Drill'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Great session! Alex was punctual, professional, and brought great energy. Would definitely train again.'
      },
      hasRating: true,
      completedDate: '4 days ago'
    },
    {
      id: 3,
      partner: {
        name: 'Marcus Thompson',
        avatar: 'MT',
        sport: 'Football',
        position: 'Wide Receiver',
        type: 'athlete'
      },
      session: {
        date: 'Jan 20, 2026',
        location: 'Memorial Stadium',
        duration: '2 hours',
        type: 'Route Running Practice'
      },
      rating: {
        overall: 4,
        skillLevel: 4,
        punctuality: 5,
        communication: 4,
        attitude: 4,
        wouldTrainAgain: true,
        feedback: 'Solid practice session. Marcus showed up on time and worked hard throughout.'
      },
      hasRating: true,
      completedDate: '1 week ago'
    },
    {
      id: 4,
      partner: {
        name: 'Coach Williams',
        avatar: 'CW',
        sport: 'Baseball',
        position: 'Pitching Coach',
        type: 'coach'
      },
      session: {
        date: 'Jan 18, 2026',
        location: 'Pro Athletics Training',
        duration: '1 hour',
        type: 'Mechanics Training'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Excellent coaching! Really helped me improve my mechanics and arm angle. Highly recommend.'
      },
      hasRating: true,
      completedDate: '1 week ago'
    }
  ];

  const handleRateSession = (session: SessionReview) => {
    const sessionData = {
      name: session.partner.name,
      avatar: session.partner.avatar,
      sport: session.partner.sport,
      position: session.partner.position,
      type: session.partner.type,
      date: session.session.date,
      location: session.session.location,
      duration: session.session.duration
    };
    onNavigate && onNavigate('rating', sessionData);
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
            <h2 className="text-white">Session Reviews</h2>
            <p className="text-blue-200 text-sm">Your completed sessions</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          {sessionReviews.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Partner Header */}
              <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {session.partner.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-900 font-medium">{session.partner.name}</h3>
                    <p className="text-sm text-slate-600">{session.partner.position}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                    <Trophy className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">{session.partner.sport}</span>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="px-4 py-3 space-y-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{session.session.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{session.session.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{session.session.duration} • {session.session.type}</span>
                </div>
              </div>

              {/* Rating Section */}
              <div className="px-4 py-4">
                {session.hasRating && session.rating ? (
                  <div className="space-y-3">
                    {/* Overall Rating */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">Your Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= session.rating!.overall
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Category Ratings */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">Skill Level</span>
                        <span className="text-slate-900 font-medium">{session.rating.skillLevel}/5</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">Punctuality</span>
                        <span className="text-slate-900 font-medium">{session.rating.punctuality}/5</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">Communication</span>
                        <span className="text-slate-900 font-medium">{session.rating.communication}/5</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                        <span className="text-slate-600">Attitude</span>
                        <span className="text-slate-900 font-medium">{session.rating.attitude}/5</span>
                      </div>
                    </div>

                    {/* Would Train Again */}
                    {session.rating.wouldTrainAgain && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-green-700 font-medium">Would train again</span>
                      </div>
                    )}

                    {/* Feedback */}
                    {session.rating.feedback && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Your Feedback</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{session.rating.feedback}</p>
                      </div>
                    )}

                    {/* Completed Date */}
                    <div className="text-xs text-slate-400 text-center pt-2">
                      Completed {session.completedDate}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center py-2">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-2">
                          <Star className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-sm text-slate-600 mb-1">Not rated yet</p>
                        <p className="text-xs text-slate-400">Share your experience with {session.partner.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRateSession(session)}
                      className="w-full py-2.5 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Rate This Session
                    </button>
                    <div className="text-xs text-slate-400 text-center">
                      Completed {session.completedDate}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Spacing */}
        <div className="h-6"></div>
      </div>
    </div>
  );
}
