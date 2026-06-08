const https = require('https');

/**
 * Geocode a "City, State" string to {lat, lon} using Nominatim (OpenStreetMap).
 * Returns null on failure — callers should handle gracefully.
 */
async function geocodeLocation(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;
  return new Promise((resolve) => {
    const path = `/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1&countrycodes=us`;
    const req = https.get(
      { hostname: 'nominatim.openstreetmap.org', path, headers: { 'User-Agent': 'LinkUpAthletics/1.0', Accept: 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.length > 0) {
              resolve({ lat: parseFloat(parsed[0].lat), lon: parseFloat(parsed[0].lon) });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
  });
}

/**
 * Haversine distance between two lat/lon points, in miles.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { geocodeLocation, haversineDistance };
