const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const {
  getFeed,
  createPost,
  toggleLike,
  addComment,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const postImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'linkup-posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
  },
});

const uploadPostImage = multer({
  storage: postImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(protect);

router.post('/upload-image', uploadPostImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image provided' });
    res.json({ url: req.file.path });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

router.get('/', getFeed);
router.post('/', createPost);
router.post('/:id/like', toggleLike);
router.post('/:id/comment', addComment);
router.delete('/:id', deletePost);

module.exports = router;
