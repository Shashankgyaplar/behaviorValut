const express = require('express');
const router = express.Router();
const DuressAlert = require('../models/DuressAlert');

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