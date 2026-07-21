require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/database');
const { getSocketIo } = require('./socket');
const { initSentry, Sentry } = require('./config/sentry');

// Must be called before any other code so Sentry can instrument automatically
initSentry();

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

if (process.env.NODE_ENV !== 'test') {
  connectDB();
  const { startActivationDrip } = require('./jobs/activationDrip');
  startActivationDrip();
}

const app = express();
const httpServer = http.createServer(app);

// Render (and most cloud platforms) sit behind a reverse proxy — trust the first hop
// so express-rate-limit and req.ip see the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

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

// Serve public static pages (privacy policy, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

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

// Apple Universal Links — AASA file (must be served before the catch-all)
app.get('/.well-known/apple-app-site-association', (req, res) => {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) console.warn('[AASA] APPLE_TEAM_ID env var not set — Universal Links will not work');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId || 'TEAM_ID'}.com.linkupathletics.app`,
          paths: ['/go/*'],
        },
      ],
    },
  });
});

// Universal Link landing pages — iOS opens the app directly via AASA;
// these pages are the fallback for users who don't have the app installed.
function deepLinkFallback(title, subtitle) {
  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — LinkUp Athletics</title>
<style>body{font-family:-apple-system,sans-serif;background:#0b1623;color:#f0f4f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box}
.card{text-align:center;max-width:360px}.logo{font-size:28px;font-weight:800;color:#22c55e;margin-bottom:8px}
h1{font-size:22px;margin:0 0 10px}p{color:#6b8199;font-size:15px;margin:0 0 28px}
a{display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px}</style>
</head>
<body><div class="card">
<div class="logo">LinkUp</div>
<h1>${title}</h1><p>${subtitle}</p>
<a href="https://apps.apple.com/app/linkup-athletics/id6748965199">Download LinkUp Athletics</a>
</div></body></html>`;
}

app.get('/go/post-session', (req, res) => {
  res.send(deepLinkFallback('Post a Training Session', 'Download LinkUp Athletics to find and connect with training partners near you.'));
});

app.get('/go/find-sessions', (req, res) => {
  res.send(deepLinkFallback('Find Sessions Near You', 'Download LinkUp Athletics to browse open training sessions posted by athletes near you.'));
});

// Serve React app for any non-API GET request (supports client-side routing)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 for unknown API routes
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Sentry error handler must come before the generic error handler
app.use(Sentry.expressErrorHandler());

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`LinkUp server running on port ${PORT}`);
    console.log(`[apn] bundle ID: ${process.env.APN_BUNDLE_ID || 'com.linkupathletics.app (default)'}`);
    console.log(`[apn] environment: ${process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'}`);
  });
}

module.exports = { app, io };
