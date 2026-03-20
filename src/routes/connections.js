const express = require('express');
const router = express.Router();
const {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeConnection,
  getConnections,
  getPendingRequests,
} = require('../controllers/connectionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getConnections);
router.get('/pending', getPendingRequests);
router.post('/request/:userId', sendRequest);
router.put('/:connectionId/accept', acceptRequest);
router.put('/:connectionId/reject', rejectRequest);
router.delete('/:connectionId', removeConnection);

module.exports = router;
