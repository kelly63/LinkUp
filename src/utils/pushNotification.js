const apn = require('node-apn');

let provider = null;

function getProvider() {
  if (provider) return provider;
  const key = process.env.APN_KEY;        // .p8 file contents as a string
  const keyId = process.env.APN_KEY_ID;   // 10-char key ID from Apple Developer
  const teamId = process.env.APN_TEAM_ID; // 10-char team ID from Apple Developer
  if (!key || !keyId || !teamId) return null;
  provider = new apn.Provider({
    token: { key, keyId, teamId },
    production: process.env.NODE_ENV === 'production',
  });
  return provider;
}

const BUNDLE_ID = 'com.linkupathletics.app';

/**
 * Send a push notification to one or more APNs device tokens.
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendPush(tokens, { title, body, data = {} }) {
  const p = getProvider();
  if (!p || !tokens?.length) return;

  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 1;
  note.sound = 'default';
  note.alert = { title, body };
  note.payload = data;
  note.topic = BUNDLE_ID;

  try {
    const result = await p.send(note, tokens);
    // Remove invalid tokens from the database
    if (result.failed?.length) {
      const User = require('../models/User');
      const badTokens = result.failed
        .filter(f => f.response?.reason === 'BadDeviceToken' || f.response?.reason === 'Unregistered')
        .map(f => f.device);
      if (badTokens.length) {
        await User.updateMany({}, { $pull: { deviceTokens: { $in: badTokens } } });
      }
    }
  } catch (err) {
    console.error('[apn] send error:', err.message);
  }
}

module.exports = { sendPush };
