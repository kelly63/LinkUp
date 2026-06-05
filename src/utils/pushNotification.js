const apn = require('node-apn');

let provider = null;

function normalizePemKey(raw) {
  const s = (raw || '').replace(/\\n/g, '\n').trim();
  if (!s) return s;
  // node-apn treats the key as a file path unless it starts with the PEM header
  if (s.includes('-----BEGIN')) return s;
  return `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----`;
}

function getProvider() {
  if (provider) return provider;
  const key = normalizePemKey(process.env.APN_KEY);
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

const BUNDLE_ID = 'com.linkupathletics.nextgen';

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
        .filter(f => ['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(f.response?.reason))
        .map(f => f.device);
      if (badTokens.length) {
        await User.updateMany({}, { $pull: { deviceTokens: { $in: badTokens } } });
      }
    }
    return result;
  } catch (err) {
    console.error('[apn] send error:', err.message);
    return { error: err.message };
  }
}

module.exports = { sendPush };
