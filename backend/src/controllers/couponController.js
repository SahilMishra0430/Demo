const Coupon = require('../models/Coupon');

// ─── Helper: calculate discount amount ────────────────────────────────────────
const calcDiscount = (coupon, cartTotal) => {
  if (coupon.discountType === 'flat') {
    // Flat discount cannot exceed the cart total
    return Math.min(coupon.discountValue, cartTotal);
  }
  // Percent discount
  const raw = (coupon.discountValue / 100) * cartTotal;
  // Apply maxDiscount cap if set
  return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
};

// ─── POST /api/coupons — admin: create coupon ─────────────────────────────────
const createCoupon = async (req, res) => {
  try {
    const {
      code, discountType, discountValue,
      minOrderAmount, maxDiscount, maxUses, expiresAt,
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: 'code, discountType and discountValue are required.' });
    }

    if (!['percent', 'flat'].includes(discountType)) {
      return res.status(400).json({ message: 'discountType must be "percent" or "flat".' });
    }

    if (discountType === 'percent' && discountValue > 100) {
      return res.status(400).json({ message: 'Percent discount cannot exceed 100.' });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: `Coupon code "${code.toUpperCase()}" already exists.` });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      maxUses: maxUses || null,
      expiresAt: expiresAt || null,
    });

    res.status(201).json(coupon);
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ message: 'Failed to create coupon.' });
  }
};

// ─── GET /api/coupons — admin: list all coupons ───────────────────────────────
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error('Get coupons error:', err);
    res.status(500).json({ message: 'Failed to fetch coupons.' });
  }
};

// ─── PATCH /api/coupons/:id/toggle — admin: toggle active/inactive ────────────
const toggleCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({ message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}.`, coupon });
  } catch (err) {
    console.error('Toggle coupon error:', err);
    res.status(500).json({ message: 'Failed to toggle coupon.' });
  }
};

// ─── DELETE /api/coupons/:id — admin: delete coupon ──────────────────────────
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ message: 'Failed to delete coupon.' });
  }
};

// ─── POST /api/coupons/validate — public: customer applies coupon ─────────────
// Body: { code, cartTotal }
// Returns: { valid, discountAmount, finalAmount, coupon }
const validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code || !cartTotal) {
      return res.status(400).json({ message: 'code and cartTotal are required.' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: 'This coupon is no longer active.' });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ valid: false, message: 'This coupon has expired.' });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ valid: false, message: 'This coupon has reached its usage limit.' });
    }

    if (cartTotal < coupon.minOrderAmount) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`,
      });
    }

    const discountAmount = Math.round(calcDiscount(coupon, cartTotal));
    const finalAmount = Math.max(0, cartTotal - discountAmount);

    res.json({
      valid: true,
      discountAmount,
      finalAmount,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (err) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ message: 'Failed to validate coupon.' });
  }
};


// ─── GET /api/coupons/public — public: active coupons for marquee banner ──────
const getPublicCoupons = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }],
    }).select('code discountType discountValue minOrderAmount maxDiscount');
    res.json(coupons);
  } catch (err) {
    console.error('Public coupons error:', err);
    res.status(500).json({ message: 'Failed to fetch coupons.' });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  toggleCoupon,
  deleteCoupon,
  validateCoupon,
  getPublicCoupons,
};
