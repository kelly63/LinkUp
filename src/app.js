require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
const profileRoutes = require('./routes/profile');
const nextgenRoutes = require('./routes/nextgen');
const uploadRoutes = require('./routes/uploads');
const reportRoutes = require('./routes/reports');

if (process.env.NODE_ENV !== 'test') connectDB();

const app = express();
const httpServer = http.createServer(app);

// Attach Socket.io and export io for use in controllers
const io = getSocketIo(httpServer);
app.set('io', io);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
}));

// Global rate limit: 300 req / 15 min per IP (catches scrapers and runaway clients)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skip: (req) => process.env.NODE_ENV === 'test',
}));

const allowedOrigins = [
  process.env.CLIENT_URL,
  'capacitor://localhost',  // iOS Capacitor
  'http://localhost',       // Android Capacitor
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (native mobile, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
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
app.use('/api/nextgen', nextgenRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reports', reportRoutes);

// Profile deep-link redirect (used by QR codes)
app.use('/profile', profileRoutes);

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
