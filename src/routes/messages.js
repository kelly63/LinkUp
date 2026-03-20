const express = require('express');
const router = express.Router();
const { sendMessage, getConversation, getInbox } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getInbox);
router.get('/:userId', getConversation);
router.post('/:userId', sendMessage);

module.exports = router;
