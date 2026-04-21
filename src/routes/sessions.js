const express = require('express');
const router = express.Router();
const {
  createSession,
  getAvailableSessions,
  getMySessions,
  getSessionById,
  updateSession,
  cancelSession,
  acceptSession,
  completeSession,
  approveChange,
  declineChange,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/available', getAvailableSessions);
router.get('/my', getMySessions);
router.get('/:id', getSessionById);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', cancelSession);
router.post('/:id/accept', acceptSession);
router.post('/:id/complete', completeSession);
router.post('/:id/approve-change', approveChange);
router.post('/:id/decline-change', declineChange);

module.exports = router;
