const Sentry = require('@sentry/node');

function initSentry() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Capture 100% of transactions in prod; dial down once volume is clear
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    // Don't send PII like IPs or user-agent strings unless you need them
    sendDefaultPii: false,
  });
}

module.exports = { initSentry, Sentry };
