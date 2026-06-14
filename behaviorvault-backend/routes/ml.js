// =============================================================================
//  ML Proxy Route — backend/routes/ml.js
//  =============================================================================
//  Receives ML scoring requests from the mobile app and forwards them to the
//  Flask API at bhv-api.nw-right.dev. All authentication headers are attached
//  here so the mobile app never sees them.
//
//  Mount in app.js / index.js with:
//      const mlRouter = require('./routes/ml');
//      app.use('/api/ml', mlRouter);
//
//  Required environment variables (.env):
//      BHV_API_URL                = https://bhv-api.nw-right.dev
//      BHV_API_KEY                = <key from Shashwath's Coolify env>
//      CF_ACCESS_CLIENT_ID        = <Cloudflare Zero Trust service token ID>
//      CF_ACCESS_CLIENT_SECRET    = <Cloudflare Zero Trust service token secret>
// =============================================================================

const express = require('express');
const router = express.Router();

const ML_BASE = process.env.BHV_API_URL || 'https://bhv-api.nw-right.dev';
const TIMEOUT_MS = 8000;

// Clean and retrieve env variable, stripping whitespace or surrounding quotes
function getCleanEnv(key) {
  const val = process.env[key];
  if (!val) return '';
  return val.trim().replace(/^['"]|['"]$/g, '');
}

// Warn if credentials aren't configured (so build/deploy doesn't fail).
function assertEnv() {
  const missing = ['BHV_API_KEY', 'CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET']
    .filter((v) => !process.env[v]);
  if (missing.length) {
    console.warn(
      `[ml] WARNING: Missing ML proxy env vars: ${missing.join(', ')}. ` +
      `Ensure these are set in your hosting environment (Render dashboard → Environment).`
    );
  } else {
    console.log(
      `[ml] ML proxy env vars present. ` +
      `BHV_API_KEY len: ${getCleanEnv('BHV_API_KEY').length}, ` +
      `CF_ACCESS_CLIENT_ID len: ${getCleanEnv('CF_ACCESS_CLIENT_ID').length}, ` +
      `CF_ACCESS_CLIENT_SECRET len: ${getCleanEnv('CF_ACCESS_CLIENT_SECRET').length}`
    );
  }
}
assertEnv();

// Middleware to check credentials at runtime rather than crashing on startup
const checkEnvConfigured = (req, res, next) => {
  const missing = ['BHV_API_KEY', 'CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET']
    .filter((v) => !process.env[v]);
  if (missing.length) {
    return res.status(500).json({
      error: 'ML Proxy is not configured on the server',
      details: `Missing environment variables: ${missing.join(', ')}`
    });
  }
  next();
};

// Standard auth headers attached to every upstream call
function authHeaders() {
  return {
    'Content-Type':              'application/json',
    'X-API-Key':                 getCleanEnv('BHV_API_KEY'),
    'CF-Access-Client-Id':       getCleanEnv('CF_ACCESS_CLIENT_ID'),
    'CF-Access-Client-Secret':   getCleanEnv('CF_ACCESS_CLIENT_SECRET'),
  };
}

// Helper — fetch with timeout
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── POST /api/ml/predict ────────────────────────────────────────────────
//   Proxies the body straight through, returns upstream response as-is.
//   Mobile sends features → we add auth → upstream scores → we forward.
router.post('/predict', checkEnvConfigured, async (req, res) => {
  const userId = req.body?.userId || 'anonymous';
  const t0 = Date.now();

  try {
    const upstream = await fetchWithTimeout(`${ML_BASE}/predict`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(req.body),
    });

    const data = await upstream.json();
    const ms = Date.now() - t0;
    console.log(
      `[ml] /predict user=${userId} → ${upstream.status} ` +
      `score=${data.score ?? '-'} conf=${data.confidence_pct ?? '-'}% ` +
      `level=${data.level ?? '-'} (${ms}ms)`
    );

    return res.status(upstream.status).json(data);
  } catch (err) {
    const ms = Date.now() - t0;
    if (err.name === 'AbortError') {
      console.error(`[ml] /predict user=${userId} TIMEOUT after ${ms}ms`);
      return res.status(504).json({ error: 'ML service timed out' });
    }
    console.error(`[ml] /predict user=${userId} error: ${err.message} (${ms}ms)`);
    return res.status(502).json({ error: 'ML service unreachable' });
  }
});

// ─── GET /api/ml/baseline/:userId ────────────────────────────────────────
//   View current baseline for a user (useful for debugging)
router.get('/baseline/:userId', checkEnvConfigured, async (req, res) => {
  try {
    const upstream = await fetchWithTimeout(
      `${ML_BASE}/baseline/${encodeURIComponent(req.params.userId)}`,
      { method: 'GET', headers: authHeaders() },
    );
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[ml] baseline lookup error: ${err.message}`);
    return res.status(502).json({ error: 'ML service unreachable' });
  }
});

// ─── DELETE /api/ml/baseline/:userId ─────────────────────────────────────
//   Reset a user's baseline (call this when a user resets their account
//   or when you need to clear pollution during testing)
router.delete('/baseline/:userId', checkEnvConfigured, async (req, res) => {
  try {
    const upstream = await fetchWithTimeout(
      `${ML_BASE}/baseline/${encodeURIComponent(req.params.userId)}`,
      { method: 'DELETE', headers: authHeaders() },
    );
    const data = await upstream.json();
    console.log(`[ml] baseline reset for user=${req.params.userId}`);
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[ml] baseline delete error: ${err.message}`);
    return res.status(502).json({ error: 'ML service unreachable' });
  }
});

// ─── GET /api/ml/health ──────────────────────────────────────────────────
//   Health check that confirms our backend can reach the ML API
router.get('/health', checkEnvConfigured, async (_req, res) => {
  const cleanKey = getCleanEnv('BHV_API_KEY');
  const cleanId = getCleanEnv('CF_ACCESS_CLIENT_ID');
  const cleanSecret = getCleanEnv('CF_ACCESS_CLIENT_SECRET');

  const debug = {
    BHV_API_KEY: {
      len: cleanKey.length,
      prefix: cleanKey.substring(0, 4),
      suffix: cleanKey.substring(Math.max(0, cleanKey.length - 4)),
    },
    CF_ACCESS_CLIENT_ID: {
      len: cleanId.length,
      prefix: cleanId.substring(0, 4),
      suffix: cleanId.substring(Math.max(0, cleanId.length - 4)),
    },
    CF_ACCESS_CLIENT_SECRET: {
      len: cleanSecret.length,
      prefix: cleanSecret.substring(0, 4),
      suffix: cleanSecret.substring(Math.max(0, cleanSecret.length - 4)),
    }
  };

  try {
    const upstream = await fetchWithTimeout(`${ML_BASE}/health`, {
      method:  'GET',
      headers: authHeaders(),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json({ proxy: 'ok', ml: data, debug });
  } catch (err) {
    return res.status(502).json({ proxy: 'ok', ml: 'unreachable', error: err.message, debug });
  }
});

module.exports = router;
