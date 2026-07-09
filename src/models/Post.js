const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Post type: session recap, thought/status, or shared article
    type: {
      type: String,
      enum: ['session_completion', 'thought', 'article'],
      default: 'thought',
    },

    content: {
      type: String,
      maxlength: 2000,
      default: '',
    },

    sport: {
      type: String,
      default: '',
    },

    // For session_completion posts
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    sessionPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionSummary: {
      type: String,
      default: '',
    },

    // For article shares
    sharedUrl: {
      type: String,
      default: '',
    },
    articleTitle: {
      type: String,
      default: '',
    },

    // For photo posts
    imageUrl: {
      type: String,
      default: '',
    },

    // Engagement
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
  },
  { timestamps: true }
);

postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
