const jwt = require('jsonwebtoken');
const Rating = require('../models/Rating');
const User = require('../models/User');
const { sendAdminRatingReviewEmail } = require('../utils/email');

const USER_FIELDS = 'name avatar role sport position skillLevel averageRating ratingCount';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'linkup-admin-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Recalculate and persist denormalized rating stats for a user (approved only)
async function refreshRatingStats(rateeId) {
  const approved = await Rating.find({ ratee: rateeId, status: 'approved' });
  const count = approved.length;
  const avg = count ? approved.reduce((sum, r) => sum + r.overallRating, 0) / count : 0;
  await User.findByIdAndUpdate(rateeId, {
    averageRating: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
}

// POST /api/ratings — submit a rating
const submitRating = async (req, res) => {
  try {
    const { rateeId, sessionId, overallRating, categories, wouldTrainAgain, feedback, sport } = req.body;

    if (!rateeId || !overallRating) {
      return res.status(400).json({ message: 'rateeId and overallRating are required' });
    }

    if (rateeId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot rate yourself' });
    }

    const ratee = await User.findById(rateeId);
    if (!ratee) return res.status(404).json({ message: 'User not found' });

    const dupQuery = { rater: req.user._id, ratee: rateeId };
    if (sessionId) dupQuery.session = sessionId;
    const existing = await Rating.findOne(dupQuery);
    if (existing) {
      return res.status(409).json({ message: 'You have already rated this person for this session' });
    }

    // Rating starts as 'pending' — admin must approve before it shows publicly
    const rating = await Rating.create({
      rater: req.user._id,
      ratee: rateeId,
      session: sessionId || null,
      overallRating: Number(overallRating),
      categories: categories || {},
      wouldTrainAgain: wouldTrainAgain != null ? wouldTrainAgain : null,
      feedback: feedback || '',
      sport: sport || '',
      status: 'pending',
    });

    await rating.populate('rater', USER_FIELDS);

    // Notify ratee via socket
    const io = req.app.get('io');
    if (io) {
      io.notify(rateeId, 'rating_new', {
        from: { _id: req.user._id, name: req.user.name, avatar: req.user.avatar },
        overallRating: rating.overallRating,
        sport: rating.sport,
      });
    }

    // Send admin review email (fire-and-forget — don't block response on email failure)
    const ratingIdStr = rating._id.toString();
    const approveToken = jwt.sign({ ratingId: ratingIdStr, action: 'approve' }, ADMIN_SECRET, { expiresIn: '7d' });
    const rejectToken  = jwt.sign({ ratingId: ratingIdStr, action: 'reject'  }, ADMIN_SECRET, { expiresIn: '7d' });
    const approveUrl = `${APP_URL}/api/admin/ratings/${ratingIdStr}/approve?token=${approveToken}`;
    const rejectUrl  = `${APP_URL}/api/admin/ratings/${ratingIdStr}/reject?token=${rejectToken}`;

    sendAdminRatingReviewEmail({
      rating,
      raterName: req.user.name,
      rateeName: ratee.name,
      approveUrl,
      rejectUrl,
    }).catch((err) => console.error('[email] admin review email failed:', err.message));

    res.status(201).json({ rating, pendingReview: true });
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

// GET /api/ratings/user/:userId — public ratings for a user (approved only)
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
    const allApproved = await Rating.find({ ratee: req.params.userId, status: 'approved' });
    const avg = allApproved.length
      ? allApproved.reduce((sum, r) => sum + r.overallRating, 0) / allApproved.length
      : 0;

    res.json({
      ratings,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      summary: { averageRating: Math.round(avg * 10) / 10, ratingCount: allApproved.length },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/ratings/:ratingId/approve?token=...
const approveRating = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));

    let payload;
    try {
      payload = jwt.verify(token, ADMIN_SECRET);
    } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }

    if (payload.action !== 'approve' || payload.ratingId !== req.params.ratingId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }

    const rating = await Rating.findById(req.params.ratingId).populate('rater', 'name').populate('ratee', 'name');
    if (!rating) return res.status(404).send(adminPage('Rating not found', false));
    if (rating.status === 'approved') return res.send(adminPage('Already approved ✓', true));

    rating.status = 'approved';
    await rating.save();
    await refreshRatingStats(rating.ratee._id);

    return res.send(adminPage(`Rating by ${rating.rater.name} approved and now visible publicly.`, true));
  } catch (error) {
    console.error('[admin] approveRating error:', error);
    return res.status(500).send(adminPage('Server error', false));
  }
};

// GET /api/admin/ratings/:ratingId/reject?token=...
const rejectRating = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));

    let payload;
    try {
      payload = jwt.verify(token, ADMIN_SECRET);
    } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }

    if (payload.action !== 'reject' || payload.ratingId !== req.params.ratingId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }

    const rating = await Rating.findById(req.params.ratingId).populate('rater', 'name').populate('ratee', 'name');
    if (!rating) return res.status(404).send(adminPage('Rating not found', false));
    if (rating.status === 'rejected') return res.send(adminPage('Already rejected ✓', true));

    rating.status = 'rejected';
    await rating.save();
    // Refresh stats in case it was previously approved
    await refreshRatingStats(rating.ratee._id);

    return res.send(adminPage(`Rating by ${rating.rater.name} has been rejected and will not appear publicly.`, true));
  } catch (error) {
    console.error('[admin] rejectRating error:', error);
    return res.status(500).send(adminPage('Server error', false));
  }
};

function adminPage(message, success) {
  const color = success ? '#16a34a' : '#dc2626';
  const icon = success ? '✅' : '❌';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LinkUp Admin</title></head>
<body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9">
<div style="text-align:center;background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.1);max-width:400px">
  <div style="font-size:48px;margin-bottom:16px">${icon}</div>
  <h2 style="margin:0 0 8px;color:${color}">LinkUp Admin</h2>
  <p style="color:#374151;margin:0">${message}</p>
</div></body></html>`;
}

module.exports = { submitRating, getReceivedRatings, getGivenRatings, getUserRatings, approveRating, rejectRating };
