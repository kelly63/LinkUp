const apn = require('node-apn');

let provider = null;

function getProvider() {
  if (provider) return provider;
  // APN_KEY can be the raw .p8 content (with real newlines) or a single-line
  // string with literal \n characters — both work after this replace.
  const key = (process.env.APN_KEY || '').replace(/\\n/g, '\n');
  const keyId = process.env.APN_KEY_ID;
  const teamId = process.env.APN_TEAM_ID;
  if (!key || !keyId || !teamId) return null;
  try {
    provider = new apn.Provider({
      token: { key, keyId, teamId },
      production: process.env.NODE_ENV === 'production',
    });
    return provider;
  } catch (err) {
    console.error('[apn] provider init error:', err.message);
    return null;
  }
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
