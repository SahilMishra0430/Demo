const express = require('express');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { protect } = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus');
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const router = express.Router();

// ── IST timezone helpers ──────────────────────────────────────────────────────
// Render servers run UTC. India is UTC+5:30.
// All "today" boundaries must be computed in IST so midnight = IST midnight.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5h 30m in ms

/**
 * Returns { start, end } as UTC Date objects representing
 * the start and end of the given IST calendar day.
 * daysAgo=0 → today IST, daysAgo=1 → yesterday IST, etc.
 */
const istDayBounds = (daysAgo = 0) => {
  const nowUTC = Date.now();
  const nowIST = nowUTC + IST_OFFSET_MS;
  // Floor to IST midnight
  const istMidnight = nowIST - (nowIST % (24 * 60 * 60 * 1000));
  // Shift back by daysAgo
  const dayStart = istMidnight - daysAgo * 24 * 60 * 60 * 1000;
  const dayEnd   = dayStart + 24 * 60 * 60 * 1000;
  // Convert back to UTC Date objects for MongoDB queries
  return {
    start: new Date(dayStart - IST_OFFSET_MS),
    end:   new Date(dayEnd   - IST_OFFSET_MS),
  };
};

/**
 * Given a date string "YYYY-MM-DD" (IST calendar date),
 * returns { start, end } UTC Date objects for that IST day.
 */
const istDateStringBounds = (dateStr) => {
  // Parse as IST midnight by appending IST offset
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end   = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
};


// ── VAPID setup ───────────────────────────────────────────────────────────────
const cafeConfig = require('../config/cafeConfig');

webpush.setVapidDetails(
  `mailto:${cafeConfig.cafe.vapidEmail}`,
  cafeConfig.env.vapidPublicKey,
  cafeConfig.env.vapidPrivateKey
);

// ── Send push notification to all subscribed admin devices ───────────────────
const sendOrderPush = async (order) => {
  try {
    const subs = await PushSubscription.find({});
    if (!subs.length) return;

    const payload = JSON.stringify({
      title: '🛎️ New Order — Velvet Vault',
      body: `${order.orderType === 'takeaway' ? '🥡 Takeaway' : `🪑 Table ${order.tableNumber}`} · ${order.customerName} · ₹${order.totalAmount}`,
      orderId: String(order._id),
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      )
    );

    // Clean up expired / invalid subscriptions automatically
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const code = result.reason?.statusCode;
        if (code === 404 || code === 410) {
          PushSubscription.deleteOne({ endpoint: subs[i].endpoint }).catch(() => { });
        }
      }
    });
  } catch (err) {
    console.error('Push notification error:', err);
  }
};

// ── Generate daily pickup token T-001, T-002… (IST-aware) ────────────────────
const generatePickupToken = async () => {
  const { start } = istDayBounds(0); // IST today start in UTC
  const count = await Order.countDocuments({
    orderType: 'takeaway',
    createdAt: { $gte: start },
  });
  return `T-${String(count + 1).padStart(3, '0')}`;
};

// ── Helper: calculate coupon discount ─────────────────────────────────────────
const calcDiscount = (coupon, cartTotal) => {
  if (coupon.discountType === 'flat') {
    return Math.min(coupon.discountValue, cartTotal);
  }
  const raw = (coupon.discountValue / 100) * cartTotal;
  return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
};

// ── POST /orders — public ─────────────────────────────────────────────────────
router.post('/', requireShopOpen, async (req, res) => {
  try {
    const {
      customerName, tableNumber, items, note,
      orderType, phoneNumber, utrNumber,
      paymentMethod,
      couponCode,       // ← NEW: optional coupon from customer
    } = req.body;

    if (!customerName || !tableNumber || !items || items.length === 0) {
      return res.status(400).json({ message: 'customerName, tableNumber and items are required.' });
    }

    const isTakeaway = orderType === 'takeaway';

    if (isTakeaway) {
      if (!phoneNumber || phoneNumber.trim().length < 10) {
        return res.status(400).json({ message: 'Valid phone number is required for takeaway.' });
      }
      const isRazorpay = paymentMethod === 'razorpay';
      if (!isRazorpay) {
        if (!utrNumber || utrNumber.trim().length < 6) {
          return res.status(400).json({ message: 'UTR/Transaction ID is required for takeaway.' });
        }
      }
    }

    // ── Coupon validation (server-side — never trust client discount) ─────────
    const originalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    let discountAmount = 0;
    let appliedCouponCode = '';

    if (couponCode && couponCode.trim()) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      });

      // Silently ignore invalid coupons (don't block order, just don't apply discount)
      // Change to return error if you want strict rejection instead
      if (coupon) {
        const isExpired = coupon.expiresAt && new Date() > coupon.expiresAt;
        const isExhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
        const meetsMinimum = originalAmount >= coupon.minOrderAmount;

        if (!isExpired && !isExhausted && meetsMinimum) {
          discountAmount = Math.round(calcDiscount(coupon, originalAmount));
          appliedCouponCode = coupon.code;

          // Increment usage count atomically
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    const totalAmount = Math.max(0, originalAmount - discountAmount);
    const pickupToken = isTakeaway ? await generatePickupToken() : '';

    const validMethods = ['upi', 'debit-card', 'credit-card', 'razorpay'];
    const resolvedPaymentMethod = isTakeaway
      ? (validMethods.includes(paymentMethod) ? paymentMethod : 'upi')
      : 'not_required';

    const order = new Order({
      customerName,
      phoneNumber: phoneNumber || '',
      tableNumber: isTakeaway ? 'Takeaway' : tableNumber,
      orderType: isTakeaway ? 'takeaway' : 'dine-in',
      items,
      originalAmount,       // ← NEW
      discountAmount,       // ← NEW
      couponCode: appliedCouponCode, // ← NEW
      totalAmount,          // final = original - discount
      note: note || '',
      paymentStatus: isTakeaway ? 'pending_verification' : 'not_required',
      utrNumber: isTakeaway ? utrNumber.trim() : '',
      paymentMethod: resolvedPaymentMethod,
      pickupToken,
    });

    await order.save();

    sendOrderPush(order).catch(() => { });

    res.status(201).json(order);
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// ── GET /orders — admin only ──────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { date, status, orderType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (orderType && ['dine-in', 'takeaway'].includes(orderType)) {
      filter.orderType = orderType;
    }
    if (date) {
      // date param is "YYYY-MM-DD" in IST — convert to UTC bounds
      const { start, end } = istDateStringBounds(date);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// ── GET /orders/track/:id — public ───────────────────────────────────────────
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({
      status: order.status,
      totalAmount: order.totalAmount,
      originalAmount: order.originalAmount,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
      orderType: order.orderType,
      pickupToken: order.pickupToken,
      paymentStatus: order.paymentStatus,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to track order.' });
  }
});

// ── GET /orders/daily-stats — admin only ──────────────────────────────────────
router.get('/daily-stats', protect, async (req, res) => {
  try {
    // Use IST day bounds so stats reset at IST midnight, not UTC midnight
    const { start: todayStart, end: todayEnd } = istDayBounds(0);

    const orders = await Order.find({
      createdAt: { $gte: todayStart, $lt: todayEnd },
      status: { $ne: 'cancelled' },
    });

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const dineInOrders = orders.filter((o) => (o.orderType || 'dine-in') === 'dine-in').length;
    const takeawayOrders = orders.filter((o) => o.orderType === 'takeaway').length;
    const takeawaySales = orders.filter((o) => o.orderType === 'takeaway').reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingVerification = orders.filter((o) => o.paymentStatus === 'pending_verification').length;
    // ── NEW: coupon stats ──────────────────────────────────────────────────
    const totalDiscountGiven = orders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
    const couponOrdersCount = orders.filter((o) => o.couponCode).length;

    res.json({
      totalSales, totalOrders,
      dineInOrders, takeawayOrders, takeawaySales,
      pendingVerification,
      totalDiscountGiven,   // ← NEW
      couponOrdersCount,    // ← NEW
      orders,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats.' });
  }
});

// ── GET /orders/history — admin only ──────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const { from, to, orderType, status } = req.query;
    const filter = {};

    if (from && to) {
      // Treat from/to as IST calendar dates
      const { start } = istDateStringBounds(from);
      const { end }   = istDateStringBounds(to);
      filter.createdAt = { $gte: start, $lte: end };
    }
    if (orderType && ['dine-in', 'takeaway'].includes(orderType)) {
      filter.orderType = orderType;
    }
    if (status && status !== 'all') {
      const valid = ['pending','accepted','preparing','ready','completed'];
      if (valid.includes(status)) filter.status = status;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    const totalSales     = orders.reduce((s, o) => s + o.totalAmount, 0);
    const dineInOrders   = orders.filter((o) => (o.orderType || 'dine-in') === 'dine-in');
    const takeawayOrders = orders.filter((o) => o.orderType === 'takeaway');

    const itemMap = {};
    orders.forEach((o) => {
      o.items.forEach((it) => {
        if (!itemMap[it.name]) itemMap[it.name] = { qty: 0, revenue: 0 };
        itemMap[it.name].qty     += it.quantity;
        itemMap[it.name].revenue += it.price * it.quantity;
      });
    });
    const topItems = Object.entries(itemMap)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue }));

    res.json({
      orders,
      summary: {
        totalOrders:    orders.length,
        totalSales,
        dineInCount:    dineInOrders.length,
        takeawayCount:  takeawayOrders.length,
        dineInSales:    dineInOrders.reduce((s, o) => s + o.totalAmount, 0),
        takeawaySales:  takeawayOrders.reduce((s, o) => s + o.totalAmount, 0),
        totalDiscountGiven: orders.reduce((s, o) => s + (o.discountAmount || 0), 0), // ← NEW
        topItems,
      },
    });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ message: 'Failed to fetch order history.' });
  }
});

// ── PUT /orders/:id — admin only ──────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updates = {};

    if (status) {
      const validStatuses = ['pending', 'accepted', 'preparing', 'ready', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      updates.status = status;
    }

    if (paymentStatus) {
      const validPayment = ['not_required', 'pending_verification', 'paid', 'failed'];
      if (!validPayment.includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid paymentStatus value.' });
      }
      updates.paymentStatus = paymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ message: 'Failed to update order.' });
  }
});

// ── DELETE /orders — admin only (clear ALL) ───────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    await Order.deleteMany({});
    res.json({ message: `${orders.length} order(s) deleted.`, count: orders.length, deletedOrders: orders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear orders.' });
  }
});

// ── DELETE /orders/:id — admin only ──────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order deleted.', deletedOrder: order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete order.' });
  }
});

module.exports = router;
