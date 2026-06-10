import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { cafeConfig } from './config/cafeConfig';
import CustomerMenu from './pages/CustomerMenu';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

const { colors, admin, name } = cafeConfig;

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem(admin.tokenKey);
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
};

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <CartProvider>
          <Toaster
            position="top-center"
            gutter={10}
            toastOptions={{
              duration: 3500,
              style: {
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '13px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                maxWidth: '360px',
              },
              success: {
                iconTheme: { primary: colors.adminAccent, secondary: 'white' },
                style: { background: '#f0fdfa', color: '#134e4a', border: '1px solid #99f6e4' },
              },
              error: {
                iconTheme: { primary: colors.danger, secondary: 'white' },
                style: { background: colors.dangerBg, color: '#7f1d1d', border: '1px solid #fecaca' },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<CustomerMenu />} />
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <div
                  className="min-h-screen flex items-center justify-center font-montserrat text-center px-4"
                  style={{ background: `linear-gradient(135deg, ${colors.adminAccentDark}, ${colors.adminAccent})` }}
                >
                  <div>
                    <p className="text-white font-black text-7xl mb-4 opacity-30">404</p>
                    <p className="text-white font-bold text-xl mb-3">Page Not Found</p>
                    <a
                      href="/"
                      className="text-sm font-bold underline underline-offset-4"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      ← Back to {name} Menu
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
