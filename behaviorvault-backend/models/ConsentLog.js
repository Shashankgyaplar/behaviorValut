const mongoose = require('mongoose');

const ConsentLogSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  signals_collected: [{
    signal_type: String,
    collected_at: Date,
    purpose: String,
    dpdp_section: String,
  }],
  consent_given: { type: Boolean, default: true },
  consent_timestamp: { type: Date, default: Date.now },
  // tiered deletion flags
  behavioral_data_deleted: { type: Boolean, default: false },
  behavioral_deleted_at: { type: Date },
  // transaction data CANNOT be deleted (RBI 7-year rule)
  transaction_data_locked: { type: Boolean, default: true },
  retention_reason: {
    type: String,
    default: 'RBI PMLA mandates 7-year retention of financial transaction data'
  },
});

module.exports = mongoose.model('ConsentLog', ConsentLogSchema);