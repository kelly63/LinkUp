const express = require('express');
const { approveRating, rejectRating } = require('../controllers/ratingController');

const router = express.Router();

// One-click approve/reject links sent in admin review emails
router.get('/ratings/:ratingId/approve', approveRating);
router.get('/ratings/:ratingId/reject', rejectRating);

module.exports = router;
