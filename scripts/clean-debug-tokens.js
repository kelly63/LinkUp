/**
 * One-time script: remove DEBUG: junk strings from deviceTokens arrays.
 * Run once after deploying:
 *   node scripts/clean-debug-tokens.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('../src/models/User');

  const result = await User.updateMany(
    { deviceTokens: { $elemMatch: { $not: /^[0-9a-f]{32,100}$/i } } },
    { $pull: { deviceTokens: { $not: /^[0-9a-f]{32,100}$/i } } }
  );

  console.log(`Cleaned ${result.modifiedCount} user(s)`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
