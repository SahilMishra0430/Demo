const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    name: { type: String, default: 'Admin' },
    logoUrl: { type: String, default: '' },  // base64 or URL — persisted in DB
    isOpen:            { type: Boolean, default: true  },
    isTakeawayEnabled: { type: Boolean, default: true  },  // controls takeaway ordering
    isAutoPayEnabled:  { type: Boolean, default: false },  // Razorpay vs manual UPI
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
