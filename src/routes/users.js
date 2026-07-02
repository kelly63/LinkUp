const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { getUsers, getUserById, updateProfile, changePassword, updateRole } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { sendInviteEmail } = require('../utils/email');

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

router.post('/invite', protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid email address is required' });
    }
    const inviteUrl = process.env.APP_STORE_URL || 'https://linkup-swpu.onrender.com/invite';
    await sendInviteEmail({ toEmail: email.trim(), fromName: req.user.name, inviteUrl });
    res.json({ message: 'Invite sent!' });
  } catch (err) {
    console.error('[invite]', err);
    res.status(500).json({ message: 'Could not send invite. Please try again.' });
  }
});

module.exports = router;
