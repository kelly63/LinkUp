const Post = require('../models/Post');
const Connection = require('../models/Connection');
const ContentReport = require('../models/ContentReport');
const { sendContentReportEmail } = require('../utils/email');

const USER_FIELDS = 'name avatar role sport position skillLevel averageRating ratingCount verificationStatus invitesSent';

// GET /api/posts — feed (posts from roster + self)
const getFeed = async (req, res) => {
  try {
    const { sport, type, page = 1, limit = 20 } = req.query;
    const blockedIds = req.user.blockedUsers || [];

    // Get roster connection IDs
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    });

    const rosterIds = connections
      .map((c) => c.requester.toString() === req.user._id.toString() ? c.recipient : c.requester)
      .filter((id) => !blockedIds.some((b) => b.toString() === id.toString()));

    // Show posts from self + roster (excluding blocked users)
    const query = { author: { $in: [req.user._id, ...rosterIds] } };
    if (sport) query.sport = sport;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const posts = await Post.find(query)
      .populate('author', USER_FIELDS)
      .populate('session', 'sport date location')
      .populate('sessionPartner', USER_FIELDS)
      .populate('comments.author', USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Post.countDocuments(query);

    res.json({ posts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/posts — create a post
const createPost = async (req, res) => {
  try {
    const {
      type,
      content,
      sport,
      sessionId,
      sessionPartnerId,
      sessionSummary,
      sharedUrl,
      articleTitle,
      imageUrl,
    } = req.body;

    const post = await Post.create({
      author: req.user._id,
      type: type || 'thought',
      content: content || '',
      sport: sport || '',
      session: sessionId || null,
      sessionPartner: sessionPartnerId || null,
      sessionSummary: sessionSummary || '',
      sharedUrl: sharedUrl || '',
      articleTitle: articleTitle || '',
      imageUrl: imageUrl || '',
    });

    await post.populate('author', USER_FIELDS);
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/posts/:id/like — toggle like
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id.toString();
    const likeIndex = post.likes.findIndex((id) => id.toString() === userId);

    if (likeIndex === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ likes: post.likes.length, liked: likeIndex === -1 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/posts/:id/comment — add a comment
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ author: req.user._id, text: text.trim() });
    await post.save();

    await post.populate('comments.author', USER_FIELDS);

    res.status(201).json({ comment: post.comments[post.comments.length - 1] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/posts/:id — delete own post
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/posts/:id/report — report a post
const reportPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const { reason } = req.body;

    await ContentReport.create({
      reportedBy: req.user._id,
      type: 'post',
      post: post._id,
      reportedUser: post.author,
      reason: reason || '',
    });

    sendContentReportEmail({
      type: 'post',
      reporterName: req.user.name,
      reporterEmail: req.user.email,
      targetName: null,
      content: post.content || `[${post.type} post]`,
      reason: reason || 'No reason given',
    }).catch((err) => console.error('[report email]', err.message));

    res.json({ message: 'Report submitted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getFeed, createPost, toggleLike, addComment, reportPost, deletePost };
