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
  Shield,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { CreatePostDialog } from './CreatePostDialog';
import { useAuth } from '../lib/auth';
import { sessions as sessionsApi, connections as connectionsApi, ratings as ratingsApi, posts as postsApi, Post, avatarThumb } from '../lib/api';
import { toast } from 'sonner';

interface DashboardViewProps {
  onTabChange: (tab: string) => void;
  onNavigate?: (view: string, details?: any) => void;
  scrollTarget?: string | null;
}

function getInitialsDash(name: string | undefined | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
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

type ActivityItem = {
  kind: 'activity';
  id: string;
  type: string;
  title: string;
  description: string;
  ts: Date;
  userProfile?: any;
  ratingDetails?: any;
  sessionDetails?: any;
  hasRating?: boolean;
  rating?: number;
};

type PostItem = {
  kind: 'post';
  id: string;
  ts: Date;
  post: Post;
};

type FeedItem = ActivityItem | PostItem;

export function DashboardView({ onTabChange, onNavigate, scrollTarget }: DashboardViewProps) {
  const { token, user } = useAuth();
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const upcomingSessionsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [recentRatings, setRecentRatings] = useState<any[]>([]);
  const [rosterIds, setRosterIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Fetch dashboard data
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [sessData, connData, rosterData, ratingData] = await Promise.all([
          sessionsApi.getMine(token),
          connectionsApi.getPending(token),
          connectionsApi.getAll(token),
          ratingsApi.getReceived(token),
        ]);
        setUpcomingSessions(sessData.sessions || []);
        setPendingRequests(connData.requests || []);
        setRecentRatings(ratingData.ratings || []);
        const ids = new Set((rosterData.connections || []).map((c: any) => c.user._id as string));
        setRosterIds(ids);
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

  useEffect(() => {
    if (scrollTarget === 'upcoming-sessions' && upcomingSessionsRef.current && containerRef.current) {
      setTimeout(() => {
        upcomingSessionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [scrollTarget]);

  // Build combined feed: activity items + community posts, sorted newest-first
  const activityItems: ActivityItem[] = [
    ...pendingRequests.slice(0, 3).map((req: any): ActivityItem => ({
      kind: 'activity',
      id: req._id,
      type: 'roster_addition',
      title: 'Roster Request',
      description: `${req.requester?.name || 'Someone'} wants to join your roster`,
      ts: new Date(req.createdAt || Date.now()),
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
    ...recentRatings.slice(0, 3).map((r: any): ActivityItem => ({
      kind: 'activity',
      id: r._id,
      type: 'rating_received',
      title: 'Rating Received',
      description: `${r.overallRating} stars from ${r.rater?.name || 'an athlete'}`,
      ts: new Date(r.createdAt),
      ratingDetails: {
        from: r.rater?.name || '',
        avatar: r.rater?.avatar || getInitialsDash(r.rater?.name || '?'),
        rating: r.overallRating,
        sport: r.sport,
        date: new Date(r.createdAt).toLocaleDateString(),
      },
    })),
  ];

  const postItems: PostItem[] = feedPosts.map((p): PostItem => ({
    kind: 'post',
    id: p._id,
    ts: new Date(p.createdAt),
    post: p,
  }));

  const combinedFeed: FeedItem[] = [...activityItems, ...postItems]
    .sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const DISPLAYED_SESSIONS_COUNT = 2;
  const displayedSessions = upcomingSessions.slice(0, DISPLAYED_SESSIONS_COUNT);
  const isAnyLoading = loading || feedLoading;

  const handleActivityClick = (item: ActivityItem) => {
    if (!onNavigate) return;
    if (item.type === 'roster_addition' && item.userProfile) {
      onNavigate('userProfile', item.userProfile);
    } else if (item.type === 'rating_received') {
      onNavigate('reviews', item.ratingDetails);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50" ref={containerRef}>
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 px-6 pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-emerald-200 text-sm">Welcome back,</p>
            <h2 className="text-white">{user?.name?.split(' ')[0] || 'Athlete'}</h2>
          </div>
        </div>

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
      <div className="px-6 mt-6 mb-6" ref={upcomingSessionsRef}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-900">Upcoming Sessions</h3>
          <button onClick={() => onNavigate?.('mySessions')} className="text-sm text-emerald-600 hover:text-emerald-700">
            View All
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="space-y-3">
          {!loading && displayedSessions.length === 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500 text-sm">No upcoming sessions.</p>
              <button onClick={() => onTabChange('post')} className="mt-3 text-emerald-600 text-sm hover:underline">
                Post or find a session →
              </button>
            </div>
          )}
          {displayedSessions.map((session) => {
            const isMySession = session.postedBy?._id === user?._id || session.postedBy === user?._id;
            const confirmedPartner: any = session.partner ?? null;
            const pendingPartners: any[] = session.pendingPartners ?? [];
            const pendingRequester: any = pendingPartners.length > 0 ? pendingPartners[0] : null;
            const otherPerson: any = isMySession
              ? (confirmedPartner ?? pendingRequester ?? null)
              : session.postedBy ?? null;
            const isPendingRequest = isMySession && !confirmedPartner && pendingPartners.length > 0;
            const iAmRequester = !isMySession && pendingPartners.some((p: any) => p?._id === user?._id);
            const otherId: string | null = otherPerson?._id ?? null;
            const isOnRoster = otherId ? rosterIds.has(otherId) : false;

            return (
            <div key={session._id} className={`bg-white rounded-2xl p-4 shadow-xl border transition-all ${
              isPendingRequest ? 'border-amber-300 hover:border-amber-400' : 'border-slate-200 hover:border-emerald-300'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-slate-900">{session.title || session.sport}</h4>
                    {isMySession && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        My Session
                      </span>
                    )}
                    <div className={`px-2 py-0.5 rounded-full text-xs border ${
                      session.status === 'confirmed'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : isPendingRequest
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : iAmRequester
                            ? 'bg-orange-100 text-orange-700 border-orange-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {session.status === 'confirmed' ? 'Confirmed' : iAmRequester ? 'Pending' : isPendingRequest ? 'Action Needed' : 'Open'}
                    </div>
                  </div>

                  {/* Other person's name + roster badge */}
                  {isPendingRequest ? (
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[8px] font-bold">
                          {getInitialsDash(pendingRequester?.name || '?')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-amber-700">
                        {pendingPartners.length > 1
                          ? `${pendingPartners.length} people want to join`
                          : `${pendingRequester?.name} wants to join`}
                      </span>
                      {isOnRoster && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                          <Shield className="w-2.5 h-2.5" />
                          Roster
                        </span>
                      )}
                    </div>
                  ) : otherPerson ? (
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[8px] font-bold">
                          {getInitialsDash(otherPerson.name || '?')}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">
                        {isMySession ? 'with ' : 'by '}{otherPerson.name}
                      </span>
                      {isOnRoster && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">
                          <Shield className="w-2.5 h-2.5" />
                          Roster
                        </span>
                      )}
                    </div>
                  ) : isMySession ? (
                    <p className="text-xs text-slate-400 mb-2 italic">Your session · awaiting partner</p>
                  ) : null}

                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 inline-flex border border-blue-100">
                    <Users className="w-3 h-3" />
                    <span className="text-xs">{session.posterRole || session.position}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3 h-3 text-amber-600" />
                  </div>
                  <span className="text-slate-700">
                    {(() => {
                      if (!session.date || session.date === 'Flexible') return session.date || 'TBD';
                      const d = new Date(session.date);
                      return isNaN(d.getTime()) ? session.date : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    })()}
                    {session.time && session.time !== 'Flexible' ? ` at ${session.time}` : session.time === 'Flexible' ? ' · Flexible time' : ''}
                  </span>
                </div>
                {session.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-slate-700">{session.location}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => onNavigate?.('sessionDetails', session)}
                className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 border border-slate-200"
              >
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            );
          })}
        </div>
      </div>

      {/* Combined Activity + Community Feed */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-900">Locker Room</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreatePostDialogOpen(true)}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
            >
              <PlusCircle className="w-4 h-4" />
              Post
            </button>
            {combinedFeed.length > 0 && (
              <button
                onClick={() => onNavigate?.('lockerRoom')}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                See All
              </button>
            )}
          </div>
        </div>

        {/* Quick post bar */}
        <button
          onClick={() => setIsCreatePostDialogOpen(true)}
          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-emerald-400 transition-all mb-4"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {user ? getInitialsDash(user.name) : '?'}
          </div>
          <span className="text-slate-400 text-sm">Share thoughts or a session update…</span>
        </button>

        {isAnyLoading && (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isAnyLoading && combinedFeed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Award className="w-8 h-8 opacity-30" />
            <p className="text-sm">No activity yet — be the first to post!</p>
          </div>
        )}

        <div className="space-y-3">
          {!isAnyLoading && combinedFeed.map((item) => {
            if (item.kind === 'activity') {
              return (
                <div
                  key={`activity-${item.id}`}
                  onClick={() => handleActivityClick(item)}
                  className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === 'roster_addition' ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {item.type === 'roster_addition'
                          ? <Users className="w-5 h-5 text-emerald-600" />
                          : <Star className="w-5 h-5 text-amber-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-slate-900 text-sm font-medium">{item.title}</h4>
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                        </div>
                        <p className="text-sm text-slate-600">{item.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(item.ts.toISOString())}</p>

                        {item.type === 'roster_addition' && (
                          <div className="mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate?.('userProfile', { ...item.userProfile, isRosterRequest: true });
                              }}
                              className="w-full py-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
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
              );
            }

            // Post item
            const { post } = item;
            const author = post.author;
            const initials = author ? getInitialsDash(author.name) : '??';
            const isLiked = likedMap[post._id] ?? false;
            const likeCount = likeCounts[post._id] ?? post.likes.length;

            return (
              <div
                key={`post-${item.id}`}
                onClick={() => onNavigate?.('lockerRoom')}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer"
              >
                {/* Author */}
                <div className="px-4 pt-4 pb-2 flex items-center gap-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 overflow-hidden">
                    {author?.avatar
                      ? <img src={avatarThumb(author.avatar, 40)!} alt={author.name} className="w-full h-full rounded-full object-cover" />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{author?.name}</p>
                    <p className="text-xs text-slate-400">
                      {[author?.position, author?.sport].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(post.createdAt)}</p>
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
                        <div className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-emerald-600 truncate">
                          {post.articleTitle || post.sharedUrl}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions — stop propagation so clicks here don't navigate */}
                <div
                  className="px-4 py-2 border-t border-slate-100 flex items-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                    {likeCount > 0 && <span>{likeCount}</span>}
                  </button>
                  <button
                    onClick={() => onNavigate?.('lockerRoom', { postId: post._id })}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-500 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.comments.length > 0 && <span>{post.comments.length}</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {combinedFeed.length > 0 && !isAnyLoading && (
          <button
            onClick={() => onNavigate?.('lockerRoom')}
            className="w-full mt-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
          >
            Open full Locker Room
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

      <div className="h-6" />
    </div>
  );
}
