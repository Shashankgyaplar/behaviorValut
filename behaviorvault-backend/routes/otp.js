const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');

// POST /api/otp/generate — Generate 6-digit OTP, store in DB, and output to server console
router.post('/generate', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    // Generate random 6-digit number
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up any existing OTPs for this user first
    await Otp.deleteMany({ userId });

    const newOtp = new Otp({ userId, otp: randomOtp });
    await newOtp.save();

    console.log(`\n==========================================\n[SECURITY ALERT] Generated OTP for user ${userId}: ${randomOtp}\n==========================================\n`);

    res.json({ success: true, message: 'OTP generated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/otp/verify — Verify submitted OTP code
router.post('/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ success: false, error: 'Missing userId or code' });
    }

    const foundRecord = await Otp.findOne({ userId });
    if (!foundRecord) {
      return res.status(400).json({ success: false, error: 'OTP expired or not found' });
    }

    if (foundRecord.otp !== String(code).trim()) {
      return res.status(400).json({ success: false, error: 'Invalid OTP code' });
    }

    // OTP matched successfully, delete it so it can't be reused
    await Otp.deleteOne({ _id: foundRecord._id });

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
