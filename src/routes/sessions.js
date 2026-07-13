const express = require('express');
const router = express.Router();
const {
  createSession,
  getAvailableSessions,
  getMySessions,
  getExpiredSessions,
  getSessionById,
  updateSession,
  cancelSession,
  acceptSession,
  completeSession,
  approveChange,
  declineChange,
  suggestNewTime,
  approvePartner,
  declinePartner,
  inviteToSession,
} = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/available', getAvailableSessions);
router.get('/my', getMySessions);
router.get('/my/expired', getExpiredSessions);
router.get('/:id', getSessionById);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', cancelSession);
router.post('/:id/accept', acceptSession);
router.post('/:id/complete', completeSession);
router.post('/:id/approve-change', approveChange);
router.post('/:id/decline-change', declineChange);
router.post('/:id/suggest-time', suggestNewTime);
router.post('/:id/approve-partner', approvePartner);
router.post('/:id/decline-partner', declinePartner);
router.post('/:id/invite', inviteToSession);

module.exports = router;
