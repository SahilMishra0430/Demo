import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

// ── Spinner ────────────────────────────────────────────────────────────────────
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
);

// ── Empty state ────────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div className="text-center py-16">
    <div className="text-5xl mb-3">🏷️</div>
    <p className="font-black text-gray-600 dark:text-gray-300">No coupons yet</p>
    <p className="text-sm text-gray-400 mt-1">Create your first discount code above</p>
  </div>
);

// ── Coupon status badge ────────────────────────────────────────────────────────
const StatusBadge = ({ coupon }) => {
  const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
  const isExhausted = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

  if (!coupon.isActive) return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
      INACTIVE
    </span>
  );
  if (isExpired) return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
      EXPIRED
    </span>
  );
  if (isExhausted) return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-200">
      LIMIT REACHED
    </span>
  );
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200">
      ACTIVE
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const CouponsPage = ({ C }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // id of coupon being toggled/deleted
  const [deleteConfirm, setDeleteConfirm] = useState(null); // coupon object

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    maxUses: '',
    expiresAt: '',
  });

  const resetForm = () => {
    setForm({ code: '', discountType: 'percent', discountValue: '', minOrderAmount: '', maxDiscount: '', maxUses: '', expiresAt: '' });
    setFormError('');
  };

  // ── Fetch coupons ──────────────────────────────────────────────────────────
  const fetchCoupons = async () => {
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data);
    } catch {
      toast.error('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  // ── Create coupon ──────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.code.trim()) return setFormError('Coupon code is required.');
    if (!form.discountValue) return setFormError('Discount value is required.');
    if (form.discountType === 'percent' && Number(form.discountValue) > 100) {
      return setFormError('Percent discount cannot exceed 100.');
    }
    setFormLoading(true);
    try {
      await api.post('/coupons', {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast.success(`Coupon "${form.code.toUpperCase()}" created! 🎉`);
      resetForm();
      setFormOpen(false);
      fetchCoupons();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create coupon.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (coupon) => {
    setActionId(coupon._id);
    try {
      await api.patch(`/coupons/${coupon._id}/toggle`);
      setCoupons((prev) => prev.map((c) =>
        c._id === coupon._id ? { ...c, isActive: !c.isActive } : c
      ));
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
    } catch {
      toast.error('Failed to toggle coupon.');
    } finally {
      setActionId(null);
    }
  };

  // ── Delete coupon ──────────────────────────────────────────────────────────
  const handleDelete = async (coupon) => {
    setActionId(coupon._id);
    try {
      await api.delete(`/coupons/${coupon._id}`);
      setCoupons((prev) => prev.filter((c) => c._id !== coupon._id));
      toast.success('Coupon deleted.');
    } catch {
      toast.error('Failed to delete coupon.');
    } finally {
      setActionId(null);
      setDeleteConfirm(null);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDiscount = (c) =>
    c.discountType === 'percent'
      ? `${c.discountValue}% off${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}`
      : `₹${c.discountValue} off`;

  const formatExpiry = (expiresAt) => {
    if (!expiresAt) return 'Never';
    const d = new Date(expiresAt);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-black text-lg ${C.text}`}>Coupon Codes</h2>
          <p className={`text-xs ${C.muted} mt-0.5`}>{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, var(--admin-dark), var(--admin))' }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
          New Coupon
        </button>
      </div>

      {/* ── Create form (slide-in) ───────────────────────────────────────────── */}
      {formOpen && (
        <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-black text-base ${C.text}`}>Create Coupon</h3>
            <button onClick={() => setFormOpen(false)} className={`${C.muted} hover:opacity-70 text-lg leading-none`}>✕</button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">

            {/* Code */}
            <div>
              <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Coupon Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder="e.g. SUMMER21"
                maxLength={20}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm font-black tracking-widest focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
              />
            </div>

            {/* Discount type + value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Discount Type *</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                >
                  <option value="percent">% Percent</option>
                  <option value="flat">₹ Flat Amount</option>
                </select>
              </div>
              <div>
                <label className={`block font-bold text-xs mb-1 ${C.muted}`}>
                  {form.discountType === 'percent' ? 'Percent (%)' : 'Amount (₹)'} *
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'percent' ? 'e.g. 10' : 'e.g. 50'}
                  min="1"
                  max={form.discountType === 'percent' ? '100' : undefined}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                />
              </div>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Min Order Amount (₹)</label>
                <input
                  type="number" min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="e.g. 200 (optional)"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                />
              </div>
              {form.discountType === 'percent' && (
                <div>
                  <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Max Discount Cap (₹)</label>
                  <input
                    type="number" min="0"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    placeholder="e.g. 100 (optional)"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Max Uses</label>
                <input
                  type="number" min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Unlimited (optional)"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                />
              </div>
              <div>
                <label className={`block font-bold text-xs mb-1 ${C.muted}`}>Expiry Date</label>
                <input
                  type="date"
                  value={form.expiresAt}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}
                />
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2 text-red-600 dark:text-red-400 text-xs font-medium">
                ⚠️ {formError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setFormOpen(false)}
                className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-3 rounded-2xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="btn-primary flex-1 py-3 rounded-2xl text-sm font-black tracking-widest uppercase disabled:opacity-60 flex items-center justify-center gap-2">
                {formLoading ? <Spinner /> : '🏷️ Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Coupon list ──────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[var(--admin-accent)] rounded-full spin" />
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div
              key={coupon._id}
              className={`${C.card} rounded-2xl p-4 shadow-sm transition-all`}
              style={{ opacity: coupon.isActive ? 1 : 0.65 }}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: code + details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-black text-base tracking-widest" style={{ color: 'var(--admin-accent)', fontFamily: 'monospace' }}>
                      {coupon.code}
                    </span>
                    <StatusBadge coupon={coupon} />
                  </div>

                  <p className={`font-black text-sm ${C.text}`}>{formatDiscount(coupon)}</p>

                  <div className={`flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[11px] font-semibold ${C.muted}`}>
                    {coupon.minOrderAmount > 0 && (
                      <span>Min order: ₹{coupon.minOrderAmount}</span>
                    )}
                    <span>
                      Used: {coupon.usedCount}{coupon.maxUses !== null ? `/${coupon.maxUses}` : ' times'}
                    </span>
                    <span>Expires: {formatExpiry(coupon.expiresAt)}</span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(coupon)}
                    disabled={actionId === coupon._id}
                    title={coupon.isActive ? 'Deactivate' : 'Activate'}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
                    style={{
                      background: coupon.isActive ? 'rgba(49,96,61,0.12)' : 'rgba(107,114,128,0.12)',
                      border: `1px solid ${coupon.isActive ? 'rgba(49,96,61,0.3)' : 'rgba(107,114,128,0.3)'}`,
                    }}
                  >
                    {actionId === coupon._id ? (
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full spin inline-block" />
                    ) : coupon.isActive ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: '#31603D' }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-gray-400">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(coupon)}
                    title="Delete"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: '#dc2626' }}>
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 fade-in flex items-center justify-center px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl text-center pop-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className={`font-black ${C.text} text-base mb-1`}>Delete Coupon?</h3>
            <p className={`${C.muted} text-sm mb-1`}>
              Code: <span className="font-black tracking-widest" style={{ color: 'var(--admin-accent)', fontFamily: 'monospace' }}>{deleteConfirm.code}</span>
            </p>
            <p className={`${C.muted} text-xs mb-5`}>This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionId === deleteConfirm._id}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center"
              >
                {actionId === deleteConfirm._id ? <Spinner /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;
