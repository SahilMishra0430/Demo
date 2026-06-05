const express = require('express');
const jwt     = require('jsonwebtoken');
const Admin   = require('../models/Admin');
const { protect } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials.' });

    const ok = await admin.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords are required.' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });

    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });

    const ok = await admin.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect.' });

    admin.password = newPassword;
    await admin.save();
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /auth/logo — public, returns current café logo URL
router.get('/logo', async (req, res) => {
  try {
    const admin = await Admin.findOne().select('logoUrl');
    res.json({ logoUrl: admin?.logoUrl || '' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logo.' });
  }
});

// PUT /auth/logo — admin only, saves base64 logo to DB
router.put('/logo', protect, async (req, res) => {
  try {
    const { logoUrl } = req.body;
    if (!logoUrl) return res.status(400).json({ message: 'logoUrl is required.' });

    // Limit size (~2MB base64 ≈ 1.5MB image)
    if (logoUrl.length > 2_100_000) {
      return res.status(400).json({ message: 'Logo file too large. Please use an image under 1.5MB.' });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { logoUrl },
      { new: true }
    ).select('logoUrl');

    res.json({ logoUrl: admin.logoUrl, message: 'Logo updated successfully.' });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ message: 'Failed to update logo.' });
  }
});

// ─── ADD THESE TWO ROUTES before module.exports ───────────────────────────

// GET /auth/shop-status — protected, admin reads current status on mount
router.get('/shop-status', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('isOpen');
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    res.json({ isOpen: admin.isOpen });
  } catch (err) {
    console.error('Shop status error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /auth/toggle-shop — protected, toggles isOpen true/false
router.put('/toggle-shop', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    admin.isOpen = !admin.isOpen;
    await admin.save();
    res.json({
      isOpen: admin.isOpen,
      message: admin.isOpen ? 'Shop is now open' : 'Shop is now closed',
    });
  } catch (err) {
    console.error('Toggle shop error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /auth/settings — PUBLIC — OrderModal fetches this to know what to show
router.get('/settings', async (req, res) => {
  try {
    const admin = await Admin.findOne().select('isOpen isTakeawayEnabled isAutoPayEnabled');
    res.json({
      isOpen:            admin?.isOpen            ?? true,
      isTakeawayEnabled: admin?.isTakeawayEnabled ?? true,
      isAutoPayEnabled:  admin?.isAutoPayEnabled  ?? false,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /auth/toggle-takeaway — protected
router.patch('/toggle-takeaway', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    admin.isTakeawayEnabled = !admin.isTakeawayEnabled;
    await admin.save();
    res.json({
      isTakeawayEnabled: admin.isTakeawayEnabled,
      message: admin.isTakeawayEnabled ? 'Takeaway orders enabled' : 'Takeaway orders disabled',
    });
  } catch (err) {
    console.error('Toggle takeaway error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /auth/toggle-autopay — protected
router.patch('/toggle-autopay', protect, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    admin.isAutoPayEnabled = !admin.isAutoPayEnabled;
    await admin.save();
    res.json({
      isAutoPayEnabled: admin.isAutoPayEnabled,
      message: admin.isAutoPayEnabled
        ? 'Auto payment (Razorpay) enabled'
        : 'Manual UPI payment enabled',
    });
  } catch (err) {
    console.error('Toggle autopay error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;