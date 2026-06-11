const cron = require('node-cron');
const User = require('../models/User');
const { sendReEngagementEmail } = require('./email');

function startCronJobs() {
  // Run daily at 10:00 AM UTC
  cron.schedule('0 10 * * *', async () => {
    console.log('[cron] running re-engagement check');
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const users = await User.find({
        email: { $exists: true, $ne: '' },
        reEngagementSentAt: null,
        $or: [
          { lastSeen: { $lt: sevenDaysAgo } },
          { lastSeen: null, createdAt: { $lt: sevenDaysAgo } },
        ],
      }).select('_id name email sport lastSeen').lean();

      let sent = 0;
      for (const user of users) {
        try {
          await sendReEngagementEmail({ user });
          await User.findByIdAndUpdate(user._id, { reEngagementSentAt: new Date() });
          sent++;
        } catch (err) {
          console.error(`[cron] re-engagement failed for ${user.email}:`, err.message);
        }
      }
      console.log(`[cron] re-engagement done — sent ${sent}/${users.length}`);
    } catch (err) {
      console.error('[cron] re-engagement error:', err.message);
    }
  });

  console.log('[cron] jobs scheduled');
}

module.exports = { startCronJobs };
