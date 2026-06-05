const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    superCategory: {
      type: String,
      required: true,
      enum: ['Chinese', 'Snacks', 'Pasta & Maggie', 'Beverages', 'Combos', 'All Items'],
    },
    subCategory: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    // ── Legacy / fallback price (kept required for backward compat) ──────────
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // ── Half / Full plate pricing ─────────────────────────────────────────────
    halfPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    fullPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    halfDescription: {
      type: String,
      default: '',
      trim: true,
    },
    fullDescription: {
      type: String,
      default: '',
      trim: true,
    },
    // ─────────────────────────────────────────────────────────────────────────
    veg: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop',
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
