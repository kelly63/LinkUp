require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const { getSocketIo } = require('./socket');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const connectionRoutes = require('./routes/connections');
const messageRoutes = require('./routes/messages');
const sessionRoutes = require('./routes/sessions');
const ratingRoutes = require('./routes/ratings');
const postRoutes = require('./routes/posts');
const notificationRoutes = require('./routes/notifications');
const utilRoutes = require('./routes/utils');
const adminRoutes = require('./routes/admin');

if (process.env.NODE_ENV !== 'test') connectDB();

const app = express();
const httpServer = http.createServer(app);

// Attach Socket.io and export io for use in controllers
const io = getSocketIo(httpServer);
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded avatars
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  httpServer.listen(PORT, () => console.log(`LinkUp server running on port ${PORT}`));
}

module.exports = { app, io };
