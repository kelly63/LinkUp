const Message = require('../models/Message');
const Connection = require('../models/Connection');
const MessageRequest = require('../models/MessageRequest');

// Check if two users have an accepted roster connection
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

// Get or create a MessageRequest between two users (requester → recipient)
// Returns { msgReq, created }
const getOrCreateRequest = async (requesterId, recipientId) => {
  let msgReq = await MessageRequest.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId },
    ],
  });
  let created = false;
  if (!msgReq) {
    msgReq = await MessageRequest.create({ requester: requesterId, recipient: recipientId });
    created = true;
  }
  return { msgReq, created };
};

// POST /api/messages/:userId
const sendMessage = async (req, res) => {
  try {
    const recipientId = req.params.userId;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    // Roster-connected users can always message
    const connected = await areConnected(req.user._id, recipientId);

    if (!connected) {
      const { msgReq, created } = await getOrCreateRequest(req.user._id, recipientId);

      if (msgReq.status === 'declined') {
        return res.status(403).json({ message: 'This user has declined your message request' });
      }

      // Notify recipient on the first message (new request)
      if (created) {
        const io = req.app.get('io');
        if (io) {
          io.notify(recipientId, 'message_request', {
            from: {
              _id: req.user._id,
              name: req.user.name,
              avatar: req.user.avatar,
            },
          });
        }
      }
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      text: text.trim(),
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        _id: message._id,
        sender: req.user._id.toString(),
        recipient: recipientId,
        text: message.text,
        read: false,
        createdAt: message.createdAt,
      };
      io.to(`user:${recipientId}`).emit('message:new', payload);
    }

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

    // Allow access if roster-connected OR a non-declined message request exists
    const connected = await areConnected(req.user._id, userId);
    if (!connected) {
      const msgReq = await MessageRequest.findOne({
        $or: [
          { requester: req.user._id, recipient: userId },
          { requester: userId, recipient: req.user._id },
        ],
        status: { $ne: 'declined' },
      });
      if (!msgReq) {
        return res.status(403).json({ message: 'No conversation access' });
      }
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

    await Message.updateMany(
      { sender: userId, recipient: req.user._id, read: false },
      { read: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('message:read', {
        by: req.user._id.toString(),
        from: userId,
      });
    }

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/messages — inbox with request status attached
const getInbox = async (req, res) => {
  try {
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
          partner: {
            _id: 1, name: 1, avatar: 1, role: 1,
            sport: 1, position: 1, skillLevel: 1,
            isOnline: 1, lastSeen: 1,
          },
          lastMessage: 1,
          unread: 1,
        },
      },
    ]);

    // Attach message request status to each conversation
    const partnerIds = messages.map((m) => m.partner._id);
    const msgRequests = await MessageRequest.find({
      $or: [
        { requester: req.user._id, recipient: { $in: partnerIds } },
        { requester: { $in: partnerIds }, recipient: req.user._id },
      ],
    });

    const requestMap = {};
    for (const r of msgRequests) {
      const otherId =
        r.requester.toString() === req.user._id.toString()
          ? r.recipient.toString()
          : r.requester.toString();
      requestMap[otherId] = {
        status: r.status,
        isRequester: r.requester.toString() === req.user._id.toString(),
        requestId: r._id,
      };
    }

    const conversations = messages
      .map((conv) => ({
        ...conv,
        requestInfo: requestMap[conv.partner._id.toString()] ?? null,
      }))
      .filter((conv) => {
        // Hide conversations where the request was declined by me (I declined their request)
        const ri = conv.requestInfo;
        if (ri && ri.status === 'declined' && !ri.isRequester) return false;
        return true;
      });

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/messages/requests/:userId/accept
const acceptMessageRequest = async (req, res) => {
  try {
    const msgReq = await MessageRequest.findOne({
      requester: req.params.userId,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!msgReq) return res.status(404).json({ message: 'Message request not found' });
    msgReq.status = 'accepted';
    await msgReq.save();
    res.json({ message: 'Message request accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/messages/requests/:userId/decline
const declineMessageRequest = async (req, res) => {
  try {
    const msgReq = await MessageRequest.findOne({
      requester: req.params.userId,
      recipient: req.user._id,
      status: 'pending',
    });
    if (!msgReq) return res.status(404).json({ message: 'Message request not found' });
    msgReq.status = 'declined';
    await msgReq.save();
    res.json({ message: 'Message request declined' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  acceptMessageRequest,
  declineMessageRequest,
};
