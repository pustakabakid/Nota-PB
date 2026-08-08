import React from 'react';
import CustomTooltip from './ui/CustomTooltip';

export default function Header({ storeProfile, currentPage, onNavigate, isCloudConnected, theme, onToggleTheme, onLogout, currentUser }) {
  const isSuperAdmin = !currentUser || currentUser.role === 'superadmin';

  return (
    <header className="app-header">
      <div className="brand-container">
        <img src="/favicon.svg" alt="Logo Toko" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
        <div>
          <h1 className="brand-title">{storeProfile.name}</h1>
          <p className="brand-subtitle">{storeProfile.subtitle}</p>
        </div>
      </div>
      <div className="header-actions" style={{ gap: '0.6rem' }}>
        {/* User Role Badge */}
        {currentUser && (
          <div style={{
            fontSize: '0.725rem',
            fontWeight: 600,
            color: isSuperAdmin ? 'var(--primary)' : 'var(--text-color)',
            background: isSuperAdmin ? 'rgba(27, 189, 143, 0.12)' : 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <i className={isSuperAdmin ? 'ri-shield-keyhole-line' : 'ri-user-3-line'}></i>
            <span>{isSuperAdmin ? 'Superadmin' : 'Admin Kasir'}</span>
          </div>
        )}

        {/* Main Page Navigation Tabs (Dashboard visible to Superadmin only) */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn btn-sm ${currentPage === 'editor' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('editor')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: 'none' }}
          >
            <i className="ri-printer-line"></i>
            <span>Cetak Nota</span>
          </button>

          {isSuperAdmin && (
            <button 
              className={`btn btn-sm ${currentPage === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onNavigate('dashboard')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: 'none' }}
            >
              <i className="ri-dashboard-3-line"></i>
              <span>Dashboard</span>
            </button>
          )}
        </div>

        <CustomTooltip text="Ganti Mode Terang / Gelap">
          <button className="btn btn-secondary btn-sm btn-icon-only" onClick={onToggleTheme}>
            <i className={theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line'}></i>
          </button>
        </CustomTooltip>

        {onLogout && (
          <CustomTooltip text="Keluar dari Sesi Kasir">
            <button className="btn btn-secondary btn-sm btn-icon-only" onClick={onLogout} style={{ color: 'var(--danger)' }}>
              <i className="ri-logout-box-r-line"></i>
            </button>
          </CustomTooltip>
        )}
      </div>
    </header>
  );
}
