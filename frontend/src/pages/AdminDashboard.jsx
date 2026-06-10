import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cafeConfig } from '../config/cafeConfig';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import ChangePassword from '../components/ChangePassword';
import ShopToggle, { TakeawayToggle, AutoPayToggle } from '../components/ShopToggle';
import SalesAnalytics from '../components/SalesAnalytics';
import AnalyticsPanel from '../components/AnalyticsPanel';
import CouponsPage from './CouponsPage';
// ── WhatsApp helpers ───────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = cafeConfig.contact.whatsapp;


const formatSingleOrderWA = (order) => {
  const time = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  let msg = `🧾 *${cafeConfig.name} Order Summary*\n`;
  msg += `${'─'.repeat(26)}\n`;
  msg += `👤 Name: ${order.customerName}\n`;
  msg += `🪑 Table: ${order.tableNumber}\n`;
  msg += `🕐 Time: ${time}, ${date}\n`;
  msg += `${'─'.repeat(26)}\n`;
  msg += `*Items:*\n`;
  order.items.forEach((it) => {
    msg += `  • ${it.name} ×${it.quantity}  —  ₹${it.price * it.quantity}\n`;
  });
  msg += `${'─'.repeat(26)}\n`;
  msg += `💰 *Total: ₹${order.totalAmount}*`;
  return msg;
};

const formatAllOrdersWA = (orders) => {
  const totalSales = orders.reduce((s, o) => s + o.totalAmount, 0);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  let msg = `☕ *${cafeConfig.name} — Orders Export*\n📅 ${date}\n${'─'.repeat(28)}\n\n`;
  orders.forEach((o, i) => {
    msg += `*Order ${i + 1}*\n`;
    msg += `👤 ${o.customerName}   🪑 ${o.tableNumber}\n`;
    msg += `🕐 ${new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
    o.items.forEach((it) => { msg += `  • ${it.name} ×${it.quantity}  —  ₹${it.price * it.quantity}\n`; });
    msg += `💰 *₹${o.totalAmount}*\n\n`;
  });
  msg += `${'─'.repeat(28)}\n💵 *TOTAL: ₹${totalSales}*  |  📦 ${orders.length} Orders`;
  return msg;
};

const openWhatsApp = (msg) => {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
};

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  preparing: 'badge-preparing',
  ready: 'badge-ready',
  completed: 'badge-completed',
};

const NEXT_STATUS = { pending: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' };
const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed' };
const NEXT_LABELS = { pending: '✓ Accept', accepted: '🍳 Start Cooking', preparing: '✅ Mark Ready', ready: '🍽️ Complete' };
// const SUPER_CATS = ['Chinese', 'Snacks', 'Pasta & Maggie', 'Beverages', 'Combos',];
const SUPER_CATS = cafeConfig.superCategories;

// ── Reusable bits ──────────────────────────────────────────────────────────────
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
);

// Centered overlay modal wrapper
const Modal = ({ onClose, children }) => (
  <div
    className="fixed inset-0 bg-black/60 z-50 fade-in flex items-center justify-center px-4"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl text-center pop-in w-full max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

// ── Table QR Code Generator ───────────────────────────────────────────────────
const QRGenerator = () => {
  const [tableCount, setTableCount] = React.useState('');
  const [generated, setGenerated] = React.useState(false);

  const baseUrl = window.location.origin; // e.g. https://velvet-vault.netlify.app
  const count = Math.min(Math.max(parseInt(tableCount) || 0, 1), 50);

  const qrUrl = (n) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(`${baseUrl}?table=${n}`)}`;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    const tableNums = Array.from({ length: count }, (_, i) => i + 1);
    win.document.write(`
      <html><head><title>Table QR Codes — ${cafeConfig.name}</title>
      <style>
        body { margin: 0; font-family: 'Georgia', serif; background: #fff; }
        h1 { text-align: center; color: #982829; font-size: 22px; margin: 24px 0 4px; letter-spacing: 0.2em; text-transform: uppercase; }
        p  { text-align: center; color: #888; font-size: 12px; margin: 0 0 24px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 0 24px 40px; }
        .card { border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 16px 12px 12px; text-align: center; break-inside: avoid; }
        .card img { width: 140px; height: 140px; display: block; margin: 0 auto; }
        .label { font-size: 15px; font-weight: 900; color: #1a1a1a; margin-top: 10px; letter-spacing: 0.05em; }
        .sub   { font-size: 10px; color: #aaa; margin-top: 3px; word-break: break-all; }
        @media print { .grid { grid-template-columns: repeat(4, 1fr); } }
      </style></head><body>
      <h1>${cafeConfig.name}</h1>
      <p>Scan to order from your table</p>
      <div class="grid">
        ${tableNums.map((n) => `
          <div class="card">
            <img src="${qrUrl(n)}" alt="Table ${n} QR" />
            <div class="label">Table ${n}</div>
            <div class="sub">${baseUrl}?table=${n}</div>
          </div>`).join('')}
      </div>
      </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid rgba(214,153,60,0.2)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--admin), var(--accent))' }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 0h-2v2h2v-2zm0 4h-2v2h2v-2zm2-4h-2v2h2v-2zm0 4h-2v2h2v-2zm-4-8h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h-2v2h2v-2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-black text-base" style={{ color: 'var(--text-body)' }}>Table QR Codes</h2>
            <p className="text-xs text-gray-400">Generate & print QR codes for each table</p>
          </div>
        </div>

        {/* Input row */}
        <div className="flex gap-3 mb-5">
          <input
            type="number"
            min="1" max="50"
            value={tableCount}
            onChange={(e) => { setTableCount(e.target.value); setGenerated(false); }}
            placeholder="How many tables? (e.g. 8)"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none border"
            style={{ borderColor: 'rgba(214,153,60,0.4)', color: 'var(--text-body)', background: '#fafaf8' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(214,153,60,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(214,153,60,0.4)'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            onClick={() => { if (parseInt(tableCount) > 0) setGenerated(true); }}
            className="px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)', boxShadow: '0 4px 12px rgba(50,88,98,0.3)' }}
          >
            Generate
          </button>
        </div>

        {/* QR Grid */}
        {generated && parseInt(tableCount) > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
                <div key={n} className="flex flex-col items-center rounded-xl p-3 border"
                  style={{ borderColor: 'rgba(214,153,60,0.2)', background: '#fafaf8' }}>
                  <img
                    src={qrUrl(n)}
                    alt={`Table ${n}`}
                    className="w-full aspect-square rounded-lg"
                    style={{ maxWidth: 100 }}
                  />
                  <p className="font-black text-xs mt-2" style={{ color: '#940901' }}>Table {n}</p>
                </div>
              ))}
            </div>

            {/* Print all button */}
            <button
              onClick={handlePrint}
              className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--accent))', boxShadow: '0 4px 16px rgba(152,40,41,0.3)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
              </svg>
              Print All {count} QR Codes
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState('today'); // 'today' | 'yesterday' | 'all'
  const [adminName, setAdminName] = useState('Admin');
  const [unreadCount, setUnreadCount] = useState(0);

  // Menu form state
  const [menuForm, setMenuForm] = useState({
    superCategory: 'Snacks', subCategory: '', name: '', description: '',
    price: '', veg: true, image: '', available: true,
    halfPrice: '', fullPrice: '', halfDescription: '', fullDescription: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Confirm dialogs
  const [deleteMenuConfirm, setDeleteMenuConfirm] = useState(null);   // menu item id
  const [orderDeleteModal, setOrderDeleteModal] = useState(null);     // order object — NEW 2-option modal
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('velvet_vault_logo_url') || '');

  const today = new Date().toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [historyOrders, setHistoryOrders] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

  const pollRef = useRef(null);
  const knownOrderIdsRef = useRef(null);   // null = first fetch not yet done
  const titleFlashRef = useRef(null);
  const reminderRef = useRef(null);   // 2-minute unprepared-order reminder

  // ── Auth check ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(cafeConfig.admin.tokenKey);
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    try {
      // Add padding to handle tokens without correct base64 padding
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      setAdminName(payload.name || 'Admin');
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem(cafeConfig.admin.tokenKey);
        navigate('/admin/login', { replace: true });
        return;
      }
      setAuthReady(true);
    } catch (_) {
      // Token unreadable — clear and redirect once
      localStorage.removeItem(cafeConfig.admin.tokenKey);
      navigate('/admin/login', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(() => {
    localStorage.removeItem(cafeConfig.admin.tokenKey);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  // ── Notification sound — Web Audio API, no audio file needed ─────────────────
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Three rising tones: a pleasant "ding ding ding"
      [[880, 0, 0.22], [1100, 0.18, 0.22], [1320, 0.36, 0.35]].forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      });
    } catch (_) { /* AudioContext blocked — silently ignore */ }
  }, []);

  // ── Urgent reminder sound — faster, insistent pattern ───────────────────────
  const playReminderSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Four short urgent pulses
      [[660, 0, 0.12], [660, 0.16, 0.12], [660, 0.32, 0.12], [880, 0.48, 0.25]].forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      });
    } catch (_) { }
  }, []);
  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
    clearInterval(titleFlashRef.current);
    document.title = `${cafeConfig.name} Admin`;
  }, []);

  // ── Logo upload (admin only) ──────────────────────────────────────────────────
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { toast.error('Image too large. Max 1.5MB.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setLogoUploading(true);
      try {
        await api.put('/auth/logo', { logoUrl: base64 });
        localStorage.setItem('velvet_vault_logo_url', base64);
        toast.success('Logo updated! Refresh to see it in navbar.', { icon: '🖼️' });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to upload logo.');
        setLogoPreview(localStorage.getItem('velvet_vault_logo_url') || '');
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = async () => {
    setLogoUploading(true);
    try {
      await api.put('/auth/logo', { logoUrl: '' });
      localStorage.removeItem('velvet_vault_logo_url');
      setLogoPreview('');
      toast.success('Logo removed.');
    } catch (_) { toast.error('Failed to remove logo.'); }
    finally { setLogoUploading(false); }
  };

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = true) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await api.get('/orders');
      const incoming = res.data;

      // ── New-order detection ─────────────────────────────────────────────
      if (knownOrderIdsRef.current === null) {
        // Very first fetch: seed the known-IDs set, no alert
        knownOrderIdsRef.current = new Set(incoming.map((o) => o._id));
      } else {
        const newOrders = incoming.filter((o) => !knownOrderIdsRef.current.has(o._id));
        if (newOrders.length > 0) {
          // Add new IDs to the known set
          newOrders.forEach((o) => knownOrderIdsRef.current.add(o._id));

          // 1. Sound alert
          playNotificationSound();

          // 2. Tab-title flash (stops when clearNotifications is called)
          clearInterval(titleFlashRef.current);
          let show = true;
          titleFlashRef.current = setInterval(() => {
            document.title = show ? `🔔 New Order — ${cafeConfig.name}` : `${cafeConfig.name} Admin`;
            show = !show;
          }, 900);

          // 3. Increment bell badge
          setUnreadCount((c) => c + newOrders.length);

          // 4. Toast notification (max 3, then a summary)
          newOrders.slice(0, 3).forEach((order) => {
            toast.custom(() => (
              <div style={{
                background: 'linear-gradient(135deg, var(--admin-dark), var(--admin))',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                minWidth: '280px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                fontFamily: 'Montserrat, sans-serif',
              }}>
                <span style={{ fontSize: '24px', lineHeight: 1 }}>🛎️</span>
                <div>
                  <p style={{ color: 'var(--accent)', fontWeight: 900, fontSize: '13px', margin: 0, letterSpacing: '0.05em' }}>
                    New Order!
                  </p>
                  <p style={{ color: 'white', fontSize: '12px', margin: '4px 0 0', fontWeight: 600 }}>
                    {order.orderType === 'takeaway' ? '🥡 Takeaway' : `🪑 Table ${order.tableNumber}`}
                    {' · '}{order.customerName}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '3px 0 0' }}>
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''} · ₹{order.totalAmount}
                  </p>
                </div>
              </div>
            ), { duration: 7000, position: 'top-right' });
          });

          if (newOrders.length > 3) {
            toast(`+${newOrders.length - 3} more new orders`, { icon: '📦', duration: 5000 });
          }
        }
      }

      setOrders(incoming);
    } catch (_) {
      if (!silent) toast.error('Failed to refresh orders');
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [playNotificationSound]);

  const fetchMenu = useCallback(async () => { try { const r = await api.get('/menu'); setMenuItems(r.data); } catch (_) { } }, []);
  const fetchStats = useCallback(async () => { try { const r = await api.get('/orders/daily-stats'); setStats({ totalSales: r.data.totalSales, totalOrders: r.data.totalOrders }); } catch (_) { } }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = { from: fromDate, to: toDate };
      if (historyTypeFilter !== 'all') params.orderType = historyTypeFilter;
      if (historyStatusFilter !== 'all') params.status = historyStatusFilter;
      const res = await api.get('/orders/history', { params });
      setHistoryOrders(res.data.orders || []);
      setHistorySummary(res.data.summary || null);
    } catch (_) { toast.error('Failed to load order history'); }
    finally { setHistoryLoading(false); }
  }, [fromDate, toDate, historyTypeFilter, historyStatusFilter]);

  const setQuickDate = (type) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (type === 'today') {
      setFromDate(today); setToDate(today);
    } else if (type === 'yesterday') {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      const ys = y.toISOString().split('T')[0];
      setFromDate(ys); setToDate(ys);
    } else if (type === 'week') {
      const w = new Date(now); w.setDate(now.getDate() - 6);
      setFromDate(w.toISOString().split('T')[0]); setToDate(today);
    } else if (type === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(m.toISOString().split('T')[0]); setToDate(today);
    }
  };

  const exportCSV = () => {
    if (!historyOrders.length) { toast('No orders to export'); return; }
    const headers = ['Date', 'Time', 'Customer', 'Phone', 'Table', 'Type', 'Items', 'Amount', 'Status', 'Payment', 'Token/UTR'];
    const rows = historyOrders.map((o) => [
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      o.customerName,
      o.phoneNumber || '',
      o.tableNumber,
      o.orderType || 'dine-in',
      o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
      `Rs.${o.totalAmount}`,
      o.status,
      o.paymentStatus || '',
      o.orderType === 'takeaway' ? (o.pickupToken || o.utrNumber || '') : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${fromDate}_to_${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!', { icon: '📥' });
  };

  const exportHistoryWA = () => {
    if (!historyOrders.length) { toast('No orders to export'); return; }
    const s = historySummary;
    const from = new Date(fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const to = new Date(toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // ── Build coupon usage map from orders ────────────────────────────────────
    const couponMap = {};
    historyOrders.forEach((o) => {
      if (o.couponCode) {
        if (!couponMap[o.couponCode]) couponMap[o.couponCode] = { uses: 0, saved: 0 };
        couponMap[o.couponCode].uses += 1;
        couponMap[o.couponCode].saved += o.discountAmount || 0;
      }
    });
    const couponEntries = Object.entries(couponMap).sort((a, b) => b[1].uses - a[1].uses);
    const totalDiscountGiven = couponEntries.reduce((sum, [, v]) => sum + v.saved, 0);

    let msg = `📊 *${cafeConfig.name} — Order History*\n`;
    msg += `📅 ${from} – ${to}\n`;
    msg += `${'─'.repeat(28)}\n`;
    msg += `📦 Total Orders: *${s?.totalOrders || historyOrders.length}*\n`;
    msg += `💰 Total Sales:  *₹${(s?.totalSales || 0).toLocaleString()}*\n`;
    msg += `🍽️ Dine In:   ${s?.dineInCount || 0}  (₹${(s?.dineInSales || 0).toLocaleString()})\n`;
    msg += `🛍️ Takeaway:  ${s?.takeawayCount || 0}  (₹${(s?.takeawaySales || 0).toLocaleString()})\n`;
    if (couponEntries.length > 0) {
      msg += `${'─'.repeat(28)}\n`;
      msg += `🏷️ *Coupon Usage:*\n`;
      couponEntries.forEach(([code, data]) => {
        msg += `  • ${code} — used ${data.uses}× — saved ₹${data.saved.toLocaleString()}\n`;
      });
      msg += `💸 Total Discount Given: *₹${totalDiscountGiven.toLocaleString()}*\n`;
    }
    if (s?.topItems?.length) {
      msg += `${'─'.repeat(28)}\n`;
      msg += `*Top Items:*\n`;
      s.topItems.slice(0, 5).forEach((item, i) => {
        msg += `${i + 1}. ${item.name} ×${item.qty} — ₹${item.revenue}\n`;
      });
    }
    msg += `${'─'.repeat(28)}\n`;
    msg += `_Exported from ${cafeConfig.name} Admin_`;
    openWhatsApp(msg);
  };

  useEffect(() => {
    if (!authReady) return;  // ← wait for token to be confirmed
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOrders(true), fetchMenu(), fetchStats()]);
      setLoading(false);
    };
    init();
    pollRef.current = setInterval(() => fetchOrders(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [authReady]);  // ← was [], now depends on authReady

  // Clear notifications when the window regains focus on the orders tab
  useEffect(() => {
    const onFocus = () => { if (tab === 'orders') clearNotifications(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [tab, clearNotifications]);

  // ── 2-minute reminder for orders not yet marked "preparing" ──────────────────
  useEffect(() => {
    if (!authReady) return;

    reminderRef.current = setInterval(() => {
      // Use the latest orders via functional state read
      setOrders((currentOrders) => {
        const unprepared = currentOrders.filter(
          (o) => o.status === 'pending' || o.status === 'accepted'
        );

        if (unprepared.length === 0) return currentOrders; // nothing to remind

        // Play urgent sound
        playReminderSound();

        // Flash tab title
        clearInterval(titleFlashRef.current);
        let show = true;
        titleFlashRef.current = setInterval(() => {
          document.title = show ? `⚠️ ${unprepared.length} Order${unprepared.length > 1 ? 's' : ''} Waiting!` : `${cafeConfig.name} Admin`;
          show = !show;
        }, 700);

        // Show one grouped reminder toast
        toast.custom(() => (
          <div style={{
            background: 'linear-gradient(135deg,#7c1d1d,#991b1b)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            minWidth: '290px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>⚠️</span>
            <div>
              <p style={{ color: '#fca5a5', fontWeight: 900, fontSize: '13px', margin: 0, letterSpacing: '0.04em' }}>
                Reminder — {unprepared.length} Order{unprepared.length > 1 ? 's' : ''} Waiting!
              </p>
              {unprepared.slice(0, 3).map((o) => (
                <p key={o._id} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: '4px 0 0', fontWeight: 600 }}>
                  {o.orderType === 'takeaway' ? '🥡 Takeaway' : `🪑 Table ${o.tableNumber}`}
                  {' · '}{o.customerName}{' · '}
                  <span style={{ color: '#fca5a5' }}>
                    {o.status === 'pending' ? 'Not yet accepted' : 'Accepted — mark Preparing!'}
                  </span>
                </p>
              ))}
              {unprepared.length > 3 && (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '4px 0 0' }}>
                  +{unprepared.length - 3} more…
                </p>
              )}
            </div>
          </div>
        ), { duration: 10000, position: 'top-right' });

        return currentOrders; // no state change, just side-effects
      });
    }, 2 * 60 * 1000); // every 2 minutes

    return () => clearInterval(reminderRef.current);
  }, [authReady, playReminderSound]);


  // ── Midnight auto-reset — refresh orders + stats when day rolls over ─────────
  useEffect(() => {
    if (!authReady) return;
    const scheduleReset = () => {
      const now = new Date();
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime();
      return setTimeout(async () => {
        // Reset orders + stats for the new day
        setOrders([]);
        knownOrderIdsRef.current = null; // re-seed on next poll
        await Promise.all([fetchOrders(true), fetchStats()]);
        toast('🌅 New day started — orders refreshed!', { duration: 5000 });
        // Schedule the next midnight reset
        scheduleReset();
      }, msUntilMidnight);
    };
    const t = scheduleReset();
    return () => clearTimeout(t);
  }, [authReady, fetchOrders, fetchStats]);

  // ── Order status update ───────────────────────────────────────────────────────
  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}`, { status });
      setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
      fetchStats();
      toast.success(`Order marked as ${STATUS_LABELS[status]}`);
    } catch (_) { toast.error('Failed to update status'); }
  };

  // ── Verify takeaway payment ───────────────────────────────────────────────────
  const verifyPayment = async (id) => {
    try {
      await api.put(`/orders/${id}`, { paymentStatus: 'paid' });
      setOrders((prev) => prev.map((o) => o._id === id ? { ...o, paymentStatus: 'paid' } : o));
      toast.success('Payment verified ✅');
    } catch (_) { toast.error('Failed to verify payment'); }
  };

  // ── Delete order — direct (no WhatsApp) ──────────────────────────────────────
  const deleteOrderDirect = async (order) => {
    setActionLoading(true);
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      fetchStats();
      toast.success('Order deleted');
    } catch (_) { toast.error('Failed to delete order'); }
    finally { setActionLoading(false); setOrderDeleteModal(null); }
  };

  // ── Delete order — send to WhatsApp then delete ───────────────────────────────
  const deleteOrderWithWA = async (order) => {
    setActionLoading(true);
    openWhatsApp(formatSingleOrderWA(order));
    await new Promise((r) => setTimeout(r, 800));
    try {
      await api.delete(`/orders/${order._id}`);
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
      fetchStats();
      toast.success('Sent to WhatsApp & deleted');
    } catch (_) { toast.error('Failed to delete order'); }
    finally { setActionLoading(false); setOrderDeleteModal(null); }
  };

  // ── Clear ALL orders ──────────────────────────────────────────────────────────
  const confirmClearAll = async () => {
    if (!orders.length) { toast('No orders to clear'); setClearAllConfirm(false); return; }
    setActionLoading(true);
    openWhatsApp(formatAllOrdersWA(orders));
    await new Promise((r) => setTimeout(r, 800));
    try {
      await api.delete('/orders');
      setOrders([]);
      fetchStats();
      toast.success('All orders exported & cleared');
    } catch (_) { toast.error('Failed to clear orders'); }
    finally { setActionLoading(false); setClearAllConfirm(false); }
  };

  // ── Menu CRUD ─────────────────────────────────────────────────────────────────
  const openAddForm = () => {
    setEditingId(null);
    setMenuForm({ superCategory: 'Snacks', subCategory: '', name: '', description: '', price: '', veg: true, image: '', available: true, halfPrice: '', fullPrice: '', halfDescription: '', fullDescription: '' });
    setFormError(''); setFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingId(item._id);
    setMenuForm({
      superCategory: item.superCategory,
      subCategory: item.subCategory,
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      veg: item.veg,
      image: item.image || '',
      available: item.available,
      halfPrice: item.halfPrice != null ? String(item.halfPrice) : '',
      fullPrice: item.fullPrice != null ? String(item.fullPrice) : '',
      halfDescription: item.halfDescription || '',
      fullDescription: item.fullDescription || '',
    });
    setFormError(''); setFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!menuForm.name.trim() || !menuForm.subCategory.trim()) return setFormError('Name and subcategory are required.');
    const hasPrice = menuForm.price !== '' && menuForm.price !== null;
    const hasHalfPrice = menuForm.halfPrice !== '' && menuForm.halfPrice !== null;
    const hasFullPrice = menuForm.fullPrice !== '' && menuForm.fullPrice !== null;
    if (!hasPrice && !hasHalfPrice && !hasFullPrice) return setFormError('At least one price (Regular, Half, or Full) is required.');
    setFormLoading(true); setFormError('');
    try {
      // Derive fallback price: fullPrice → halfPrice → price
      const resolvedPrice = hasPrice
        ? Number(menuForm.price)
        : hasFullPrice
          ? Number(menuForm.fullPrice)
          : Number(menuForm.halfPrice);
      const payload = {
        ...menuForm,
        price: resolvedPrice,
        halfPrice: hasHalfPrice ? Number(menuForm.halfPrice) : null,
        fullPrice: hasFullPrice ? Number(menuForm.fullPrice) : null,
        halfDescription: menuForm.halfDescription || '',
        fullDescription: menuForm.fullDescription || '',
      };
      if (editingId) { await api.put(`/menu/${editingId}`, payload); toast.success('Item updated'); }
      else { await api.post('/menu', payload); toast.success('Item added'); }
      await fetchMenu(); setFormOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save.');
    } finally { setFormLoading(false); }
  };

  const handleDeleteMenuItem = async (id) => {
    try {
      await api.delete(`/menu/${id}`);
      setMenuItems((prev) => prev.filter((i) => i._id !== id));
      setDeleteMenuConfirm(null);
      toast.success('Item deleted');
    } catch (_) { toast.error('Failed to delete item'); }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { available: !item.available });
      setMenuItems((prev) => prev.map((i) => i._id === item._id ? { ...i, available: !i.available } : i));
      toast.success(item.available ? 'Marked unavailable' : 'Marked available');
    } catch (_) { toast.error('Failed to update availability'); }
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const filteredOrders = orders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .filter((o) => orderTypeFilter === 'all' || (o.orderType || 'dine-in') === orderTypeFilter)
    .filter((o) => {
      if (orderDateFilter === 'all') return true;
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      const now = new Date();
      if (orderDateFilter === 'today') return orderDate === now.toISOString().split('T')[0];
      if (orderDateFilter === 'yesterday') {
        const y = new Date(now); y.setDate(now.getDate() - 1);
        return orderDate === y.toISOString().split('T')[0];
      }
      return true;
    });

  // Group filteredOrders by date for day-separator rendering
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const dateKey = new Date(order.createdAt).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {});
  const groupedOrderEntries = Object.entries(groupedOrders); // [ [dateLabel, orders[]], ... ]

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-montserrat bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--admin-accent)] rounded-full spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  // ── CSS helpers using inline styles (dark mode via data- or class on root) ────
  // const { isDark } = useTheme();
  const C = {
    bg: isDark ? 'bg-[var(--admin-bg-dark)]' : 'bg-[var(--admin-bg)]',
    card: isDark ? 'bg-[var(--admin-card-dark)] border border-[var(--admin-border-dark)]' : 'bg-white border border-[var(--admin-card)]',
    text: isDark ? 'text-[var(--admin-text-dark)]' : 'text-[var(--admin-text)]',
    muted: isDark ? 'text-[var(--admin-muted-dark)]' : 'text-[var(--admin-muted)]',
    border: isDark ? 'border-[var(--admin-border-dark)]' : 'border-[var(--admin-border)]',
    input: isDark ? 'bg-[var(--admin-input-dark)] border-[var(--admin-input-border-dark)] text-[var(--admin-input-text-dark)]' : 'bg-[var(--admin-input)] border-[var(--admin-input-border)] text-[var(--admin-input-text)]',
  };

  return (
    <div className={`min-h-screen font-montserrat ${C.bg} transition-colors duration-300`}>

      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 shadow-lg" style={{ background: 'linear-gradient(135deg, var(--admin-dark) 0%, var(--admin) 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {localStorage.getItem('velvet_logo_url') ? (
              <img src={localStorage.getItem('velvet_logo_url')} alt="logo" className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M2 21h18v-2H2v2zM20 8H4V5h16v3zm-2 7H6V9h12v6z" /></svg>
              </div>
            )}
            <div>
              <p className="font-black text-white text-sm tracking-widest">{cafeConfig.nameLine1}</p>
              <p className="text-white/40 text-[10px]">Admin · {cafeConfig.adminname}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full" style={{ animation: 'pulse 1.5s ease infinite' }}>
                {pendingCount} NEW
              </div>
            )}

            {/* Notification bell */}
            <button
              onClick={() => { setTab('orders'); clearNotifications(); }}
              title="Notifications"
              className="relative w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center"
                  style={{ animation: 'pulse 1.5s ease infinite' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Refresh */}
            <button onClick={() => fetchOrders(false)} disabled={refreshing} title="Refresh"
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-50">
              <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-white ${refreshing ? 'spin' : ''}`}>
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Logout */}
            <button onClick={handleLogout} title="Logout"
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Stats Bar ──────────────────────────────────────────────────────── */}
      <div className={`${C.card} border-b shadow-sm`} style={{ borderBottom: undefined }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-3 overflow-x-auto no-scrollbar">
          {[
            { label: "Today's Sales", value: `₹${stats.totalSales.toLocaleString()}`, color: 'var(--admin-stat-sales)' },
            { label: 'Orders Today', value: stats.totalOrders, color: undefined },
            { label: 'Pending', value: pendingCount, color: 'var(--admin-stat-pending)' },
            { label: 'Available', value: menuItems.filter((i) => i.available).length, color: 'var(--admin-stat-available)' },
          ].map((s) => (
            <div key={s.label} className={`flex-shrink-0 ${C.card} rounded-xl px-4 py-2.5 text-center min-w-[90px] shadow-sm`}>
              <p className="font-black text-lg leading-none" style={{ color: s.color || (document.documentElement.classList.contains('dark') ? '#f3f4f6' : 'var(--text-body)') }}>
                {s.value}
              </p>
              <p className={`${C.muted} text-[10px] font-bold uppercase tracking-wide mt-1`}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div
        className={`${C.card} sticky top-[60px] z-30 shadow-sm`}
        style={{ border: undefined }}
      >
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center gap-2">
          {[
            { id: 'orders', label: 'Orders', badge: pendingCount },
            { id: 'menu', label: 'Menu' },
            { id: 'stats', label: 'Reports' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'history', label: 'History' },
            { id: 'settings', label: 'Settings' },
            // { id: 'coupons', label: '🏷️ Coupons' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'orders') clearNotifications();
              }}
              className="flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wide border-b-2 transition-all relative text-center"
              style={{
                borderBottomColor: tab === t.id ? 'var(--admin-tab-active)' : 'transparent',
                color: tab === t.id ? 'var(--admin-tab-active)' : 'var(--admin-tab-inactive)',
              }}
            >
              {t.label}

              {t.badge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-24 gap-6">

        {/* ══ ORDERS TAB ═════════════════════════════════════════════════════ */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {/* Filter + Clear All row */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 pb-0.5">
                {['all', 'pending', 'accepted', 'preparing', 'ready', 'completed'].map((s) => {
                  const count = s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;
                  return (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all capitalize"
                      style={{
                        background: statusFilter === s ? 'var(--admin)' : (document.documentElement.classList.contains('dark') ? '#374151' : 'white'),
                        color: statusFilter === s ? 'white' : 'var(--admin-tab-inactive)',
                        borderColor: statusFilter === s ? 'var(--admin)' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                      }}
                    >
                      {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
                    </button>
                  );
                })}
              </div>
              {orders.length > 0 && (
                <button onClick={() => setClearAllConfirm(true)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-700 hover:bg-red-100 transition-all">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  Clear All
                </button>
              )}
            </div>

            {/* Date filter row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { id: 'today', label: "Today" },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'all', label: 'All Days' },
              ].map((d) => (
                <button key={d.id} onClick={() => setOrderDateFilter(d.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={{
                    background: orderDateFilter === d.id ? 'var(--accent-dark,#b45309)' : (document.documentElement.classList.contains('dark') ? '#374151' : 'white'),
                    color: orderDateFilter === d.id ? 'white' : 'var(--admin-tab-inactive)',
                    borderColor: orderDateFilter === d.id ? 'var(--accent-dark,#b45309)' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                  }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* Order type filter row */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar pb-0.5">
              {[
                // { id: 'all', label: 'All Types' },
                { id: 'dine-in', label: '🍽️ Dine In' },
                // { id: 'takeaway', label: '🛍️ Takeaway' },
              ].map((t) => (
                <button key={t.id} onClick={() => setOrderTypeFilter(t.id)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                  style={{
                    background: orderTypeFilter === t.id ? 'var(--admin-takeaway-badge)' : (document.documentElement.classList.contains('dark') ? '#374151' : 'white'),
                    color: orderTypeFilter === t.id ? 'white' : 'var(--admin-tab-inactive)',
                    borderColor: orderTypeFilter === t.id ? 'var(--admin-takeaway-badge)' : (document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb'),
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Orders list — grouped by date */}
            {filteredOrders.length === 0 ? (
              <div className={`py-16 text-center ${C.card} rounded-2xl shadow-sm`}>
                <div className="text-5xl mb-3">📋</div>
                <p className={`font-bold ${C.text}`}>No orders here</p>
                <p className={`${C.muted} text-sm mt-1`}>Orders appear in real-time (every 5s)</p>
              </div>
            ) : groupedOrderEntries.map(([dateLabel, dayOrders]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Date separator */}
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px" style={{ background: 'rgba(214,153,60,0.25)' }} />
                  <span
                    className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: 'rgba(214,153,60,0.12)', color: 'var(--accent-dark,#b45309)', border: '1px solid rgba(214,153,60,0.25)' }}
                  >
                    📅 {dateLabel} · {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(214,153,60,0.25)' }} />
                </div>
                {dayOrders.map((order) => (
              <div key={order._id}
                className={`${C.card} rounded-2xl overflow-hidden transition-all duration-300 shadow-sm`}
                style={{ borderLeft: order.status === 'pending' ? '3px solid var(--admin-pending-border)' : '3px solid transparent' }}
              >
                {/* Header */}
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-black ${C.text} text-sm`}>{order.customerName}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,123,139,0.1)', color: 'var(--admin-table-badge)' }}>{order.tableNumber}</span>
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          background: (order.orderType || 'dine-in') === 'takeaway'
                            ? 'rgba(148,9,1,0.12)' : 'rgba(49,96,61,0.12)',
                          color: (order.orderType || 'dine-in') === 'takeaway'
                            ? 'var(--admin-takeaway-badge)' : 'var(--admin-dine-in-badge)',
                          border: `1px solid ${(order.orderType || 'dine-in') === 'takeaway' ? 'var(--admin-takeaway-badge)' : 'var(--admin-dine-in-badge)'}`,
                        }}
                      >
                        {(order.orderType || 'dine-in') === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                    </div>
                    <p className={`${C.muted} text-xs mt-1`}>
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-base" style={{ color: 'var(--admin-order-amount)' }}>₹{order.totalAmount}</p>
                    <p className={`${C.muted} text-xs`}>{order.items.length} item(s)</p>
                  </div>
                </div>

                {/* Items */}
                <div className={`px-4 pb-3 space-y-1 border-t ${C.border} pt-2`}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className={`${C.text} font-medium flex items-center gap-1.5 flex-wrap`}>
                        {item.name}
                        {item.selectedSize && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{
                              background: item.selectedSize === 'half' ? 'rgba(214,153,60,0.2)' : 'rgba(0,123,139,0.12)',
                              color: item.selectedSize === 'half' ? 'var(--accent-dark)' : 'var(--admin-accent)',
                            }}
                          >
                            {item.selectedSize === 'half' ? 'Half' : 'Full'}
                          </span>
                        )}
                        <span className={`${C.muted} font-normal`}>×{item.quantity}</span>
                      </span>
                      <span className={`${C.muted} text-xs`}>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {order.note && <p className={`${C.muted} text-xs italic mt-1.5 border-t ${C.border} pt-1.5`}>📝 {order.note}</p>}
                </div>


                {/* Coupon / Discount row */}
                {order.couponCode && (
                  <div className={`px-4 pb-2.5 border-t ${C.border} pt-2 flex items-center justify-between gap-2 flex-wrap`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-widest"
                        style={{
                          background: 'rgba(214,153,60,0.12)',
                          color: 'var(--accent-dark, #b45309)',
                          border: '1px solid rgba(214,153,60,0.35)',
                          fontFamily: 'monospace',
                        }}
                      >
                        🏷️ {order.couponCode}
                      </span>
                      {order.discountAmount > 0 && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
                        >
                          − ₹{order.discountAmount} saved
                        </span>
                      )}
                    </div>
                    {order.originalAmount > 0 && order.originalAmount !== order.totalAmount && (
                      <span className={`text-xs ${C.muted}`}>
                        <span style={{ textDecoration: 'line-through' }}>₹{order.originalAmount}</span>
                        {' → '}
                        <span className="font-black" style={{ color: '#059669' }}>₹{order.totalAmount}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Takeaway — pickup token, UTR, payment method, verify button */}
                {order.orderType === 'takeaway' && (
                  <div className={`px-4 pb-3 border-t ${C.border} pt-2 flex flex-wrap gap-2 items-center`}>
                    {order.phoneNumber && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(49,96,61,0.1)', color: 'var(--admin-phone-pill)', border: '1px solid rgba(49,96,61,0.25)' }}>
                        📞 {order.phoneNumber}
                      </span>
                    )}
                    {order.pickupToken && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black"
                        style={{ background: 'rgba(148,9,1,0.1)', color: 'var(--admin-pickup-pill)', border: '1px solid rgba(148,9,1,0.25)' }}>
                        🎫 {order.pickupToken}
                      </span>
                    )}
                    {order.utrNumber && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(0,123,139,0.08)', color: 'var(--admin-utr-pill)', border: '1px solid rgba(0,123,139,0.2)' }}>
                        🔗 {order.utrNumber}
                      </span>
                    )}
                    {order.paymentMethod && order.paymentMethod !== 'not_required' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(214,153,60,0.1)', color: 'var(--admin-payment-pill)', border: '1px solid rgba(214,153,60,0.25)' }}>
                        {order.paymentMethod === 'upi' ? '📱 UPI' : order.paymentMethod === 'debit-card' ? '💳 Debit' : '💳 Credit'}
                      </span>
                    )}
                    {order.paymentStatus === 'pending_verification' && (
                      <button onClick={() => verifyPayment(order._id)}
                        className="ml-auto px-3 py-1 rounded-lg text-xs font-black text-white active:scale-95 transition-all"
                        style={{ background: `linear-gradient(135deg, var(--admin-verified-pill), #047857)` }}>
                        ✓ Verify Payment
                      </button>
                    )}
                    {order.paymentStatus === 'paid' && (
                      <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(5,150,105,0.1)', color: 'var(--admin-verified-pill)', border: '1px solid rgba(5,150,105,0.25)' }}>
                        ✅ Verified
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className={`border-t ${C.border} px-4 py-2.5 flex gap-2`}>
                  {order.status !== 'completed' && (
                    <button onClick={() => updateOrderStatus(order._id, NEXT_STATUS[order.status])}
                      className="flex-1 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all active:scale-[0.98] text-white"
                      style={{ background: order.status === 'pending' ? `linear-gradient(135deg, var(--admin-btn-accept), #16a34a)` : order.status === 'accepted' ? `linear-gradient(135deg, var(--admin-btn-cook), #1d4ed8)` : order.status === 'preparing' ? `linear-gradient(135deg, var(--admin-btn-ready), #047857)` : `linear-gradient(135deg, var(--admin-btn-complete), #4b5563)` }}>
                      {NEXT_LABELS[order.status]}
                    </button>
                  )}

                  {/* WA share only */}
                  <button onClick={() => openWhatsApp(formatSingleOrderWA(order))}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-700 hover:bg-green-100 transition-all flex items-center gap-1"
                    title="Share to WhatsApp">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                    </svg>
                    WA
                  </button>

                  {/* Delete — opens 2-option modal */}
                  <button onClick={() => setOrderDeleteModal(order)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-200 dark:border-red-700 hover:bg-red-100 transition-all"
                    title="Delete order">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                  </button>
                </div>
              </div>
              ))}
            </div>
          ))}
        </div>
        )}
        {/* ══ MENU TAB ═══════════════════════════════════════════════════════ */}
        {tab === 'menu' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`font-black ${C.text} text-base`}>Menu Items <span className={`${C.muted} font-normal`}>({menuItems.length})</span></h2>
              <button onClick={openAddForm} className="text-white text-xs font-black px-4 py-2 rounded-full active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)' }}>
                + Add Item
              </button>
            </div>

            {SUPER_CATS.map((cat) => {
              const catItems = menuItems.filter((i) => i.superCategory === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--admin-menu-divider), transparent)' }} />
                    <h3 className="font-black text-xs uppercase tracking-widest px-2" style={{ color: 'var(--admin-menu-cat-title)' }}>{cat}</h3>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg, var(--admin-menu-divider), transparent)' }} />
                  </div>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <div key={item._id} className={`${C.card} rounded-xl p-3 flex gap-3 shadow-sm transition-opacity ${!item.available ? 'opacity-50' : ''}`}>
                        <img src={item.image || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'} alt={item.name}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100'; }}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-700" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate">{item.name}</p>
                              <p className="text-gray-500 dark:text-gray-300 text-xs mt-0.5">{item.subCategory} · <span style={{ color: 'var(--admin-menu-price)' }} className="font-bold">₹{item.price}</span></p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 items-center">
                              <button onClick={() => toggleAvailability(item)}
                                className="text-xs px-2 py-1 rounded-lg font-bold border transition-all"
                                style={item.available ? { background: 'var(--admin-menu-on-bg)', color: '#940901', borderColor: 'var(--admin-menu-on-border)' } : { background: document.documentElement.classList.contains('dark') ? '#374151' : '#f3f4f6', color: 'var(--admin-tab-inactive)', borderColor: document.documentElement.classList.contains('dark') ? '#4b5563' : '#e5e7eb' }}>
                                {item.available ? 'ON' : 'OFF'}
                              </button>
                              <button onClick={() => openEditForm(item)} className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${C.muted} hover:text-gray-600 dark:hover:text-gray-200 transition-colors`}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                              </button>
                              <button onClick={() => setDeleteMenuConfirm(item._id)} className={`p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 ${C.muted} hover:text-red-500 transition-colors`}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ STATS TAB ══════════════════════════════════════════════════════ */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Today's Revenue", value: `\`₹${stats.totalSales.toLocaleString()}\``, color: 'var(--admin-stat-sales)' },
                { label: 'Total Orders', value: stats.totalOrders, color: undefined },
                { label: 'Completed', value: orders.filter((o) => o.status === 'completed').length, color: 'var(--admin-stat-available)' },
                { label: 'Pending', value: pendingCount, color: 'var(--admin-stat-pending)' },
              ].map((s) => (
                <div key={s.label} className={`${C.card} rounded-2xl p-4 text-center shadow-sm`}>
                  <p className="font-black text-2xl" style={{ color: s.color || (document.documentElement.classList.contains('dark') ? '#f3f4f6' : 'var(--text-body)') }}>{s.value}</p>
                  <p className={`${C.muted} text-xs font-bold uppercase tracking-wide mt-1`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
              <h3 className={`font-black ${C.text} text-base mb-4`}>Status Breakdown</h3>
              {['pending', 'accepted', 'preparing', 'ready', 'completed'].map((s) => {
                const count = orders.filter((o) => o.status === s).length;
                const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-bold ${C.muted} w-20 capitalize`}>{STATUS_LABELS[s]}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--admin-accent), var(--admin-accent-dark))' }} />
                    </div>
                    <span className={`text-xs font-black ${C.text} w-6 text-right`}>{count}</span>
                  </div>
                );
              })}
            </div>

            {orders.length > 0 && (
              <button onClick={() => openWhatsApp(formatAllOrdersWA(orders))}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm tracking-wide text-white transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                Export All Orders to WhatsApp
              </button>
            )}
          </div>
        )}

        {/* ══ SETTINGS TAB ═══════════════════════════════════════════════════ */}
        {tab === 'settings' && (
          <div className="space-y-5">

            {/* ── Operational Controls — all 3 toggles ── */}
            <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--admin), var(--accent), #528FF0)' }} />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: 'var(--admin-accent)' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                  <h2 className={`font-black text-base ${C.text}`}>Operational Controls</h2>
                </div>
                <p className={`text-xs ${C.muted} mb-4`}>
                  Changes take effect instantly for all customers
                </p>
                <div className="flex flex-wrap gap-2">
                  <ShopToggle />
                  <TakeawayToggle />
                  <AutoPayToggle />
                </div>
                <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--admin-border)' }}>
                  <p className={`text-[11px] ${C.muted}`}>🏪 <strong>Shop</strong> — opens or closes all ordering for customers</p>
                  <p className={`text-[11px] ${C.muted}`}>🥡 <strong>Takeaway</strong> — hides takeaway option from customer menu</p>
                  <p className={`text-[11px] ${C.muted}`}>⚡ <strong>Auto Pay</strong> — Razorpay checkout (ON) vs manual UPI + UTR (OFF)</p>
                </div>
              </div>
            </div>


            {/* ── Coupons Management ───────────────────── */}
            <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
              <div
                className="h-1 w-full"
                style={{
                  background: 'linear-gradient(90deg, var(--admin), var(--accent))'
                }}
              />
              <div className="p-5">
                <h2 className={`font-black text-base mb-4 ${C.text}`}>
                  🏷️ Coupon Management
                </h2>

                <CouponsPage C={C} />
              </div>
            </div>

            {/* ── Push Notifications ── */}
            {pushSupported && (
              <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--admin), var(--accent))' }} />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: pushSubscribed ? 'linear-gradient(135deg, var(--admin-stat-available), #047857)' : 'linear-gradient(135deg, var(--admin), var(--admin-dark))' }}>
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className={`font-black text-base ${C.text}`}>Push Notifications</h2>
                        <p className={`text-xs ${C.muted}`}>
                          {pushSubscribed
                            ? '✅ Active on this device — works even when tab is closed'
                            : 'Get alerted even when tab is closed or screen is off'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={pushSubscribed ? pushUnsubscribe : pushSubscribe}
                      disabled={pushLoading}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black text-white transition-all disabled:opacity-50"
                      style={{
                        background: pushSubscribed
                          ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                          : 'linear-gradient(135deg, var(--admin-stat-available), #047857)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      {pushLoading ? '…' : pushSubscribed ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  {pushSubscribed && (
                    <p className={`text-[11px] ${C.muted} mt-3 pt-3 border-t ${C.border}`}>
                      💡 Enable on each device/browser you want to receive alerts on. Each one subscribes separately.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Logo Upload (admin only) ── */}
            <div className={`${C.card} rounded-2xl shadow-sm overflow-hidden`}>
              {/* Card header strip */}
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--primary-dark), var(--accent), var(--admin))' }} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)' }}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`font-black text-base ${C.text}`}>{cafeConfig.type} Logo</h2>
                    <p className={`text-xs ${C.muted}`}>Displayed in navbar for all customers</p>
                  </div>
                </div>

                {/* Preview row */}
                <div className="flex items-center gap-4 mb-4">
                  {/* Logo preview circle */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border-2"
                    style={{ borderColor: 'rgba(214,153,60,0.4)', background: 'rgba(214,153,60,0.08)' }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-9 h-9" style={{ fill: 'var(--accent)', opacity: 0.45 }}>
                        <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.93 0 3.5-1.57 3.5-3.5S20.43 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.83 0 1.5.67 1.5 1.5S19.33 8 18.5 8zM4 19h16v2H4z" />
                      </svg>
                    )}
                  </div>

                  {/* Upload area */}
                  <div className="flex-1 space-y-2">
                    <p className={`text-xs font-bold uppercase tracking-wider ${C.muted}`}>Upload New Logo</p>
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={logoUploading}
                      />
                      <span
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all select-none"
                        style={{
                          background: logoUploading
                            ? 'rgba(50,88,98,0.5)'
                            : 'linear-gradient(135deg, var(--admin), var(--admin-dark))',
                          cursor: logoUploading ? 'not-allowed' : 'pointer',
                          fontFamily: 'Poppins,sans-serif',
                          boxShadow: '0 4px 12px rgba(50,88,98,0.3)',
                        }}
                      >
                        {logoUploading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                            Uploading…
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                            </svg>
                            Choose Image
                          </>
                        )}
                      </span>
                    </label>
                    <p className={`text-xs ${C.muted}`}>PNG, JPG, WebP · Max 1.5 MB</p>
                  </div>
                </div>

                {/* Remove button — shown only when logo exists */}
                {logoPreview && (
                  <button
                    onClick={handleLogoRemove}
                    disabled={logoUploading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 mt-1"
                    style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}
                  >
                    🗑️ Remove Logo
                  </button>
                )}
              </div>
            </div>

            {/* ── Change Password ── */}
            <ChangePassword />

            {/* ── Table QR Code Generator ── */}
            <QRGenerator />
          </div>
        )}
      </main>

      {/* ══ ANALYTICS TAB ══ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <AnalyticsPanel />
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === 'history' && (
        <div className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">

          {/* ── Filters card ── */}
          <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
            <h3 className={`font-black ${C.text} text-base mb-4`}>📅 Order History</h3>

            {/* Quick date buttons */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
              ].map((q) => (
                <button key={q.id} onClick={() => setQuickDate(q.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)' }}>
                  {q.label}
                </button>
              ))}
            </div>

            {/* Date range pickers */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1 uppercase tracking-wide`}>From</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none ${C.input}`} />
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1 uppercase tracking-wide`}>To</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none ${C.input}`} />
              </div>
            </div>

            {/* Type + Status filters */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1 uppercase tracking-wide`}>Order Type</label>
                <select value={historyTypeFilter} onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none ${C.input}`}>
                  <option value="all">All Types</option>
                  <option value="dine-in">🍽️ Dine In</option>
                  <option value="takeaway">🛍️ Takeaway</option>
                </select>
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1 uppercase tracking-wide`}>Status</label>
                <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none ${C.input}`}>
                  <option value="all">All Statuses</option>
                  <option value="completed">✅ Completed</option>
                  <option value="ready">Ready</option>
                  <option value="preparing">Preparing</option>
                  <option value="accepted">Accepted</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>
            </div>

            <button onClick={fetchHistory} disabled={historyLoading}
              className="w-full py-3 rounded-2xl font-black text-sm text-white disabled:opacity-60 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #940901, #7c1d1d)' }}>
              {historyLoading
                ? <span className="flex items-center justify-center gap-2"><Spinner /> Searching…</span>
                : '🔍 Search Orders'}
            </button>
          </div>

          {/* ── Results ── */}
          {!historyLoading && historyOrders.length === 0 && historySummary === null && (
            <div className={`${C.card} rounded-2xl p-12 text-center shadow-sm`}>
              <div className="text-4xl mb-3">📅</div>
              <p className={`font-bold ${C.text}`}>No results yet</p>
              <p className={`${C.muted} text-sm mt-1`}>Select a date range above and click Search</p>
            </div>
          )}

          {historySummary !== null && historyOrders.length === 0 && (
            <div className={`${C.card} rounded-2xl p-12 text-center shadow-sm`}>
              <div className="text-4xl mb-3">🗂️</div>
              <p className={`font-bold ${C.text}`}>No orders found</p>
              <p className={`${C.muted} text-sm mt-1`}>Try a different date range or filter</p>
            </div>
          )}

          {historyOrders.length > 0 && (
            <>
              {/* Summary cards */}
              {(() => {
                // Compute coupon stats from orders client-side
                const couponMap = {};
                historyOrders.forEach((o) => {
                  if (o.couponCode) {
                    if (!couponMap[o.couponCode]) couponMap[o.couponCode] = { uses: 0, saved: 0 };
                    couponMap[o.couponCode].uses += 1;
                    couponMap[o.couponCode].saved += o.discountAmount || 0;
                  }
                });
                const couponEntries = Object.entries(couponMap).sort((a, b) => b[1].uses - a[1].uses);
                const totalDiscount = couponEntries.reduce((s, [, v]) => s + v.saved, 0);
                const couponOrdersCount = historyOrders.filter((o) => o.couponCode).length;

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total Orders', value: historySummary?.totalOrders || historyOrders.length, color: undefined },
                        { label: 'Total Sales', value: `₹${(historySummary?.totalSales || 0).toLocaleString()}`, color: '#940901' },
                        { label: 'Dine In', value: historySummary?.dineInCount || 0, color: '#31603D' },
                        { label: 'Takeaway', value: historySummary?.takeawayCount || 0, color: '#940901' },
                      ].map((s) => (
                        <div key={s.label} className={`${C.card} rounded-xl px-4 py-3 text-center shadow-sm`}>
                          <p className="font-black text-xl leading-none"
                            style={{ color: s.color || (document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1F1F1F') }}>
                            {s.value}
                          </p>
                          <p className={`${C.muted} text-[10px] font-bold uppercase tracking-wide mt-1`}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Coupon summary card — only if any coupon was used */}
                    {couponEntries.length > 0 && (
                      <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`font-black ${C.text} text-sm`}>🏷️ Coupon Usage in Period</h4>
                          <div className="flex gap-3">
                            <div className="text-right">
                              <p className="font-black text-base" style={{ color: '#059669' }}>₹{totalDiscount.toLocaleString()}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-wide ${C.muted}`}>Total Saved</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-base" style={{ color: 'var(--accent-dark, #b45309)' }}>{couponOrdersCount}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-wide ${C.muted}`}>Orders w/ Coupon</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {couponEntries.map(([code, data]) => {
                            const maxUses = couponEntries[0][1].uses;
                            return (
                              <div key={code} className="flex items-center gap-3">
                                <span
                                  className="text-xs font-black px-2.5 py-1 rounded-lg flex-shrink-0"
                                  style={{
                                    background: 'rgba(214,153,60,0.12)',
                                    color: 'var(--accent-dark, #b45309)',
                                    border: '1px solid rgba(214,153,60,0.3)',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.08em',
                                  }}
                                >
                                  {code}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className={`text-xs font-bold ${C.text}`}>Used {data.uses}× </span>
                                    <span className="text-xs font-bold" style={{ color: '#059669' }}>₹{data.saved.toLocaleString()} saved</span>
                                  </div>
                                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                                    <div className="h-1.5 rounded-full transition-all"
                                      style={{ width: `${(data.uses / maxUses) * 100}%`, background: 'linear-gradient(90deg,#d6993c,#b45309)' }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Top items */}
              {historySummary?.topItems?.length > 0 && (
                <div className={`${C.card} rounded-2xl p-5 shadow-sm`}>
                  <h4 className={`font-black ${C.text} text-sm mb-3`}>🏆 Top Items in Period</h4>
                  <div className="space-y-2">
                    {historySummary.topItems.slice(0, 5).map((item, i) => {
                      const maxQty = historySummary.topItems[0]?.qty || 1;
                      return (
                        <div key={item.name} className="flex items-center gap-3">
                          <span className="text-xs font-black w-5 text-center" style={{ color: i === 0 ? '#d6993c' : C.muted }}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className={`text-xs font-bold ${C.text} truncate`}>{item.name}</span>
                              <span className={`text-xs ${C.muted} flex-shrink-0 ml-2`}>×{item.qty} · ₹{item.revenue}</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
                              <div className="h-1.5 rounded-full transition-all"
                                style={{ width: `${(item.qty / maxQty) * 100}%`, background: 'linear-gradient(90deg, #940901, #7c1d1d)' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Export buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={exportCSV}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                  📥 Export CSV
                </button>
                <button onClick={exportHistoryWA}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  WhatsApp
                </button>
              </div>

              {/* Orders list */}
              <div className="space-y-2">
                {historyOrders.map((order) => (
                  <div key={order._id} className={`${C.card} rounded-xl shadow-sm overflow-hidden`}>
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Row 1: name + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`font-black ${C.text} text-sm`}>{order.customerName}</span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{
                              background: (order.orderType || 'dine-in') === 'takeaway' ? 'rgba(148,9,1,0.1)' : 'rgba(49,96,61,0.1)',
                              color: (order.orderType || 'dine-in') === 'takeaway' ? '#940901' : '#31603D',
                            }}>
                            {(order.orderType || 'dine-in') === 'takeaway' ? '🛍️ Takeaway' : '🍽️ Dine In'}
                          </span>
                          {order.pickupToken && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: '#940901', color: 'white' }}>
                              {order.pickupToken}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>
                        {/* Row 2: date/time/table */}
                        <p className={`${C.muted} text-xs mb-1.5`}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {order.orderType !== 'takeaway' && order.tableNumber && ` · Table ${order.tableNumber}`}
                          {order.phoneNumber && ` · ${order.phoneNumber}`}
                        </p>
                        {/* Row 3: items */}
                        <div className="space-y-0.5">
                          {order.items.map((it, idx) => (
                            <p key={idx} className={`text-xs ${C.muted}`}>
                              {it.name} ×{it.quantity} — ₹{it.price * it.quantity}
                            </p>
                          ))}
                        </div>
                      </div>
                      {/* Right: total */}
                      <div className="text-right flex-shrink-0">
                        {order.couponCode && order.originalAmount > order.totalAmount ? (
                          <>
                            <p className="text-[10px] line-through" style={{ color: '#9ca3af' }}>₹{order.originalAmount}</p>
                            <p className="font-black text-sm" style={{ color: '#059669' }}>₹{order.totalAmount}</p>
                          </>
                        ) : (
                          <p className="font-black text-sm" style={{ color: '#940901' }}>₹{order.totalAmount}</p>
                        )}
                        {order.couponCode && (
                          <p className="text-[10px] font-black mt-0.5" style={{ color: 'var(--accent-dark,#b45309)', fontFamily: 'monospace' }}>
                            🏷️ {order.couponCode}
                          </p>
                        )}
                        {order.utrNumber && <p className={`${C.muted} text-[10px] mt-0.5`}>UTR: {order.utrNumber}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ Menu Item Form Modal ═══════════════════════════════════════════════ */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 fade-in flex items-end sm:items-center justify-center sm:px-4" onClick={() => setFormOpen(false)}>
          <div className={`${C.card} rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto w-full sm:max-w-md`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 sm:hidden"><div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-600" /></div>
            <div className="px-5 pt-5 pb-2 flex items-center justify-between">
              <h3 className={`font-black ${C.text} text-lg`}>{editingId ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setFormOpen(false)} className={`${C.muted} hover:text-gray-600 p-1`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="px-5 pb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Super Category *</label>
                  <select value={menuForm.superCategory} onChange={(e) => setMenuForm({ ...menuForm, superCategory: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}>
                    {SUPER_CATS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Sub Category *</label>
                  <input type="text" value={menuForm.subCategory} onChange={(e) => setMenuForm({ ...menuForm, subCategory: e.target.value })} placeholder="e.g. Momos"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                </div>
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Item Name *</label>
                <input type="text" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Paneer Burger"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Description</label>
                <input type="text" value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} placeholder="Short description"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Price (₹)</label>
                  <input type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} placeholder="Regular price" min="0"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Type</label>
                  <select value={menuForm.veg ? 'veg' : 'nonveg'} onChange={(e) => setMenuForm({ ...menuForm, veg: e.target.value === 'veg' })}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`}>
                    <option value="veg">🟢 Veg</option>
                    <option value="nonveg">🔴 Non-Veg</option>
                  </select>
                </div>
              </div>

              {/* ── Half / Full Plate Pricing ── */}
              <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(0,123,139,0.05)', border: '1px solid rgba(0,123,139,0.15)' }}>
                <p className={`text-xs font-black uppercase tracking-widest ${C.muted}`}>Half / Full Plate (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block ${C.muted} font-bold text-xs mb-1`}>Half Price (₹)</label>
                    <input type="number" value={menuForm.halfPrice} onChange={(e) => setMenuForm({ ...menuForm, halfPrice: e.target.value })} placeholder="e.g. 80" min="0"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                  </div>
                  <div>
                    <label className={`block ${C.muted} font-bold text-xs mb-1`}>Full Price (₹)</label>
                    <input type="number" value={menuForm.fullPrice} onChange={(e) => setMenuForm({ ...menuForm, fullPrice: e.target.value })} placeholder="e.g. 140" min="0"
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                  </div>
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Half Plate Description</label>
                  <input type="text" value={menuForm.halfDescription} onChange={(e) => setMenuForm({ ...menuForm, halfDescription: e.target.value })} placeholder="e.g. 3 pcs, great for one"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                </div>
                <div>
                  <label className={`block ${C.muted} font-bold text-xs mb-1`}>Full Plate Description</label>
                  <input type="text" value={menuForm.fullDescription} onChange={(e) => setMenuForm({ ...menuForm, fullDescription: e.target.value })} placeholder="e.g. 6 pcs, perfect for sharing"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
                </div>
              </div>
              <div>
                <label className={`block ${C.muted} font-bold text-xs mb-1`}>Image URL</label>
                <input type="url" value={menuForm.image} onChange={(e) => setMenuForm({ ...menuForm, image: e.target.value })} placeholder="https://..."
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--admin-accent)] ${C.input}`} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={menuForm.available} onChange={(e) => setMenuForm({ ...menuForm, available: e.target.checked })} className="w-4 h-4" style={{ accentColor: 'var(--admin-accent)' }} />
                <span className={`${C.text} font-bold text-sm`}>Available today</span>
              </label>
              {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-3 py-2 text-red-600 dark:text-red-400 text-xs font-medium">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setFormOpen(false)} className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-3 rounded-2xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>Cancel</button>
                <button type="submit" disabled={formLoading} className="btn-primary flex-1 py-3 rounded-2xl text-sm tracking-widest uppercase disabled:opacity-60">
                  {formLoading ? <Spinner /> : editingId ? 'Update' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ COUPONS TAB ══════════════════════════════════════════════════════
      {tab === 'coupons' && (
        <CouponsPage C={C} />
      )} */}

      {/* ══ Delete Menu Item Confirm ══════════════════════════════════════════ */}
      {deleteMenuConfirm && (
        <Modal onClose={() => setDeleteMenuConfirm(null)}>
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className={`font-black ${C.text} text-base mb-1.5`}>Delete Menu Item?</h3>
          <p className={`${C.muted} text-sm mb-5`}>This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteMenuConfirm(null)} className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all`}>Cancel</button>
            <button onClick={() => handleDeleteMenuItem(deleteMenuConfirm)} className="flex-1 bg-red-500 text-white font-black py-2.5 rounded-xl text-sm hover:bg-red-600 transition-all">Delete</button>
          </div>
        </Modal>
      )}

      {/* ══ Delete Order — 2-option modal ═════════════════════════════════════ */}
      {orderDeleteModal && (
        <Modal onClose={() => !actionLoading && setOrderDeleteModal(null)}>
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className={`font-black ${C.text} text-base mb-1`}>Delete Order?</h3>
          <p className={`${C.muted} text-sm mb-1`}>
            <span className={`font-bold ${C.text}`}>{orderDeleteModal.customerName}</span> · {orderDeleteModal.tableNumber}
          </p>
          <p className={`${C.muted} text-xs mb-5`}>Choose how to delete this order:</p>

          <div className="space-y-2.5">
            {/* Option 1 — WhatsApp + Delete */}
            <button
              onClick={() => deleteOrderWithWA(orderDeleteModal)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}
            >
              {actionLoading ? <Spinner /> : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  ✅ Send to WhatsApp &amp; Delete
                </>
              )}
            </button>

            {/* Option 2 — Delete only */}
            <button
              onClick={() => deleteOrderDirect(orderDeleteModal)}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-black text-sm text-white bg-red-500 hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Spinner /> : '❌ Delete Without Sending'}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setOrderDeleteModal(null)}
              disabled={actionLoading}
              className={`w-full py-2.5 rounded-xl font-bold text-sm border-2 ${C.border} ${C.muted} hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-60`}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ══ Clear All Confirm ══════════════════════════════════════════════════ */}
      {clearAllConfirm && (
        <Modal onClose={() => !actionLoading && setClearAllConfirm(false)}>
          <div className="text-4xl mb-3">📤</div>
          <h3 className={`font-black ${C.text} text-base mb-1.5`}>Export All &amp; Clear?</h3>
          <p className={`${C.muted} text-sm mb-5`}>
            This will send <span className="font-bold" style={{ color: 'var(--accent)' }}>{orders.length} orders</span> to WhatsApp, then permanently delete them all.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setClearAllConfirm(false)} disabled={actionLoading}
              className={`flex-1 border-2 ${C.border} ${C.muted} font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-60`}>
              Cancel
            </button>
            <button onClick={confirmClearAll} disabled={actionLoading}
              className="flex-1 text-white font-black py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
              {actionLoading ? <Spinner /> : '📲 Export & Clear All'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
