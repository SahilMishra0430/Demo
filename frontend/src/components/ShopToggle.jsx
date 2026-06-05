/**
 * components/ShopToggle.jsx
 *
 * Exports three admin toggle buttons:
 *   ShopToggle     — opens/closes the café
 *   TakeawayToggle — enables/disables takeaway ordering
 *   AutoPayToggle  — switches between Razorpay and manual UPI
 *
 * All share the same pill style and talk to /auth/* endpoints.
 * Used in AdminDashboard Settings tab — shown side by side in one card.
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { cafeConfig } from '../config/cafeConfig';

// ── Shared pill style ─────────────────────────────────────────────────────────
const TogglePill = ({ active, loading, fetching, onClick, label, loadingLabel, activeColor = 'var(--success)', inactiveColor = 'var(--danger)', icon }) => {
  if (fetching) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 opacity-40 animate-pulse">
      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
      <span className="text-xs font-black text-gray-400">LOADING…</span>
    </div>
  );

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all disabled:opacity-60 active:scale-[0.97] focus:outline-none whitespace-nowrap"
      style={{
        background:  active
          ? `linear-gradient(135deg, ${activeColor}26, ${activeColor}14)`
          : `linear-gradient(135deg, ${inactiveColor}2e, ${inactiveColor}1a)`,
        borderColor: active ? `${activeColor}66` : `${inactiveColor}66`,
        color:       active ? activeColor : inactiveColor,
      }}
    >
      {/* Dot */}
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
        {active && !loading && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ background: activeColor }} />
        )}
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 transition-colors"
          style={{ background: active ? activeColor : inactiveColor }} />
      </span>
      <span className="text-xs font-black tracking-wide">
        {loading ? loadingLabel : label}
      </span>
      {icon && !loading && <span className="text-sm leading-none">{icon}</span>}
    </button>
  );
};

// ── 1. Shop Open/Closed ───────────────────────────────────────────────────────
export const ShopToggle = () => {
  const [isOpen,   setIsOpen]   = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get('/shop-status')
      .then(res => setIsOpen(res.data.isOpen))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.patch('/shop-status', { isOpen: !isOpen });
      setIsOpen(res.data.isOpen);
      toast.success(res.data.message, { icon: res.data.isOpen ? '✅' : '🔒' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update shop status.');
    } finally { setLoading(false); }
  };

  return (
    <TogglePill
      active={isOpen}
      loading={loading}
      fetching={fetching}
      onClick={handleToggle}
      label={isOpen ? `${cafeConfig.type} OPEN` : `${cafeConfig.type} CLOSED`}
      loadingLabel="UPDATING…"
      activeColor="var(--success)"
      inactiveColor="var(--danger)"
    />
  );
};

// ── 2. Takeaway On/Off ────────────────────────────────────────────────────────
export const TakeawayToggle = () => {
  const [enabled,  setEnabled]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get('/auth/settings')
      .then(res => setEnabled(res.data.isTakeawayEnabled ?? true))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.patch('/auth/toggle-takeaway');
      setEnabled(res.data.isTakeawayEnabled);
      toast.success(res.data.message, { icon: res.data.isTakeawayEnabled ? '🥡' : '🚫' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update takeaway status.');
    } finally { setLoading(false); }
  };

  return (
    <TogglePill
      active={enabled}
      loading={loading}
      fetching={fetching}
      onClick={handleToggle}
      label={enabled ? 'TAKEAWAY ON' : 'TAKEAWAY OFF'}
      loadingLabel="UPDATING…"
      activeColor="var(--admin-accent)"
      inactiveColor="var(--admin-tab-inactive)"
      icon="🥡"
    />
  );
};

// ── 3. Auto Pay (Razorpay) On/Off ─────────────────────────────────────────────
export const AutoPayToggle = () => {
  const [enabled,  setEnabled]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get('/auth/settings')
      .then(res => setEnabled(res.data.isAutoPayEnabled ?? false))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.patch('/auth/toggle-autopay');
      setEnabled(res.data.isAutoPayEnabled);
      toast.success(res.data.message, { icon: res.data.isAutoPayEnabled ? '⚡' : '📱' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment mode.');
    } finally { setLoading(false); }
  };

  return (
    <TogglePill
      active={enabled}
      loading={loading}
      fetching={fetching}
      onClick={handleToggle}
      label={enabled ? 'AUTO PAY ON' : 'MANUAL PAY'}
      loadingLabel="UPDATING…"
      activeColor="#528FF0"
      inactiveColor="var(--accent)"
      icon={enabled ? '⚡' : '📱'}
    />
  );
};

// ── Default export — keeps backward compatibility ─────────────────────────────
export default ShopToggle;
