const express = require('express');
const router = express.Router();
const {
  submitRating,
  getReceivedRatings,
  getGivenRatings,
  getUserRatings,
} = require('../controllers/ratingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', submitRating);
router.get('/received', getReceivedRatings);
router.get('/given', getGivenRatings);
router.get('/user/:userId', getUserRatings);

module.exports = router;
