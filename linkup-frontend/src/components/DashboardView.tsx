import {
  Calendar,
  MapPin,
  Star,
  Clock,
  Users,
  ChevronRight,
  Search,
  Trophy,
  Heart,
  MessageCircle,
  PlusCircle,
  Award,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { CreatePostDialog } from './CreatePostDialog';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, connections as connectionsApi, ratings as ratingsApi, posts as postsApi, Post } from '../lib/api';
import { toast } from 'sonner';

interface DashboardViewProps {
  onTabChange: (tab: string) => void;
  onNavigate?: (view: string, details?: any) => void;
  scrollTarget?: string | null;
}

function getInitialsDash(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

export function DashboardView({ onTabChange, onNavigate, scrollTarget }: DashboardViewProps) {
  const { token, user } = useAuth();
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const upcomingSessionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [recentRatings, setRecentRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Community feed
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Fetch dashboard data
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [sessData, connData, ratingData] = await Promise.all([
          sessionsApi.getMine(token),
          connectionsApi.getPending(token),
          ratingsApi.getReceived(token),
        ]);
        setUpcomingSessions(sessData.sessions || []);
        setPendingRequests(connData.requests || []);
        setRecentRatings(ratingData.ratings || []);
      } catch (err: any) {
        toast.error(err?.message || 'Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Fetch community feed
  useEffect(() => {
    if (!token) return;
    setFeedLoading(true);
    postsApi.getFeed(token, { page: 1 })
      .then(({ posts: fetched }) => {
        setFeedPosts(fetched);
        const liked: Record<string, boolean> = {};
        const counts: Record<string, number> = {};
        fetched.forEach((p) => {
          liked[p._id] = user?._id ? p.likes.includes(user._id) : false;
          counts[p._id] = p.likes.length;
        });
        setLikedMap(liked);
        setLikeCounts(counts);
      })
      .catch(() => {})
      .finally(() => setFeedLoading(false));
  }, [token, user?._id]);

  const handleLike = useCallback(async (postId: string) => {
    if (!token) return;
    const wasLiked = likedMap[postId] ?? false;
    setLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      await postsApi.toggleLike(token, postId);
    } catch {
      setLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1) }));
    }
  }, [token, likedMap]);

  const handlePostCreated = useCallback((post: Post) => {
    setFeedPosts((prev) => [post, ...prev]);
    setLikedMap((prev) => ({ ...prev, [post._id]: false }));
    setLikeCounts((prev) => ({ ...prev, [post._id]: 0 }));
  }, []);

  // Scroll to target section when scrollTarget changes
  useEffect(() => {
    if (scrollTarget === 'upcoming-sessions' && upcomingSessionsRef.current && containerRef.current) {
      setTimeout(() => {
        upcomingSessionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [scrollTarget]);

  // Build recent activity from pending requests + recent ratings
  const recentActivity = [
    ...pendingRequests.slice(0, 2).map((req: any) => ({
      id: req._id,
      type: 'roster_addition',
      title: 'Roster Request',
      description: `${req.requester?.name || 'Someone'} wants to join your roster`,
      time: timeAgo(req.createdAt || new Date().toISOString()),
      userProfile: {
        _id: req.requester?._id,
        name: req.requester?.name || '',
        avatar: req.requester?.avatar || getInitialsDash(req.requester?.name || '?'),
        sport: req.requester?.sport || '',
        position: req.requester?.position || '',
        level: req.requester?.skillLevel || '',
        connectionId: req._id,
        isRosterRequest: true,
      },
    })),
    ...recentRatings.slice(0, 2).map((r: any) => ({
      id: r._id,
      type: 'rating_received',
      title: 'Rating Received',
      description: `${r.overallRating} stars from ${r.rater?.name || 'an athlete'}`,
      time: timeAgo(r.createdAt),
      ratingDetails: {
        from: r.rater?.name || '',
        avatar: r.rater?.avatar || getInitialsDash(r.rater?.name || '?'),
        rating: r.overallRating,
        sport: r.sport,
        date: new Date(r.createdAt).toLocaleDateString(),
      },
    })),
  ];

  const DISPLAYED_SESSIONS_COUNT = 2;
  const DISPLAYED_ACTIVITY_COUNT = 3;
  const displayedSessions = upcomingSessions.slice(0, DISPLAYED_SESSIONS_COUNT);
  const displayedActivity = recentActivity.slice(0, DISPLAYED_ACTIVITY_COUNT);

  const handleActivityClick = (activity: any) => {
    if (!onNavigate) return;

    switch (activity.type) {
      case 'session_completed':
        // If already rated, show session details; otherwise rating button handles it
        if (activity.hasRating && activity.sessionDetails) {
          onNavigate('userProfile', activity.sessionDetails);
        }
        break;
      case 'roster_addition':
        // Navigate to the user's profile
        if (activity.userProfile) {
          onNavigate('userProfile', activity.userProfile);
        }
        break;
      case 'rating_received':
        // Navigate to reviews to see the rating
        onNavigate('reviews', activity.ratingDetails);
        break;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50" ref={containerRef}>
      {/* Header with Search */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">Welcome back,</p>
            <h2 className="text-white">{user?.name?.split(' ')[0] || 'Athlete'}</h2>
          </div>
        </div>

        {/* Search Athletes Button */}
        {onNavigate && (
          <button
            onClick={() => onNavigate('athleteSearch')}
            className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white p-5 rounded-2xl flex items-center justify-between transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-semibold">Search Athletes</h4>
                <p className="text-sm text-emerald-100">Find practice partners nearby</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        )}

      </div>
  {/* Upcoming Sessions */}
      <div className="px-6 mb-6" ref={upcomingSessionsRef}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-900">Upcoming Sessions</h3>
          {upcomingSessions.length > DISPLAYED_SESSIONS_COUNT && (
            <button
              onClick={() => onNavigate && onNavigate('mySessions')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          )}
        </div>
        
        {loading && (
          <div className="flex justify-center py-6">
            <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="space-y-3">
          {!loading && displayedSessions.length === 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500 text-sm">No upcoming sessions.</p>
              <button
                onClick={() => onTabChange('post')}
                className="mt-3 text-blue-600 text-sm hover:underline"
              >
                Post or find a session →
              </button>
            </div>
          )}
          {displayedSessions.map((session) => (
            <div
              key={session._id}
              className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200 hover:border-blue-300 transition-all"
            >
              {/* Session Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-slate-900">{session.title || session.sport}</h4>
                    <div className={`px-2 py-0.5 rounded-full text-xs ${
                      session.status === 'confirmed'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {session.status === 'confirmed' ? 'Confirmed' : 'Open'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 rounded-lg px-2 py-1 inline-flex border border-blue-100">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{session.posterRole || session.position}</span>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3 h-3 text-amber-600" />
                  </div>
                  <span className="text-slate-700">
                    {session.date ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
                    {session.time ? ` at ${session.time}` : ''}
                  </span>
                </div>
                {session.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-slate-700">{session.location}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onNavigate && onNavigate('sessionDetails', session)}
                className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 border border-slate-200"
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Recent Activity */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-900">Recent Activity</h3>
          {recentActivity.length > DISPLAYED_ACTIVITY_COUNT && (
            <button 
              onClick={() => onNavigate && onNavigate('reviews')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {!loading && displayedActivity.length === 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500 text-sm">No recent activity yet.</p>
            </div>
          )}
          {displayedActivity.map((activity) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className={`w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all ${
                (activity.type === 'roster_addition' || activity.type === 'rating_received' || (activity.type === 'session_completed' && activity.hasRating))
                  ? 'hover:border-blue-300 hover:shadow-md active:scale-[0.99] cursor-pointer'
                  : ''
              }`}
            >
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'session_completed' ? 'bg-green-100' :
                    activity.type === 'roster_addition' ? 'bg-blue-100' :
                    'bg-amber-100'
                  }`}>
                    {activity.type === 'session_completed' && <Trophy className="w-5 h-5 text-green-600" />}
                    {activity.type === 'roster_addition' && <Users className="w-5 h-5 text-blue-600" />}
                    {activity.type === 'rating_received' && <Star className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-slate-900 text-sm font-medium">{activity.title}</h4>
                      {activity.type === 'rating_received' && (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                    
                    {/* Show rating status or button for completed sessions */}
                    {activity.type === 'session_completed' && (
                      <div className="mt-3">
                        {activity.hasRating ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-600">Your rating:</span>
                            {[...Array(activity.rating || 0)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate && onNavigate('rating', activity.sessionDetails);
                            }}
                            className="w-full py-2.5 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Star className="w-4 h-4" />
                            Rate This Session
                          </button>
                        )}
                      </div>
                    )}

                    {/* Show respond button for roster requests */}
                    {activity.type === 'roster_addition' && (
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate && onNavigate('userProfile', {
                              ...activity.userProfile,
                              isRosterRequest: true
                            });
                          }}
                          className="w-full py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          View Profile & Respond
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    

      {/* Community Feed */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-900">Community Feed</h3>
          <button
            onClick={() => setIsCreatePostDialogOpen(true)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <PlusCircle className="w-4 h-4" />
            Post
          </button>
        </div>

        {/* Quick post bar */}
        <button
          onClick={() => setIsCreatePostDialogOpen(true)}
          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-blue-400 transition-all mb-4"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {user ? getInitialsDash(user.name) : '?'}
          </div>
          <span className="text-slate-400 text-sm">Share thoughts or a session update…</span>
        </button>

        {feedLoading && (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!feedLoading && feedPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Award className="w-8 h-8 opacity-30" />
            <p className="text-sm">No posts yet — be the first!</p>
          </div>
        )}

        <div className="space-y-4">
          {feedPosts.map((post) => {
            const author = post.author;
            const initials = author ? getInitialsDash(author.name) : '??';
            const isLiked = likedMap[post._id] ?? false;
            const likeCount = likeCounts[post._id] ?? post.likes.length;
            return (
              <div key={post._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Author */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden">
                    {author?.avatar
                      ? <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                      : initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{author?.name}</p>
                    <p className="text-xs text-slate-400">
                      {[author?.position, author?.sport].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  {post.type === 'thought' && (
                    <p className="text-sm text-slate-800 leading-relaxed">{post.content}</p>
                  )}
                  {post.type === 'session_completion' && (
                    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-3 border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-medium text-emerald-700">Session Completed</span>
                      </div>
                      <p className="text-sm text-slate-800">
                        {post.sessionSummary || post.content || 'Completed a session'}
                      </p>
                    </div>
                  )}
                  {post.type === 'article' && (
                    <div>
                      {post.content && <p className="text-sm text-slate-800 mb-2">{post.content}</p>}
                      {post.sharedUrl && (
                        <div className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-blue-600 truncate">
                          {post.articleTitle || post.sharedUrl}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                    {likeCount > 0 && <span>{likeCount}</span>}
                  </button>
                  <button
                    onClick={() => onNavigate?.('lockerRoom')}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-500 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments.length > 0 && <span>{post.comments.length}</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {feedPosts.length > 0 && (
          <button
            onClick={() => onNavigate?.('lockerRoom')}
            className="w-full mt-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
          >
            See all posts in Locker Room
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <CreatePostDialog
        isOpen={isCreatePostDialogOpen}
        onClose={() => setIsCreatePostDialogOpen(false)}
        token={token}
        user={user}
        onPostCreated={handlePostCreated}
      />

      {/* Bottom Spacing */}
      <div className="h-6"></div>
    </div>
  );
}