import { ChevronLeft, Star, Trophy, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface ReceivedRating {
  id: number;
  from: {
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
  rating: {
    overall: number;
    skillLevel: number;
    punctuality: number;
    communication: number;
    attitude: number;
    wouldTrainAgain: boolean;
    feedback: string;
  };
  receivedDate: string;
  status: 'approved' | 'pending' | 'rejected';
}

interface ReceivedRatingsViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

export function ReceivedRatingsView({ onBack, onNavigate }: ReceivedRatingsViewProps) {
  const [filterTab, setFilterTab] = useState<'approved' | 'pending' | 'all'>('approved');
  
  // Mock data for ratings received from others
  const receivedRatings: ReceivedRating[] = [
    {
      id: 1,
      from: {
        name: 'Alex Thompson',
        avatar: 'AT',
        sport: 'Football',
        position: 'Quarterback',
        type: 'athlete'
      },
      session: {
        date: 'Jan 22, 2026',
        location: 'Memorial Stadium',
        duration: '2 hours',
        type: 'QB-WR Route Running'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Excellent practice partner! Mike showed up on time, brought great energy, and really pushed me to improve. His technique is solid and he communicates well. Would definitely train again.'
      },
      receivedDate: '6 days ago',
      status: 'approved'
    },
    {
      id: 2,
      from: {
        name: 'Steve Johnson',
        avatar: 'SJ',
        sport: 'Baseball',
        position: 'Pitcher (RHP)',
        type: 'athlete'
      },
      session: {
        date: 'Jan 26, 2026',
        location: 'UCLA Practice Field',
        duration: '2 hours',
        type: 'Baseball Bullpen'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Great session! Mike is a skilled catcher with excellent game knowledge. Very punctual and professional. Highly recommend training with him.'
      },
      receivedDate: '2 days ago',
      status: 'approved'
    },
    {
      id: 3,
      from: {
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
        skillLevel: 4,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Mike was a great training partner. Very focused and brought good competitive energy. Would work with him again.'
      },
      receivedDate: '4 days ago',
      status: 'approved'
    },
    {
      id: 4,
      from: {
        name: 'Coach Martinez',
        avatar: 'CM',
        sport: 'Baseball',
        position: 'Catching Coach',
        type: 'coach'
      },
      session: {
        date: 'Jan 15, 2026',
        location: 'Diamond Training Center',
        duration: '1 hour',
        type: 'Catching Fundamentals'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Mike is a coachable athlete with a strong work ethic. He listens well and applies feedback immediately. A pleasure to work with.'
      },
      receivedDate: '2 weeks ago',
      status: 'approved'
    },
    {
      id: 5,
      from: {
        name: 'Jordan Williams',
        avatar: 'JW',
        sport: 'Baseball',
        position: 'Infielder',
        type: 'athlete'
      },
      session: {
        date: 'Jan 10, 2026',
        location: 'UCLA Practice Field',
        duration: '2 hours',
        type: 'Defensive Drills'
      },
      rating: {
        overall: 4,
        skillLevel: 4,
        punctuality: 5,
        communication: 4,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Solid practice session. Mike is reliable and works hard. Good communication throughout.'
      },
      receivedDate: '3 weeks ago',
      status: 'approved'
    },
    {
      id: 6,
      from: {
        name: 'Taylor Rodriguez',
        avatar: 'TR',
        sport: 'Baseball',
        position: 'Outfielder',
        type: 'athlete'
      },
      session: {
        date: 'Jan 28, 2026',
        location: 'UCLA Practice Field',
        duration: '1.5 hours',
        type: 'Hitting Practice'
      },
      rating: {
        overall: 5,
        skillLevel: 5,
        punctuality: 5,
        communication: 5,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Mike is an outstanding training partner. His dedication and positive attitude make every session productive.'
      },
      receivedDate: '1 day ago',
      status: 'pending'
    },
    {
      id: 7,
      from: {
        name: 'Sarah Martinez',
        avatar: 'SM',
        sport: 'Softball',
        position: 'Pitcher (RHP)',
        type: 'athlete'
      },
      session: {
        date: 'Jan 27, 2026',
        location: 'Sunset Sports Complex',
        duration: '2 hours',
        type: 'Catching Drills'
      },
      rating: {
        overall: 4,
        skillLevel: 4,
        punctuality: 5,
        communication: 4,
        attitude: 5,
        wouldTrainAgain: true,
        feedback: 'Great session with Mike. He really knows his stuff and gave me helpful feedback on my mechanics.'
      },
      receivedDate: '2 days ago',
      status: 'pending'
    }
  ];

  // Filter ratings based on selected tab
  const filteredRatings = receivedRatings.filter(rating => {
    if (filterTab === 'all') return true;
    return rating.status === filterTab;
  });

  // Count approved and pending reviews
  const approvedCount = receivedRatings.filter(r => r.status === 'approved').length;
  const pendingCount = receivedRatings.filter(r => r.status === 'pending').length;

  // Calculate average rating (only for approved reviews)
  const approvedRatings = receivedRatings.filter(r => r.status === 'approved');
  const averageRating = approvedRatings.length > 0 
    ? (approvedRatings.reduce((sum, r) => sum + r.rating.overall, 0) / approvedRatings.length).toFixed(1)
    : '0.0';

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-white">My Ratings</h2>
            <p className="text-blue-200 text-sm">Ratings received from others</p>
          </div>
        </div>

        {/* Overall Rating Summary */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Overall Rating</p>
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                <span className="text-3xl text-white font-semibold">{averageRating}</span>
                <span className="text-blue-200 text-sm">/ 5.0</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl text-white font-semibold">{approvedCount}</div>
              <p className="text-blue-200 text-sm">Approved Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterTab('approved')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filterTab === 'approved'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Approved
            <span className={`ml-1.5 text-xs ${
              filterTab === 'approved' ? 'text-blue-100' : 'text-slate-500'
            }`}>
              ({approvedCount})
            </span>
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all relative ${
              filterTab === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending
            <span className={`ml-1.5 text-xs ${
              filterTab === 'pending' ? 'text-amber-100' : 'text-slate-500'
            }`}>
              ({pendingCount})
            </span>
            {pendingCount > 0 && filterTab !== 'pending' && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
            <span className={`ml-1.5 text-xs ${
              filterTab === 'all' ? 'text-slate-300' : 'text-slate-500'
            }`}>
              ({receivedRatings.length})
            </span>
          </button>
        </div>
      </div>

      {/* Ratings List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          {filteredRatings.map((rating) => (
            <div
              key={rating.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Reviewer Header */}
              <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {rating.from.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-900 font-medium">{rating.from.name}</h3>
                    <p className="text-sm text-slate-600">{rating.from.position}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                    <Trophy className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">{rating.from.sport}</span>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="px-4 py-3 space-y-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{rating.session.date}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{rating.session.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{rating.session.duration} • {rating.session.type}</span>
                </div>
              </div>

              {/* Rating Section */}
              <div className="px-4 py-4">
                <div className="space-y-3">
                  {/* Pending Status Badge */}
                  {rating.status === 'pending' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 font-medium">Pending Admin Approval</p>
                        <p className="text-xs text-amber-600">This review is awaiting moderation before appearing on your public profile</p>
                      </div>
                    </div>
                  )}

                  {/* Overall Rating */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium">Rating from {rating.from.name.split(' ')[0]}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= rating.rating.overall
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
                      <span className="text-slate-900 font-medium">{rating.rating.skillLevel}/5</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Punctuality</span>
                      <span className="text-slate-900 font-medium">{rating.rating.punctuality}/5</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Communication</span>
                      <span className="text-slate-900 font-medium">{rating.rating.communication}/5</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-600">Attitude</span>
                      <span className="text-slate-900 font-medium">{rating.rating.attitude}/5</span>
                    </div>
                  </div>

                  {/* Would Train Again */}
                  {rating.rating.wouldTrainAgain && (
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
                  {rating.rating.feedback && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Feedback</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{rating.rating.feedback}</p>
                    </div>
                  )}

                  {/* Received Date */}
                  <div className="text-xs text-slate-400 text-center pt-2">
                    Received {rating.receivedDate}
                  </div>
                </div>
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