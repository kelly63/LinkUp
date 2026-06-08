const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const User = require('./models/User');
const Message = require('./models/Message');
const Connection = require('./models/Connection');
const MessageRequest = require('./models/MessageRequest');
const PushSubscription = require('./models/PushSubscription');
const Notification = require('./models/Notification');
const { sendPush } = require('./utils/pushNotification');

const PUSH_MESSAGES = {
  roster_request:  (d) => ({ title: 'New Connection Request', body: `${d.from?.name || 'Someone'} wants to connect with you` }),
  roster_accepted: (d) => ({ title: 'Connection Accepted',   body: `${d.by?.name || 'Someone'} accepted your request` }),
  session_accepted:(d) => ({ title: 'Session Accepted',      body: d.sessionTitle ? `"${d.sessionTitle}" has a new partner` : 'Someone accepted your session' }),
  message_new:     (d) => ({ title: 'New Message',           body: d.senderName ? `${d.senderName}: ${(d.text || '').slice(0, 80)}` : 'You have a new message' }),
  message_request: (d) => ({ title: 'Message Request',       body: `${d.from?.name || 'Someone'} sent you a message request` }),
  rating_new:      (d) => ({ title: 'New Rating',            body: d.from?.name ? `${d.from.name} gave you a ${d.overallRating}★ rating` : 'You received a new rating' }),
  session_updated: (d) => ({ title: 'Session Updated',       body: d.updatedBy?.name ? `${d.updatedBy.name} updated "${d.sessionTitle || 'your session'}"` : 'A session you joined was updated' }),
  change_proposed: (d) => ({ title: 'Review Requested',      body: d.proposedBy?.name ? `${d.proposedBy.name} proposed schedule changes` : 'Your partner proposed schedule changes' }),
  change_approved: (d) => ({ title: 'Changes Approved',      body: d.approvedBy?.name ? `${d.approvedBy.name} approved your proposed changes` : 'Your proposed changes were approved' }),
  change_declined: (d) => ({ title: 'Changes Declined',      body: d.declinedBy?.name ? `${d.declinedBy.name} declined your proposed changes` : 'Your proposed changes were declined' }),
  session_cancelled:(d)=> ({ title: 'Session Cancelled',     body: d.cancelledBy?.name ? `${d.cancelledBy.name} cancelled "${d.sessionTitle || 'your session'}"` : 'A session was cancelled' }),
  session_inquiry: (d) => ({ title: 'Session Inquiry',       body: d.from?.name ? `${d.from.name} is interested in your session` : 'Someone is interested in your session' }),
  partner_approved:(d) => ({ title: 'Request Approved',      body: d.approvedBy?.name ? `${d.approvedBy.name} approved your session request` : 'Your session request was approved' }),
  partner_declined:(d) => ({ title: 'Request Declined',      body: d.declinedBy?.name ? `${d.declinedBy.name} declined your session request` : 'Your session request was declined' }),
  session_nearby:  (d) => ({ title: 'Session Near You',      body: d.postedBy?.name ? `${d.postedBy.name} posted a ${d.sport || 'training'} session near you` : `A ${d.sport || 'training'} session was just posted near you` }),
};

if (process.env.VAPID_EMAIL && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Track userId → Set of socket IDs (a user can have multiple tabs/devices)
const onlineUsers = new Map();

const SOCKET_ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'capacitor://localhost',  // iOS Capacitor (simulator + device)
  'ionic://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

function getSocketIo(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow no-origin requests (native HTTP, curl) and known origins
        if (!origin || SOCKET_ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        // Fall back to permissive if CLIENT_URL not configured
        if (!process.env.CLIENT_URL) return callback(null, true);
        callback(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
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

        // Check for an existing message request
        const existingReq = await MessageRequest.findOne({
          $or: [
            { requester: userId, recipient: recipientId },
            { requester: recipientId, recipient: userId },
          ],
        });

        if (existingReq?.status === 'declined') {
          return ack?.({ error: 'This user has declined your message request' });
        }

        // Check roster connection
        const conn = await Connection.findOne({
          $or: [
            { requester: userId, recipient: recipientId },
            { requester: recipientId, recipient: userId },
          ],
          status: 'accepted',
        });

        // If not roster-connected and no request yet, create one
        if (!conn && !existingReq) {
          await MessageRequest.create({ requester: userId, recipient: recipientId }).catch(() => {});
          io.notify(recipientId, 'message_request', {
            from: { _id: userId, name: socket.user.name, avatar: socket.user.avatar },
          });
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

        // Deliver to recipient and echo to sender's other tabs
        io.to(`user:${recipientId}`).emit('message:new', payload);
        socket.to(`user:${userId}`).emit('message:new', payload);

        // Push notification if recipient is offline
        io.notify(recipientId, 'message_new', {
          senderName: socket.user.name,
          senderId: userId,
          text: text.trim().slice(0, 100),
        });

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

    // Push to offline users (app closed / backgrounded)
    const isOnline = onlineUsers.has(userIdStr) && onlineUsers.get(userIdStr).size > 0;
    if (!isOnline) {
      // Web Push (browser)
      const subs = await PushSubscription.find({ user: userId }).lean().catch(() => []);
      const payload = JSON.stringify({ type, data });
      for (const sub of subs) {
        webpush.sendNotification(sub, payload).catch((err) => {
          if (err.statusCode === 410) {
            PushSubscription.findByIdAndDelete(sub._id).catch(() => {});
          }
        });
      }

      // APNs (iOS native app)
      const msgFn = PUSH_MESSAGES[type];
      if (msgFn) {
        const user = await User.findById(userId).select('deviceTokens').lean().catch(() => null);
        if (user?.deviceTokens?.length) {
          const { title, body } = msgFn(data);
          sendPush(user.deviceTokens, { title, body, data: { type, ...data } }).catch(() => {});
        }
      }
    }
  };

  return io;
}

module.exports = { getSocketIo, onlineUsers };
