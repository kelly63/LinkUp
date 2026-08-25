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

    const rating_num = Number(overallRating);
    if (!Number.isInteger(rating_num) || rating_num < 1 || rating_num > 5) {
      return res.status(400).json({ message: 'overallRating must be an integer between 1 and 5' });
    }

    if (rateeId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot rate yourself' });
    }

    const ratee = await User.findById(rateeId);
    if (!ratee) return res.status(404).json({ message: 'User not found' });

    // Duplicate check: session-scoped when sessionId is present; otherwise per-rater+ratee in last 7 days
    if (sessionId) {
      const existing = await Rating.findOne({ rater: req.user._id, ratee: rateeId, session: sessionId });
      if (existing) {
        return res.status(409).json({ message: 'You have already rated this person for this session' });
      }
    } else {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await Rating.findOne({
        rater: req.user._id,
        ratee: rateeId,
        createdAt: { $gte: sevenDaysAgo },
      });
      if (recent) {
        return res.status(409).json({ message: 'You have already submitted a rating for this person recently' });
      }
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
    // Default to approved-only so users never see pending/rejected reviews
    const validStatuses = ['pending', 'approved', 'rejected'];
    query.status = validStatuses.includes(status) ? status : 'approved';

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
    const allApproved = await Rating.find({ ratee: req.params.userId, status: 'approved' }).select('overallRating').lean();
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

    if (req.query.back) {
      try {
        const backUrl = new URL(req.query.back);
        if (backUrl.origin === new URL(APP_URL).origin) return res.redirect(req.query.back);
      } catch {}
    }
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
    await refreshRatingStats(rating.ratee._id);

    if (req.query.back) {
      try {
        const backUrl = new URL(req.query.back);
        if (backUrl.origin === new URL(APP_URL).origin) return res.redirect(req.query.back);
      } catch {}
    }
    return res.send(adminPage(`Rating by ${rating.rater.name} has been rejected and will not appear publicly.`, true));
  } catch (error) {
    console.error('[admin] rejectRating error:', error);
    return res.status(500).send(adminPage('Server error', false));
  }
};

// GET /api/admin/dashboard?token=<ADMIN_SECRET>&status=pending|approved|rejected|all
const getAdminDashboard = async (req, res) => {
  const { token, status = 'pending' } = req.query;

  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unauthorized</title></head>
<body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9">
<div style="text-align:center;background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.1)">
<div style="font-size:48px;margin-bottom:16px">🔒</div>
<h2 style="margin:0 0 8px;color:#dc2626">Access Denied</h2>
<p style="color:#374151;margin:0">Invalid or missing admin token.</p>
</div></body></html>`);
  }

  try {
    const validStatuses = ['pending', 'approved', 'rejected', 'all'];
    const safeStatus = validStatuses.includes(status) ? status : 'pending';
    const query = safeStatus === 'all' ? {} : { status: safeStatus };

    const [ratings, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      Rating.find(query)
        .populate('rater', 'name sport position role')
        .populate('ratee', 'name sport position role')
        .populate('session', 'sport date location')
        .sort({ createdAt: -1 })
        .limit(100),
      Rating.countDocuments({ status: 'pending' }),
      Rating.countDocuments({ status: 'approved' }),
      Rating.countDocuments({ status: 'rejected' }),
    ]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const dashBase = `${baseUrl}/api/admin/dashboard?token=${encodeURIComponent(token)}`;

    const tabStyle = (s) => safeStatus === s
      ? 'background:#1e3a5f;color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px'
      : 'background:#e2e8f0;color:#475569;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:14px';

    const tabs = `
      <div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap">
        <a href="${dashBase}&status=pending" style="${tabStyle('pending')}">⏳ Pending <span style="opacity:.7">(${pendingCount})</span></a>
        <a href="${dashBase}&status=approved" style="${tabStyle('approved')}">✅ Approved <span style="opacity:.7">(${approvedCount})</span></a>
        <a href="${dashBase}&status=rejected" style="${tabStyle('rejected')}">❌ Rejected <span style="opacity:.7">(${rejectedCount})</span></a>
        <a href="${dashBase}&status=all" style="${tabStyle('all')}">All <span style="opacity:.7">(${pendingCount + approvedCount + rejectedCount})</span></a>
      </div>`;

    const statusBadge = (s) => {
      const map = { pending: ['#fef3c7','#92400e','⏳ Pending'], approved: ['#d1fae5','#065f46','✅ Approved'], rejected: ['#fee2e2','#991b1b','❌ Rejected'] };
      const [bg, color, label] = map[s] || ['#f1f5f9','#475569', s];
      return `<span style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${label}</span>`;
    };

    const cards = ratings.length === 0
      ? `<div style="text-align:center;padding:60px 20px;color:#94a3b8;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
          <div style="font-size:40px;margin-bottom:12px">🎉</div>
          <p style="font-size:16px;margin:0">No ${safeStatus === 'all' ? '' : safeStatus + ' '}ratings</p>
         </div>`
      : ratings.map((r) => {
          const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          const raterName = esc(r.rater?.name || 'Unknown');
          const rateeName = esc(r.ratee?.name || 'Unknown');
          const rating_val = Math.min(5, Math.max(0, Math.round(r.overallRating || 0)));
          const stars = '★'.repeat(rating_val) + '☆'.repeat(5 - rating_val);
          const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const cats = r.categories || {};
          const catItems = Object.entries({ 'Skill': cats.skillLevel, 'Punctuality': cats.punctuality, 'Communication': cats.communication, 'Attitude': cats.attitude })
            .filter(([, v]) => v != null)
            .map(([k, v]) => `<span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;color:#475569">${k}: ${v}/5</span>`)
            .join(' ');

          let actions = '';
          if (r.status === 'pending') {
            const approveToken = jwt.sign({ ratingId: r._id.toString(), action: 'approve' }, ADMIN_SECRET, { expiresIn: '7d' });
            const rejectToken  = jwt.sign({ ratingId: r._id.toString(), action: 'reject'  }, ADMIN_SECRET, { expiresIn: '7d' });
            const backUrl = encodeURIComponent(`${dashBase}&status=${safeStatus}`);
            const approveUrl = `${baseUrl}/api/admin/ratings/${r._id}/approve?token=${approveToken}&back=${backUrl}`;
            const rejectUrl  = `${baseUrl}/api/admin/ratings/${r._id}/reject?token=${rejectToken}&back=${backUrl}`;
            actions = `
              <div style="display:flex;gap:8px;margin-top:14px">
                <a href="${approveUrl}" style="flex:1;text-align:center;background:#16a34a;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">✅ Approve</a>
                <a href="${rejectUrl}"  style="flex:1;text-align:center;background:#dc2626;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">❌ Reject</a>
              </div>`;
          }

          return `
          <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:14px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <div style="font-size:14px;color:#64748b;margin-bottom:4px">
                  <strong style="color:#1e293b">${raterName}</strong>
                  <span style="margin:0 6px;color:#cbd5e1">→</span>
                  <strong style="color:#1e293b">${rateeName}</strong>
                  ${r.sport ? `<span style="color:#94a3b8;margin-left:6px">• ${r.sport}</span>` : ''}
                </div>
                <div style="font-size:20px;color:#f59e0b;letter-spacing:1px">${stars}
                  <span style="font-size:14px;color:#64748b;font-weight:600;margin-left:4px">${rating_val}/5</span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                ${statusBadge(r.status)}
                <span style="font-size:12px;color:#94a3b8">${date}</span>
              </div>
            </div>
            ${catItems ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${catItems}</div>` : ''}
            ${r.wouldTrainAgain != null ? `<div style="margin-top:8px;font-size:13px;color:#64748b">${r.wouldTrainAgain ? '✅ Would train again' : '❌ Would not train again'}</div>` : ''}
            ${r.feedback ? `<div style="margin-top:10px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;padding:10px 12px;font-size:14px;color:#374151;line-height:1.5">${r.feedback.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
            ${actions}
          </div>`;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LinkUp Admin Dashboard</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:20px 32px;display:flex;align-items:center;gap:12px">
    <div style="font-size:24px">⚡</div>
    <div>
      <h1 style="margin:0;color:#fff;font-size:20px">LinkUp Athletics</h1>
      <p style="margin:2px 0 0;color:rgba(255,255,255,.7);font-size:13px">Admin Dashboard</p>
    </div>
  </div>

  <div style="max-width:760px;margin:0 auto;padding:28px 20px">

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#d97706">${pendingCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Pending</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${approvedCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Approved</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#dc2626">${rejectedCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Rejected</div>
      </div>
    </div>

    ${tabs}
    ${cards}

    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
      LinkUp Athletics Admin · Bookmark this page for quick access
    </p>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('[admin] dashboard error:', error);
    res.status(500).send(adminPage('Server error loading dashboard', false));
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

module.exports = { submitRating, getReceivedRatings, getGivenRatings, getUserRatings, approveRating, rejectRating, getAdminDashboard };
