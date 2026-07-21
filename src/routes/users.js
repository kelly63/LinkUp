const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { getUsers, getUserById, updateProfile, changePassword, updateRole } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { sendInviteEmail, sendContentReportEmail } = require('../utils/email');
const User = require('../models/User');
const ContentReport = require('../models/ContentReport');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'linkup-avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, upload.single('avatar'), updateProfile);
router.put('/password', protect, changePassword);
router.put('/role', protect, updateRole);

router.post('/:id/block', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: targetId } });

    const target = await User.findById(targetId).select('name').lean();
    sendContentReportEmail({
      type: 'block',
      reporterName: req.user.name,
      reporterEmail: req.user.email,
      targetName: target?.name || targetId,
      content: null,
      reason: `${req.user.name} blocked this user`,
    }).catch((err) => console.error('[block email]', err.message));

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id/block', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.id } });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/report', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const target = await User.findById(req.params.id).select('name').lean();
    if (!target) return res.status(404).json({ message: 'User not found' });

    await ContentReport.create({
      reportedBy: req.user._id,
      type: 'user',
      reportedUser: req.params.id,
      reason: reason || '',
    });

    sendContentReportEmail({
      type: 'user',
      reporterName: req.user.name,
      reporterEmail: req.user.email,
      targetName: target.name,
      content: null,
      reason: reason || 'No reason given',
    }).catch((err) => console.error('[report user email]', err.message));

    res.json({ message: 'User reported' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/invite', protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    const inviteUrl = process.env.APP_STORE_URL || 'https://linkup-swpu.onrender.com/invite';
    await sendInviteEmail({ toEmail: email.trim(), fromName: req.user.name, inviteUrl });
    await User.findByIdAndUpdate(req.user._id, { $inc: { invitesSent: 1 } });
    res.json({ message: 'Invite sent!' });
  } catch (err) {
    console.error('[invite]', err);
    res.status(500).json({ message: 'Could not send invite. Please try again.' });
  }
});

module.exports = router;
