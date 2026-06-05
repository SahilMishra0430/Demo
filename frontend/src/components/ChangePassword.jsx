import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    {open ? (
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    ) : (
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    )}
  </svg>
);

const PasswordField = ({ label, value, onChange, placeholder, show, onToggle }) => (
  <div>
    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-gray-500 dark:text-gray-300">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border rounded-xl px-4 py-3 pr-11 text-sm font-medium focus:outline-none transition-all
          bg-white dark:bg-gray-800
          border-gray-200 dark:border-gray-600
          text-gray-800 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/15"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  </div>
);

const ChangePassword = () => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const toggleShow = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const validate = () => {
    const e = {};
    if (!form.current) e.current = 'Current password is required.';
    if (!form.next || form.next.length < 6) e.next = 'New password must be at least 6 characters.';
    if (form.next !== form.confirm) e.confirm = 'Passwords do not match.';
    if (form.next === form.current) e.next = 'New password must differ from current password.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      toast.success('Password changed successfully!', { icon: '🔐' });
      setForm({ current: '', next: '', confirm: '' });
      setErrors({});
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      toast.error(msg);
      if (msg.toLowerCase().includes('current')) {
        setErrors((e) => ({ ...e, current: msg }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,var(--admin-accent),var(--admin-accent-dark))' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-black text-gray-800 dark:text-gray-100 text-base">Change Password</h2>
            <p className="text-gray-500 dark:text-gray-300 text-xs">Update your admin password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <PasswordField
              label="Current Password"
              value={form.current}
              onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
              placeholder="Enter current password"
              show={show.current}
              onToggle={() => toggleShow('current')}
            />
            {errors.current && (
              <p className="text-red-500 text-xs mt-1 font-medium">⚠ {errors.current}</p>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            {/* New Password */}
            <div className="mb-4">
              <PasswordField
                label="New Password"
                value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                placeholder="Min. 6 characters"
                show={show.next}
                onToggle={() => toggleShow('next')}
              />
              {/* Strength bar */}
              {form.next && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background:
                          form.next.length >= i * 3
                            ? i <= 1 ? 'var(--danger)'
                            : i <= 2 ? 'var(--warning)'
                            : i <= 3 ? 'var(--admin-accent)'
                            : 'var(--success)'
                            : 'var(--admin-border)',
                      }}
                    />
                  ))}
                </div>
              )}
              {errors.next && (
                <p className="text-red-500 text-xs mt-1 font-medium">⚠ {errors.next}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <PasswordField
                label="Confirm New Password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                placeholder="Re-enter new password"
                show={show.confirm}
                onToggle={() => toggleShow('confirm')}
              />
              {/* Match indicator */}
              {form.confirm && form.next && (
                <p className={`text-xs mt-1 font-medium ${form.next === form.confirm ? 'text-green-500' : 'text-red-500'}`}>
                  {form.next === form.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
              {errors.confirm && !form.confirm && (
                <p className="text-red-500 text-xs mt-1 font-medium">⚠ {errors.confirm}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-black text-sm tracking-widest uppercase text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{ background: 'linear-gradient(135deg,var(--admin-accent),var(--admin-accent-dark))', boxShadow: '0 4px 14px rgba(0,123,139,0.3)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spin inline-block" />
                Updating…
              </span>
            ) : '🔐 Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
