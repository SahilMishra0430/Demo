/**
 * ThemeContext.jsx
 *
 * Two jobs:
 *  1. Inject ALL brand colors from cafeConfig as CSS variables on <html>
 *     so every component can use var(--primary), var(--admin-btn-accept), etc.
 *  2. Manage light / dark mode toggle (adds/removes .dark class on <html>)
 *
 * CSS variables are injected ONCE on mount via injectCSSVariables().
 * To change ANY color in the app: edit cafeConfig.colors — this file never needs touching.
 *
 * VARIABLE GROUPS:
 *  --primary*          Customer UI — navbar, cart, category tabs
 *  --accent*           Gold highlights throughout the app
 *  --admin*            Admin dashboard — header, tabs, buttons, badges
 *  --admin-btn-*       Order action button colors (Accept/Cook/Ready/Complete)
 *  --admin-stat-*      Stats bar KPI card value colors
 *  --admin-*-pill      Takeaway info pill colors
 *  --admin-menu-*      Menu tab colors
 *  --text-*            Text colors
 *  --*-bg / card-bg    Background surfaces
 *  --success/danger/warning  Status colors
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { cafeConfig } from '../config/cafeConfig';

const ThemeContext = createContext(null);

const injectCSSVariables = () => {
  const root = document.documentElement;
  const c = cafeConfig.colors;

  // ── Customer UI ────────────────────────────────────────────────────────────
  root.style.setProperty('--primary', c.primary);
  root.style.setProperty('--primary-dark', c.primaryDark);
  root.style.setProperty('--primary-deep', c.primaryDeep);
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-light', c.accentLight);
  root.style.setProperty('--accent-dark', c.accentDark);
  root.style.setProperty('--pill-active', c.pillActive);
  root.style.setProperty('--pill-active-text', c.pillActiveText);
  root.style.setProperty('--pillsub', c.pillsub);
  root.style.setProperty('--pillsubText', c.pillsubText);
  root.style.setProperty('--pillsup', c.pillsup);
  root.style.setProperty('--pillsupText', c.pillsupText);
  root.style.setProperty('--pillsupActive', c.pillsupActive);
  root.style.setProperty('--pillsupActiveText', c.pillsupActiveText);
  root.style.setProperty('--subbg', c.subbg);


  // OrderModal & Cart
  root.style.setProperty('--ordermodelbg', c.ordermodelbg);
  root.style.setProperty('--ordermodelbgtext', c.ordermodelbgtext);
  root.style.setProperty('--ordermodelbgtextonsummery', c.ordermodelbgtextonsummery);
  root.style.setProperty('--canclebuttonbg', c.canclebuttonbg);
  root.style.setProperty('--canclebuttonborder', c.canclebuttonborder);
  root.style.setProperty('--ordermodelbgmesseges', c.ordermodelbgmesseges);
  root.style.setProperty('--ordermodelinputbg', c.ordermodelinputbg);
  root.style.setProperty('--ordermodelinputborder', c.ordermodelinputborder);
  root.style.setProperty('--typeselectorbgactive', c.typeselectorbgactive);
  root.style.setProperty('--typeselectorbg', c.typeselectorbg);
  root.style.setProperty('--typeselectorborderactive', c.typeselectorborderactive);
  root.style.setProperty('--typeselectorbgborderinactive', c.typeselectorborderinactive);
  root.style.setProperty('--typeselectortextinactive', c.typeselectortextinactive);
  root.style.setProperty('--typeselectortextactive', c.typeselectortextactive);
  root.style.setProperty('--typeselectorshadowinactive', c.typeselectorshadowinactive);
  root.style.setProperty('--cancelbuttonbg', c.cancelbuttonbg);
  root.style.setProperty('--cancelbuttonborder', c.cancelbuttonborder);
  root.style.setProperty('--confirmbuttonbg', c.confirmbuttonbg);





  // ── Text ───────────────────────────────────────────────────────────────────
  root.style.setProperty('--text-on-primary', c.textOnPrimary);
  root.style.setProperty('--text-body', c.textBody);
  root.style.setProperty('--textbodymainbg', c.textbodymainbg);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--text-price', c.textPrice);
  root.style.setProperty('--text-desc', c.textDesc);

  // ── Backgrounds ────────────────────────────────────────────────────────────
  root.style.setProperty('--page-bg', c.pageBg);
  root.style.setProperty('--card-bg', c.cardBg);
  root.style.setProperty('--image-bg', c.imageBg);
  root.style.setProperty('--ivory', c.ivory);

  // ── Admin panel — structural ───────────────────────────────────────────────
  root.style.setProperty('--admin', c.adminPrimary);
  root.style.setProperty('--admin-dark', c.adminDark);
  root.style.setProperty('--admin-deep', c.adminDeep);
  root.style.setProperty('--admin-accent', c.adminAccent);
  root.style.setProperty('--admin-accent-dark', c.adminAccentDark);

  // ── Admin — tab navigation ─────────────────────────────────────────────────
  root.style.setProperty('--admin-tab-active', c.adminTabActive);
  root.style.setProperty('--admin-tab-inactive', c.adminTabInactive);

  // ── Admin — stats bar KPI values ───────────────────────────────────────────
  root.style.setProperty('--admin-stat-sales', c.adminStatSales);
  root.style.setProperty('--admin-stat-pending', c.adminStatPending);
  root.style.setProperty('--admin-stat-available', c.adminStatAvailable);

  // ── Admin — order cards ────────────────────────────────────────────────────
  root.style.setProperty('--admin-order-amount', c.adminOrderAmount);
  root.style.setProperty('--admin-pending-border', c.adminPendingBorder);
  root.style.setProperty('--admin-table-badge', c.adminTableBadge);
  root.style.setProperty('--admin-takeaway-badge', c.adminTakeawayBadge);
  root.style.setProperty('--admin-dine-in-badge', c.adminDineInBadge);

  // ── Admin — order action buttons (status progression) ─────────────────────
  root.style.setProperty('--admin-btn-accept', c.adminBtnAccept);   // pending → accepted
  root.style.setProperty('--admin-btn-cook', c.adminBtnCook);     // accepted → preparing
  root.style.setProperty('--admin-btn-ready', c.adminBtnReady);    // preparing → ready
  root.style.setProperty('--admin-btn-complete', c.adminBtnComplete); // ready → completed

  // ── Admin — takeaway info pills ────────────────────────────────────────────
  root.style.setProperty('--admin-phone-pill', c.adminPhonePill);
  root.style.setProperty('--admin-pickup-pill', c.adminPickupPill);
  root.style.setProperty('--admin-utr-pill', c.adminUtrPill);
  root.style.setProperty('--admin-payment-pill', c.adminPaymentPill);
  root.style.setProperty('--admin-verified-pill', c.adminVerifiedPill);

  // ── Admin — menu tab ───────────────────────────────────────────────────────
  root.style.setProperty('--admin-menu-divider', c.adminMenuDivider);
  root.style.setProperty('--admin-menu-cat-title', c.adminMenuCatTitle);
  root.style.setProperty('--admin-menu-price', c.adminMenuPrice);
  root.style.setProperty('--admin-menu-on-bg', c.adminMenuOnBg);
  root.style.setProperty('--admin-menu-on-border', c.adminMenuOnBorder);

  // ── Status colors ──────────────────────────────────────────────────────────
  root.style.setProperty('--success', c.success);
  root.style.setProperty('--success-bg', c.successBg);
  root.style.setProperty('--danger', c.danger);
  root.style.setProperty('--danger-bg', c.dangerBg);
  root.style.setProperty('--warning', c.warning);
  root.style.setProperty('--warning-bg', c.warningBg);

  // ── Legacy aliases (backward-compat with index.css) ───────────────────────
  root.style.setProperty('--gold', c.accent);
  root.style.setProperty('--gold-light', c.accentLight);
  root.style.setProperty('--gold-dark', c.accentDark);
  root.style.setProperty('--red', c.primaryDark);
  root.style.setProperty('--teal', c.adminPrimary);
  root.style.setProperty('--teal-dark', c.adminDark);
  root.style.setProperty('--cream', c.imageBg);

  // ── Admin backgrounds & surfaces ────────────────────────────────────────
  root.style.setProperty('--admin-bg', c.adminBg);
  root.style.setProperty('--admin-bg-dark', c.adminBgDark);
  root.style.setProperty('--admin-card', c.adminCard);
  root.style.setProperty('--admin-card-dark', c.adminCardDark);
  root.style.setProperty('--admin-border', c.adminBorder);
  root.style.setProperty('--admin-border-dark', c.adminBorderDark);
  root.style.setProperty('--admin-muted', c.adminMuted);
  root.style.setProperty('--admin-muted-dark', c.adminMutedDark);
  root.style.setProperty('--admin-text', c.adminText);
  root.style.setProperty('--admin-text-dark', c.adminTextDark);
  root.style.setProperty('--admin-input', c.adminInput);
  root.style.setProperty('--admin-input-dark', c.adminInputDark);
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem(cafeConfig.storage.theme) === 'dark';
  });

  // Inject all CSS variables once when app loads
  useEffect(() => { injectCSSVariables(); }, []);

  useEffect(() => {
    const root = document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem(cafeConfig.storage.theme, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
