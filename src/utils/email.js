const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendAdminRatingReviewEmail({ rating, raterName, rateeName, approveUrl, rejectUrl }) {
  const transport = createTransport();
  const stars = '★'.repeat(rating.overallRating) + '☆'.repeat(5 - rating.overallRating);
  const categories = rating.categories || {};
  const catRows = Object.entries({
    'Skill Level': categories.skillLevel,
    Punctuality: categories.punctuality,
    Communication: categories.communication,
    Attitude: categories.attitude,
  })
    .filter(([, v]) => v != null)
    .map(([label, val]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td><strong>${val}/5</strong></td></tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">⭐ New Rating Awaiting Review</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px">LinkUp Athletics — Admin Review Required</p>
    </div>

    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666;width:120px">Submitted by</td>
          <td><strong>${raterName}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Rated user</td>
          <td><strong>${rateeName}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Overall</td>
          <td><span style="font-size:18px;color:#f59e0b">${stars}</span> <strong>${rating.overallRating}/5</strong></td>
        </tr>
        ${rating.sport ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Sport</td><td>${rating.sport}</td></tr>` : ''}
        ${rating.wouldTrainAgain != null ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Train again?</td><td>${rating.wouldTrainAgain ? '✅ Yes' : '❌ No'}</td></tr>` : ''}
      </table>

      ${catRows ? `<table style="border-collapse:collapse;margin-bottom:20px">${catRows}</table>` : ''}

      ${rating.feedback ? `
      <div style="background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Feedback</p>
        <p style="margin:0;color:#1e293b;line-height:1.5">${rating.feedback.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>` : ''}

      <p style="color:#374151;margin-bottom:16px">Please review the rating above and take an action:</p>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding-right:8px">
            <a href="${approveUrl}" style="display:block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;padding:14px;border-radius:8px;font-weight:600;font-size:15px">
              ✅ Approve Rating
            </a>
          </td>
          <td style="padding-left:8px">
            <a href="${rejectUrl}" style="display:block;text-align:center;background:#dc2626;color:#fff;text-decoration:none;padding:14px;border-radius:8px;font-weight:600;font-size:15px">
              ↩ Send Back / Reject
            </a>
          </td>
        </tr>
      </table>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">
        These links expire in 7 days. LinkUp Athletics Admin Panel.
      </p>
    </div>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: `"LinkUp Athletics" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL || 'kelly@linkupathletics.com',
    subject: `[Review Needed] ${raterName} rated ${rateeName} — ${rating.overallRating}/5 stars`,
    html,
  });
}

async function sendVerificationEmail({ user, approveUrl, clarifyUrl }) {
  const transport = createTransport();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">🔍 New Verification Request</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px">LinkUp Athletics — Athlete Verification</p>
    </div>

    <div style="padding:28px 32px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666;width:120px">Name</td>
          <td><strong>${user.name}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Email</td>
          <td>${user.email}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">School</td>
          <td>${user.school || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Sport</td>
          <td>${user.sport || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Level</td>
          <td>${user.skillLevel || '—'}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">Position</td>
          <td>${user.position || '—'}</td>
        </tr>
        ${user.ngbMemberId ? `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#666">NGB Member ID</td>
          <td><strong>${user.ngbMemberId}</strong></td>
        </tr>` : ''}
      </table>

      ${user.verificationRosterUrl ? `
      <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:16px">
        <p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Roster Page Link</p>
        <a href="${user.verificationRosterUrl}" style="color:#2563eb;word-break:break-all">${user.verificationRosterUrl}</a>
      </div>` : ''}

      ${user.verificationNote ? `
      <div style="background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px">Additional Info</p>
        <p style="margin:0;color:#1e293b;line-height:1.5">${user.verificationNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>` : ''}

      <p style="color:#374151;margin-bottom:16px">Review the athlete's credentials:</p>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding-right:8px">
            <a href="${approveUrl}" style="display:block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;padding:14px;border-radius:8px;font-weight:600;font-size:15px">
              ✅ Approve
            </a>
          </td>
          <td style="padding-left:8px">
            <a href="${clarifyUrl}" style="display:block;text-align:center;background:#d97706;color:#fff;text-decoration:none;padding:14px;border-radius:8px;font-weight:600;font-size:15px">
              ✏️ Request Clarification
            </a>
          </td>
        </tr>
      </table>

      <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">
        These links expire in 30 days. LinkUp Athletics Admin Panel.
      </p>
    </div>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: `"LinkUp Athletics" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL || 'kelly@linkupathletics.com',
    subject: `[Verify] ${user.name} — ${user.sport || 'Athlete'} (${user.skillLevel || 'Unknown Level'})`,
    html,
  });
}

async function sendPasswordResetEmail({ toEmail, toName, resetUrl }) {
  const transport = createTransport();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">Password Reset Request</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px">LinkUp Athletics</p>
    </div>

    <div style="padding:28px 32px">
      <p style="color:#374151;margin-bottom:16px">Hi ${toName || 'there'},</p>
      <p style="color:#374151;margin-bottom:24px">
        We received a request to reset the password for your LinkUp Athletics account.
        Click the button below to choose a new password.
      </p>

      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:24px">
        Reset My Password
      </a>

      <p style="color:#6b7280;font-size:13px;margin-bottom:8px">
        This link expires in <strong>1 hour</strong>.
      </p>
      <p style="color:#6b7280;font-size:13px;margin-bottom:0">
        If you didn't request a password reset, you can safely ignore this email — your password won't change.
      </p>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">
        LinkUp Athletics · <a href="https://linkup-swpu.onrender.com/privacy.html" style="color:#9ca3af">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: `"LinkUp Athletics" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Reset your LinkUp Athletics password',
    html,
  });
}

async function sendClarificationEmail({ user, message }) {
  const transport = createTransport();
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">Action Required — Verification</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px">LinkUp Athletics</p>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#374151;margin-bottom:16px">Hi ${user.name},</p>
      <p style="color:#374151;margin-bottom:20px">We're reviewing your LinkUp Athletics account and need a bit more information to verify your college team membership:</p>
      <div style="background:#fffbeb;border-left:3px solid #d97706;border-radius:0 8px 8px 0;padding:16px;margin-bottom:24px">
        <p style="margin:0;color:#1e293b;line-height:1.6">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
      </div>
      <p style="color:#374151;margin-bottom:8px">Please reply to this email with the requested information and we'll complete your verification as soon as possible.</p>
      <p style="color:#6b7280;font-size:13px">Questions? Reply to this email or contact us at support@linkupathletics.com</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center">LinkUp Athletics · <a href="https://linkup-swpu.onrender.com/privacy.html" style="color:#9ca3af">Privacy Policy</a></p>
    </div>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: `"LinkUp Athletics" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: 'Action Required — Complete Your LinkUp Athletics Verification',
    html,
  });
}

module.exports = { sendAdminRatingReviewEmail, sendVerificationEmail, sendPasswordResetEmail, sendClarificationEmail };
