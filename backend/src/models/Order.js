const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem:     { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:         { type: String,  required: true },
  price:        { type: Number,  required: true },
  quantity:     { type: Number,  required: true, min: 1 },
  veg:          { type: Boolean, default: true },
  // ── Half / Full plate variant — '' means no variant (legacy item) ─────────
  selectedSize: { type: String,  enum: ['half', 'full', ''], default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber:  { type: String, default: '', trim: true },
    tableNumber:  { type: String, required: true, trim: true },

    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway'],
      default: 'dine-in',
    },

    items:       [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'preparing', 'ready', 'completed'],
      default: 'pending',
    },

    note: { type: String, default: '' },

    // ── UPI Payment fields (takeaway only) ──────────────────────────────────
    paymentStatus: {
      type: String,
      enum: [
        'not_required',
        'pending_verification',
        'paid',
        'failed',
      ],
      default: 'not_required',
    },

    utrNumber: { type: String, default: '', trim: true },

    paymentMethod: {
      type: String,
      enum: ['upi', 'debit-card', 'credit-card', 'not_required', 'razorpay'],
      default: 'not_required',
    },

    // ── Razorpay fields ──────────────────────────────────────────────────────
    paymentId:       { type: String, default: '' },   // Razorpay payment ID
    razorpayOrderId: { type: String, default: '' },   // Razorpay order ID

    pickupToken: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
