const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const PushSubscription = require('./models/PushSubscription');
const Notification = require('./models/Notification');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Track userId → Set of socket IDs (a user can have multiple tabs/devices)
const onlineUsers = new Map();

function getSocketIo(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  // ─── Authentication middleware ───────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Helper: notify roster connections of presence change ───────────────────
  async function broadcastPresence(userId, isOnline) {
    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    for (const conn of connections) {
      const otherId =
        conn.requester.toString() === userId
          ? conn.recipient.toString()
          : conn.requester.toString();
      io.to(`user:${otherId}`).emit('user:presence', { userId, isOnline });
    }
  }

  // ─── Helper: get online status for a list of userIds ────────────────────────
  function getOnlineStatus(userIds) {
    const result = {};
    for (const id of userIds) {
      result[id] = onlineUsers.has(id) && onlineUsers.get(id).size > 0;
    }
    return result;
  }

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // Join personal room
    socket.join(`user:${userId}`);

    // Track online sockets for this user
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Mark online in DB and notify roster
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    broadcastPresence(userId, true);

    console.log(`[socket] ${socket.user.name} connected (${socket.id})`);

    // ── Event: send a message ────────────────────────────────────────────────
    socket.on('message:send', async ({ recipientId, text }, ack) => {
      try {
        if (!recipientId || !text?.trim()) {
          return ack?.({ error: 'recipientId and text are required' });
        }

        // Verify they are connected (on roster)
        const conn = await Connection.findOne({
          $or: [
            { requester: userId, recipient: recipientId },
            { requester: recipientId, recipient: userId },
          ],
          status: 'accepted',
        });

        if (!conn) {
          return ack?.({ error: 'You can only message your roster connections' });
        }

        const message = await Message.create({
          sender: userId,
          recipient: recipientId,
          text: text.trim(),
        });

        const payload = {
          _id: message._id,
          sender: userId,
          recipient: recipientId,
          text: message.text,
          read: false,
          createdAt: message.createdAt,
        };

        // Deliver to recipient
        io.to(`user:${recipientId}`).emit('message:new', payload);

        // Echo back to sender (other tabs)
        socket.to(`user:${userId}`).emit('message:new', payload);

        // Push notification if recipient is offline
        io.notify(recipientId, 'message_new', {
          senderName: socket.user.name,
          senderId: userId,
          text: text.trim().slice(0, 100),
        });

        // Acknowledge to the sending socket
        ack?.({ message: payload });
      } catch (err) {
        console.error('[socket] message:send error', err);
        ack?.({ error: 'Server error' });
      }
    });

    // ── Event: mark messages as read ────────────────────────────────────────
    socket.on('message:read', async ({ senderId }) => {
      try {
        await Message.updateMany(
          { sender: senderId, recipient: userId, read: false },
          { read: true }
        );
        // Notify sender that their messages were read
        io.to(`user:${senderId}`).emit('message:read', { by: userId, from: senderId });
      } catch (err) {
        console.error('[socket] message:read error', err);
      }
    });

    // ── Event: typing indicators ─────────────────────────────────────────────
    socket.on('typing:start', ({ recipientId }) => {
      io.to(`user:${recipientId}`).emit('typing:start', { userId });
    });

    socket.on('typing:stop', ({ recipientId }) => {
      io.to(`user:${recipientId}`).emit('typing:stop', { userId });
    });

    // ── Event: query online status for a list of users ───────────────────────
    socket.on('presence:query', ({ userIds }, ack) => {
      ack?.(getOnlineStatus(userIds));
    });

    // ── Notification helper (called from controllers) ────────────────────────
    // Exposed via io instance so controllers can call io.notify(userId, type, data)

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          broadcastPresence(userId, false);
        }
      }
      console.log(`[socket] ${socket.user.name} disconnected (${socket.id})`);
    });
  });

  // ── Utility: push a notification to a user from anywhere in the app ─────────
  io.notify = async (userId, type, data) => {
    const userIdStr = userId.toString();

    // Persist to DB so the panel can show history
    const saved = await Notification.create({ user: userId, type, data }).catch(() => null);
    const notification = { _id: saved?._id, type, data, read: false, createdAt: saved?.createdAt ?? new Date() };

    // Real-time via Socket.io (works when app is open)
    io.to(`user:${userIdStr}`).emit('notification', notification);

    // Web Push for users not currently connected (app closed / backgrounded)
    const isOnline = onlineUsers.has(userIdStr) && onlineUsers.get(userIdStr).size > 0;
    if (!isOnline) {
      const subs = await PushSubscription.find({ user: userId }).lean().catch(() => []);
      const payload = JSON.stringify({ type, data });
      for (const sub of subs) {
        webpush.sendNotification(sub, payload).catch((err) => {
          // 410 Gone = subscription expired; clean it up
          if (err.statusCode === 410) {
            PushSubscription.findByIdAndDelete(sub._id).catch(() => {});
          }
        });
      }
    }
  };

  return io;
}

module.exports = { getSocketIo, onlineUsers };
