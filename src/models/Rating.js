const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ratee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },

    // Overall star rating (1-5)
    overallRating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },

    // Category ratings (optional)
    categories: {
      skillLevel: { type: Number, min: 1, max: 5, default: null },
      punctuality: { type: Number, min: 1, max: 5, default: null },
      communication: { type: Number, min: 1, max: 5, default: null },
      attitude: { type: Number, min: 1, max: 5, default: null },
    },

    wouldTrainAgain: {
      type: Boolean,
      default: null,
    },

    feedback: {
      type: String,
      maxlength: 1000,
      default: '',
    },

    // Sport context
    sport: {
      type: String,
      default: '',
    },

    // Moderation — new ratings start as 'pending' until admin approves
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// One rating per rater-ratee-session combination
ratingSchema.index({ rater: 1, ratee: 1, session: 1 }, { unique: true, sparse: true });
ratingSchema.index({ ratee: 1, status: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
