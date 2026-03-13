const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs   = require('fs');

const VISION_URL =
  'https://vision.googleapis.com/v1/images:annotate';

// Lazy GoogleAuth instance — built on first request so Vercel cold-start never
// crashes even if credentials are missing.
let _auth = null;

function getAuth() {
  if (_auth) return _auth;

  // Priority 1: full service-account JSON in env var (Vercel-friendly).
  // Vercel dashboard → Settings → Environment Variables → GOOGLE_CREDENTIALS_JSON
  // Value: paste the entire contents of the JSON key file (minified, single line).
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      // Fix double-escaped newlines in private_key (common when storing JSON in env vars)
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      _auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      return _auth;
    } catch (e) {
      console.error('[visionService] Failed to parse GOOGLE_CREDENTIALS_JSON:', e.message);
      // Fall through to next priority
    }
  }

  // Priority 2: key file on disk (local development)
  const keyPath = path.join(
    __dirname,
    '../config/gen-lang-client-0410661056-a77b695b2532.json'
  );
  if (fs.existsSync(keyPath)) {
    _auth = new GoogleAuth({
      keyFilename: keyPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return _auth;
  }

  // Priority 3: GOOGLE_APPLICATION_CREDENTIALS env var (standard GCP ADC)
  _auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return _auth;
}

/**
 * Run Google Cloud Vision text detection via REST API (no gRPC / native modules).
 * @param {Buffer} imageBuffer - Raw image bytes (from multer memoryStorage)
 * @returns {Promise<string>} - Full detected text, or empty string if nothing found
 */
async function detectText(imageBuffer) {
  const auth  = getAuth();
  const token = await auth.getAccessToken();

  const body = JSON.stringify({
    requests: [
      {
        image: { content: imageBuffer.toString('base64') },
        features: [{ type: 'TEXT_DETECTION' }],
      },
    ],
  });

  const res = await fetch(VISION_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision API error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const annotations =
    json.responses?.[0]?.textAnnotations;

  if (annotations && annotations.length > 0) {
    return annotations[0].description;
  }

  return '';
}

module.exports = detectText;

