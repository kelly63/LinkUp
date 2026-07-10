/**
 * One-time migration: backfill expiresAt on sessions that are missing it.
 *
 * Run once after deploying the updated sessionController:
 *   MONGODB_URI=... node scripts/fix-session-expiry.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Session = require('../src/models/Session');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Find open sessions with null expiresAt that have a non-Flexible date
  const sessions = await Session.find({
    expiresAt: null,
    date: { $ne: 'Flexible' },
  }).select('_id date dateWindowEnd').lean();

  console.log(`Found ${sessions.length} sessions with missing expiresAt`);

  let updated = 0;
  let skipped = 0;
  const ops = [];

  for (const s of sessions) {
    const parsed = new Date(s.date);
    if (isNaN(parsed.getTime())) {
      // Unparseable date string — expire immediately so it falls off the feed
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { expiresAt: new Date(0) } },
        },
      });
      skipped++;
    } else {
      // Set expiresAt to day-after the session date (matches createSession logic)
      parsed.setDate(parsed.getDate() + 1);
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { expiresAt: parsed } },
        },
      });
      updated++;
    }
  }

  if (ops.length > 0) {
    await Session.bulkWrite(ops);
  }

  console.log(`Updated ${updated} sessions with valid dates`);
  console.log(`Expired ${skipped} sessions with unparseable dates`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
