const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');

const Session = require('../models/Session');

// Helper to fetch upstream ML score
const ML_BASE = process.env.BHV_API_URL || 'https://bhv-api.nw-right.dev';
function authHeaders() {
  return {
    'Content-Type':              'application/json',
    'X-API-Key':                 (process.env.BHV_API_KEY || '').trim().replace(/^['"]|['"]$/g, ''),
    'CF-Access-Client-Id':       (process.env.CF_ACCESS_CLIENT_ID || '').trim().replace(/^['"]|['"]$/g, ''),
    'CF-Access-Client-Secret':   (process.env.CF_ACCESS_CLIENT_SECRET || '').trim().replace(/^['"]|['"]$/g, ''),
  };
}

// POST /api/otp/generate — Generate 4-digit OTP, store in DB, and output to server console
router.post('/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    // Generate random 4-digit number
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Clean up any existing OTPs for this user first
    await Otp.deleteMany({ userId });

    const newOtp = new Otp({ userId, otp: randomOtp });
    await newOtp.save();

    console.log(`\n==========================================\n[SECURITY ALERT] Generated OTP for user ${userId}: ${randomOtp}\n==========================================\n`);

    res.json({ success: true, message: 'OTP generated successfully', otp: randomOtp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/otp/verify — Verify submitted OTP code + behavioral telemetry
router.post('/verify', async (req, res) => {
  try {
    const { userId, code, behaviorReport } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, error: 'Missing userId or code' });
    }

    const foundRecord = await Otp.findOne({ userId });
    if (!foundRecord) {
      return res.status(400).json({ success: false, error: 'OTP expired or not found' });
    }

    if (foundRecord.otp !== String(code).trim()) {
      foundRecord.attempts += 1;
      await foundRecord.save();

      if (foundRecord.attempts >= 3) {
        await Otp.deleteOne({ _id: foundRecord._id });
        return res.status(403).json({
          success: false,
          locked: true,
          error: 'Too many failed attempts. Access locked.'
        });
      }

      return res.status(400).json({
        success: false,
        attemptsRemaining: 3 - foundRecord.attempts,
        error: 'Invalid OTP code'
      });
    }

    // ─── BEHAVIORAL MULTI-FACTOR VALIDATION ──────────────────
    if (behaviorReport) {
      let isAnomaly = false;
      let mlScore = 0;

      // 1. Try ML model check on the OTP input behavior
      try {
        const hasCredentials = process.env.BHV_API_KEY && process.env.CF_ACCESS_CLIENT_ID;
        if (hasCredentials) {
          const upstream = await fetch(`${ML_BASE}/predict`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              userId,
              keystroke_avg_ms: behaviorReport.keystroke_avg_ms || 0,
              touch_pressure_avg: behaviorReport.touch_pressure_avg || 0.5,
              swipe_avg_px_per_sec: behaviorReport.swipe_avg_px_per_sec || 0,
              scroll_rhythm_ms: behaviorReport.touch_avg_duration_ms || 0,
              accelerometer_avg_variance: parseFloat(behaviorReport.accelerometer_avg_variance) || 0,
            }),
          });
          const mlResult = await upstream.json();
          mlScore = mlResult.score || 0;
          if (mlResult.is_anomaly || mlScore > 0.8) {
            isAnomaly = true;
            console.log(`[OTP SECURITY] ML flagged OTP typing as anomalous. Score: ${mlScore}`);
          }
        }
      } catch (err) {
        console.log('[OTP SECURITY] ML check failed, falling back to database statistical engine:', err.message);
      }

      // 2. Statistical Z-Score check on the server using historical DB sessions
      if (!isAnomaly) {
        try {
          const historicalSessions = await Session.find({ userId }).sort({ timestamp: -1 }).limit(10);
          if (historicalSessions.length >= 3) {
            const keystrokeVals = historicalSessions.map(s => s.keystroke_avg_ms).filter(v => v != null);
            if (keystrokeVals.length >= 3 && behaviorReport.keystroke_avg_ms) {
              const avg = keystrokeVals.reduce((a, b) => a + b, 0) / keystrokeVals.length;
              const variance = keystrokeVals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / keystrokeVals.length;
              const stdDev = Math.max(Math.sqrt(variance), 100); // 100ms floor to prevent false triggers
              const zScore = Math.abs(behaviorReport.keystroke_avg_ms - avg) / stdDev;
              console.log(`[OTP SECURITY] Server-side keystroke Z-score for OTP input: ${zScore.toFixed(2)}`);

              if (zScore > 3.0) { // 3.0 Z-score threshold for server-side OTP lockdown
                isAnomaly = true;
                console.log(`[OTP SECURITY] Z-score flagged OTP typing as anomalous. Z: ${zScore.toFixed(2)}`);
              }
            }
          }
        } catch (err) {
          console.log('[OTP SECURITY] Statistical check failed:', err.message);
        }
      }

      // If behavior was anomalous, lock the transaction/account
      if (isAnomaly) {
        return res.status(403).json({
          success: false,
          locked: true,
          error: 'Identity mismatch detected during OTP typing. Access locked.'
        });
      }
    }

    // OTP matched and behavior verified successfully, delete it so it can't be reused
    await Otp.deleteOne({ _id: foundRecord._id });

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.log('Error verifying OTP:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
