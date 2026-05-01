const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { approveRating, rejectRating, getAdminDashboard } = require('../controllers/ratingController');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'linkup-admin-secret';
const router = express.Router();

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

// Admin dashboard — GET /api/admin/dashboard?token=<ADMIN_SECRET>
router.get('/dashboard', getAdminDashboard);

// Rating moderation
router.get('/ratings/:ratingId/approve', approveRating);
router.get('/ratings/:ratingId/reject', rejectRating);

// Athlete verification — GET /api/admin/verify/:userId/approve?token=...
router.get('/verify/:userId/approve', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));
    let payload;
    try { payload = jwt.verify(token, ADMIN_SECRET); } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }
    if (payload.action !== 'approve' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send(adminPage('User not found', false));
    if (user.verificationStatus === 'approved') return res.send(adminPage('Already approved ✓', true));
    user.verificationStatus = 'approved';
    user.verifiedAt = new Date();
    await user.save({ validateBeforeSave: false });
    return res.send(adminPage(`${user.name} is now a Verified Athlete on LinkUp.`, true));
  } catch (error) {
    return res.status(500).send(adminPage('Server error', false));
  }
});

// Athlete verification — GET /api/admin/verify/:userId/reject?token=...
router.get('/verify/:userId/reject', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));
    let payload;
    try { payload = jwt.verify(token, ADMIN_SECRET); } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }
    if (payload.action !== 'reject' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send(adminPage('User not found', false));
    if (user.verificationStatus === 'rejected') return res.send(adminPage('Already rejected ✓', true));
    user.verificationStatus = 'rejected';
    await user.save({ validateBeforeSave: false });
    return res.send(adminPage(`${user.name}'s verification request has been rejected.`, true));
  } catch (error) {
    return res.status(500).send(adminPage('Server error', false));
  }
});

// POST /api/admin/reset-password
// Body: { email, newPassword, adminSecret }
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, adminSecret } = req.body;
  if (!adminSecret || adminSecret !== ADMIN_SECRET) {
    return res.status(401).json({ message: 'Invalid admin secret' });
  }
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'email and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: `No user found with email: ${email}` });
    user.password = newPassword;
    await user.save();
    res.json({ message: `Password reset for ${user.name} (${user.email})` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
