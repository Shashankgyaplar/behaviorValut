const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete OTPs after 5 minutes
});

module.exports = mongoose.model('Otp', OtpSchema);
