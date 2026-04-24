const express = require('express');
const { approveRating, rejectRating, getAdminDashboard } = require('../controllers/ratingController');

const router = express.Router();

// Admin dashboard — GET /api/admin/dashboard?token=<ADMIN_SECRET>
router.get('/dashboard', getAdminDashboard);

// One-click approve/reject links (sent in emails or used from dashboard)
router.get('/ratings/:ratingId/approve', approveRating);
router.get('/ratings/:ratingId/reject', rejectRating);

module.exports = router;
