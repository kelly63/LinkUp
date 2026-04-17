const Rating = require('../models/Rating');
const User = require('../models/User');

const USER_FIELDS = 'name avatar role sport position skillLevel averageRating ratingCount';

// POST /api/ratings — submit a rating
const submitRating = async (req, res) => {
  try {
    const {
      rateeId,
      sessionId,
      overallRating,
      categories,
      wouldTrainAgain,
      feedback,
      sport,
    } = req.body;

    if (!rateeId || !overallRating) {
      return res.status(400).json({ message: 'rateeId and overallRating are required' });
    }

    if (rateeId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot rate yourself' });
    }

    const ratee = await User.findById(rateeId);
    if (!ratee) return res.status(404).json({ message: 'User not found' });

    // Check for duplicate (same rater + ratee + session)
    const query = { rater: req.user._id, ratee: rateeId };
    if (sessionId) query.session = sessionId;

    const existing = await Rating.findOne(query);
    if (existing) {
      return res.status(409).json({ message: 'You have already rated this person for this session' });
    }

    const rating = await Rating.create({
      rater: req.user._id,
      ratee: rateeId,
      session: sessionId || null,
      overallRating: Number(overallRating),
      categories: categories || {},
      wouldTrainAgain: wouldTrainAgain != null ? wouldTrainAgain : null,
      feedback: feedback || '',
      sport: sport || '',
    });

    // Update denormalized rating stats on ratee
    const allRatings = await Rating.find({ ratee: rateeId, status: 'approved' });
    const count = allRatings.length;
    const avg = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / count;

    await User.findByIdAndUpdate(rateeId, {
      averageRating: Math.round(avg * 10) / 10,
      ratingCount: count,
    });

    await rating.populate('rater', USER_FIELDS);

    const io = req.app.get('io');
    if (io) {
      io.notify(rateeId, 'rating_new', {
        from: {
          _id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar,
        },
        overallRating: rating.overallRating,
        sport: rating.sport,
      });
    }

    res.status(201).json({ rating });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/ratings/received — ratings received by current user
const getReceivedRatings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { ratee: req.user._id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const ratings = await Rating.find(query)
      .populate('rater', USER_FIELDS)
      .populate('session', 'sport date location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Rating.countDocuments(query);

    res.json({ ratings, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/ratings/given — ratings submitted by current user
const getGivenRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ rater: req.user._id })
      .populate('ratee', USER_FIELDS)
      .populate('session', 'sport date location')
      .sort({ createdAt: -1 });

    res.json({ ratings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/ratings/user/:userId — public ratings for a user
const getUserRatings = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const ratings = await Rating.find({ ratee: req.params.userId, status: 'approved' })
      .populate('rater', USER_FIELDS)
      .populate('session', 'sport date location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Rating.countDocuments({ ratee: req.params.userId, status: 'approved' });

    // Aggregate summary
    const allRatings = await Rating.find({ ratee: req.params.userId, status: 'approved' });
    const avg = allRatings.length
      ? allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length
      : 0;

    res.json({
      ratings,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      summary: {
        averageRating: Math.round(avg * 10) / 10,
        ratingCount: allRatings.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { submitRating, getReceivedRatings, getGivenRatings, getUserRatings };
