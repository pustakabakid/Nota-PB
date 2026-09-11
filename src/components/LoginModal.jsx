import React, { useState } from 'react';
import { loginApi } from '../services/api';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    
    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await loginApi(username, password);

      if (result && result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result?.error || 'Username atau Password salah.');
        setIsLoading(false);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke database. Periksa koneksi internet Anda.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: 'calc(var(--space-3) + var(--sat)) var(--space-3) calc(var(--space-3) + var(--sab)) var(--space-3)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        maxHeight: 'min(90dvh, 540px)',
        overflowY: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(1.5rem, 5vw, 2.25rem) clamp(1.25rem, 4vw, 2rem)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 1rem auto',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem'
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
          </div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
            Login Kasir Percetakan
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
            Masukkan kredensial operator untuk mengelola transaksi
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div role="alert" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">warning</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.15rem' }}>
            <label className="form-label" htmlFor="login-username">Username Operator</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="login-username"
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
              <span className="material-symbols-outlined" style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                fontSize: '1.2rem'
              }} aria-hidden="true">person</span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" htmlFor="login-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                className="form-control"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <span className="material-symbols-outlined" style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                fontSize: '1.2rem'
              }} aria-hidden="true">lock</span>
              <button
                type="button"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.35rem',
                  minHeight: '38px',
                  minWidth: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: 'var(--text-sm)', minHeight: '44px' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined spin-animation" aria-hidden="true">sync</span> Memverifikasi...
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">login</span> Masuk Aplikasi
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
