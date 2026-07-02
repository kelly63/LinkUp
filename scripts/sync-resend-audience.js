/**
 * One-time script: sync all existing users into the Resend Audience.
 * Run once after setting RESEND_AUDIENCE_ID on Render:
 *   node scripts/sync-resend-audience.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { Resend } = require('resend');

const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
if (!AUDIENCE_ID) {
  console.error('RESEND_AUDIENCE_ID env var is not set');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../src/models/User');

  const users = await User.find({}, 'name email').lean();
  console.log(`Found ${users.length} users to sync`);

  let added = 0;
  let skipped = 0;

  for (const user of users) {
    const parts = (user.name || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const { error } = await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email: user.email,
      firstName,
      lastName,
      unsubscribed: false,
    });

    if (error) {
      console.warn(`  skipped ${user.email}: ${error.message}`);
      skipped++;
    } else {
      console.log(`  added ${user.email}`);
      added++;
    }

    // Stay well under Resend rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
