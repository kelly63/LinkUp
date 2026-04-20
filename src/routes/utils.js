const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const router = express.Router();

function fetchUrl(urlStr, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(urlStr); } catch { return reject(new Error('Invalid URL')); }

    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkUpBot/1.0)' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : `${parsed.protocol}//${parsed.hostname}${res.headers.location}`;
          res.resume();
          return resolve(fetchUrl(next, redirects + 1));
        }
        let html = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          html += chunk;
          if (html.length > 100_000) req.destroy();
        });
        res.on('end', () => resolve(html));
      }
    );
    req.setTimeout(8000, () => req.destroy());
    req.on('error', reject);
  });
}

function extractMeta(html, baseUrl) {
  const og = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
    return m ? m[1].trim() : null;
  };
  const meta = (name) => {
    const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
    return m ? m[1].trim() : null;
  };
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  const title = og('title') || meta('title') || (titleMatch ? titleMatch[1].trim() : null);
  const description = og('description') || meta('description');
  let image = og('image');

  if (image && image.startsWith('/')) {
    try { const u = new URL(baseUrl); image = `${u.protocol}//${u.hostname}${image}`; } catch {}
  }

  const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
  let favicon = faviconMatch ? faviconMatch[1] : null;
  if (favicon && favicon.startsWith('/')) {
    try { const u = new URL(baseUrl); favicon = `${u.protocol}//${u.hostname}${favicon}`; } catch {}
  }

  return { title, description, image, favicon };
}

// GET /api/utils/link-preview?url=https://...
router.get('/link-preview', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'url query param required' });

  try {
    new URL(url); // validate
  } catch {
    return res.status(400).json({ message: 'Invalid URL' });
  }

  try {
    const html = await fetchUrl(url);
    const meta = extractMeta(html, url);
    const parsed = new URL(url);
    res.json({ ...meta, domain: parsed.hostname.replace(/^www\./, '') });
  } catch (err) {
    res.status(422).json({ message: 'Could not fetch preview', error: err.message });
  }
});

module.exports = router;
