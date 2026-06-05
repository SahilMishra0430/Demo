const express = require('express');
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/auth');

const router = express.Router();
const cafeConfig = require('../config/cafeConfig');

webpush.setVapidDetails(
  `mailto:${cafeConfig.cafe.vapidEmail}`,
  cafeConfig.env.vapidPublicKey,
  cafeConfig.env.vapidPrivateKey
);

// GET /api/push/public-key — public, frontend needs this to subscribe
router.get('/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save this device's subscription (admin only)
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription object.' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys },
      { upsert: true, new: true }
    );
    res.json({ message: 'Subscribed successfully.' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ message: 'Failed to save subscription.' });
  }
});

// DELETE /api/push/subscribe — remove this device's subscription (admin only)
router.delete('/subscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'Endpoint required.' });
    await PushSubscription.deleteOne({ endpoint });
    res.json({ message: 'Unsubscribed.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove subscription.' });
  }
});

module.exports = router;
