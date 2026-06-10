const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    discountType: {
      type: String,
      enum: ['percent', 'flat'],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },

    // Minimum cart total required to apply this coupon
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Cap on discount amount — only applies to 'percent' type
    // e.g. 20% off but max ₹100 discount
    maxDiscount: {
      type: Number,
      default: null,
    },

    // null = unlimited uses
    maxUses: {
      type: Number,
      default: null,
    },

    usedCount: {
      type: Number,
      default: 0,
    },

    // null = never expires
    expiresAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
