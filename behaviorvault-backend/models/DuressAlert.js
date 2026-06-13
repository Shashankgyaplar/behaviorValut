const mongoose = require('mongoose');

const DuressAlertSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  alert_type: {
    type: String,
    enum: ['movement', 'behavioral', 'time_location', 'combined'],
    default: 'movement'
  },
  accelerometer_variance: { type: Number },
  transaction_amount: { type: Number },
  beneficiary: { type: String },
  is_new_beneficiary: { type: Boolean, default: false },
  shadow_escrow_active: { type: Boolean, default: false },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DuressAlert', DuressAlertSchema);