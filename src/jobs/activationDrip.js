const cron = require('node-cron');
const Session = require('../models/Session');
const User = require('../models/User');
const { sendActivationDay3Email, sendActivationDay7Email } = require('../utils/email');

// Returns users who signed up ~N days ago (within a 24-hour window) with no sessions posted
async function getUsersWithNoSessions(daysAgo) {
  const now = new Date();
  const windowEnd = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  const windowStart = new Date(windowEnd - 24 * 60 * 60 * 1000);

  const candidates = await User.find({
    createdAt: { $gte: windowStart, $lt: windowEnd },
    role: { $in: ['athlete', 'coach'] },
  }).select('_id email name').lean();

  if (!candidates.length) return [];

  const ids = candidates.map((u) => u._id);
  const postedIds = await Session.distinct('postedBy', { postedBy: { $in: ids } });
  const postedSet = new Set(postedIds.map(String));

  return candidates.filter((u) => !postedSet.has(String(u._id)));
}

async function runActivationDrip() {
  console.log('[activation drip] running');
  try {
    const [day3Users, day7Users] = await Promise.all([
      getUsersWithNoSessions(3),
      getUsersWithNoSessions(7),
    ]);

    console.log(`[activation drip] day3=${day3Users.length} day7=${day7Users.length}`);

    for (const user of day3Users) {
      sendActivationDay3Email({ user }).catch((err) =>
        console.error(`[activation drip day3] ${user.email}:`, err.message)
      );
    }
    for (const user of day7Users) {
      sendActivationDay7Email({ user }).catch((err) =>
        console.error(`[activation drip day7] ${user.email}:`, err.message)
      );
    }
  } catch (err) {
    console.error('[activation drip] error:', err.message);
  }
}

function startActivationDrip() {
  // Run daily at 10:00 AM UTC
  cron.schedule('0 10 * * *', runActivationDrip, { timezone: 'UTC' });
  console.log('[activation drip] scheduled daily at 10:00 UTC');
}

module.exports = { startActivationDrip, runActivationDrip };
