const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getInbox,
  acceptMessageRequest,
  declineMessageRequest,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getInbox);
// Must come before /:userId to avoid route shadowing
router.put('/requests/:userId/accept', acceptMessageRequest);
router.put('/requests/:userId/decline', declineMessageRequest);
router.get('/:userId', getConversation);
router.post('/:userId', sendMessage);

module.exports = router;
