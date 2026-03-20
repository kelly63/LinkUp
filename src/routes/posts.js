const express = require('express');
const router = express.Router();
const {
  getFeed,
  createPost,
  toggleLike,
  addComment,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getFeed);
router.post('/', createPost);
router.post('/:id/like', toggleLike);
router.post('/:id/comment', addComment);
router.delete('/:id', deletePost);

module.exports = router;
