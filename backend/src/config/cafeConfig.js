/**
 * ═══════════════════════════════════════════════════════════════════
 *  BACKEND CAFÉ CONFIG — single source of truth for server config
 * ═══════════════════════════════════════════════════════════════════
 *
 *  HOW TO SET UP A NEW CAFÉ (backend side):
 *  1. Change the values in the CAFÉ IDENTITY section below
 *  2. Set the environment variables on Render for this deployment
 *  3. Run createAdmin.js once to create the admin account
 *
 *  SECRETS (JWT, DB password, VAPID private key, Razorpay secret)
 *  must stay as Render environment variables — never hardcode them.
 * ═══════════════════════════════════════════════════════════════════
 */

module.exports = {

  // ── ① CAFÉ IDENTITY ──────────────────────────────────────────────
  // Change these for each new café deployment

  cafe: {
    name:           'Demo Cafe',
    type:           'Café',
    vapidEmail:     'admin@democafe.com',   // used in web-push VAPID setup
  },

  // ── ② ADMIN CREDENTIALS ──────────────────────────────────────────
  // Used by createAdmin.js to seed the first admin account
  // After running createAdmin.js, change the password via the dashboard

  admin: {
    email:    'admin@democafe.com',
    password: 'democafepassword',               // change after first login!
    name:     'Sahil'
  },

  // ── ③ ENVIRONMENT VARIABLES ──────────────────────────────────────
  // These READ from Render environment variables.
  // Set each one in: Render → your service → Environment
  // Never put actual secret values in this file.

  env: {
    port:            process.env.PORT            || 5000,
    mongoUri:        process.env.MONGODB_URI,
    jwtSecret:       process.env.JWT_SECRET,
    frontendUrl:     process.env.FRONTEND_URL,
    vapidPublicKey:  process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    razorpayKeyId:   process.env.RAZORPAY_KEY_ID,
    razorpaySecret:  process.env.RAZORPAY_KEY_SECRET,
    nodeEnv:         process.env.NODE_ENV        || 'development',
  },
};