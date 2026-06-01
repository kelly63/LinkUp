import { ChevronLeft, Star, Trophy, Calendar, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ratings as ratingsApi } from '../lib/api';
import { useAuth } from '../lib/auth';

interface ReviewsViewProps {
  onBack: () => void;
  onNavigate?: (view: string, data?: any) => void;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function ReviewsView({ onBack, onNavigate }: ReviewsViewProps) {
  const { token } = useAuth();
  const [sessionReviews, setSessionReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    ratingsApi.getGiven(token)
      .then((data) => setSessionReviews(data.ratings || []))
      .catch(() => setSessionReviews([]))
      .finally(() => setLoading(false));
  }, [token]);

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
            <p className="text-emerald-200 text-sm">Ratings you've given to others</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : sessionReviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Star className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-semibold mb-1">No reviews yet</h3>
            <p className="text-sm text-slate-500">Ratings you give after sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionReviews.map((review) => {
              const ratee = review.ratee || {};
              const initials = ratee.avatar || getInitials(ratee.name || '?');
              const sport = ratee.sport || ratee.sportsCoached?.[0] || review.sport || '';
              const position = ratee.role === 'coach' ? 'Coach' : (ratee.position || '');
              const sessionDate = review.session?.date
                ? new Date(review.session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
              const reviewDate = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div key={review._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Partner Header */}
                  <div className="px-4 py-4 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-slate-900 font-medium">{ratee.name}</h3>
                        {position && <p className="text-sm text-slate-600">{position}</p>}
                      </div>
                      {sport && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs text-emerald-700 font-medium">{sport}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Session Details */}
                  {(sessionDate || review.session?.location || review.sport) && (
                    <div className="px-4 py-3 space-y-2 border-b border-slate-200">
                      {sessionDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{sessionDate}</span>
                        </div>
                      )}
                      {review.session?.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{review.session.location}</span>
                        </div>
                      )}
                      {review.sport && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{review.sport}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rating Section */}
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 font-medium">Your Rating</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= review.overallRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    </div>

                    {review.categories && Object.keys(review.categories).length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {review.categories.skillLevel != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Skill Level</span>
                            <span className="text-slate-900 font-medium">{review.categories.skillLevel}/5</span>
                          </div>
                        )}
                        {review.categories.punctuality != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Punctuality</span>
                            <span className="text-slate-900 font-medium">{review.categories.punctuality}/5</span>
                          </div>
                        )}
                        {review.categories.communication != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Communication</span>
                            <span className="text-slate-900 font-medium">{review.categories.communication}/5</span>
                          </div>
                        )}
                        {review.categories.attitude != null && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Attitude</span>
                            <span className="text-slate-900 font-medium">{review.categories.attitude}/5</span>
                          </div>
                        )}
                      </div>
                    )}

                    {review.wouldTrainAgain && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm text-green-700 font-medium">Would train again</span>
                      </div>
                    )}

                    {review.feedback && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Your Feedback</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{review.feedback}</p>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 text-center pt-2">Submitted {reviewDate}</div>
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
