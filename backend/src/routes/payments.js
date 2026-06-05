/**
 * routes/payments.js
 *
 * POST /api/payments/create-order  → creates Razorpay order, returns ID + amount
 * POST /api/payments/verify        → verifies HMAC signature → saves order to DB
 * POST /api/payments/webhook       → Razorpay auto-calls this on payment → marks paid
 */

const express    = require('express');
const crypto     = require('crypto');
const Razorpay   = require('razorpay');
const Order      = require('../models/Order');
const webpush    = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const cafeConfig = require('../config/cafeConfig');

const router = express.Router();

// ── Razorpay instance (lazy — won't crash if keys missing) ───────────────────
const getRazorpay = () => {
  if (!cafeConfig.env.razorpayKeyId || !cafeConfig.env.razorpaySecret) {
    throw new Error('Razorpay keys not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to Render env vars.');
  }
  return new Razorpay({
    key_id:     cafeConfig.env.razorpayKeyId,
    key_secret: cafeConfig.env.razorpaySecret,
  });
};

// ── VAPID setup for push notifications ────────────────────────────────────────
if (cafeConfig.env.vapidPublicKey && cafeConfig.env.vapidPrivateKey) {
  webpush.setVapidDetails(
    `mailto:${cafeConfig.cafe.vapidEmail}`,
    cafeConfig.env.vapidPublicKey,
    cafeConfig.env.vapidPrivateKey
  );
}

// ── Send push notification to admin devices ────────────────────────────────────
const sendOrderPush = async (order) => {
  try {
    const subs = await PushSubscription.find({});
    if (!subs.length) return;
    const payload = JSON.stringify({
      title: `🛎️ New Order — ${cafeConfig.cafe.name}`,
      body:  `🥡 Takeaway · ${order.customerName} · ₹${order.totalAmount}`,
      orderId: String(order._id),
    });
    const results = await Promise.allSettled(
      subs.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload))
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const code = result.reason?.statusCode;
        if (code === 404 || code === 410) {
          PushSubscription.deleteOne({ endpoint: subs[i].endpoint }).catch(() => {});
        }
      }
    });
  } catch (_) {}
};

// ── Generate daily pickup token T-001, T-002 … ────────────────────────────────
const generatePickupToken = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await Order.countDocuments({ orderType: 'takeaway', createdAt: { $gte: today } });
  return `T-${String(count + 1).padStart(3, '0')}`;
};

// ── POST /api/payments/create-order ──────────────────────────────────────────
// Frontend calls this first to get a Razorpay order ID before opening checkout
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount.' });

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),   // ₹ → paise
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    });

    res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('[payments/create-order]', err.message);
    res.status(500).json({ message: err.message || 'Failed to create payment order.' });
  }
});

// ── POST /api/payments/verify ─────────────────────────────────────────────────
// Called after Razorpay payment succeeds on the frontend.
// Verifies HMAC signature → creates the Order in MongoDB → sends push to admin.
router.post('/verify', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderData,   // { customerName, phoneNumber, note, items }
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderData) {
      return res.status(400).json({ message: 'Missing payment verification fields.' });
    }

    // ── Verify HMAC-SHA256 signature ──────────────────────────────────────────
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', cafeConfig.env.razorpaySecret)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    // ── Signature valid — save order to DB ────────────────────────────────────
    const totalAmount  = orderData.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const pickupToken  = await generatePickupToken();

    const order = new Order({
      customerName:    orderData.customerName,
      phoneNumber:     orderData.phoneNumber || '',
      tableNumber:     'Takeaway',
      orderType:       'takeaway',
      note:            orderData.note || '',
      items:           orderData.items,
      totalAmount,
      paymentStatus:   'paid',           // auto-verified — no manual check needed
      paymentMethod:   'razorpay',
      paymentId:       razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      pickupToken,
    });

    await order.save();

    // Push notification to admin (non-blocking)
    sendOrderPush(order).catch(() => {});

    res.status(201).json({ order, pickupToken });
  } catch (err) {
    console.error('[payments/verify]', err.message);
    res.status(500).json({ message: 'Payment verified but order creation failed. Contact support.' });
  }
});

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Razorpay calls this automatically on payment.captured event.
// Acts as a safety net — if frontend verify call failed, this catches it.
// NOTE: server.js must add:
//   app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
//   BEFORE app.use(express.json(...))
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = cafeConfig.env.razorpayWebhookSecret;
    const signature     = req.headers['x-razorpay-signature'];

    if (!webhookSecret) {
      console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification');
      return res.json({ status: 'skipped' });
    }

    // req.body is a Buffer when express.raw() is used
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSig !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody.toString());

    // Only handle successful payment capture
    if (event.event === 'payment.captured') {
      const paymentId       = event.payload.payment.entity.id;
      const razorpayOrderId = event.payload.payment.entity.order_id;

      // If order already saved by /verify, just update payment fields
      // If /verify somehow failed, this creates nothing (order data not available here)
      await Order.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: 'paid', paymentId },
        { new: true }
      );
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[payments/webhook]', err);
    res.status(500).json({ message: 'Webhook processing failed.' });
  }
});

module.exports = router;
