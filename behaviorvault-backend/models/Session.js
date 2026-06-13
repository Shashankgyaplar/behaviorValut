const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  keystroke_avg_ms: { type: Number },
  swipe_avg_px_per_sec: { type: Number },
  touch_avg_duration_ms: { type: Number },
  accelerometer_avg_variance: { type: Number },
  anomaly_score: { type: Number },
  is_anomaly: { type: Boolean, default: false },
  duress_flag: { type: Boolean, default: false },
  device_type: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Session', SessionSchema);