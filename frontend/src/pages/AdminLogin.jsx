import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cafeConfig } from '../config/cafeConfig';
import api from '../api/axios';

const { name, type, admin, storage } = cafeConfig;

const AdminLogin = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem(admin.tokenKey);
    if (token) navigate('/admin/dashboard', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return setError('Both fields are required.');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      localStorage.setItem(admin.tokenKey, res.data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, var(--admin-deep) 0%, #1a2f35 50%, var(--admin-dark) 100%)' }}
    >
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--admin-accent), transparent)' }} />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--admin-accent), transparent)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo block */}
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--admin), var(--admin-dark))', boxShadow: '0 12px 40px rgba(0,123,139,0.4)' }}
          >
            {localStorage.getItem(storage.logo) ? (
              <img src={localStorage.getItem(storage.logo)} alt="logo" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
                <path d="M2 21h18v-2H2v2zM20 8H4V5h16v3zm-2 7H6V9h12v6z" />
              </svg>
            )}
          </div>
          <h1
            className="font-black text-4xl tracking-widest"
            style={{ fontFamily: '"Playfair Display", serif', color: 'var(--accent)', letterSpacing: '0.2em' }}
          >
            {name.toUpperCase()}
          </h1>
          <p className="font-light text-sm tracking-[0.6em] uppercase mt-1" style={{ color: 'var(--accent)' }}>
            {type} Admin
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-white font-black text-lg mb-1">Welcome Back</h2>
          <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Sign in to manage orders &amp; menu
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={admin.emailPlaceholder} autoComplete="email"
                className="w-full rounded-xl px-4 py-3 text-white text-sm font-medium placeholder-white/20 focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(214,153,60,0.2)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-12 text-white text-sm font-medium placeholder-white/20 focus:outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(214,153,60,0.2)'; }}
                  onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
                    {showPass ? (
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                    ) : (
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-white"
              style={{ background: 'linear-gradient(135deg, var(--admin), var(--admin-dark))', boxShadow: '0 8px 24px rgba(0,123,139,0.4)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {name} {type} Management System © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
