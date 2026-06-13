const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Session = require('../models/Session');
const Nonce = require('../models/Nonce');

const TELEMETRY_SECRET = process.env.TELEMETRY_SECRET || 'bv_secret_key_2026';

// GET /api/behavior/nonce — Generate single-use cryptographic nonce
router.get('/nonce', async (req, res) => {
  try {
    const rawNonce = crypto.randomBytes(16).toString('hex');
    const nonceObj = new Nonce({ nonce: rawNonce });
    await nonceObj.save();
    
    res.json({ success: true, nonce: rawNonce });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/behavior/log — save behavior report from app (with signature and nonce verification)
router.post('/log', async (req, res) => {
  try {
    const {
      userId,
      keystroke_avg_ms,
      swipe_avg_px_per_sec,
      touch_avg_duration_ms,
      accelerometer_avg_variance,
      anomaly_score,
      is_anomaly,
      duress_flag,
      device_type,
      nonce,
      signature
    } = req.body;

    // ─── REPLAY ATTACK PROTECTION: Validate and burn nonce ───
    if (!nonce) {
      return res.status(400).json({ success: false, error: 'Missing security nonce' });
    }
    
    const validNonce = await Nonce.findOneAndDelete({ nonce });
    if (!validNonce) {
      return res.status(403).json({ success: false, error: 'Invalid or expired nonce (Possible Replay Attack)' });
    }

    // ─── INTEGRITY PROTECTION: Verify HMAC signature ───
    if (!signature) {
      return res.status(400).json({ success: false, error: 'Missing cryptographic signature' });
    }

    const sanitize = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '';
      return val;
    };

    const dataToSign = `${userId || 'demo_user'}:${sanitize(keystroke_avg_ms)}:${sanitize(swipe_avg_px_per_sec)}:${sanitize(touch_avg_duration_ms)}:${sanitize(accelerometer_avg_variance)}:${nonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', TELEMETRY_SECRET)
      .update(dataToSign)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({ success: false, error: 'Telemetry integrity check failed' });
    }

    const session = new Session({
      userId: userId || 'demo_user',
      keystroke_avg_ms,
      swipe_avg_px_per_sec,
      touch_avg_duration_ms,
      accelerometer_avg_variance,
      anomaly_score,
      is_anomaly,
      duress_flag,
      device_type: device_type || 'mobile',
    });

    await session.save();

    console.log('Behavior logged securely for user:', userId, '| Anomaly:', is_anomaly);

    res.json({
      success: true,
      message: 'Behavior logged securely',
      session_id: session._id,
    });

  } catch (err) {
    console.log('Error logging behavior:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/behavior/sessions/:userId — get all sessions for a user
router.get('/sessions/:userId', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;