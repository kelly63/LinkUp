import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical,
  Trophy,
  TrendingUp,
  Image as ImageIcon,
  Link2,
  PlusCircle,
  Award,
  Users,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { CreatePostDialog } from './CreatePostDialog';

interface Post {
  id: number;
  type: 'session_completion' | 'thought' | 'article';
  author: {
    name: string;
    avatar: string;
    position: string;
    sport: string;
  };
  timestamp: string;
  content?: string;
  session?: {
    sport: string;
    partner: string;
    location: string;
    type: string;
    rating: number;
  };
  article?: {
    title: string;
    source: string;
    url: string;
    imageUrl?: string;
  };
  likes: number;
  comments: number;
  isLiked: boolean;
}

export function LockerRoomView() {
  const posts: Post[] = [
    {
      id: 1,
      type: 'session_completion',
      author: {
        name: 'Mike Johnson',
        avatar: 'MJ',
        position: 'Pitcher',
        sport: 'Baseball'
      },
      timestamp: '2 hours ago',
      session: {
        sport: 'Baseball',
        partner: 'Alex Rivera',
        location: 'Diamond Sports Complex',
        type: 'Bullpen Session',
        rating: 5
      },
      likes: 24,
      comments: 5,
      isLiked: false
    },
    {
      id: 2,
      type: 'thought',
      author: {
        name: 'Sarah Williams',
        avatar: 'SW',
        position: 'Point Guard',
        sport: 'Basketball'
      },
      timestamp: '4 hours ago',
      content: 'Just wrapped up an intense shooting session. Working on my catch-and-shoot mechanics has been a game changer. Consistency is key! 🏀 Who else is putting in work this weekend?',
      likes: 47,
      comments: 12,
      isLiked: true
    },
    {
      id: 3,
      type: 'article',
      author: {
        name: 'Chris Martinez',
        avatar: 'CM',
        position: 'Quarterback',
        sport: 'Football'
      },
      timestamp: '6 hours ago',
      content: 'Great read on QB mechanics and footwork fundamentals. This is exactly what we work on in our sessions.',
      article: {
        title: 'The Science Behind Elite Quarterback Footwork',
        source: 'Athletic Performance Lab',
        url: '#'
      },
      likes: 31,
      comments: 8,
      isLiked: false
    },
    {
      id: 4,
      type: 'session_completion',
      author: {
        name: 'Emma Davis',
        avatar: 'ED',
        position: 'Setter',
        sport: 'Volleyball'
      },
      timestamp: '8 hours ago',
      session: {
        sport: 'Volleyball',
        partner: 'Jessica Thompson',
        location: 'Coastal Volleyball Center',
        type: 'Setting Practice',
        rating: 5
      },
      likes: 18,
      comments: 3,
      isLiked: true
    },
    {
      id: 5,
      type: 'thought',
      author: {
        name: 'John Doe',
        avatar: 'JD',
        position: 'Catcher',
        sport: 'Baseball'
      },
      timestamp: '1 day ago',
      content: 'Pitch framing session today was incredible. Shoutout to all the pitchers grinding on their mechanics. The trust between pitcher and catcher is everything. 💪',
      likes: 56,
      comments: 15,
      isLiked: true
    },
    {
      id: 6,
      type: 'article',
      author: {
        name: 'Taylor Brooks',
        avatar: 'TB',
        position: 'Shortstop',
        sport: 'Softball'
      },
      timestamp: '1 day ago',
      content: 'Interesting breakdown of defensive positioning strategies. Worth a read for all infielders.',
      article: {
        title: 'Advanced Defensive Metrics: Reading the Hitter',
        source: 'Softball IQ',
        url: '#'
      },
      likes: 22,
      comments: 6,
      isLiked: false
    }
  ];

  const renderSessionCompletionPost = (post: Post) => (
    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-4 mb-4 border-2 border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-emerald-600" />
        <span className="text-emerald-700">Session Completed</span>
      </div>
      
      <div className="bg-white rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-slate-900">{post.session?.type}</p>
            <p className="text-sm text-slate-600">with {post.session?.partner}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4" />
          <span>{post.session?.location}</span>
        </div>

        <div className="flex items-center gap-1 pt-2 border-t border-slate-200">
          <span className="text-sm text-slate-600">Rating:</span>
          {[...Array(post.session?.rating || 0)].map((_, i) => (
            <Award key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
          ))}
        </div>
      </div>
    </div>
  );

  const renderThoughtPost = (post: Post) => (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-slate-900 leading-relaxed">{post.content}</p>
    </div>
  );

  const renderArticlePost = (post: Post) => (
    <div className="bg-white rounded-2xl overflow-hidden">
      {post.content && (
        <div className="p-4 pb-3">
          <p className="text-slate-900">{post.content}</p>
        </div>
      )}
      
      <div className="border-2 border-slate-200 rounded-xl m-4 mt-0 overflow-hidden hover:border-blue-400 transition-colors">
        {post.article?.imageUrl && (
          <div className="aspect-video bg-slate-200"></div>
        )}
        <div className="p-4">
          <h4 className="text-slate-900 mb-2 line-clamp-2">{post.article?.title}</h4>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{post.article?.source}</p>
            <ExternalLink className="w-4 h-4 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );

  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    createPost: boolean;
    filters: boolean;
    sessions: boolean;
    thoughts: boolean;
    articles: boolean;
  }>({
    createPost: true,
    filters: true,
    sessions: true,
    thoughts: true,
    articles: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Group posts by type
  const sessionPosts = posts.filter(p => p.type === 'session_completion');
  const thoughtPosts = posts.filter(p => p.type === 'thought');
  const articlePosts = posts.filter(p => p.type === 'article');

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-900">Locker Room</h2>
          <button 
            onClick={() => setIsCreatePostDialogOpen(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          >
            <PlusCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Create Post Quick Action */}
      <div className="px-6 pt-4 pb-3 border-b border-slate-200">
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer"
          onClick={() => toggleSection('createPost')}
        >
          <h3 className="text-slate-700">Quick Post</h3>
          {expandedSections.createPost ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </div>
        {expandedSections.createPost && (
          <button className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 hover:border-blue-400 transition-all" onClick={() => setIsCreatePostDialogOpen(true)}>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
              JD
            </div>
            <span className="text-slate-500 text-sm">Share your thoughts or session update...</span>
          </button>
        )}
      </div>

      {/* Feed Filters */}
      <div className="px-6 py-4 border-b border-slate-200">
        <div 
          className="flex items-center justify-between mb-3 cursor-pointer"
          onClick={() => toggleSection('filters')}
        >
          <h3 className="text-slate-700">Filters</h3>
          {expandedSections.filters ? (
            <ChevronUp className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          )}
        </div>
        {expandedSections.filters && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm flex-shrink-0">
              All Posts
            </button>
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm hover:border-blue-400 transition-colors flex-shrink-0">
              Sessions
            </button>
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm hover:border-blue-400 transition-colors flex-shrink-0">
              Articles
            </button>
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm hover:border-blue-400 transition-colors flex-shrink-0">
              My Network
            </button>
          </div>
        )}
      </div>

      {/* Posts Feed */}
      <div className="space-y-6 pb-6">
        {/* Session Completions Section */}
        {sessionPosts.length > 0 && (
          <div>
            <div 
              className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 cursor-pointer flex items-center justify-between"
              onClick={() => toggleSection('sessions')}
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <h3 className="text-emerald-700">Session Completions ({sessionPosts.length})</h3>
              </div>
              {expandedSections.sessions ? (
                <ChevronUp className="w-5 h-5 text-emerald-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            {expandedSections.sessions && (
              <div className="px-6 pt-4 space-y-4">
                {sessionPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Post Header */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            {post.author.avatar}
                          </div>
                          <div>
                            <h4 className="text-slate-900">{post.author.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>{post.author.position}</span>
                              <span>•</span>
                              <span>{post.author.sport}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{post.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-3">
                      {renderSessionCompletionPost(post)}
                    </div>

                    {/* Post Actions */}
                    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-around">
                      <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        post.isLiked 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-600' : ''}`} />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thoughts Section */}
        {thoughtPosts.length > 0 && (
          <div>
            <div 
              className="px-6 py-3 bg-blue-50 border-b border-blue-200 cursor-pointer flex items-center justify-between"
              onClick={() => toggleSection('thoughts')}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-blue-700">Thoughts & Updates ({thoughtPosts.length})</h3>
              </div>
              {expandedSections.thoughts ? (
                <ChevronUp className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              )}
            </div>
            {expandedSections.thoughts && (
              <div className="px-6 pt-4 space-y-4">
                {thoughtPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Post Header */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            {post.author.avatar}
                          </div>
                          <div>
                            <h4 className="text-slate-900">{post.author.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>{post.author.position}</span>
                              <span>•</span>
                              <span>{post.author.sport}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{post.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-3">
                      {renderThoughtPost(post)}
                    </div>

                    {/* Post Actions */}
                    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-around">
                      <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        post.isLiked 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-600' : ''}`} />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Articles Section */}
        {articlePosts.length > 0 && (
          <div>
            <div 
              className="px-6 py-3 bg-purple-50 border-b border-purple-200 cursor-pointer flex items-center justify-between"
              onClick={() => toggleSection('articles')}
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-600" />
                <h3 className="text-purple-700">Shared Articles ({articlePosts.length})</h3>
              </div>
              {expandedSections.articles ? (
                <ChevronUp className="w-5 h-5 text-purple-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-purple-600" />
              )}
            </div>
            {expandedSections.articles && (
              <div className="px-6 pt-4 space-y-4">
                {articlePosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Post Header */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            {post.author.avatar}
                          </div>
                          <div>
                            <h4 className="text-slate-900">{post.author.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>{post.author.position}</span>
                              <span>•</span>
                              <span>{post.author.sport}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{post.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-3">
                      {renderArticlePost(post)}
                    </div>

                    {/* Post Actions */}
                    <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-around">
                      <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        post.isLiked 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-600' : ''}`} />
                        <span className="text-sm">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-sm">{post.comments}</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-6"></div>

      {/* Create Post Dialog */}
      <CreatePostDialog isOpen={isCreatePostDialogOpen} onClose={() => setIsCreatePostDialogOpen(false)} />
    </div>
  );
}