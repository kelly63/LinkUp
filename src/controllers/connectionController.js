const Connection = require('../models/Connection');
const User = require('../models/User');

// POST /api/connections/request/:userId
const sendRequest = async (req, res) => {
  try {
    const recipientId = req.params.userId;

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot connect with yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: 'User not found' });

    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });

    if (existing) {
      return res.status(409).json({ message: 'Connection already exists', connection: existing });
    }

    const connection = await Connection.create({
      requester: req.user._id,
      recipient: recipientId,
    });

    res.status(201).json({ connection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/connections/:connectionId/accept
const acceptRequest = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      recipient: req.user._id,
      status: 'pending',
    });

    if (!connection) return res.status(404).json({ message: 'Connection request not found' });

    connection.status = 'accepted';
    await connection.save();

    res.json({ connection });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/connections/:connectionId/reject
const rejectRequest = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      recipient: req.user._id,
      status: 'pending',
    });

    if (!connection) return res.status(404).json({ message: 'Connection request not found' });

    connection.status = 'rejected';
    await connection.save();

    res.json({ message: 'Connection request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/connections/:connectionId
const removeConnection = async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    await connection.deleteOne();
    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/connections — get accepted connections for current user
const getConnections = async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'name avatar profession isOnline lastSeen')
      .populate('recipient', 'name avatar profession isOnline lastSeen');

    // Return the "other" user in each connection
    const users = connections.map((conn) => {
      const other =
        conn.requester._id.toString() === req.user._id.toString()
          ? conn.recipient
          : conn.requester;
      return { connectionId: conn._id, user: other, connectedAt: conn.updatedAt };
    });

    res.json({ connections: users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/connections/pending — incoming requests
const getPendingRequests = async (req, res) => {
  try {
    const pending = await Connection.find({
      recipient: req.user._id,
      status: 'pending',
    }).populate('requester', 'name avatar profession');

    res.json({ requests: pending });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeConnection,
  getConnections,
  getPendingRequests,
};
