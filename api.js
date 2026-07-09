// =============================================================================
//  BehaviorVault — Mobile API client
//  =============================================================================
//  Talks ONLY to his own backend (BASE_URL). The ML scoring API lives behind
//  the backend, so secrets never end up bundled in the mobile app.
//
//  Mobile  →  BASE_URL (Node.js)  →  bhv-api.nw-right.dev (Flask)
//                                    ↑ all auth headers added here
// =============================================================================

const BASE_URL = 'https://behaviorvault-api.onrender.com';

// ─── PURE JAVASCRIPT CRYPTO IMPLEMENTATION (HMAC-SHA256) ───
// Module-level cache (Hermes engine treats function properties as read-only)
let _sha256_h = null;
let _sha256_k = null;

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i, j;
  let result = '';
  const words = [];
  const asciiLength = ascii.length * 8;

  // Initialize hash values and round constants from primes (cached after first call)
  if (!_sha256_h) {
    _sha256_h = [];
    _sha256_k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = 1;
        }
        if (primeCounter < 8) {
          _sha256_h[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        }
        _sha256_k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter++;
      }
    }
  }

  // Copy initial hash values (so we don't mutate the cache)
  let hash = _sha256_h.slice();
  const k = _sha256_k;

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words.length] = ((asciiLength / maxWord) | 0);
  words[words.length] = (asciiLength | 0);

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const a = hash[0], e = hash[4];
      const temp1 = hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    let byteVal = hash[i];
    if (byteVal < 0) byteVal += maxWord;
    let hexStr = byteVal.toString(16);
    while (hexStr.length < 8) hexStr = '0' + hexStr;
    result += hexStr;
  }
  return result;
}

function hexToString(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

function hmacSHA256(message, key) {
  const blockSize = 64;
  if (key.length > blockSize) {
    key = sha256(key);
  }
  let ipad = '';
  let opad = '';
  for (let i = 0; i < blockSize; i++) {
    const charCode = i < key.length ? key.charCodeAt(i) : 0;
    ipad += String.fromCharCode(charCode ^ 0x36);
    opad += String.fromCharCode(charCode ^ 0x5c);
  }
  const innerHash = hexToString(sha256(ipad + message));
  return sha256(opad + innerHash);
}

// ─── TIMEOUT WRAPPER — prevents hanging forever ───────────
const fetchWithTimeout = (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

// ─── BEHAVIOR LOGGING (unchanged — talks to own backend) ──
export const logBehavior = async (report, anomalyResult, userId = 'anonymous') => {
  try {
    // 1. Request a one-time nonce from the backend
    const nonceRes = await fetchWithTimeout(`${BASE_URL}/api/behavior/nonce`, { method: 'GET' });
    const nonceData = await nonceRes.json();
    const nonce = nonceData?.nonce;

    if (!nonce) {
      console.log('Security error: Could not fetch validation nonce from backend');
      return null;
    }

    const keystroke = report.keystroke_avg_ms;
    const swipe = report.swipe_avg_px_per_sec;
    const touch = report.touch_avg_duration_ms;
    const accelVal = parseFloat(report.accelerometer_avg_variance);
    const accel = isNaN(accelVal) ? null : accelVal;
    const uId = userId || 'demo_user';

    const sanitize = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '';
      return val;
    };

    // 2. Generate signature of data parameters + nonce using the telemetry secret key
    const dataToSign = `${uId}:${sanitize(keystroke)}:${sanitize(swipe)}:${sanitize(touch)}:${sanitize(accel)}:${nonce}`;
    const TELEMETRY_SECRET = 'bv_secret_key_2026';
    const signature = hmacSHA256(dataToSign, TELEMETRY_SECRET);

    // 3. Post telemetry data with nonce and signature validation
    const response = await fetchWithTimeout(`${BASE_URL}/api/behavior/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: uId,
        keystroke_avg_ms: keystroke,
        swipe_avg_px_per_sec: swipe,
        touch_avg_duration_ms: touch,
        accelerometer_avg_variance: accel,
        anomaly_score: anomalyResult?.score || 0,
        is_anomaly: anomalyResult?.isAnomaly || false,
        duress_flag: report.duress_flag,
        device_type: 'mobile',
        nonce,
        signature,
      }),
    });
    const data = await response.json();
    console.log('Behavior logged to backend:', data.session_id);
    return data;
  } catch (err) {
    console.log('Backend log error:', err.message);
    return null;
  }
};

// ─── DURESS ALERT (unchanged — talks to own backend) ──────
export const sendDuressAlert = async (variance, amount, beneficiary, userId = 'anonymous') => {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/duress/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        alert_type: 'movement',
        accelerometer_variance: variance,
        transaction_amount: amount || 0,
        beneficiary: beneficiary || 'unknown',
        is_new_beneficiary: true,
      }),
    });
    const data = await response.json();
    console.log('Duress alert sent — escrow:', data.escrow_active);
    return data;
  } catch (err) {
    console.log('Duress alert error:', err.message);
    return null;
  }
};

// ─── ML SCORE (REWRITTEN) ─────────────────────────────────
//   Now goes through our backend, not the ML API directly.
//   The backend at /api/ml/predict proxies to Flask with the
//   X-API-Key + Cloudflare Access headers attached server-side.
//   No secrets in the mobile bundle.
export const getMLScore = async (report, userId = 'anonymous') => {
  // Sanitize: ensure every feature is a valid number (0 = "no activity this session")
  const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

  try {
    const response = await fetchWithTimeout(`${BASE_URL}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        keystroke_avg_ms:           num(report.keystroke_avg_ms),
        touch_pressure_avg:         num(report.touch_pressure_avg) || 0.5,  // TODO: measure for real
        swipe_avg_px_per_sec:       num(report.swipe_avg_px_per_sec),
        scroll_rhythm_ms:           num(report.touch_avg_duration_ms),
        accelerometer_avg_variance: num(parseFloat(report.accelerometer_avg_variance)),
      }),
    });

    if (!response.ok) {
      console.log(`ML score error: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(
      `TFLite ML — score: ${data.score} | confidence: ${data.confidence_pct}%`
      + ` | level: ${data.level}`
    );

    return {
      score:          data.score,            // 0.0–1.0
      confidencePct:  data.confidence_pct,   // 0–100, safe to display
      isAnomaly:      data.is_anomaly,
      learning:       data.warmup_remaining > 0,
      duress:         data.score > 0.8 && report.duress_flag,
      level:          data.level,
    };
  } catch (err) {
    console.log('ML score error:', err.message);
    return null;
  }
};

// ─── BACKEND HEALTH CHECK ─────────────────────────────────
export const checkBackendHealth = async () => {
  try {
    const response = await fetchWithTimeout(`${BASE_URL}/`, {
      method: 'GET',
    }, 3000);
    return response.ok;
  } catch (err) {
    return false;
  }
};