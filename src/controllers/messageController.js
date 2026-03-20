const Message = require('../models/Message');
const Connection = require('../models/Connection');

// Helper: verify the two users are connected
const areConnected = async (userId1, userId2) => {
  const conn = await Connection.findOne({
    $or: [
      { requester: userId1, recipient: userId2 },
      { requester: userId2, recipient: userId1 },
    ],
    status: 'accepted',
  });
  return !!conn;
};

// POST /api/messages/:userId
const sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const connected = await areConnected(req.user._id, userId);
    if (!connected) {
      return res.status(403).json({ message: 'You can only message your connections' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: userId,
      text: text.trim(),
    });

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages/:userId — conversation thread
const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const connected = await areConnected(req.user._id, userId);
    if (!connected) {
      return res.status(403).json({ message: 'You can only view messages with your connections' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Mark incoming messages as read
    await Message.updateMany(
      { sender: userId, recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages — list of recent conversations
const getInbox = async (req, res) => {
  try {
    // Aggregate latest message per conversation partner
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { recipient: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$recipient',
              '$sender',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unread: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipient', req.user._id] }, { $eq: ['$read', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'partner',
        },
      },
      { $unwind: '$partner' },
      {
        $project: {
          partner: { _id: 1, name: 1, avatar: 1, isOnline: 1, lastSeen: 1 },
          lastMessage: 1,
          unread: 1,
        },
      },
    ]);

    res.json({ conversations: messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { sendMessage, getConversation, getInbox };
