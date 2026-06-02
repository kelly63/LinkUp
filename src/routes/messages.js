const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getInbox,
  acceptMessageRequest,
  declineMessageRequest,
  postSessionLink,
  respondToBooking,
  likeMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getInbox);
// Static routes must come before /:userId to avoid route shadowing
router.post('/session-link', postSessionLink);
router.put('/requests/:userId/accept', acceptMessageRequest);
router.put('/requests/:userId/decline', declineMessageRequest);
router.put('/:messageId/booking', respondToBooking);
router.put('/:messageId/like', likeMessage);
router.get('/:userId', getConversation);
router.post('/:userId', sendMessage);

module.exports = router;
