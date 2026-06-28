const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const Notification = require('../models/Notification');

// GET /api/notifications/vapid-key — public
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// GET /api/notifications — fetch most recent 50 for the authed user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/subscribe
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user.id, endpoint, keys },
      { upsert: true, new: true }
    );
    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notifications/unsubscribe
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await PushSubscription.deleteOne({ user: req.user.id, endpoint });
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notifications/device-token — register APNs device token
router.post('/device-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token is required' });
    const User = require('../models/User');
    console.log(`[apn] registering token for user ${req.user.id}: ${token.slice(0, 12)}...${token.slice(-6)}`);
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { deviceTokens: token },
    });
    res.json({ message: 'Token registered' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notifications/device-token — unregister APNs device token
router.delete('/device-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { deviceTokens: token },
    });
    res.json({ message: 'Token removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
