import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { saveMyOrder } from '../utils/myOrders';
import { cafeConfig } from '../config/cafeConfig';
import CouponInput from './CouponInput';

// ── UPI config from env vars ──────────────────────────────────────────────────
const CAFE_UPI_ID = cafeConfig.contact.upiId;
const CAFE_UPI_NAME = cafeConfig.contact.upiName;

const buildUpiLink = (amount) =>
  `upi://pay?pa=${CAFE_UPI_ID}&pn=${encodeURIComponent(CAFE_UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Takeaway Order')}`;

const buildQrUrl = (amount) => {
  const upiLink = buildUpiLink(amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
};

// ── Payment method config ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'upi', label: '📱 UPI', sub: 'GPay · PhonePe · Paytm' },
  { id: 'debit-card', label: '💳 Debit Card', sub: 'Visa · Mastercard · RuPay' },
  { id: 'credit-card', label: '💳 Credit Card', sub: 'Visa · Mastercard · Amex' },
];

// UTR label changes based on payment method
const getUtrLabel = (method) => {
  if (method === 'upi') return 'UTR / Transaction ID *';
  if (method === 'debit-card') return 'Transaction Reference No. *';
  if (method === 'credit-card') return 'Transaction Reference No. *';
  return 'Transaction ID *';
};

const getUtrPlaceholder = (method) => {
  if (method === 'upi') return 'e.g. 425012345678 (12 digits)';
  return 'e.g. TXN123456789';
};

const getPaymentTitle = (method) => {
  if (method === 'upi') return 'Pay via UPI';
  if (method === 'debit-card') return 'Pay via Debit Card';
  if (method === 'credit-card') return 'Pay via Credit Card';
  return 'Complete Payment';
};

// ─────────────────────────────────────────────────────────────────────────────
const OrderModal = ({ isOpen, onClose, tableFromQR }) => {
  const { items, totalAmount, clearCart } = useCart();

  const [step, setStep] = useState('form');
  const [orderType, setOrderType] = useState('dine-in');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [table, setTable] = useState(tableFromQR || '');
  const [note, setNote] = useState('');
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [utrError, setUtrError] = useState('');
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedOrderType, setSavedOrderType] = useState('dine-in');
  const [pickupToken, setPickupToken] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('not_required');

  // ── NEW: payment method state ─────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'debit-card' | 'credit-card'

  // ── Coupon state ────────────────────────────────────────────────
  // appliedCoupon: { code, discountAmount, finalAmount } | null
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // ── Operational settings from backend ────────────────────────────────────
  const [isTakeawayEnabled, setIsTakeawayEnabled] = useState(true);
  const [isAutoPayEnabled, setIsAutoPayEnabled] = useState(false);

  const pollRef = useRef(null);
  const prevStatusRef = useRef('pending');

  useEffect(() => { if (tableFromQR) setTable(tableFromQR); }, [tableFromQR]);

  // ── Fetch operational settings on mount ───────────────────────────────────
  useEffect(() => {
    api.get('/auth/settings')
      .then(res => {
        setIsTakeawayEnabled(res.data.isTakeawayEnabled ?? true);
        setIsAutoPayEnabled(res.data.isAutoPayEnabled ?? false);
        // If takeaway just got disabled and user had it selected, switch to dine-in
        if (!res.data.isTakeawayEnabled) setOrderType('dine-in');
      })
      .catch(() => { }); // fail silently — defaults stay
  }, []);

  useEffect(() => {
    if (orderType === 'takeaway') setTable('Takeaway');
    else setTable(tableFromQR || '');
    setError('');
    setUtrError('');
    setUtr('');
  }, [orderType, tableFromQR]);

  // ── Real-time polling every 3s ─────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'success' || !orderId) return;

    const TOASTS = {
      accepted: { msg: '✅ Order accepted by the kitchen!', icon: '🍳' },
      preparing: { msg: '👨‍🍳 Chef is preparing your food!', icon: '🔥' },
      ready: { msg: savedOrderType === 'takeaway' ? '🛍️ Ready for pickup!' : '🎉 Your food is ready!', icon: '🍽️' },
      completed: { msg: '🙏 Thanks! Visit again.', icon: '☕' },
    };

    const poll = async () => {
      try {
        const res = await api.get(`/orders/track/${orderId}`);
        const ns = res.data.status;
        if (ns !== prevStatusRef.current) {
          prevStatusRef.current = ns;
          setOrderStatus(ns);
          if (TOASTS[ns]) toast.success(TOASTS[ns].msg, { duration: 5000, icon: TOASTS[ns].icon });
          if (['ready', 'completed'].includes(ns)) clearInterval(pollRef.current);
        }
        if (res.data.paymentStatus) setPaymentStatus(res.data.paymentStatus);
      } catch (_) { }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [step, orderId, savedOrderType]);

  const handleClose = () => {
    setStep('form'); setOrderType('dine-in');
    setName(''); setPhone(''); setTable(tableFromQR || '');
    setNote(''); setUtr(''); setError(''); setUtrError('');
    setOrderId(null); setOrderStatus('pending'); setPickupToken('');
    setPaymentStatus('not_required');
    setPaymentMethod('upi'); // ← RESET payment method
    setAppliedCoupon(null); // ← RESET coupon
    prevStatusRef.current = 'pending';
    clearInterval(pollRef.current);
    onClose();
  };

  // ── Step 1: validate form ─────────────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    // if (orderType === 'dine-in' && !table.trim()) return setError('Please enter your table number.');
    if (orderType === 'takeaway') {
      if (!phone.trim()) return setError('Please enter your mobile number.');
      if (!/^[6-9]\d{9}$/.test(phone.trim())) return setError('Enter a valid 10-digit mobile number.');
    }
    if (items.length === 0) return setError('Your cart is empty.');

    if (orderType === 'dine-in') {
      setLoading(true);
      try {
        const res = await api.post('/orders', {
          customerName: name.trim(),
          tableNumber: 'N/A',
          orderType: 'dine-in',
          note: note.trim(),
          items: items.map((i) => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, veg: i.veg })),
          couponCode: appliedCoupon?.code || '', // ← NEW
        });
        setSavedTotal(appliedCoupon?.finalAmount ?? totalAmount); // ← show discounted total
        setSavedOrderType('dine-in');
        setOrderId(res.data._id);
        setStep('success');
        // ── Save to My Orders (localStorage) before cart is cleared ──────
        saveMyOrder({
          orderId: res.data._id,
          customerName: name.trim(),
          tableNumber: 'N/A',
          orderType: 'dine-in',
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, veg: i.veg })),
          totalAmount,
          pickupToken: '',
          placedAt: new Date().toISOString(),
          note: note.trim(),
        });
        clearCart();
        toast.success('Order placed! Kitchen notified.', { icon: '🛎️', duration: 4000 });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to place order. Try again.');
      } finally { setLoading(false); }
      return;
    }

    // Takeaway: go to payment screen
    setStep('payment');
  };

  // ── Step 2: customer enters transaction ID → submit order ─────────────────
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setUtrError('');
    if (!utr.trim()) return setUtrError(`Please enter the ${getUtrLabel(paymentMethod).replace(' *', '')}.`);
    if (utr.trim().length < 6) return setUtrError('Transaction ID must be at least 6 characters.');

    setSubmitLoading(true);
    try {
      const res = await api.post('/orders', {
        customerName: name.trim(),
        phoneNumber: phone.trim(),
        tableNumber: 'Takeaway',
        orderType: 'takeaway',
        note: note.trim(),
        utrNumber: utr.trim(),
        paymentMethod: paymentMethod,
        couponCode: appliedCoupon?.code || '', // ← NEW
        items: items.map((i) => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, veg: i.veg })),
      });
      setSavedTotal(appliedCoupon?.finalAmount ?? totalAmount); // ← show discounted total
      setSavedOrderType('takeaway');
      setPickupToken(res.data.pickupToken);
      setPaymentStatus(res.data.paymentStatus);
      setOrderId(res.data._id);
      setStep('success');
      // ── Save to My Orders (localStorage) before cart is cleared ────────
      saveMyOrder({
        orderId: res.data._id,
        customerName: name.trim(),
        tableNumber: 'Takeaway',
        orderType: 'takeaway',
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, veg: i.veg })),
        totalAmount,
        pickupToken: res.data.pickupToken || '',
        placedAt: new Date().toISOString(),
        note: note.trim(),
      });
      clearCart();
      toast.success(`Order placed! Pickup: ${res.data.pickupToken}`, { icon: '🛍️', duration: 5000 });
    } catch (err) {
      setUtrError(err.response?.data?.message || 'Failed to place order. Try again.');
    } finally { setSubmitLoading(false); }
  };

  // ── Step 2 (Auto): Razorpay payment handler ───────────────────────────────
  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const orderRes = await api.post('/payments/create-order', { amount: totalAmount });
      const { id: order_id, currency, amount } = orderRes.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: cafeConfig.name,
        description: 'Takeaway Order',
        order_id,
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: {
                customerName: name.trim(),
                phoneNumber: phone.trim(),
                note: note.trim(),
                items: items.map((i) => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, veg: i.veg })),
              },
            });
            const newOrderId = verifyRes.data.order._id;
            setSavedTotal(totalAmount);
            setSavedOrderType('takeaway');
            setPickupToken(verifyRes.data.pickupToken);
            setPaymentStatus('paid');
            setOrderId(newOrderId);
            saveMyOrder({
              orderId: newOrderId,
              customerName: name.trim(),
              tableNumber: 'Takeaway',
              orderType: 'takeaway',
              items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, veg: i.veg })),
              totalAmount,
              pickupToken: verifyRes.data.pickupToken || '',
              placedAt: new Date().toISOString(),
              note: note.trim(),
            });
            clearCart();
            setStep('success');
            toast.success(`Order placed! Pickup: ${verifyRes.data.pickupToken}`, { icon: '🛍️', duration: 5000 });
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verified but order failed. Contact staff.');
          }
        },
        prefill: { name: name.trim(), contact: `+91${phone.trim()}` },
        theme: { color: '#940901' },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setError('Payment failed. Please try again.'));
      rzp.open();
    } catch (err) {
      console.error('Razorpay error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Could not initiate payment. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const isTakeaway = orderType === 'takeaway';

  const statusConfig = {
    pending: {
      label: 'Order Received', icon: '⏳', color: '#786c16', bg: '#fef3c7',
      desc: isTakeaway ? 'Admin will verify your payment shortly.' : 'Waiting for kitchen confirmation…'
    },
    accepted: { label: 'Order Accepted!', icon: '✅', color: '#0f742fd0', bg: '#d1fae5', desc: 'Your order is confirmed and being prepared.' },
    preparing: { label: 'Preparing…', icon: '👨‍🍳', color: '#4a7c59', bg: '#dbeafe', desc: "Chef is cooking your food. Won't be long!" },
    ready: {
      label: isTakeaway ? 'Ready for Pickup!' : 'Ready to Serve!',
      icon: '🎉', color: '#0d571f', bg: '#ecfdf5',
      desc: isTakeaway ? '🛍️ Show your pickup token at the counter!' : "Your food is ready! We'll bring it to your table."
    },
    completed: { label: 'Completed', icon: '🍽️', color: '#6b7280', bg: '#f3f4f6', desc: `Thank you for visiting ${cafeConfig.name}!` },
  };

  const status = statusConfig[orderStatus] || statusConfig.pending;
  const statusSteps = ['pending', 'accepted', 'preparing', 'ready'];
  const currentIdx = statusSteps.indexOf(orderStatus);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-50 fade-in" onClick={handleClose} />

      {/* Sheet */}
      <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
        <div className="rounded-2xl w-full max-w-md slide-up overflow-y-auto max-h-[92vh]"
          style={{ background: 'var(--ordermodelbg)' }}>

          {/* Pull handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white" />
          </div>

          {/* ══ STEP 1: FORM ════════════════════════════════════════ */}
          {step === 'form' && (
            <>
              <div className="px-6 pt-5 pb-2">
                <h2 className="font-black text-xl tracking-wide text-black" style={{ color: 'var(--ordermodelbgtext)' }}>PLACE ORDER</h2>
                <p className=" text-sm mt-1" style={{ color: 'var(--ordermodelbgtext)' }}>{items.length} item(s) · ₹{totalAmount}</p>
              </div>

              {/* Order type selector */}
              <div className="mx-6 mb-3">
                <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-80" style={{ color: 'var(--ordermodelbgtext)' }}>Order Type</p>
                <div className={`grid gap-2 ${isTakeawayEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {[
                    { id: 'dine-in', label: '🍽️ Dine In', show: true },
                    { id: 'takeaway', label: '🛍️ Takeaway', show: isTakeawayEnabled },
                  ].filter(t => t.show).map((t) => (
                    <button key={t.id} type="button" onClick={() => setOrderType(t.id)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 active:scale-[0.97]"
                      style={{
                        background: orderType === t.id ? 'var(--typeselectorbgactive)' : 'var(--typeselectorbg)',
                        borderColor: orderType === t.id ? 'var(--typeselectorborderactive)' : 'var(--typeselectorborderinactive)',
                        color: 'var(--typeselectortextactive)',
                        boxShadow: orderType === t.id ? 'var(--typeselectorshadowactive)' : 'var(--typeselectorshadowinactive)',
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {!isTakeawayEnabled && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--ordermodelbgmesseges)', border: '1px solid #00000040' }}>
                    🚫 Takeaway is currently unavailable
                  </div>
                )}
                {isTakeaway && isTakeawayEnabled && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--ordermodelbgmesseges)', border: '1px solid #00000040' }}>
                    {isAutoPayEnabled ? '⚡ Online payment via Razorpay' : '💳 Takeaway requires payment'}
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="mx-6 my-3 rounded-2xl p-3 space-y-1.5 max-h-28 overflow-y-auto"
                style={{ background: '#f6eee5', border: '1px solid #e0cdb8' }}>
                {items.map((item) => (
                  <div key={item._id} className="flex justify-between text-sm">
                    <span className="font-medium" style={{ color: 'var(--ordermodelbgtextonsummery)' }}>{item.name} <span className="font-normal" style={{ color: 'var(--ordermodelbgtextonsummery)' }}>×{item.quantity}</span></span>
                    <span className="font-bold" style={{ color: '#31603D' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="font-black text-sm" style={{ color: 'var(--ordermodelbgtextonsummery)' }}>Total</span>
                  <span className="font-black" style={{ color: '#31603D' }}>₹{appliedCoupon ? appliedCoupon.finalAmount : totalAmount}</span>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="px-6 pb-6 space-y-3">
                {/* Name */}
                <div>
                  <label className="block font-bold text-sm mb-1" style={{ color: 'var(--ordermodelbgtext)' }}>Your Name *</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name" className="input-base" maxLength={50} autoFocus />
                </div>

                {/* Phone — takeaway only */}
                {isTakeaway && (
                  <div>
                    <label className="block font-bold text-sm mb-1" style={{ color: 'var(--ordermodelbgtext)' }}>Mobile Number *</label>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 rounded-xl font-bold text-sm bg-white text-gray-600 flex-shrink-0"
                        style={{ border: '1.5px solid', color: 'var(--text-muted)', minWidth: '52px' }}>
                        +91
                      </div>
                      <input type="tel" value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit number" className="input-base flex-1"
                        inputMode="numeric" maxLength={10} />
                    </div>
                    <p className=" text-xs mt-1" style={{ color: 'var(--ordermodelbgmesseges)' }}>We'll call you when your order is ready</p>
                  </div>
                )}

                {/* Table — dine-in only */}
                {/* {!isTakeaway && (
                  <div>
                    <label className="block font-bold text-sm mb-1" style={{ color: 'var(--ordermodelbgtext)' }}>Table Number *</label>
                    <input type="number" value={table} onChange={(e) => setTable(e.target.value)}
                      placeholder="e.g. 5" className="input-base"
                      readOnly={!!tableFromQR}
                      style={tableFromQR ? { background: '#f9fafb', color: '#6b7280' } : {}}
                      maxLength={20} />
                    {tableFromQR && <p className="text-gray-100 text-xs mt-1">📍 Auto-detected from QR code</p>}
                  </div>
                )} */}

                {/* Note */}
                <div>
                  <label className="block font-bold text-sm mb-1" style={{ color: 'var(--ordermodelbgtext)' }}>
                    Special Note <span className="font-normal" style={{ color: 'var(--ordermodelbgtext)' }}>(optional)</span>
                  </label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Allergies or special requests?" rows={2}
                    className="input-base resize-none" maxLength={200} />
                </div>

                {/* Coupon code input */}
                <CouponInput
                  cartTotal={totalAmount}
                  appliedCoupon={appliedCoupon}
                  onApply={(coupon) => setAppliedCoupon(coupon)}
                  onRemove={() => setAppliedCoupon(null)}
                />

                {/* Discount summary — shown when coupon applied */}
                {appliedCoupon && (
                  <div className="rounded-xl px-4 py-2.5 space-y-1" style={{ background: '#f6eee5', border: '1px solid #e0cdb8' }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: 'var(--ordermodelbgtextonsummery)' }}>Subtotal</span>
                      <span style={{ color: 'var(--ordermodelbgtextonsummery)' }}>₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#31603D' }}>Discount ({appliedCoupon.code})</span>
                      <span className="font-bold" style={{ color: '#31603D' }}>− ₹{appliedCoupon.discountAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1">
                      <span className="font-black" style={{ color: 'var(--ordermodelbgtextonsummery)' }}>You Pay</span>
                      <span className="font-black" style={{ color: '#31603D' }}>₹{appliedCoupon.finalAmount}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleClose}
                    className="flex-1 border-2 font-bold py-3 rounded-2xl text-sm active:scale-[0.98] transition-all"
                    style={{ background: 'var(--cancelbuttonbg)', borderColor: 'var(--cancelbuttonborder)', color: 'var(--cancelbuttonborder)' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="btn-primary flex-1 py-3 rounded-2xl text-sm font-black tracking-wide uppercase disabled:opacity-30"
                    style={{ background: 'var(--confirmbuttonbg)' }}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full spin inline-block" />
                        Placing…
                      </span>
                    ) : isTakeaway ? 'Proceed to Pay' : 'CONFIRM'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══ STEP 2: PAYMENT ══════════════════════════════════════ */}
          {step === 'payment' && (
            <div className="px-6 py-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep('form')}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>←</button>
                <div>
                  <h2 className="font-black text-lg" style={{ color: 'var(--ordermodelbgtext)' }}>
                    {isAutoPayEnabled ? 'Complete Payment' : getPaymentTitle(paymentMethod)}
                  </h2>
                  <p className="text-white/70 text-xs">
                    {isAutoPayEnabled ? 'Secure payment powered by Razorpay' : 'Complete payment to place order'}
                  </p>
                </div>
              </div>

              {/* Amount badge */}
              <div className="text-center mb-4 py-3 rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <p className="text-white/60 text-xs uppercase tracking-widest mb-1">Amount to Pay</p>
                <p className="text-white font-black text-4xl">₹{totalAmount}</p>
                <p className="text-white/40 text-xs mt-1">{items.length} item{items.length !== 1 ? 's' : ''} · Takeaway</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                  ⚠️ {error}
                </div>
              )}

              {/* ── AUTO PAY ON: Razorpay flow ──────────────────────────── */}
              {isAutoPayEnabled ? (
                <>
                  <button onClick={handleRazorpayPayment} disabled={loading}
                    className="w-full py-4 rounded-2xl font-black text-sm text-white tracking-wide uppercase disabled:opacity-50 transition-all active:scale-[0.98] mb-3"
                    style={{ background: 'linear-gradient(135deg, #528FF0, #3355CC)', boxShadow: '0 4px 16px rgba(83,143,240,0.4)' }}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                        Opening Payment…
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                        Pay ₹{totalAmount} — UPI / Card / NetBanking
                      </span>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider">Powered by</span>
                    <span className="text-xs font-black text-white/60">Razorpay</span>
                    <span className="text-white/20">·</span>
                    <span className="text-[10px] text-white/40">GPay · PhonePe · Paytm · Cards</span>
                  </div>
                </>
              ) : (
                <>
                  {/* ── MANUAL PAY: Payment method selector + QR + UTR ─── */}
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ordermodelbgtext)' }}>
                      Select Payment Method
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                          className="flex flex-col items-center justify-center py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all active:scale-[0.97] text-center"
                          style={{
                            background: paymentMethod === m.id ? 'var(--typeselectorbgactive)' : 'rgba(255,255,255,0.12)',
                            borderColor: paymentMethod === m.id ? 'var(--typeselectorborderactive)' : 'rgba(255,255,255,0.25)',
                            color: 'white',
                            boxShadow: paymentMethod === m.id ? '0 4px 12px var(--typeselectorbgactive)' : 'none',
                          }}>
                          <span className="text-base mb-1 leading-none">{m.id === 'upi' ? '📱' : '💳'}</span>
                          <span className="leading-tight">{m.id === 'upi' ? 'UPI' : m.id === 'debit-card' ? 'Debit' : 'Credit'}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--ordermodelbgmesseges)' }}>
                      {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.sub}
                    </p>
                  </div>

                  {paymentMethod === 'upi' && (
                    <>
                      <div className="bg-white rounded-2xl p-4 text-center mb-4">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Scan with any UPI app</p>
                        <img src={buildQrUrl(totalAmount)} alt="UPI QR Code" className="w-44 h-44 mx-auto rounded-xl"
                          onError={(e) => { e.target.style.display = 'none'; }} />
                        <p className="text-gray-400 text-xs mt-2">GPay · PhonePe · Paytm · BHIM · Any UPI app</p>
                        <div className="mt-3 py-2 px-4 rounded-xl flex items-center justify-between gap-2"
                          style={{ background: 'var(--order-card-bg)', border: '1px solid #e0cdb8' }}>
                          <div className="text-left">
                            <p className="text-gray-400 text-[10px] uppercase tracking-wider">UPI ID</p>
                            <p className="text-gray-800 font-black text-sm">{CAFE_UPI_ID}</p>
                          </div>
                          <button onClick={() => { navigator.clipboard?.writeText(CAFE_UPI_ID); toast.success('UPI ID copied!'); }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                            style={{ background: 'var(--typeselectorbgactive)' }}>Copy</button>
                        </div>
                      </div>
                      <a href={buildUpiLink(totalAmount)}
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-sm mb-4 transition-all active:scale-[0.98] text-white no-underline"
                        style={{ background: 'var(--confirmbuttonbg)', textDecoration: 'none' }}>
                        📱 Open UPI App to Pay
                      </a>
                    </>
                  )}

                  {paymentMethod !== 'upi' && (
                    <div className="mb-4 px-4 py-3 rounded-2xl text-sm"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <p className="text-white font-bold mb-1">
                        {paymentMethod === 'debit-card' ? '💳 Pay via Debit Card' : '💳 Pay via Credit Card'}
                      </p>
                      <p className="text-white/60 text-xs leading-relaxed">
                        Complete your payment and note the transaction reference number shown after payment.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                    <p className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--ordermodelbgmesseges)' }}>
                      {paymentMethod === 'upi' ? 'After paying, enter UTR below' : 'Enter transaction reference below'}
                    </p>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  </div>

                  <form onSubmit={handlePaymentSubmit} className="space-y-3 pb-4">
                    <div>
                      <label className="block font-bold text-sm mb-1 text-gray-100">{getUtrLabel(paymentMethod)}</label>
                      <input type="text" value={utr}
                        onChange={(e) => setUtr(e.target.value.replace(/\s/g, ''))}
                        placeholder={getUtrPlaceholder(paymentMethod)} className="input-base"
                        maxLength={30} inputMode="text" />
                      <p className="text-xs mt-1" style={{ color: 'var(--ordermodelbgmesseges)' }}>
                        {paymentMethod === 'upi' ? 'Find UTR in your UPI app under payment history' : 'Find this in your bank SMS or transaction receipt'}
                      </p>
                    </div>
                    {utrError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm font-medium">
                        ⚠️ {utrError}
                      </div>
                    )}
                    <button type="submit" disabled={submitLoading}
                      className="w-full py-3.5 rounded-2xl font-black text-sm text-white tracking-widest uppercase disabled:opacity-40 transition-all active:scale-[0.98]"
                      style={{ background: 'var(--confirmbuttonbg)' }}>
                      {submitLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                          Submitting…
                        </span>
                      ) : "I've Paid — Place Order"}
                    </button>
                    <p className="text-center text-white text-xs">Your order will be confirmed after payment verification</p>
                  </form>
                </>
              )}
            </div>
          )}


          {/* ══ STEP 3: SUCCESS ═════════════════════════════════════ */}
          {step === 'success' && (
            <div className="px-6 py-8 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl pop-in"
                style={{ background: status.bg }}>
                {status.icon}
              </div>

              <h2 className="font-black text-2xl mb-2" style={{ color: status.color }}>{status.label}</h2>
              <p className="text-gray-200 text-sm leading-relaxed mb-4">{status.desc}</p>

              {/* Order type badge */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                  style={{
                    background: savedOrderType === 'takeaway' ? 'rgba(148,9,1,0.15)' : 'rgba(49,96,61,0.15)',
                    color: savedOrderType === 'takeaway' ? '#940901' : '#31603D',
                    border: `1px solid ${savedOrderType === 'takeaway' ? '#940901' : '#31603D'}`,
                  }}>
                  {savedOrderType === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                </span>
              </div>

              {/* Pickup token */}
              {savedOrderType === 'takeaway' && pickupToken && (
                <div className="mb-4 py-4 px-6 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#940901,#c41a0a)', boxShadow: '0 8px 24px rgba(148,9,1,0.4)' }}>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Your Pickup Token</p>
                  <p className="text-white font-black text-4xl tracking-widest">{pickupToken}</p>
                  <p className="text-white/60 text-xs mt-1">Show this at the counter</p>
                </div>
              )}

              {/* Payment verification notice */}
              {savedOrderType === 'takeaway' && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-left"
                  style={{
                    background: paymentStatus === 'paid' ? 'rgba(49,96,61,0.2)' : 'rgba(255,193,7,0.15)',
                    border: `1px solid ${paymentStatus === 'paid' ? '#31603D' : '#ffc107'}`,
                  }}>
                  <span className="text-lg">{paymentStatus === 'paid' ? '✅' : '⏳'}</span>
                  <div>
                    <p className="text-white text-xs font-black">
                      {paymentStatus === 'paid' ? 'Payment Verified!' : 'Payment Verification Pending'}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {paymentStatus === 'paid'
                        ? 'Your payment has been confirmed by the café.'
                        : 'Admin is verifying your payment. Kitchen will start once confirmed.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Order detail card */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-left mb-4 shadow-sm">
                <p className="text-[10px] font-black text-black uppercase tracking-widest mb-3">Order Summary</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-bold text-black">{name}</span>
                  </div>
                  {savedOrderType === 'dine-in' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Table</span>
                      <span className="font-bold text-black">{table}</span>
                    </div>
                  )}
                  {savedOrderType === 'takeaway' && phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-bold text-black">+91 {phone}</span>
                    </div>
                  )}
                  {savedOrderType === 'takeaway' && utr && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Txn ID</span>
                      <span className="font-bold text-black text-xs">{utr}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-1.5 mt-1.5 flex justify-between">
                    <span className="text-gray-500">Total</span>
                    <span className="font-black" style={{ color: '#31603D' }}>₹{savedTotal}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  {statusSteps.map((s, idx) => (
                    <React.Fragment key={s}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500"
                        style={{
                          background: idx <= currentIdx ? '#940901' : '#f3f4f6',
                          color: idx <= currentIdx ? 'white' : '#9ca3af',
                          transform: idx === currentIdx ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: idx === currentIdx ? '0 0 0 4px #94080161' : 'none',
                        }}>
                        {idx < currentIdx ? '✓' : idx + 1}
                      </div>
                      {idx < statusSteps.length - 1 && (
                        <div className="flex-1 h-1 mx-1 rounded-full"
                          style={{ background: idx < currentIdx ? '#940901' : '#f3f4f6' }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between px-0.5">
                  {['Received', 'Accepted', 'Cooking', savedOrderType === 'takeaway' ? 'Pickup' : 'Ready'].map((l, i) => (
                    <span key={l} className="text-[9px] font-bold"
                      style={{ color: i <= currentIdx ? '#940901' : '#838587' }}>{l}</span>
                  ))}
                </div>
              </div>

              {!['ready', 'completed'].includes(orderStatus) && (
                <p className="text-gray-100 text-xs mb-4 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"
                    style={{ animation: 'pulse 1.4s ease-in-out infinite' }} />
                  Updating every 3 seconds
                </p>
              )}

              <button onClick={handleClose}
                className="btn-primary w-full py-3.5 rounded-2xl text-sm tracking-widest uppercase"
                style={{ background: '#940801a8' }}>
                Back to Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderModal;