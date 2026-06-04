const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { approveRating, rejectRating, getAdminDashboard } = require('../controllers/ratingController');
const { sendVerifiedEmail } = require('../utils/email');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'linkup-admin-secret';
const APP_URL = process.env.APP_URL || 'https://linkup-backend-46g1.onrender.com';
const router = express.Router();

function adminPage(message, success) {
  const color = success ? '#16a34a' : '#dc2626';
  const icon = success ? '✅' : '❌';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LinkUp Admin</title></head>
<body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9">
<div style="text-align:center;background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.1);max-width:400px">
  <div style="font-size:48px;margin-bottom:16px">${icon}</div>
  <h2 style="margin:0 0 8px;color:${color}">LinkUp Admin</h2>
  <p style="color:#374151;margin:0">${message}</p>
</div></body></html>`;
}

// Admin dashboard — GET /api/admin/dashboard?token=<ADMIN_SECRET>
router.get('/dashboard', getAdminDashboard);

// ─── Verification dashboard ───────────────────────────────────────────────────
// GET /api/admin/verify-dashboard?token=<ADMIN_SECRET>&status=pending|approved|rejected|all
router.get('/verify-dashboard', async (req, res) => {
  const { token, status = 'pending' } = req.query;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).send(adminPage('Invalid or missing admin token', false));
  }

  try {
    const validStatuses = ['pending', 'approved', 'rejected', 'all'];
    const safeStatus = validStatuses.includes(status) ? status : 'pending';
    const query = safeStatus === 'all'
      ? { verificationStatus: { $ne: 'unsubmitted' } }
      : { verificationStatus: safeStatus };

    const [users, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).limit(150),
      User.countDocuments({ verificationStatus: 'pending' }),
      User.countDocuments({ verificationStatus: 'approved' }),
      User.countDocuments({ verificationStatus: 'rejected' }),
    ]);

    const baseUrl = APP_URL;
    const dashBase = `${baseUrl}/api/admin/verify-dashboard?token=${encodeURIComponent(token)}`;

    const tabStyle = (s) => safeStatus === s
      ? 'background:#1e3a5f;color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px'
      : 'background:#e2e8f0;color:#475569;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:14px';

    const tabs = `
      <div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap">
        <a href="${dashBase}&status=pending"  style="${tabStyle('pending')}">⏳ Pending <span style="opacity:.7">(${pendingCount})</span></a>
        <a href="${dashBase}&status=approved" style="${tabStyle('approved')}">✅ Approved <span style="opacity:.7">(${approvedCount})</span></a>
        <a href="${dashBase}&status=rejected" style="${tabStyle('rejected')}">❌ Rejected <span style="opacity:.7">(${rejectedCount})</span></a>
        <a href="${dashBase}&status=all"      style="${tabStyle('all')}">All <span style="opacity:.7">(${pendingCount + approvedCount + rejectedCount})</span></a>
      </div>`;

    const statusBadge = (s) => {
      const map = {
        pending:  ['#fef3c7','#92400e','⏳ Pending'],
        approved: ['#d1fae5','#065f46','✅ Approved'],
        rejected: ['#fee2e2','#991b1b','❌ Rejected'],
      };
      const [bg, color, label] = map[s] || ['#f1f5f9','#475569', s];
      return `<span style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">${label}</span>`;
    };

    const cards = users.length === 0
      ? `<div style="text-align:center;padding:60px 20px;color:#94a3b8;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
          <div style="font-size:40px;margin-bottom:12px">🎉</div>
          <p style="font-size:16px;margin:0">No ${safeStatus === 'all' ? '' : safeStatus + ' '}verification requests</p>
         </div>`
      : users.map((u) => {
          const userIdStr = u._id.toString();
          const joined = new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

          let actions = '';
          if (u.verificationStatus === 'pending') {
            const approveToken  = jwt.sign({ userId: userIdStr, action: 'approve'  }, ADMIN_SECRET, { expiresIn: '30d' });
            const rejectToken   = jwt.sign({ userId: userIdStr, action: 'reject'   }, ADMIN_SECRET, { expiresIn: '30d' });
            const clarifyToken  = jwt.sign({ userId: userIdStr, action: 'clarify'  }, ADMIN_SECRET, { expiresIn: '30d' });
            const approveUrl  = `${baseUrl}/api/admin/verify/${userIdStr}/approve?token=${approveToken}`;
            const rejectUrl   = `${baseUrl}/api/admin/verify/${userIdStr}/reject?token=${rejectToken}`;
            const clarifyUrl  = `${baseUrl}/api/admin/verify/${userIdStr}/clarify?token=${clarifyToken}`;
            actions = `
              <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
                <a href="${approveUrl}"  style="flex:1;min-width:100px;text-align:center;background:#16a34a;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">✅ Approve</a>
                <a href="${clarifyUrl}" style="flex:1;min-width:100px;text-align:center;background:#d97706;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">✏️ Clarify</a>
                <a href="${rejectUrl}"  style="flex:1;min-width:100px;text-align:center;background:#dc2626;color:#fff;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">❌ Reject</a>
              </div>`;
          }

          return `
          <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:14px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
              <div>
                <div style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:2px">${u.name}</div>
                <div style="font-size:13px;color:#64748b">${u.email}</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                ${statusBadge(u.verificationStatus)}
                <span style="font-size:12px;color:#94a3b8">Joined ${joined}</span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:8px">
              ${u.school ? `<div style="background:#f8fafc;border-radius:8px;padding:8px 12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">School</div><div style="font-size:13px;color:#1e293b;font-weight:500">${u.school}</div></div>` : ''}
              ${u.sport  ? `<div style="background:#f8fafc;border-radius:8px;padding:8px 12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Sport</div><div style="font-size:13px;color:#1e293b;font-weight:500">${u.sport}</div></div>` : ''}
              ${u.skillLevel ? `<div style="background:#f8fafc;border-radius:8px;padding:8px 12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Level</div><div style="font-size:13px;color:#1e293b;font-weight:500">${u.skillLevel}</div></div>` : ''}
              ${u.position ? `<div style="background:#f8fafc;border-radius:8px;padding:8px 12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Position</div><div style="font-size:13px;color:#1e293b;font-weight:500">${u.position}</div></div>` : ''}
              ${u.location ? `<div style="background:#f8fafc;border-radius:8px;padding:8px 12px"><div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Location</div><div style="font-size:13px;color:#1e293b;font-weight:500">${u.location}</div></div>` : ''}
              ${u.ngbMemberId ? `<div style="background:#fffbeb;border-radius:8px;padding:8px 12px;border:1px solid #fde68a"><div style="font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">NGB Member ID</div><div style="font-size:13px;color:#92400e;font-weight:600">${u.ngbMemberId}</div></div>` : ''}
            </div>
            ${u.verificationRosterUrl ? `
            <div style="margin-bottom:8px">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Roster Link</div>
              <a href="${u.verificationRosterUrl}" target="_blank" rel="noopener" style="color:#2563eb;font-size:13px;word-break:break-all">${u.verificationRosterUrl}</a>
            </div>` : ''}
            ${u.verificationNote ? `
            <div style="background:#f0f9ff;border-left:3px solid #2563eb;border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:8px;font-size:13px;color:#1e293b;line-height:1.5">
              <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${u.verificationStatus === 'rejected' ? 'Rejection note' : 'Notes'}</div>
              ${u.verificationNote.replace(/</g,'&lt;').replace(/>/g,'&gt;')}
            </div>` : ''}
            ${actions}
          </div>`;
        }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LinkUp — Verification Dashboard</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:20px 32px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="font-size:24px">🔍</div>
      <div>
        <h1 style="margin:0;color:#fff;font-size:20px">Verification Dashboard</h1>
        <p style="margin:2px 0 0;color:rgba(255,255,255,.7);font-size:13px">LinkUp Athletics</p>
      </div>
    </div>
    <a href="${APP_URL}/api/admin/dashboard?token=${encodeURIComponent(token)}" style="color:rgba(255,255,255,.7);font-size:13px;text-decoration:none">← Ratings Dashboard</a>
  </div>

  <div style="max-width:760px;margin:0 auto;padding:28px 20px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#d97706">${pendingCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Pending</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#16a34a">${approvedCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Approved</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:18px;border:1px solid #e2e8f0;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#dc2626">${rejectedCount}</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px">Rejected</div>
      </div>
    </div>

    ${tabs}
    ${cards}

    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px">
      LinkUp Athletics Admin · Bookmark this page for quick access
    </p>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('[admin] verify-dashboard error:', err);
    res.status(500).send(adminPage('Server error loading dashboard', false));
  }
});

// Rating moderation
router.get('/ratings/:ratingId/approve', approveRating);
router.get('/ratings/:ratingId/reject', rejectRating);

// Athlete verification — GET /api/admin/verify/:userId/approve?token=...
router.get('/verify/:userId/approve', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));
    let payload;
    try { payload = jwt.verify(token, ADMIN_SECRET); } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }
    if (payload.action !== 'approve' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send(adminPage('User not found', false));
    if (user.verificationStatus === 'approved') return res.send(adminPage('Already approved ✓', true));
    user.verificationStatus = 'approved';
    user.verifiedAt = new Date();
    await user.save({ validateBeforeSave: false });
    sendVerifiedEmail({ user }).catch((err) => console.error('[verified email]', err.message));
    return res.send(adminPage(`${user.name} is now a Verified Athlete on LinkUp.`, true));
  } catch (error) {
    return res.status(500).send(adminPage('Server error', false));
  }
});

// Athlete verification — GET /api/admin/verify/:userId/reject?token=...
router.get('/verify/:userId/reject', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send(adminPage('Missing token', false));
    let payload;
    try { payload = jwt.verify(token, ADMIN_SECRET); } catch {
      return res.status(401).send(adminPage('Invalid or expired link', false));
    }
    if (payload.action !== 'reject' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).send(adminPage('User not found', false));
    if (user.verificationStatus === 'rejected') return res.send(adminPage('Already rejected ✓', true));
    user.verificationStatus = 'rejected';
    await user.save({ validateBeforeSave: false });
    return res.send(adminPage(`${user.name}'s verification request has been rejected.`, true));
  } catch (error) {
    return res.status(500).send(adminPage('Server error', false));
  }
});

// GET /api/admin/verify/:userId/clarify?token=... — shows the clarification form
router.get('/verify/:userId/clarify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(adminPage('Missing token', false));
  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.action !== 'clarify' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
  } catch {
    return res.status(401).send(adminPage('Invalid or expired link', false));
  }
  const user = await User.findById(req.params.userId).catch(() => null);
  if (!user) return res.status(404).send(adminPage('User not found', false));

  // Show a form to type the clarification message
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Request Clarification</title></head>
<body style="font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f6f9">
<div style="background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.1);max-width:480px;width:100%">
  <h2 style="margin:0 0 8px;color:#1e3a5f">Request Clarification</h2>
  <p style="color:#6b7280;margin:0 0 24px">Send a message to <strong>${user.name}</strong> (${user.email}) asking for more information.</p>
  <form method="POST" action="/api/admin/verify/${req.params.userId}/clarify?token=${token}">
    <textarea name="message" placeholder="e.g. Could you please provide your roster URL or a photo of your student-athlete ID?"
      style="width:100%;min-height:120px;padding:12px;border:2px solid #e5e7eb;border-radius:8px;font-size:14px;font-family:Arial,sans-serif;resize:vertical;box-sizing:border-box" required></textarea>
    <button type="submit" style="margin-top:16px;width:100%;padding:14px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer">
      Send Clarification Request
    </button>
  </form>
</div></body></html>`);
});

// POST /api/admin/verify/:userId/clarify?token=... — sends the message to the user
router.post('/verify/:userId/clarify', express.urlencoded({ extended: false }), async (req, res) => {
  const { token } = req.query;
  const { message } = req.body;
  if (!token) return res.status(400).send(adminPage('Missing token', false));
  if (!message?.trim()) return res.status(400).send(adminPage('Message is required', false));
  try {
    const payload = jwt.verify(token, ADMIN_SECRET);
    if (payload.action !== 'clarify' || payload.userId !== req.params.userId) {
      return res.status(400).send(adminPage('Token mismatch', false));
    }
  } catch {
    return res.status(401).send(adminPage('Invalid or expired link', false));
  }
  const user = await User.findById(req.params.userId).catch(() => null);
  if (!user) return res.status(404).send(adminPage('User not found', false));

  const { sendClarificationEmail } = require('../utils/email');
  await sendClarificationEmail({ user, message: message.trim() }).catch((err) => {
    console.error('[clarify email]', err.message);
  });
  user.verificationStatus = 'rejected';
  user.verificationNote = message.trim();
  await user.save({ validateBeforeSave: false });
  return res.send(adminPage(`Clarification request sent to ${user.name} at ${user.email}.`, true));
});

// GET /api/admin/test-email?token=<ADMIN_SECRET>&to=<optional email>
// Sends a test email via Resend and shows the result
router.get('/test-email', async (req, res) => {
  const { token, to } = req.query;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).send(adminPage('Invalid or missing admin token', false));
  }

  const cfg = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? `${process.env.RESEND_API_KEY.slice(0,8)}****` : '(not set)',
    EMAIL_FROM:     process.env.EMAIL_FROM     || '(not set — fallback: LinkUp Athletics <noreply@linkupathletics.com>)',
    ADMIN_EMAIL:    process.env.ADMIN_EMAIL    || '(not set — fallback: kelly@linkupathletics.com)',
    APP_URL:        process.env.APP_URL        || '(not set)',
  };

  const recipient = to || process.env.ADMIN_EMAIL || 'kelly@linkupathletics.com';

  let result, error;
  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM || 'LinkUp Athletics <noreply@linkupathletics.com>';
    const { data, error: sendError } = await resend.emails.send({
      from,
      to: recipient,
      subject: '✅ LinkUp Email Test — it works!',
      text: 'If you receive this, your Resend email configuration on Render is working correctly.',
    });
    if (sendError) throw new Error(sendError.message);
    result = `Email sent! Resend ID: ${data?.id}`;
  } catch (err) {
    error = err.message;
  }

  const rows = Object.entries(cfg).map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${k}</td><td style="font-family:monospace;color:#1e293b">${v}</td></tr>`
  ).join('');

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Email Test</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <h2 style="margin:0 0 20px;color:#1e3a5f">Resend Email Configuration Test</h2>

  <table style="border-collapse:collapse;width:100%;margin-bottom:24px">${rows}</table>

  <div style="padding:16px;border-radius:8px;${error
    ? 'background:#fee2e2;border-left:4px solid #dc2626'
    : 'background:#d1fae5;border-left:4px solid #16a34a'}">
    <p style="margin:0;font-weight:600;color:${error ? '#991b1b' : '#065f46'}">${error ? '❌ Failed' : '✅ Success'}</p>
    <p style="margin:6px 0 0;font-size:14px;color:${error ? '#7f1d1d' : '#064e3b'};word-break:break-all">${error || result}</p>
    ${!error ? `<p style="margin:6px 0 0;font-size:13px;color:#064e3b">Sent to: <strong>${recipient}</strong> — check your inbox (and spam folder).</p>` : ''}
  </div>

  ${error ? `<div style="margin-top:20px;padding:14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a">
    <p style="margin:0 0 8px;font-weight:600;color:#92400e;font-size:14px">Setup steps:</p>
    <ol style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.8">
      <li>Sign up at <strong>resend.com</strong></li>
      <li>Add and verify your domain <strong>linkupathletics.com</strong> (adds DNS TXT/MX records)</li>
      <li>Create an API key → copy it</li>
      <li>Set <code>RESEND_API_KEY</code> env var on Render (starts with <code>re_</code>)</li>
      <li>Set <code>EMAIL_FROM</code> to <code>LinkUp Athletics &lt;noreply@linkupathletics.com&gt;</code></li>
    </ol>
  </div>` : ''}
</div></body></html>`);
});

// GET /api/admin/test-apns?token=<ADMIN_SECRET>&deviceToken=<optional APNs device token>
// Verifies APNs env vars and optionally sends a test push notification
router.get('/test-apns', async (req, res) => {
  const { token, deviceToken } = req.query;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).send(adminPage('Invalid or missing admin token', false));
  }

  const apnKey    = process.env.APN_KEY    || '';
  const apnKeyId  = process.env.APN_KEY_ID || '';
  const apnTeamId = process.env.APN_TEAM_ID || '';
  const nodeEnv   = process.env.NODE_ENV || 'development';

  const cfg = {
    APN_KEY:     apnKey    ? `${apnKey.slice(0, 27).replace(/\n/g, '\\n')}… (${apnKey.length} chars)` : '(not set)',
    APN_KEY_ID:  apnKeyId  || '(not set)',
    APN_TEAM_ID: apnTeamId || '(not set)',
    NODE_ENV:    nodeEnv,
    APNs_env:    nodeEnv === 'production' ? 'production gateway' : 'sandbox gateway',
  };

  let providerOk = false;
  let providerError = null;
  let pushResult = null;
  let pushError = null;

  if (apnKey && apnKeyId && apnTeamId) {
    try {
      const apn = require('node-apn');
      const rawKey = apnKey.replace(/\\n/g, '\n').trim();
      const key = rawKey.includes('-----BEGIN') ? rawKey : `-----BEGIN PRIVATE KEY-----\n${rawKey}\n-----END PRIVATE KEY-----`;
      const testProvider = new apn.Provider({
        token: { key, keyId: apnKeyId, teamId: apnTeamId },
        production: nodeEnv === 'production',
      });
      providerOk = true;

      if (deviceToken) {
        try {
          const note = new apn.Notification();
          note.expiry = Math.floor(Date.now() / 1000) + 3600;
          note.badge = 1;
          note.sound = 'default';
          note.alert = { title: 'APNs Test', body: 'Push notifications are working!' };
          note.topic = 'com.linkupathletics.nextgen';
          const result = await testProvider.send(note, [deviceToken]);
          if (result.failed?.length) {
            pushError = `Failed: ${JSON.stringify(result.failed[0].response)}`;
          } else {
            pushResult = `Sent successfully to ${result.sent?.length || 1} device(s)`;
          }
        } catch (err) {
          pushError = err.message;
        }
      }

      testProvider.shutdown();
    } catch (err) {
      providerError = err.message;
    }
  }

  const rows = Object.entries(cfg).map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#666;white-space:nowrap">${k}</td><td style="font-family:monospace;color:#1e293b;word-break:break-all">${v}</td></tr>`
  ).join('');

  const missingVars = [
    !apnKey    && 'APN_KEY (paste .p8 file contents)',
    !apnKeyId  && 'APN_KEY_ID (10-char ID from Apple Developer)',
    !apnTeamId && 'APN_TEAM_ID (10-char Team ID from Apple Developer)',
  ].filter(Boolean);

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>APNs Test</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <h2 style="margin:0 0 20px;color:#1e3a5f">APNs Push Notification Test</h2>

  <table style="border-collapse:collapse;width:100%;margin-bottom:24px">${rows}</table>

  <div style="padding:16px;border-radius:8px;margin-bottom:16px;${providerOk
    ? 'background:#d1fae5;border-left:4px solid #16a34a'
    : 'background:#fee2e2;border-left:4px solid #dc2626'}">
    <p style="margin:0;font-weight:600;color:${providerOk ? '#065f46' : '#991b1b'}">${providerOk ? '✅ APNs provider initialised successfully' : '❌ Provider init failed'}</p>
    ${providerError ? `<p style="margin:6px 0 0;font-size:14px;color:#7f1d1d">${providerError}</p>` : ''}
  </div>

  ${providerOk && deviceToken ? `
  <div style="padding:16px;border-radius:8px;margin-bottom:16px;${pushResult
    ? 'background:#d1fae5;border-left:4px solid #16a34a'
    : 'background:#fee2e2;border-left:4px solid #dc2626'}">
    <p style="margin:0;font-weight:600;color:${pushResult ? '#065f46' : '#991b1b'}">${pushResult ? '✅ Test push sent' : '❌ Push failed'}</p>
    <p style="margin:6px 0 0;font-size:14px;color:${pushResult ? '#064e3b' : '#7f1d1d'}">${pushResult || pushError}</p>
  </div>` : ''}

  ${missingVars.length ? `<div style="margin-top:16px;padding:14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a">
    <p style="margin:0 0 8px;font-weight:600;color:#92400e;font-size:14px">Missing environment variables on Render:</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.8">
      ${missingVars.map(v => `<li><code>${v}</code></li>`).join('')}
    </ul>
    <p style="margin:10px 0 0;font-size:13px;color:#78350f">Set these in Render → your service → Environment → Add environment variable.</p>
  </div>` : ''}

  ${providerOk && !deviceToken ? `<div style="margin-top:16px;padding:14px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd">
    <p style="margin:0;font-size:13px;color:#0c4a6e">To send a test push, append <code>&amp;deviceToken=DEVICE_TOKEN_HERE</code> to this URL.<br>You can find your device token in the app's notification settings or Xcode console logs.</p>
  </div>` : ''}
</div></body></html>`);
});

// GET /api/admin/sessions-debug?token=<ADMIN_SECRET>&sport=Basketball
// Shows open sessions and simulates the exact getAvailableSessions query
router.get('/sessions-debug', async (req, res) => {
  const { token, sport } = req.query;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const Session = require('../models/Session');

  // Raw open sessions (no filters)
  const all = await Session.find({ status: 'open' })
    .populate('postedBy', 'name sport location')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Simulate the actual getAvailableSessions query for given sport
  let simulated = null;
  if (sport) {
    const simQuery = {
      status: 'open',
      $or: [{ source: 'athletics' }, { source: { $exists: false } }, { source: null }],
      sport: { $regex: sport, $options: 'i' },
    };
    const simResults = await Session.find(simQuery)
      .populate('postedBy', 'name sport')
      .sort({ createdAt: -1 })
      .lean();
    simulated = { query: simQuery, count: simResults.length, sessions: simResults.map(s => ({ _id: s._id, sport: s.sport, source: s.source, postedBy: s.postedBy?.name })) };
  }

  res.json({
    totalOpen: all.length,
    sessions: all.map(s => ({
      _id: s._id,
      sport: s.sport,
      source: s.source ?? '(null/missing)',
      status: s.status,
      postedBy: s.postedBy?.name,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    ...(simulated ? { simulated } : {}),
  });
});

// POST /api/admin/reset-password
// Body: { email, newPassword, adminSecret }
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, adminSecret } = req.body;
  if (!adminSecret || adminSecret !== ADMIN_SECRET) {
    return res.status(401).json({ message: 'Invalid admin secret' });
  }
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'email and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: `No user found with email: ${email}` });
    user.password = newPassword;
    await user.save();
    res.json({ message: `Password reset for ${user.name} (${user.email})` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admin/push-debug?token=<ADMIN_SECRET>&email=<email>
// Shows device tokens for a user and optionally sends a test push
router.get('/push-debug', async (req, res) => {
  const { token, email } = req.query;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!email) {
    return res.status(400).json({ message: 'email query param required' });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const tokens = user.deviceTokens || [];
  let pushResults = null;

  if (tokens.length > 0) {
    try {
      const { sendPush } = require('../utils/pushNotification');
      pushResults = await sendPush(tokens, {
        title: 'LinkUp Test',
        body: 'Push notifications are working!',
        data: { type: 'test' },
      });
    } catch (err) {
      pushResults = { error: err.message };
    }
  }

  res.json({
    name: user.name,
    email: user.email,
    deviceTokenCount: tokens.length,
    deviceTokens: tokens.map(t => `${t.slice(0, 12)}...${t.slice(-6)}`),
    pushSent: tokens.length > 0,
    pushResults,
  });
});

module.exports = router;
