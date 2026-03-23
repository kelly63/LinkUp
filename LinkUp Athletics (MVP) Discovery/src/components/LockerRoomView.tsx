import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Trophy,
  Link2,
  PlusCircle,
  Award,
  Users,
  Clock,
  MapPin,
  ExternalLink,
  Send,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { CreatePostDialog } from './CreatePostDialog';
import { useAuth } from '../lib/auth';
import { posts as postsApi, Post } from '../lib/api';
import { toast } from 'sonner';

type Filter = 'all' | 'session_completion' | 'thought' | 'article';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function LockerRoomView() {
  const { token, user } = useAuth();
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  // optimistic like tracking: postId → liked by me
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  // comment panel state
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, Post['comments']>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (!token) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const params: Parameters<typeof postsApi.getFeed>[1] = { page: p };
      if (activeFilter !== 'all') params.type = activeFilter;
      const { posts: fetched, pages } = await postsApi.getFeed(token, params);
      setTotalPages(pages ?? 1);
      setPage(p);

      // Seed like + comment maps from API data
      const myId = user?._id;
      const newLikedMap: Record<string, boolean> = {};
      const newLikeCounts: Record<string, number> = {};
      const newCommentCounts: Record<string, number> = {};
      const newPostComments: Record<string, Post['comments']> = {};
      fetched.forEach((post) => {
        newLikedMap[post._id] = myId ? post.likes.includes(myId) : false;
        newLikeCounts[post._id] = post.likes.length;
        newCommentCounts[post._id] = post.comments.length;
        newPostComments[post._id] = post.comments;
      });

      if (replace) {
        setFeedPosts(fetched);
        setLikedMap(newLikedMap);
        setLikeCounts(newLikeCounts);
        setCommentCounts(newCommentCounts);
        setPostComments(newPostComments);
      } else {
        setFeedPosts((prev) => [...prev, ...fetched]);
        setLikedMap((prev) => ({ ...prev, ...newLikedMap }));
        setLikeCounts((prev) => ({ ...prev, ...newLikeCounts }));
        setCommentCounts((prev) => ({ ...prev, ...newCommentCounts }));
        setPostComments((prev) => ({ ...prev, ...newPostComments }));
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not load feed');
    } finally {
      replace ? setLoading(false) : setLoadingMore(false);
    }
  }, [token, user?._id, activeFilter]);

  useEffect(() => {
    fetchPage(1, true);
  }, [activeFilter, token]);

  const handleLike = async (postId: string) => {
    if (!token) return;
    const wasLiked = likedMap[postId] ?? false;
    // optimistic update
    setLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      await postsApi.toggleLike(token, postId);
    } catch {
      // revert on failure
      setLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + (wasLiked ? 1 : -1) }));
    }
  };

  const handlePostCreated = (post: Post) => {
    setFeedPosts((prev) => [post, ...prev]);
    setLikedMap((prev) => ({ ...prev, [post._id]: false }));
    setLikeCounts((prev) => ({ ...prev, [post._id]: 0 }));
    setCommentCounts((prev) => ({ ...prev, [post._id]: 0 }));
    setPostComments((prev) => ({ ...prev, [post._id]: [] }));
  };

  const handleToggleComments = (postId: string) => {
    setOpenCommentPostId((prev) => (prev === postId ? null : postId));
  };

  const handleSubmitComment = async (postId: string) => {
    if (!token) return;
    const text = (commentDrafts[postId] || '').trim();
    if (!text) return;

    // Optimistic update
    const optimistic: Post['comments'][0] = {
      _id: `temp-${Date.now()}`,
      author: user as any,
      text,
      createdAt: new Date().toISOString(),
    };
    setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), optimistic] }));
    setCommentCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    try {
      const { comment } = await postsApi.addComment(token, postId, text);
      // Replace optimistic entry with real one
      setPostComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((c) => (c._id === optimistic._id ? comment : c)),
      }));
    } catch (err: any) {
      toast.error(err?.message || 'Could not post comment');
      // Revert
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c._id !== optimistic._id),
      }));
      setCommentCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 1) - 1 }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: text }));
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'session_completion', label: 'Sessions' },
    { id: 'thought', label: 'Thoughts' },
    { id: 'article', label: 'Articles' },
  ];

  const userInitials = user ? getInitials(user.name) : '??';

  // ── Post card components ───────────────────────────────────────────────────

  const renderSessionContent = (post: Post) => (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-4 mb-1 border-2 border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-emerald-600" />
        <span className="text-emerald-700 font-medium text-sm">Session Completed</span>
      </div>
      <div className="bg-white rounded-xl p-4 space-y-2">
        {post.sessionPartner && typeof post.sessionPartner === 'object' && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-900 font-medium">
                {post.sessionSummary || `Session with ${post.sessionPartner.name}`}
              </p>
              <p className="text-xs text-slate-500">with {post.sessionPartner.name}</p>
            </div>
          </div>
        )}
        {post.session && typeof post.session === 'object' && post.session.location && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{post.session.location}</span>
          </div>
        )}
        {post.content && (
          <p className="text-sm text-slate-700 pt-1 border-t border-slate-100">{post.content}</p>
        )}
      </div>
    </div>
  );

  const renderThoughtContent = (post: Post) => (
    <p className="text-slate-900 leading-relaxed text-sm">{post.content}</p>
  );

  const renderArticleContent = (post: Post) => (
    <div>
      {post.content && (
        <p className="text-slate-900 text-sm mb-3">{post.content}</p>
      )}
      {post.sharedUrl && (
        <a
          href={post.sharedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-2 border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 transition-colors"
        >
          <div className="p-4">
            <h4 className="text-slate-900 text-sm font-medium mb-1 line-clamp-2">
              {post.articleTitle || post.sharedUrl}
            </h4>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="truncate">{new URL(post.sharedUrl).hostname}</span>
            </div>
          </div>
        </a>
      )}
    </div>
  );

  const PostCard = ({ post }: { post: Post }) => {
    const author = post.author;
    const initials = author ? getInitials(author.name) : '??';
    const isLiked = likedMap[post._id] ?? false;
    const likeCount = likeCounts[post._id] ?? post.likes.length;
    const commentCount = commentCounts[post._id] ?? post.comments.length;
    const comments = postComments[post._id] ?? post.comments;
    const isCommentsOpen = openCommentPostId === post._id;
    const draft = commentDrafts[post._id] ?? '';
    const isSubmitting = submittingComment[post._id] ?? false;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {author?.avatar
                  ? <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full object-cover" />
                  : initials}
              </div>
              <div>
                <h4 className="text-slate-900 text-sm font-medium">{author?.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  {author?.position && <span>{author.position}</span>}
                  {author?.position && author?.sport && <span>•</span>}
                  {author?.sport && <span>{author.sport}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo(post.createdAt)}</span>
                </div>
              </div>
            </div>
            <button className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {post.type === 'session_completion' && renderSessionContent(post)}
          {post.type === 'thought' && renderThoughtContent(post)}
          {post.type === 'article' && renderArticleContent(post)}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-around">
          <button
            onClick={() => handleLike(post._id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isLiked ? 'text-red-600 bg-red-50' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600' : ''}`} />
            <span className="text-sm">{likeCount}</span>
          </button>
          <button
            onClick={() => handleToggleComments(post._id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isCommentsOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className={`w-4 h-4 ${isCommentsOpen ? 'fill-blue-100' : ''}`} />
            <span className="text-sm">{commentCount}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Comment panel */}
        {isCommentsOpen && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
            {/* Existing comments */}
            {comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden">
                      {c.author?.avatar
                        ? <img src={c.author.avatar} alt={c.author.name} className="w-full h-full object-cover" />
                        : getInitials(c.author?.name || '?')}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                      <span className="text-xs font-medium text-slate-900">{c.author?.name} </span>
                      <span className="text-xs text-slate-700">{c.text}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-1">No comments yet — be the first!</p>
            )}

            {/* New comment input */}
            <div className="flex gap-2 items-center pt-1">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden">
                {user?.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : userInitials}
              </div>
              <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(post._id); } }}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
                />
                <button
                  onClick={() => handleSubmitComment(post._id)}
                  disabled={!draft.trim() || isSubmitting}
                  className="text-blue-600 disabled:text-slate-300 transition-colors"
                >
                  {isSubmitting
                    ? <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin block" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-900">Locker Room</h2>
          <button
            onClick={() => setIsCreatePostDialogOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 transition-colors ${
                activeFilter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Post bar */}
      <div className="px-6 pt-4 pb-3">
        <button
          onClick={() => setIsCreatePostDialogOpen(true)}
          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-blue-400 transition-all"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {userInitials}
          </div>
          <span className="text-slate-400 text-sm">Share thoughts or a session update…</span>
        </button>
      </div>

      {/* Feed */}
      <div className="px-6 space-y-4 pb-6">
        {loading && (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && feedPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Award className="w-10 h-10 opacity-30" />
            <p className="text-sm">No posts yet — be the first!</p>
          </div>
        )}

        {!loading && feedPosts.map((post) => <PostCard key={post._id} post={post} />)}

        {page < totalPages && !loading && (
          <div className="flex justify-center">
            <button
              onClick={() => fetchPage(page + 1, false)}
              disabled={loadingMore}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      <CreatePostDialog
        isOpen={isCreatePostDialogOpen}
        onClose={() => setIsCreatePostDialogOpen(false)}
        token={token}
        user={user}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
