import axios from 'axios';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MenuCard from '../components/MenuCard';
import Cart from '../components/Cart';
import OrderModal from '../components/OrderModal';
import WelcomeModal from '../components/WelcomeModal';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import { cafeConfig } from '../config/cafeConfig';
import { getMyOrders, clearMyOrders } from '../utils/myOrders';

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { label: 'Order Received', icon: '⏳', color: '#92400e', bg: '#fef3c7' },
  accepted:  { label: 'Accepted',       icon: '✅', color: '#065f46', bg: '#d1fae5' },
  preparing: { label: 'Preparing…',     icon: '👨‍🍳', color: '#1e40af', bg: '#dbeafe' },
  ready:     { label: 'Ready!',         icon: '🎉', color: '#065f46', bg: '#ecfdf5' },
  completed: { label: 'Completed',      icon: '🍽️', color: '#6b7280', bg: '#f3f4f6' },
  cancelled: { label: 'Cancelled',      icon: '❌', color: '#991b1b', bg: '#fee2e2' },
};

// ── My Orders slide-in panel ──────────────────────────────────────────────────
const MyOrdersPanel = ({ orders, onClose, onClear }) => {
  const [liveData, setLiveData]   = useState({});
  const [mounted, setMounted]     = useState(false);
  const pollRef                   = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!orders.length) return;
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        orders.map((o) =>
          axios
            .get(`${import.meta.env.VITE_API_URL}/orders/track/${o.orderId}`)
            .then((r) => ({ orderId: o.orderId, ...r.data }))
        )
      );
      const next = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') next[r.value.orderId] = r.value;
      });
      setLiveData(next);
    };
    fetchAll();
    pollRef.current = setInterval(fetchAll, 5000);
    return () => clearInterval(pollRef.current);
  }, [orders]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm h-full flex flex-col shadow-2xl bg-white"
        style={{
          transform: mounted ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <h2 className="font-black text-base tracking-wide text-white">My Orders</h2>
            {orders.length > 0 && (
              <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {orders.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {orders.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-bold text-gray-500 text-base">No orders yet</p>
              <p className="text-sm text-gray-400 mt-1">Your orders will appear here after you place one</p>
            </div>
          ) : (
            orders.map((order) => {
              const live   = liveData[order.orderId];
              const status = live?.status || 'pending';
              const cfg    = STATUS_CFG[status] || STATUS_CFG.pending;
              const token  = live?.pickupToken || order.pickupToken;

              return (
                <div
                  key={order.orderId}
                  className="rounded-2xl overflow-hidden"
                  style={{ border: '1.5px solid rgba(214,153,60,0.2)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  {/* Order header row */}
                  <div
                    className="flex items-start justify-between px-4 py-3"
                    style={{ background: 'linear-gradient(135deg,#fafaf8,#fffdf5)' }}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{order.orderType === 'takeaway' ? '🥡' : '🍽️'}</span>
                        <span className="font-black text-sm" style={{ color: '#1a1a1a' }}>
                          {order.orderType === 'takeaway'
                            ? `Takeaway${token ? ` · ${token}` : ''}`
                            : `Table ${order.tableNumber}`}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {order.customerName} ·{' '}
                        {new Date(order.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-sm" style={{ color: '#d6993c' }}>₹{order.totalAmount}</p>
                      <p className="text-[10px] text-gray-400">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(214,153,60,0.12)' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-0.5">
                        <span className="text-xs text-gray-600">
                          {item.veg !== undefined && (
                            <span className="mr-1" style={{ color: item.veg ? '#16a34a' : '#dc2626' }}>
                              {item.veg ? '🟢' : '🔴'}
                            </span>
                          )}
                          {item.name} ×{item.quantity}
                        </span>
                        <span className="text-xs text-gray-400">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    {order.note && (
                      <p className="text-[11px] text-gray-400 mt-1 italic">📝 {order.note}</p>
                    )}
                  </div>

                  {/* Live status */}
                  <div
                    className="px-4 py-2.5 flex items-center gap-2"
                    style={{ background: cfg.bg, borderTop: '1px solid rgba(214,153,60,0.12)' }}
                  >
                    <span className="text-base">{cfg.icon}</span>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    {!live && (
                      <span className="text-[10px] text-gray-400 ml-auto animate-pulse">Checking…</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer — clear history */}
        {orders.length > 0 && (
          <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid #f3f4f6' }}>
            <button
              onClick={onClear}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


const SUPER_CATEGORIES = cafeConfig.superCategories;

const CustomerMenu = () => {
  const [searchParams] = useSearchParams();
  const tableFromQR = searchParams.get('table') || '';

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSuperCat, setActiveSuperCat] = useState('All Items');
  const [activeSubCat, setActiveSubCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopClosed, setShopClosed] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen]     = useState(false);
  const [myOrders, setMyOrders]             = useState(() => getMyOrders());
  const { toggleCart, totalItems, totalAmount } = useCart();

  const refreshMyOrders = useCallback(() => setMyOrders(getMyOrders()), []);

  const handleClearOrders = useCallback(() => {
    clearMyOrders();
    setMyOrders([]);
  }, []);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      // Use plain axios so no Bearer token is attached
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/menu`);
      setMenuItems(res.data);
    } catch (err) {
      if (err.response?.status === 403) {
        setShopClosed(true);
      } else {
        setError('Failed to load menu. Please refresh.');
      }
    } finally {
      setLoading(false);
    }
  };

  const subCategories = useCallback(() => {
    const pool = activeSuperCat === 'All Items'
      ? menuItems
      : menuItems.filter((i) => i.superCategory === activeSuperCat);
    return ['All', ...new Set(pool.map((i) => i.subCategory))];
  }, [menuItems, activeSuperCat]);

  useEffect(() => { setActiveSubCat('All'); }, [activeSuperCat]);

  const filteredItems = useCallback(() => {
    let items = menuItems.filter((i) => i.available);
    if (activeSuperCat !== 'All Items') items = items.filter((i) => i.superCategory === activeSuperCat);
    if (activeSubCat !== 'All') items = items.filter((i) => i.subCategory === activeSubCat);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.subCategory.toLowerCase().includes(q)
      );
    }
    return items;
  }, [menuItems, activeSuperCat, activeSubCat, searchQuery]);

  const groupedItems = useCallback(() => {
    const groups = {};
    filteredItems().forEach((item) => {
      if (!groups[item.subCategory]) groups[item.subCategory] = [];
      groups[item.subCategory].push(item);
    });
    return groups;
  }, [filteredItems]);

  const subs = subCategories();
  const groups = groupedItems();
  const hasItems = Object.keys(groups).length > 0;

  return (
    <div className="min-h-screen font-poppins" style={{ background: '#ffffff' }}>

      {/* ✅ ADD THIS BLOCK — shop closed screen */}
      {shopClosed && (
        <div
          className="min-h-screen flex flex-col items-center justify-center text-center px-6"
          style={{ background: '#f8eecb' }}
        >
          <div className="text-6xl mb-5">🔒</div>
          <p
            className="font-black text-xl mb-2"
            style={{ fontFamily: 'Playfair Display, serif', color: '#982829' }}
          >
            We're Closed Right Now
          </p>
          <p
            className="text-sm font-medium"
            style={{ fontFamily: 'Poppins, sans-serif', color: '#6b6b4a' }}
          >
            Shop is currently closed. Please visit later.
          </p>
        </div>
      )}

      {!shopClosed && (
        <> {/* Welcome modal — shows once per session */}
          <WelcomeModal tableNo={tableFromQR ? `Table ${tableFromQR}` : ''} />

          <Navbar
            onCartClick={toggleCart}
            onOrdersClick={() => { refreshMyOrders(); setMyOrdersOpen(true); }}
            ordersCount={myOrders.length}
          />

          {/* QR Table banner */}
          {tableFromQR && (
            <div className="text-center py-2 px-4 text-xs font-semibold tracking-widest uppercase"
              style={{ background: 'linear-gradient(90deg,#982829,#d6993c)', color: 'white' }}>
              📍 Table {tableFromQR} — Ordering from your table
            </div>
          )}

          {/* Search */}
          <div className="sticky top-16 z-30 shadow-sm px-4 py-2.5"
            style={{ background: '#', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(214,153,60,0.2)' }}>
            <div className="max-w-lg mx-auto">
              <div className="relative">
                <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ fill: '#325862', opacity: 0.5 }}>
                  <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes…"
                  className="w-full rounded-full pl-10 pr-10 py-2.5 text-sm font-medium focus:outline-none transition-all"
                  style={{
                    background: 'white',
                    border: '1.5px solid var(--primary)',
                    color: '#1a1a1a',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(173, 191, 196, 0.12)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = 'none'; }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#325862', opacity: 0.5 }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Super Category Tabs */}
          {!searchQuery && (
            <div className="sticky top-[125px] z-20 shadow-md"
              style={{ background: 'var(--primary)' }}>
              <div className="max-w-lg mx-auto">
                <div className="flex overflow-x-auto no-scrollbar px-3 py-2.5 gap-1.5">
                  {SUPER_CATEGORIES.map((cat) => {
                    const active = activeSuperCat === cat;
                    const count = cat === 'All Items'
                      ? menuItems.filter((i) => i.available).length
                      : menuItems.filter((i) => i.superCategory === cat && i.available).length;
                    return (
                      <button key={cat} onClick={() => setActiveSuperCat(cat)}
                        className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-250 flex items-center gap-1.5"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          background: active ? 'var(--pillsupActive)' : 'var(--pillsup)',
                          color: active ? 'var(--pillsupActiveText)' : 'var(--pillsupText)',
                          boxShadow: active ? '0 2px 10px rgba(0, 0, 0, 0.45)' : 'none',
                          border: active ? 'none' : '1px solid #dbc5ae',
                        }}
                      >
                        {cat}
                        {count > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: active ? 'rgba(0,0,0,0.15)' : 'rgba(0, 0, 0, 0.3)', color: active ? '#1a1a1a' : '#ffffff' }}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub Category Pills */}
          {!searchQuery && subs.length > 2 && (
            <div className="sticky top-[178px] z-40" style={{ background: 'var(--subbg)', borderBottom: '1px solid rgba(214,153,60,0.15)' }}>
              <div className="max-w-lg mx-auto">
                <div className="flex overflow-x-auto no-scrollbar px-3 py-2 gap-1.5">
                  {subs.map((sub) => {
                    const active = activeSubCat === sub;
                    return (
                      <button key={sub} onClick={() => setActiveSubCat(sub)}
                        className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200"
                        style={{
                          fontFamily: 'Poppins, sans-serif',
                          background: active ? 'var(--pill-active)' : 'var(--pillsub)',
                          color: active ? 'var(--pill-active-text)' : 'var(--pillsubText)',
                          borderColor: active ? '#dbc5ae' : 'rgba(229, 229, 229, 0.25)',
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="max-w-lg mx-auto px-4 pb-28">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-gray-200 rounded-full spin" style={{ borderTopColor: '#d6993c' }} />
                <p className="text-sm font-medium" style={{ color: '#325862', fontFamily: 'Poppins,sans-serif' }}>Loading menu…</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="font-medium mb-3 text-red-600">{error}</p>
                <button onClick={fetchMenu} className="btn-primary px-6 py-2 rounded-full text-sm">Retry</button>
              </div>
            ) : !hasItems ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-3">🍽️</div>
                <p className="font-bold text-lg" style={{ color: '#325862', fontFamily: 'Playfair Display,serif' }}>Nothing here</p>
                <p className="text-sm mt-1" style={{ color: '#6b6b4a' }}>
                  {searchQuery ? 'Try a different search' : 'Check back soon'}
                </p>
              </div>
            ) : (
              <div className="bg-black bg-menu-section rounded-full mt-4 p-3 space-y-6" style={{ background: 'var(--primary)' }}>
                {Object.entries(groups).map(([subCat, items]) => (
                  <div key={subCat}>
                    {/* Section header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,var(--textbodymainbg),transparent)' }} />
                      <h2 className="text-xs uppercase tracking-[0.25em] px-2 font-bold"
                        style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--textbodymainbg)' }}>
                        {subCat}
                      </h2>
                      <div className="h-px flex-1" style={{ background: 'linear-gradient(270deg,var(--textbodymainbg),transparent)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {items.map((item) => <MenuCard key={item._id} item={item} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>

          {/* Floating cart bar */}
          {totalItems > 0 && (
            <div className="fixed bottom-5 left-0 right-0 flex justify-center z-30 px-4">
              <button onClick={toggleCart}
                className="text-white rounded-2xl py-3.5 px-5 flex items-center gap-3 active:scale-[0.98] transition-all max-w-sm w-full shadow-gold-lg"
                style={{ background: 'linear-gradient(135deg, var(--confirmbuttonbg), var(--confirmbuttonbg))', fontFamily: 'Poppins,sans-serif' }}>
                <div className="bg-white rounded-xl w-8 h-8 flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{ color: 'var(--primary)' }}>
                  {totalItems}
                </div>
                <span className="font-bold tracking-widest text-sm uppercase flex-1 text-center">View Cart</span>
                <span className="font-black text-sm opacity-90">₹{totalAmount}</span>
              </button>
            </div>
          )}

          <Cart onCheckout={() => setOrderModalOpen(true)} />
          <OrderModal
            isOpen={orderModalOpen}
            onClose={() => { setOrderModalOpen(false); refreshMyOrders(); }}
            tableFromQR={tableFromQR}
          />
          {myOrdersOpen && (
            <MyOrdersPanel
              orders={myOrders}
              onClose={() => setMyOrdersOpen(false)}
              onClear={handleClearOrders}
            />
          )}
        </>
      )}
    </div>
  );


};

export default CustomerMenu;
