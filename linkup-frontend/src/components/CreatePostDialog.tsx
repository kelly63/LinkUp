import { X, Link2, Type, Trophy, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { posts as postsApi, Post, User } from '../lib/api';
import { toast } from 'sonner';

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  user?: User | null;
  onPostCreated?: (post: Post) => void;
}

interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function isValidUrl(str: string) {
  try { new URL(str); return true; } catch { return false; }
}

export function CreatePostDialog({ isOpen, onClose, token, user, onPostCreated }: CreatePostDialogProps) {
  const [postType, setPostType] = useState<'thought' | 'article' | null>(null);
  const [content, setContent] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch preview whenever the URL changes (debounced)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreview(null);
    if (!articleUrl.trim() || !isValidUrl(articleUrl.trim())) return;

    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch(`/api/utils/link-preview?url=${encodeURIComponent(articleUrl.trim())}`);
        if (res.ok) {
          const data: LinkPreview = await res.json();
          setPreview(data);
          if (!articleTitle.trim() && data.title) setArticleTitle(data.title);
        }
      } catch {
        // silently fail — preview is non-critical
      } finally {
        setPreviewLoading(false);
      }
    }, 800);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [articleUrl]);

  if (!isOpen) return null;

  const handleClose = () => {
    setPostType(null);
    setContent('');
    setArticleUrl('');
    setArticleTitle('');
    setPreview(null);
    onClose();
  };

  const handlePost = async () => {
    if (!token) { toast.error('You must be logged in to post'); return; }
    if (postType === 'thought' && !content.trim()) { toast.error('Write something first'); return; }
    if (postType === 'article' && !articleUrl.trim()) { toast.error('Paste an article URL'); return; }

    setSubmitting(true);
    try {
      const body: Parameters<typeof postsApi.create>[1] = { type: postType! };
      if (content.trim()) body.content = content.trim();
      if (postType === 'article') {
        body.sharedUrl = articleUrl.trim();
        if (articleTitle.trim()) body.articleTitle = articleTitle.trim();
        if (preview?.image) body.previewImage = preview.image;
        if (preview?.description) body.previewDescription = preview.description;
        if (preview?.favicon) body.previewFavicon = preview.favicon;
      }
      if (user?.sport) body.sport = user.sport;

      const { post } = await postsApi.create(token, body);
      onPostCreated?.(post);
      toast.success('Posted!');
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not create post');
    } finally {
      setSubmitting(false);
    }
  };

  const initials = user ? getInitials(user.name) : '??';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-slate-900">Create Post</h3>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Author Info */}
        <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
            {initials}
          </div>
          <div>
            <h4 className="text-slate-900">{user?.name || 'You'}</h4>
            <p className="text-sm text-slate-500">
              {user?.position && user?.sport ? `${user.position} • ${user.sport}` : user?.sport || ''}
            </p>
          </div>
        </div>

        {/* Post Type Selection */}
        {!postType && (
          <div className="px-6 pb-6 space-y-3 flex-1 overflow-y-auto">
            <p className="text-sm text-slate-600 mb-3">What would you like to share?</p>

            <button
              onClick={() => setPostType('thought')}
              className="w-full bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-emerald-200 rounded-2xl p-5 flex items-start gap-4 hover:border-emerald-400 transition-all"
            >
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Type className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-slate-900 mb-1">Share a Thought</h4>
                <p className="text-sm text-slate-600">Post updates, insights, or motivation</p>
              </div>
            </button>

            <button
              onClick={() => setPostType('article')}
              className="w-full bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-2xl p-5 flex items-start gap-4 hover:border-emerald-400 transition-all"
            >
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Link2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <h4 className="text-slate-900 mb-1">Share an Article</h4>
                <p className="text-sm text-slate-600">Post training tips, news, or resources</p>
              </div>
            </button>

            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-slate-900 mb-1 text-sm">Session Completions</h4>
                  <p className="text-sm text-slate-600">These are posted automatically when you complete a session</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thought Post Form */}
        {postType === 'thought' && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what's on your mind..."
              className="w-full min-h-[200px] p-4 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-400 resize-none text-slate-900"
              autoFocus
            />
          </div>
        )}

        {/* Article Post Form */}
        {postType === 'article' && (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Article URL *</label>
              <input
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
                autoFocus
              />
            </div>

            {/* Link Preview */}
            {previewLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching preview…
              </div>
            )}

            {preview && !previewLoading && (
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-emerald-400 transition-colors"
              >
                {preview.image && (
                  <img
                    src={preview.image}
                    alt=""
                    className="w-full h-36 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                    {preview.favicon && (
                      <img src={preview.favicon} alt="" className="w-3.5 h-3.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <span>{preview.domain}</span>
                    <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                  </div>
                  {preview.title && (
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{preview.title}</p>
                  )}
                  {preview.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{preview.description}</p>
                  )}
                </div>
              </a>
            )}

            <div>
              <label className="block text-sm text-slate-600 mb-2">Article Title (optional)</label>
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Title of the article..."
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Your Thoughts (optional)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add your commentary..."
                className="w-full min-h-[100px] p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400 resize-none"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {postType && (
          <div className="px-6 py-4 border-t border-slate-200 flex gap-3 flex-shrink-0">
            <button
              onClick={() => { setPostType(null); setPreview(null); }}
              disabled={submitting}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-60"
            >
              Back
            </button>
            <button
              onClick={handlePost}
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
