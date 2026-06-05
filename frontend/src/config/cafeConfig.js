/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CAFÉ CONFIG  —  Single source of truth for every café-specific value
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO SET UP A NEW CAFÉ (10-minute process):
 *  ─────────────────────────────────────────────
 *  1. Duplicate this file (e.g. src/config/cafeConfig.js)
 *  2. Change the values in the sections below
 *  3. Push to GitHub → Netlify / Render auto-deploys
 *  4. Done — the entire app (frontend + theme) updates automatically
 *
 *  WHAT THIS FILE CONTROLS:
 *  ─────────────────────────
 *  ✦ Café name, tagline, description
 *  ✦ UPI payment ID & display name
 *  ✦ All brand colors  (customer UI + admin panel)
 *  ✦ Menu super-categories
 *  ✦ localStorage / sessionStorage keys  (keep unique per café)
 *
 *  HOW COLORS WORK:
 *  ─────────────────
 *  ThemeContext.jsx reads cafeConfig.colors and injects them as CSS
 *  variables on <html> at app startup:
 *
 *    --primary, --accent, --admin, etc.
 *
 *  Every component references these via:
 *    JSX inline →  style={{ background: 'var(--primary)' }}
 *    CSS class  →  background: var(--primary);
 *
 *  To rebrand → change colors here → CSS vars update → UI updates.
 *  No component files need editing.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const cafeConfig = {

  // ── ① IDENTITY ────────────────────────────────────────────────────────────
  // The café's public-facing name and personality.

  name: 'Demo All',               // Full name used in titles, toasts
  nameLine1: 'Demo ',                     // Navbar logo — first line
  nameLine2: 'Cafe',
  adminname: 'Sahil',         // Admin panel name
  tagline: 'Where every sip tells a story',
  description: 'Experience premium taste & comfort',
  type: 'CAFE',                       // 'Café' | 'Restaurant' | 'Bakery'


  // ── ② CONTACT & PAYMENT ───────────────────────────────────────────────────
  // Shown to customers during the takeaway checkout UPI flow.

  contact: {
    phone: '9696028522',    // for display in UPI payment flow (with country code, no +)
    whatsapp: '9696028522',   // with country code, no + (for wa.me links)
    upiId: '9696028522@ybl',
    upiName: 'Sahil Anil Mishra',
  },

  
  
  // ── ③ ADMIN ───────────────────────────────────────────────────────────────
  
  admin: {
    email: 'admin@democafe.com',   // used in createAdmin.js
    emailPlaceholder: 'admin@democafe.com',    // shown in login form
    tokenKey: 'demo_cafe_admin_token',
  },


  // ── ④ STORAGE KEYS ────────────────────────────────────────────────────────
  // Keep these unique per café.  If a customer uses the same browser for two
  // different café systems, different keys prevent data collisions.

  storage: {
    myOrders: 'demo_cafe_my_orders',
    welcomeShown: 'demo_cafe_welcome_shown',
    theme: 'demo_cafe_theme',
    logo: 'demo_cafe_logo_url',
  },


  // ── ⑤ MENU CATEGORIES ─────────────────────────────────────────────────────
  // Edit this list to match the café's actual menu structure.
  // These appear as the horizontal tab bar on the customer menu page.

  superCategories: [
    'All Items',
    'Chinese',
    'Snacks',
    'Pasta & Maggie',
    'Beverages',
    'Combos',
  ],


  // ── ⑥ BRAND COLORS ────────────────────────────────────────────────────────
  // ⚡ This is the ONLY place you need to edit to fully rebrand the app.
  //
  // These values are injected as CSS variables by ThemeContext.jsx on startup.
  // Components reference them via var(--primary), var(--accent), etc.
  //
  // COLOR MAP:
  // ┌──────────────────┬────────────────────────────────────────────────────┐
  // │ primary*         │ Navbar, cart header, category tabs, main buttons   │
  // │ accent*          │ Gold — icons, borders, price badge, highlights     │
  // │ admin*           │ Admin dashboard dark panel                         │
  // │ text*            │ Text across the app                                │
  // │ *Bg / card / *Bg │ Surface / background colours                       │
  // │ status colours   │ Success / danger / warning — keep these standard   │
  // └──────────────────┴────────────────────────────────────────────────────┘

  colors: {

    // ── Customer UI ────────────────────────────────────────────────────────
    primary: '#3a1a1e',   // navbar bg, cart header, category bar
    primaryDark: '#982829',   // darker variant used in gradients/hover
    primaryDeep: '#3a1a1e',   // add-to-cart button, quantity stepper bg

    // Gold accent
    accent: '#d6993c',   // icons, borders, order badge
    accentLight: '#e8b86d',
    accentDark: '#b37d2e',

    // Sub-category filter pills
    pillActive: '#4e2c21',   // active pill bg
    pillActiveText: '#ffffff',
    pillsub: '#ffffff',   // active pill bg
    pillsubText: '#000000',
    subbg: '#3a1a1ec3',   // active pill bg

    // Sup-category filter pills
    pillsupActive: '#ffffff',   // active pill bg
    pillsupActiveText: '#1a1a1a',
    pillsup: '#ffffff00',   // active pill bg
    pillsupText: '#ffffffc0',

    // Order Model Colours
    ordermodelbg: '#3a1a1e',
    ordermodelbgtext: '#ffffff',
    ordermodelbgtextonsummery: '#4a262b',
    ordermodelbgmesseges: '#dcf309',
    canclebuttonbg: '#ffffff',
    canclebuttonborder: '#000000',
    typeselectorbgactive: '#940901',
    typeselectorbg: '#0000004d',
    typeselectorborderactive: '#940901',
    typeselectorborderinactive: '#0000008f',
    typeselectortextactive: '#ffffff',
    typeselectortextinactive: '#ffffff',
    typeselectorshadowactive: '#93030273',
    // cancelbuttonbg:'#0000004d',
    // cancelbuttonborder: '#ffffff',
    confirmbuttonbg: '#31603d',


    // Text
    textOnPrimary: '#ede8d0',   // text ON the red navbar / dark surfaces
    textBody: '#1a1a1a',   // main body text
    textbodymainbg: '#f4eded',   // main body text
    textMuted: '#6b6b4a',   // secondary / muted text
    textPrice: '#31603d',   // price display (green)
    textDesc: '#64690c',   // item description (olive)

    // Backgrounds
    pageBg: '#ffffff',   // main page bg
    cardBg: '#f8faee',   // menu cards, cart items
    imageBg: '#f4eaa8',   // image placeholder / loading bg
    cream: '#f4eaa8',
    ivory: '#fdf8e8',   // global body bg (index.css)

    // ── Admin Panel ────────────────────────────────────────────────────────
    // These control every section of the admin dashboard.
    // Change these to restyle the entire admin UI for a new café.

    // Header / Top Bar
    // background: linear-gradient(135deg, adminDark → adminPrimary)
    adminPrimary: '#325862',   // header gradient end, filter pill active, Add Item button
    adminDark: '#243f47',   // header gradient start, login page gradient
    adminDeep: '#0f1a1e',   // login page background (very dark teal)

    // Tab Navigation bar
    adminTabActive: '#007B8B',   // active tab text + underline colour
    adminTabInactive: '#9ca3af',   // inactive tab text colour

    // Accent / highlight used across admin
    adminAccent: '#007B8B',   // category divider lines, UTR badge, half/full badge, tab active
    adminAccentDark: '#014F5A',   // 404 page gradient, darker highlight

    // Stats Bar — mini KPI cards at top
    adminStatSales: '#d6993c',   // "Today's Sales" value colour  (same as accent)
    adminStatPending: '#d97706',   // "Pending" count colour         (amber warning)
    adminStatAvailable: '#059669',   // "Available items" count colour (green)

    // Order Cards
    adminOrderAmount: '#d6993c',   // order total amount (₹ value, top-right of card)
    adminPendingBorder: '#f59e0b',   // left border on cards with status = pending
    adminTableBadge: '#d6993c',   // table number pill colour
    adminTakeawayBadge: '#940901',   // "Takeaway" type badge
    adminDineInBadge: '#31603d',   // "Dine In" type badge

    // Order action buttons (status progression)
    adminBtnAccept: '#22c55e',   // "✓ Accept" button (pending → accepted)
    adminBtnCook: '#3b82f6',   // "🍳 Start Cooking" button (accepted → preparing)
    adminBtnReady: '#10b981',   // "✅ Mark Ready" button (preparing → ready)
    adminBtnComplete: '#6b7280',   // "🍽️ Complete" button (ready → completed)

    // Takeaway info pills on order cards
    adminPhonePill: '#31603d',   // phone number pill
    adminPickupPill: '#940901',   // pickup token pill (T-001 etc.)
    adminUtrPill: '#007B8B',   // UTR/transaction ID pill
    adminPaymentPill: '#b37d2e',   // payment method pill (UPI/Card)
    adminVerifiedPill: '#059669',   // "✅ Verified" payment badge

    // Menu Tab
    adminMenuDivider: '#007B8B',   // category section divider line gradient
    adminMenuCatTitle: '#d6993c',   // category title text (Chinese, Snacks etc.)
    adminMenuPrice: '#d6993c',   // item price in menu list
    adminMenuOnBg: 'rgba(214,153,60,0.15)',  // "ON" availability toggle bg
    adminMenuOnBorder: '#d6993c',                // "ON" availability toggle border
    adminMenuOnText: '#325862',                // "ON" availability toggle text

    // ── Admin Backgrounds & Surfaces ──────────────────────────────────────────
    adminBg: '#F9FAFB',   // light mode page background
    adminBgDark: '#111827',   // dark mode page background
    adminCard: '#f1e9e9',   // light mode card surface
    adminCardDark: '#1F2937',   // dark mode card surface
    adminBorder: '#ffffff',   // light mode card border
    adminBorderDark: '#374151',   // dark mode card border
    adminMuted: '#6B7280',   // light mode muted text
    adminMutedDark: '#D1D5DB',   // dark mode muted text
    adminText: '#1F2937',   // light mode primary text
    adminTextDark: '#F9FAFB',   // dark mode primary text
    adminInput: '#FFFFFF',   // light mode input bg
    adminInputDark: '#374151',   // dark mode input bg

    // ── Status (keep standard — do NOT change per café) ────────────────────
    success: '#059669',
    successBg: '#d1fae5',
    danger: '#dc2626',
    dangerBg: '#fee2e2',
    warning: '#d97706',
    warningBg: '#fef3c7',
    info: '#1d4ed8',
    infoBg: '#dbeafe',
  },
};

/**
 * ─── HOW TO ADD A NEW CAFÉ ─────────────────────────────────────────────────
 *
 *  Option A — Simple fork (recommended for now):
 *  1. Fork / duplicate the GitHub repo
 *  2. Edit cafeConfig.js with the new café's values
 *  3. Create new Netlify + Render deploys pointing to the fork
 *  4. Set env vars on Render (MONGODB_URI, JWT_SECRET, VAPID keys, etc.)
 *
 *  Option B — Future multi-tenant upgrade:
 *  When you have 10+ clients, move cafeConfig into the database (one doc
 *  per tenant).  ThemeContext fetches it via API on startup.  Zero code
 *  changes needed in components — they already use CSS variables.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */
