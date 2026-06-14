const express = require('express');
const router = express.Router();
const ConsentLog = require('../models/ConsentLog');

const resolveUserIds = (userId) => {
  const lower = String(userId).toLowerCase();
  if (lower === 'shashank' || lower === '190204') {
    return ['shashank', '190204'];
  }
  if (lower === 'shashwath' || lower === '4405') {
    return ['shashwath', '4405'];
  }
  if (lower === 'vincent' || lower === '120305') {
    return ['vincent', '120305'];
  }
  if (lower === 'shashanks' || lower === '070604') {
    return ['shashanks', '070604'];
  }
  if (lower === 'dhyan' || lower === '221104') {
    return ['dhyan', '221104'];
  }
  if (lower === 'dishan' || lower === '91104') {
    return ['dishan', '91104'];
  }
  if (lower === 'x' || lower === '4406') {
    return ['x', '4406'];
  }
  if (lower === 'pavan' || lower === '190106') {
    return ['pavan', '190106'];
  }
  if (lower === 'shetty' || lower === '201004') {
    return ['shetty', '201004'];
  }
  if (lower === 'boss' || lower === '290804') {
    return ['boss', '290804'];
  }
  return [userId];
};

// GET /api/consent/:userId — what data was collected
router.get('/:userId', async (req, res) => {
  try {
    const userIds = resolveUserIds(req.params.userId);
    let consent = await ConsentLog.findOne({ userId: { $in: userIds } });

    if (!consent) {
      // create default consent log using the requested ID
      consent = new ConsentLog({
        userId: req.params.userId,
        signals_collected: [
          {
            signal_type: 'keystroke_timing',
            collected_at: new Date(),
            purpose: 'Behavioral authentication',
            dpdp_section: 'Section 6 — Consent'
          },
          {
            signal_type: 'swipe_speed',
            collected_at: new Date(),
            purpose: 'Behavioral authentication',
            dpdp_section: 'Section 8 — Data Minimization'
          },
          {
            signal_type: 'touch_duration',
            collected_at: new Date(),
            purpose: 'Behavioral authentication',
            dpdp_section: 'Section 8 — Data Minimization'
          },
          {
            signal_type: 'accelerometer',
            collected_at: new Date(),
            purpose: 'Duress detection',
            dpdp_section: 'Section 6 — Consent'
          },
        ]
      });
      await consent.save();
    }

    res.json({ success: true, consent });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/consent/:userId — tiered deletion
router.delete('/:userId', async (req, res) => {
  try {
    const { data_type } = req.body;

    if (data_type === 'transaction') {
      // RBI rule — cannot delete
      return res.status(403).json({
        success: false,
        message: 'Cannot delete transaction data',
        reason: 'RBI Master Directions under PMLA mandate 7-year retention of all financial transaction records. This data cannot be deleted.',
        regulation: 'RBI/PMLA 7-Year Retention Rule',
      });
    }

    // behavioral data CAN be deleted (DPDP Act)
    const userIds = resolveUserIds(req.params.userId);
    
    // 1. Mark consent as deleted
    await ConsentLog.updateMany(
      { userId: { $in: userIds } },
      {
        behavioral_data_deleted: true,
        behavioral_deleted_at: new Date(),
        signals_collected: [],
      }
    );

    // 2. Erase all raw session telemetry from database (DPDP Compliance)
    const Session = require('../models/Session');
    await Session.deleteMany({ userId: { $in: userIds } });

    // 3. Clear the ML baseline in the upstream ML microservice
    const ML_BASE = process.env.BHV_API_URL || 'https://bhv-api.nw-right.dev';
    const cleanKey = (process.env.BHV_API_KEY || '').replace(/\\n/g, '\n').trim();
    const cleanId = (process.env.CF_ACCESS_CLIENT_ID || '').replace(/\\n/g, '\n').trim();
    const cleanSecret = (process.env.CF_ACCESS_CLIENT_SECRET || '').replace(/\\n/g, '\n').trim();

    try {
      await Promise.all(
        userIds.map(async (uId) => {
          await fetch(`${ML_BASE}/baseline/${encodeURIComponent(uId)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': cleanKey,
              'CF-Access-Client-Id': cleanId,
              'CF-Access-Client-Secret': cleanSecret,
            },
          });
        })
      );
      console.log(`[consent] Successfully reset ML baselines upstream for user IDs: ${userIds.join(', ')}`);
    } catch (mlErr) {
      console.error('[consent] Failed to reset ML baselines upstream:', mlErr.message);
    }

    res.json({
      success: true,
      message: 'Behavioral data deleted successfully',
      dpdp_compliance: 'Section 12 — Right to Erasure satisfied',
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;