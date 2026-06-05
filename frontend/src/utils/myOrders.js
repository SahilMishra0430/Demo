// src/utils/myOrders.js
// Stores the last 5 orders in localStorage.
// Each entry expires automatically after 24 hours.

const KEY    = 'velvet_vault_my_orders';
const MAX    = 5;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Read orders, auto-removing anything older than 24h */
export const getMyOrders = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const orders = JSON.parse(raw);
    const cutoff = Date.now() - TTL_MS;
    const valid  = orders.filter((o) => new Date(o.placedAt).getTime() > cutoff);
    if (valid.length !== orders.length) {
      localStorage.setItem(KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (_) { return []; }
};

/** Prepend a new order; keeps only the latest MAX entries */
export const saveMyOrder = (order) => {
  try {
    const existing = getMyOrders();
    const updated  = [order, ...existing.filter((o) => o.orderId !== order.orderId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch (_) {}
};

/** Wipe all saved orders */
export const clearMyOrders = () => localStorage.removeItem(KEY);
