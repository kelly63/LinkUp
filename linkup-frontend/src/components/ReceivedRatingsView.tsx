import { ChevronLeft, Star, Trophy, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ratings as ratingsApi } from '../lib/api';
import { useAuth } from '../lib/auth';

interface ReceivedRatingsViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function ReceivedRatingsView({ onBack, onNavigate }: ReceivedRatingsViewProps) {
  const { token } = useAuth();
  const [filterTab, setFilterTab] = useState<'approved' | 'pending' | 'all'>('approved');
  const [receivedRatings, setReceivedRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    ratingsApi.getReceived(token)
      .then((data) => setReceivedRatings(data.ratings || []))
      .catch(() => setReceivedRatings([]))
      .finally(() => setLoading(false));
  }, [token]);

  const filteredRatings = receivedRatings.filter((r) => {
    if (filterTab === 'all') return true;
    return r.status === filterTab;
  });

  const approvedCount = receivedRatings.filter((r) => r.status === 'approved').length;
  const pendingCount = receivedRatings.filter((r) => r.status === 'pending').length;

  const approvedRatings = receivedRatings.filter((r) => r.status === 'approved');
  const averageRating = approvedRatings.length > 0
    ? (approvedRatings.reduce((sum, r) => sum + r.overallRating, 0) / approvedRatings.length).toFixed(1)
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
          {(['approved', 'pending', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                filterTab === tab
                  ? tab === 'pending' ? 'bg-amber-600 text-white shadow-sm'
                    : tab === 'all' ? 'bg-slate-700 text-white shadow-sm'
                    : 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className={`ml-1.5 text-xs ${filterTab === tab ? 'text-white/70' : 'text-slate-500'}`}>
                ({tab === 'approved' ? approvedCount : tab === 'pending' ? pendingCount : receivedRatings.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ratings List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : filteredRatings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Star className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-semibold mb-1">No ratings yet</h3>
            <p className="text-sm text-slate-500">Ratings from others will appear here after sessions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRatings.map((rating) => {
              const rater = rating.rater || {};
              const initials = rater.avatar || getInitials(rater.name || '?');
              const sport = rater.sport || rater.sportsCoached?.[0] || '';
              const position = rater.role === 'coach' ? 'Coach' : (rater.position || '');
              const sessionDate = rating.session?.date
                ? new Date(rating.session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
              const receivedDate = new Date(rating.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div key={rating._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Reviewer Header */}
                  <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-slate-900 font-medium">{rater.name}</h3>
                        {position && <p className="text-sm text-slate-600">{position}</p>}
                      </div>
                      {sport && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                          <Trophy className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs text-blue-700 font-medium">{sport}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Session Details */}
                  {(sessionDate || rating.session?.location || rating.sport) && (
                    <div className="px-4 py-3 space-y-2 border-b border-slate-200">
                      {sessionDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{sessionDate}</span>
                        </div>
                      )}
                      {rating.session?.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{rating.session.location}</span>
                        </div>
                      )}
                      {rating.sport && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{rating.sport}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Section */}
                  <div className="px-4 py-4 space-y-3">
                    {rating.status === 'pending' && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-800">Pending admin approval</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">Overall Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= rating.overallRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    </div>

                    {rating.categories && Object.keys(rating.categories).length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {rating.categories.skillLevel != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Skill Level</span>
                            <span className="text-slate-900 font-medium">{rating.categories.skillLevel}/5</span>
                          </div>
                        )}
                        {rating.categories.punctuality != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Punctuality</span>
                            <span className="text-slate-900 font-medium">{rating.categories.punctuality}/5</span>
                          </div>
                        )}
                        {rating.categories.communication != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Communication</span>
                            <span className="text-slate-900 font-medium">{rating.categories.communication}/5</span>
                          </div>
                        )}
                        {rating.categories.attitude != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Attitude</span>
                            <span className="text-slate-900 font-medium">{rating.categories.attitude}/5</span>
                          </div>
                        )}
                      </div>
                    )}

                    {rating.wouldTrainAgain && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-green-700 font-medium">Would train again</span>
                      </div>
                    )}

                    {rating.feedback && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Feedback</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{rating.feedback}</p>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 text-center pt-2">Received {receivedDate}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="h-6"></div>
      </div>
    </div>
  );
}
