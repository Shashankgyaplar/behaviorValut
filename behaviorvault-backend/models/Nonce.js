const mongoose = require('mongoose');

const NonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-delete nonces after 5 minutes (300 seconds)
});

module.exports = mongoose.model('Nonce', NonceSchema);
