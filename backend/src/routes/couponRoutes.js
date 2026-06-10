const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createCoupon,
  getAllCoupons,
  toggleCoupon,
  deleteCoupon,
  validateCoupon,
  getPublicCoupons,
} = require('../controllers/couponController');

const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/public', getPublicCoupons);    // Active coupons for customer banner
router.post('/validate', validateCoupon);          // Customer applies coupon at checkout

// ── Admin only ────────────────────────────────────────────────────────────────
router.post('/',              protect, createCoupon);    // Create new coupon
router.get('/',               protect, getAllCoupons);   // List all coupons
router.patch('/:id/toggle',   protect, toggleCoupon);   // Enable / disable coupon
router.delete('/:id',         protect, deleteCoupon);   // Delete coupon

module.exports = router;
