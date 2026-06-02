import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Trophy,
  PlusCircle,
  Award,
  Users,
  Clock,
  MapPin,
  ExternalLink,
  Send,
  Trash2,
  Flag,
  ArrowLeft,
  BadgeCheck,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CreatePostDialog } from './CreatePostDialog';
import { useAuth } from '../lib/auth';
import { posts as postsApi, Post, avatarThumb } from '../lib/api';
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

// ── Content renderers (stable, defined at module level) ────────────────────

function SessionContent({ post }: { post: Post }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-4 mb-1 border-2 border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-emerald-600" />
        <span className="text-emerald-700 font-medium text-sm">Session Completed</span>
      </div>
      <div className="bg-white rounded-xl p-4 space-y-2">
        {post.sessionPartner && typeof post.sessionPartner === 'object' && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-emerald-600" />
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
}

function ArticleContent({ post }: { post: Post }) {
  return (
    <div>
      {post.content && <p className="text-slate-900 text-sm mb-3">{post.content}</p>}
      {post.sharedUrl && (
        <a
          href={post.sharedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-2 border-slate-200 rounded-xl overflow-hidden hover:border-emerald-400 transition-colors"
        >
          <div className="p-4">
            <h4 className="text-slate-900 text-sm font-medium mb-1 line-clamp-2">
              {post.articleTitle || post.sharedUrl}
            </h4>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="truncate">{new URL(post.sharedUrl).hostname}</span>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

// ── PostCard (stable, defined at module level) ─────────────────────────────

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  comments: Post['comments'];
  isCommentsOpen: boolean;
  draft: string;
  isSubmitting: boolean;
  isMenuOpen: boolean;
  isOwner: boolean;
  userInitials: string;
  userAvatar?: string;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onLike: () => void;
  onToggleComments: () => void;
  onSubmitComment: () => void;
  onDelete: () => void;
  onReport: () => void;
  onMenuToggle: () => void;
  onDraftChange: (value: string) => void;
  onAuthorClick: (userId: string) => void;
}

function PostCard({
  post, isLiked, likeCount, commentCount, comments, isCommentsOpen,
  draft, isSubmitting, isMenuOpen, isOwner, userInitials, userAvatar,
  menuRef, onLike, onToggleComments, onSubmitComment, onDelete, onReport,
  onMenuToggle, onDraftChange, onAuthorClick,
}: PostCardProps) {
  const author = post.author;
  const initials = author ? getInitials(author.name) : '??';
  const isVerified = (author as any)?.verificationStatus === 'approved';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => author?._id && onAuthorClick(author._id)}
              className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 overflow-hidden"
            >
              {author?.avatar
                ? <img src={avatarThumb(author.avatar, 40)!} alt={author.name} className="w-full h-full rounded-full object-cover" />
                : initials}
            </button>
            <div>
              <button
                onClick={() => author?._id && onAuthorClick(author._id)}
                className="flex items-center gap-1 text-left"
              >
                <h4 className="text-slate-900 text-sm font-medium hover:text-emerald-600 transition-colors">{author?.name}</h4>
                {isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              </button>
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
          <div className="relative" ref={isMenuOpen ? menuRef : null}>
            <button
              onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[140px]">
                {isOwner && (
                  <button
                    onClick={onDelete}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete post
                  </button>
                )}
                <button
                  onClick={onReport}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Report post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.type === 'session_completion' && <SessionContent post={post} />}
        {post.type === 'thought' && <p className="text-slate-900 leading-relaxed text-sm">{post.content}</p>}
        {post.type === 'article' && <ArticleContent post={post} />}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-around">
        <button
          onClick={onLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isLiked ? 'text-red-600 bg-red-50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-600' : ''}`} />
          <span className="text-sm">{likeCount}</span>
        </button>
        <button
          onClick={onToggleComments}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isCommentsOpen ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'
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
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((c) => {
                const commentVerified = (c.author as any)?.verificationStatus === 'approved';
                return (
                  <div key={c._id} className="flex gap-2.5">
                    <button
                      onClick={() => c.author?._id && onAuthorClick(c.author._id)}
                      className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden"
                    >
                      {c.author?.avatar
                        ? <img src={avatarThumb(c.author.avatar, 80)!} alt={c.author.name} className="w-full h-full object-cover" />
                        : getInitials(c.author?.name || '?')}
                    </button>
                    <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2">
                      <button
                        onClick={() => c.author?._id && onAuthorClick(c.author._id)}
                        className="inline-flex items-center gap-1 text-left"
                      >
                        <span className="text-xs font-medium text-slate-900 hover:text-emerald-600 transition-colors">{c.author?.name}</span>
                        {commentVerified && <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />}
                      </button>
                      <span className="text-xs text-slate-700 ml-1">{c.text}</span>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">No comments yet — be the first!</p>
          )}

          <div className="flex gap-2 items-center pt-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 overflow-hidden">
              {userAvatar
                ? <img src={avatarThumb(userAvatar, 80)!} alt="me" className="w-full h-full object-cover" />
                : userInitials}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5">
              <input
                type="text"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitComment(); } }}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
                autoFocus
              />
              <button
                onClick={onSubmitComment}
                disabled={!draft.trim() || isSubmitting}
                className="text-emerald-600 disabled:text-slate-300 transition-colors"
              >
                {isSubmitting
                  ? <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin block" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LockerRoomView ─────────────────────────────────────────────────────────

export function LockerRoomView({ onBack, initialOpenCommentPostId, onNavigate }: { onBack?: () => void; initialOpenCommentPostId?: string | null; onNavigate?: (view: string, data?: any) => void }) {
  const { token, user } = useAuth();
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(initialOpenCommentPostId ?? null);
  const didAutoScrollRef = useRef(false);
  const [postComments, setPostComments] = useState<Record<string, Post['comments']>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuPostId) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openMenuPostId]);

  // Auto-scroll to the targeted post once it loads
  useEffect(() => {
    if (loading || !initialOpenCommentPostId || didAutoScrollRef.current) return;
    didAutoScrollRef.current = true;
    setTimeout(() => {
      const el = document.getElementById(`post-${initialOpenCommentPostId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [loading, initialOpenCommentPostId]);

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    if (!token) return;
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const params: Parameters<typeof postsApi.getFeed>[1] = { page: p };
      if (activeFilter !== 'all') params.type = activeFilter;
      const { posts: fetched, pages } = await postsApi.getFeed(token, params);
      setTotalPages(pages ?? 1);
      setPage(p);

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

  useEffect(() => { fetchPage(1, true); }, [activeFilter, token]);

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
    setCommentCounts((prev) => ({ ...prev, [post._id]: 0 }));
    setPostComments((prev) => ({ ...prev, [post._id]: [] }));
  }, []);

  const handleToggleComments = useCallback((postId: string) => {
    setOpenCommentPostId((prev) => (prev === postId ? null : postId));
  }, []);

  const handleSubmitComment = useCallback(async (postId: string, draft: string) => {
    if (!token || !draft.trim()) return;
    const text = draft.trim();
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
      setPostComments((prev) => ({
        ...prev,
        [postId]: prev[postId].map((c) => (c._id === optimistic._id ? comment : c)),
      }));
    } catch (err: any) {
      toast.error(err?.message || 'Could not post comment');
      setPostComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c._id !== optimistic._id),
      }));
      setCommentCounts((prev) => ({ ...prev, [postId]: (prev[postId] ?? 1) - 1 }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: text }));
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }, [token, user]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!token) return;
    setOpenMenuPostId(null);
    try {
      await postsApi.delete(token, postId);
      setFeedPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success('Post deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete post');
    }
  }, [token]);

  const handleReportPost = useCallback((postId: string) => {
    setOpenMenuPostId(null);
    toast.success("Post reported. We'll review it shortly.");
  }, []);

  const handleAuthorClick = useCallback((userId: string) => {
    onNavigate?.('userProfile', { _id: userId });
  }, [onNavigate]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'session_completion', label: 'Sessions' },
    { id: 'thought', label: 'Thoughts' },
    { id: 'article', label: 'Articles' },
  ];

  const userInitials = user ? getInitials(user.name) : '??';

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors -ml-2">
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <h2 className="text-slate-900">Locker Room</h2>
          </div>
          <button
            onClick={() => setIsCreatePostDialogOpen(true)}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-sm flex-shrink-0 transition-colors ${
                activeFilter === f.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-400'
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
          className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-emerald-400 transition-all"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
            {userInitials}
          </div>
          <span className="text-slate-400 text-sm">Share thoughts or a session update…</span>
        </button>
      </div>

      {/* Feed */}
      <div className="px-6 space-y-4 pb-6">
        {loading && (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && feedPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
            <Award className="w-10 h-10 opacity-30" />
            <p className="text-sm">No posts yet — be the first!</p>
          </div>
        )}

        {!loading && feedPosts.map((post) => (
          <div key={post._id} id={`post-${post._id}`}>
          <PostCard
            key={post._id}
            post={post}
            isLiked={likedMap[post._id] ?? false}
            likeCount={likeCounts[post._id] ?? post.likes.length}
            commentCount={commentCounts[post._id] ?? post.comments.length}
            comments={postComments[post._id] ?? post.comments}
            isCommentsOpen={openCommentPostId === post._id}
            draft={commentDrafts[post._id] ?? ''}
            isSubmitting={submittingComment[post._id] ?? false}
            isMenuOpen={openMenuPostId === post._id}
            isOwner={!!(user && post.author && post.author._id === user._id)}
            userInitials={userInitials}
            userAvatar={user?.avatar}
            menuRef={menuRef}
            onLike={() => handleLike(post._id)}
            onToggleComments={() => handleToggleComments(post._id)}
            onSubmitComment={() => handleSubmitComment(post._id, commentDrafts[post._id] ?? '')}
            onDelete={() => handleDeletePost(post._id)}
            onReport={() => handleReportPost(post._id)}
            onMenuToggle={() => setOpenMenuPostId(openMenuPostId === post._id ? null : post._id)}
            onDraftChange={(val) => setCommentDrafts((prev) => ({ ...prev, [post._id]: val }))}
            onAuthorClick={handleAuthorClick}
          />
          </div>
        ))}

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
