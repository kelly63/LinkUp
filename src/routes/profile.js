const express = require('express');
const router = express.Router();

router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const appSchemeUrl = `linkupathletics://profile/${userId}`;
  const appStoreUrl = process.env.APP_STORE_URL || 'https://apps.apple.com/us/search?term=linkup+athletics';

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>LinkUp Athletics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: white;
      text-align: center;
      padding: 32px 24px;
    }
    .logo {
      width: 96px;
      height: 96px;
      border-radius: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .sub { color: #94a3b8; font-size: 16px; margin-bottom: 40px; }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .status { color: #94a3b8; font-size: 14px; margin-bottom: 40px; }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 17px;
      box-shadow: 0 4px 16px rgba(37,99,235,0.4);
    }
    .tagline { color: #475569; font-size: 13px; margin-top: 24px; }
  </style>
  <script>
    (function() {
      var appUrl = '${appSchemeUrl}';
      var storeUrl = '${appStoreUrl}';
      var start = Date.now();

      // Try to open the app
      window.location = appUrl;

      // If we're still here after 1.8s the app isn't installed — go to App Store
      var timer = setTimeout(function() {
        window.location = storeUrl;
      }, 1800);

      // If the page goes hidden the app opened — cancel the redirect
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) clearTimeout(timer);
      });
    })();
  </script>
</head>
<body>
  <img class="logo" src="https://i.imgur.com/LnXJJ04.png" alt="LinkUp Athletics" />
  <h1>LinkUp Athletics</h1>
  <p class="sub">The athlete connection platform</p>
  <div class="spinner"></div>
  <p class="status">Opening profile in app...</p>
  <a class="btn" href="${appStoreUrl}">Download on the App Store</a>
  <p class="tagline">LinkUp. Level Up.</p>
</body>
</html>`);
});

module.exports = router;
