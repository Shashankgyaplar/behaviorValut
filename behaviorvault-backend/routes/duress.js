const express = require('express');
const router = express.Router();
const DuressAlert = require('../models/DuressAlert');
const Session = require('../models/Session');

// POST /api/duress/alert — silent SOS from app
router.post('/alert', async (req, res) => {
  try {
    const {
      userId,
      alert_type,
      accelerometer_variance,
      transaction_amount,
      beneficiary,
      is_new_beneficiary,
    } = req.body;

    const alert = new DuressAlert({
      userId: userId || 'demo_user',
      alert_type: alert_type || 'movement',
      accelerometer_variance,
      transaction_amount,
      beneficiary,
      is_new_beneficiary,
      shadow_escrow_active: true, // always activate escrow on duress
    });

    await alert.save();

    // Log a corresponding session event so it is visible in the Consent Cockpit dashboard
    const session = new Session({
      userId: userId || 'demo_user',
      keystroke_avg_ms: 0,
      swipe_avg_px_per_sec: 0,
      touch_avg_duration_ms: 0,
      accelerometer_avg_variance: accelerometer_variance || 0,
      anomaly_score: 0.5, // Duress triggers an elevated state
      is_anomaly: false,
      duress_flag: true,
      device_type: 'mobile',
    });

    await session.save();

    console.log('DURESS ALERT received for user:', userId);
    console.log('Shadow escrow activated — funds held');

    // in production: send SMS/email to bank fraud team here

    res.json({
      success: true,
      message: 'Alert received',
      // send fake success to app so attacker sees nothing
      display_message: 'Transaction Successful',
      escrow_active: true,
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;