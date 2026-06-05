/**
 * routes/menu.js
 *
 * Admin requests (with JWT Bearer token) bypass requireShopOpen.
 * Customers without a token still get 403 when the shop is closed.
 * All write routes (POST, PUT, DELETE) are admin-only and unaffected.
 */

const express         = require('express');
const MenuItem        = require('../models/Menu');
const { protect }     = require('../middleware/auth');
const requireShopOpen = require('../middleware/shopStatus');

const router = express.Router();

// ── GET /api/menu ─────────────────────────────────────────────────────────────
router.get(
  '/',
  (req, res, next) => {
    if (req.headers.authorization?.startsWith('Bearer ')) return next();
    return requireShopOpen(req, res, next);
  },
  async (req, res) => {
    try {
      const items = await MenuItem
        .find({})
        .sort({ superCategory: 1, subCategory: 1, name: 1 })
        .lean();
      res.json(items);
    } catch (err) {
      console.error('[menu GET]', err.message);
      res.status(500).json({ message: 'Failed to fetch menu.' });
    }
  }
);

// ── POST /api/menu ────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const {
      superCategory, subCategory, name, description,
      price, veg, image, available,
      halfPrice, fullPrice, halfDescription, fullDescription,
    } = req.body;

    if (!superCategory || !subCategory || !name) {
      return res.status(400).json({ message: 'superCategory, subCategory and name are required.' });
    }

    // At least one price must be provided
    const hasPrice     = price     !== undefined && price     !== null && price     !== '';
    const hasHalfPrice = halfPrice !== undefined && halfPrice !== null && halfPrice !== '';
    const hasFullPrice = fullPrice !== undefined && fullPrice !== null && fullPrice !== '';

    if (!hasPrice && !hasHalfPrice && !hasFullPrice) {
      return res.status(400).json({ message: 'At least one price (price, halfPrice, or fullPrice) is required.' });
    }

    // Derive fallback price: fullPrice → halfPrice → price
    const resolvedPrice = hasPrice
      ? Number(price)
      : hasFullPrice
        ? Number(fullPrice)
        : Number(halfPrice);

    const item = new MenuItem({
      superCategory, subCategory, name,
      description:    description    || '',
      price:          resolvedPrice,
      veg:            veg !== undefined ? veg : true,
      image:          image          || '',
      available:      available !== undefined ? available : true,
      halfPrice:      hasHalfPrice ? Number(halfPrice) : null,
      fullPrice:      hasFullPrice ? Number(fullPrice) : null,
      halfDescription: halfDescription || '',
      fullDescription: fullDescription || '',
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('[menu POST]', err.message);
    res.status(500).json({ message: 'Failed to add menu item.' });
  }
});

// ── PUT /api/menu/:id ─────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const allowed = [
      'superCategory', 'subCategory', 'name', 'description',
      'price', 'veg', 'image', 'available',
      'halfPrice', 'fullPrice', 'halfDescription', 'fullDescription',
    ];

    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    // If half/full prices are being set and no explicit price change,
    // keep price in sync with fullPrice (or halfPrice) as fallback
    if ((updates.halfPrice !== undefined || updates.fullPrice !== undefined) && updates.price === undefined) {
      const existing = await MenuItem.findById(req.params.id).lean();
      if (existing) {
        const fp = updates.fullPrice  !== undefined ? updates.fullPrice  : existing.fullPrice;
        const hp = updates.halfPrice  !== undefined ? updates.halfPrice  : existing.halfPrice;
        if (fp != null) updates.price = Number(fp);
        else if (hp != null) updates.price = Number(hp);
      }
    }

    // Coerce numeric fields
    ['price', 'halfPrice', 'fullPrice'].forEach((k) => {
      if (updates[k] !== undefined) {
        updates[k] = updates[k] === '' || updates[k] === null ? null : Number(updates[k]);
      }
    });
    // price must never be null (schema required)
    if (updates.price === null || isNaN(updates.price)) delete updates.price;

    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Menu item not found.' });
    res.json(item);
  } catch (err) {
    console.error('[menu PUT]', err.message);
    res.status(500).json({ message: 'Failed to update menu item.' });
  }
});

// ── DELETE /api/menu/:id ──────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found.' });
    res.json({ message: 'Item deleted successfully.' });
  } catch (err) {
    console.error('[menu DELETE]', err.message);
    res.status(500).json({ message: 'Failed to delete menu item.' });
  }
});

module.exports = router;
