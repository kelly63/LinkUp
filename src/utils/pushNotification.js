const apn = require('node-apn');

let provider = null;
let sandboxProvider = null;

function normalizePemKey(raw) {
  const s = (raw || '').replace(/\\n/g, '\n').trim();
  if (!s) return s;
  // node-apn treats the key as a file path unless it starts with the PEM header
  if (s.includes('-----BEGIN')) return s;
  return `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----`;
}

function buildProvider(production) {
  const key = normalizePemKey(process.env.APN_KEY);
  const keyId = process.env.APN_KEY_ID;
  const teamId = process.env.APN_TEAM_ID;
  if (!key || !keyId || !teamId) {
    console.warn('[apn] missing credentials — push disabled. Set APN_KEY, APN_KEY_ID, APN_TEAM_ID on Render.');
    return null;
  }
  try {
    const p = new apn.Provider({ token: { key, keyId, teamId }, production });
    console.log(`[apn] provider ready — gateway: ${production ? 'production' : 'sandbox'}, bundle: ${process.env.APN_BUNDLE_ID || 'com.linkupathletics.app'}`);
    return p;
  } catch (err) {
    console.error('[apn] provider init error:', err.message);
    return null;
  }
}

function getProvider(sandbox = false) {
  if (sandbox) {
    if (!sandboxProvider) sandboxProvider = buildProvider(false);
    return sandboxProvider;
  }
  if (!provider) provider = buildProvider(true);
  return provider;
}

const BUNDLE_ID = process.env.APN_BUNDLE_ID || 'com.linkupathletics.app';

/**
 * Send a push notification to one or more APNs device tokens.
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendPush(tokens, { title, body, data = {}, sandbox = process.env.APN_SANDBOX === 'true' }) {
  const p = getProvider(sandbox);
  if (!p || !tokens?.length) return;

  console.log(`[apn] sending via ${sandbox ? 'sandbox' : 'production'} gateway to ${tokens.length} device(s)`);

  const note = new apn.Notification();
  note.expiry = Math.floor(Date.now() / 1000) + 3600;
  note.badge = 1;
  note.sound = 'default';
  note.alert = { title, body };
  note.payload = data;
  note.topic = BUNDLE_ID;
  note.priority = 10;
  note.pushType = 'alert';

  try {
    const result = await p.send(note, tokens);
    if (result.sent?.length) console.log(`[apn] sent to ${result.sent.length} device(s)`);
    if (result.failed?.length) {
      console.warn('[apn] failed:', JSON.stringify(result.failed.map(f => ({ device: f.device?.slice(0,12), reason: f.response?.reason }))));
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
