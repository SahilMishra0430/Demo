import React, { useState } from 'react';
import api from '../api/axios';

/**
 * CouponInput — drop into OrderModal's form step
 *
 * Props:
 *   cartTotal        {number}   — original cart total (before discount)
 *   onApply          {fn}       — called with { code, discountAmount, finalAmount } when valid
 *   onRemove         {fn}       — called when coupon is cleared
 *   appliedCoupon    {object|null} — { code, discountAmount, finalAmount } if already applied
 */
const CouponInput = ({ cartTotal, onApply, onRemove, appliedCoupon }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return setError('Please enter a coupon code.');
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: trimmed, cartTotal });
      onApply({
        code: res.data.coupon.code,
        discountAmount: res.data.discountAmount,
        finalAmount: res.data.finalAmount,
      });
      setCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid coupon code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode('');
    setError('');
    onRemove();
  };

  // ── Already applied state ──────────────────────────────────────────────────
  if (appliedCoupon) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(49,96,61,0.15)', border: '1px solid rgba(49,96,61,0.4)' }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">🎉</span>
          <div className="min-w-0">
            <p className="font-black text-sm truncate" style={{ color: '#31603D' }}>
              {appliedCoupon.code} applied!
            </p>
            <p className="text-xs font-semibold" style={{ color: '#31603D', opacity: 0.8 }}>
              You save ₹{appliedCoupon.discountAmount}
            </p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-lg transition-all active:scale-95"
          style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
        >
          Remove
        </button>
      </div>
    );
  }

  // ── Input state ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <label className="block font-bold text-sm" style={{ color: 'var(--ordermodelbgtext)' }}>
        Have a coupon?
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder="e.g. SUMMER21"
          maxLength={20}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold tracking-widest focus:outline-none input-base"
          style={{ letterSpacing: '0.1em' }}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
          style={{ background: 'var(--confirmbuttonbg)' }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
          ) : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};

export default CouponInput;
