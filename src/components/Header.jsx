import React from 'react';
import CustomTooltip from './ui/CustomTooltip';

export default function Header({ storeProfile, currentPage, onNavigate, isCloudConnected, theme, onToggleTheme, onLogout }) {
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
        {/* Main Page Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn btn-sm ${currentPage === 'editor' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('editor')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: 'none' }}
          >
            <i className="ri-printer-line"></i>
            <span>Cetak Nota</span>
          </button>
          <button 
            className={`btn btn-sm ${currentPage === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: 'none' }}
          >
            <i className="ri-dashboard-3-line"></i>
            <span>Dashboard</span>
            <span style={{
              fontSize: '0.65rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '10px',
              background: isCloudConnected ? 'rgba(27, 189, 143, 0.25)' : 'rgba(0,0,0,0.12)',
              marginLeft: '0.15rem'
            }}>
              {isCloudConnected ? '☁️ Cloud' : '💾 Lokal'}
            </span>
          </button>
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
