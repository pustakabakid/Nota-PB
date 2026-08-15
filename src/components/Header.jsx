import React, { useState, useRef, useEffect } from 'react';

/**
 * Header — Responsive POS Navigation with User Profile Popover
 *
 * Left   : Logo + Store Name + Subtitle
 * Center/Right : Segmented Navigation Tabs (Order Kasir, Preview [mobile], Dashboard)
 * Right  : Unified Avatar Button → opens floating Profile / Status / Settings Popover
 */
export default function Header({
  storeProfile,
  currentPage,
  onNavigate,
  isCloudConnected,
  theme,
  onToggleTheme,
  onLogout,
  currentUser,
  activeMobileTab = 'order',
  onSwitchMobileTab,
}) {
  const isSuperAdmin = !currentUser || currentUser.role === 'superadmin';
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Click outside & Escape key listeners
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const userName = currentUser?.name || currentUser?.username || 'Operator Kasir';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="app-header" role="banner">
      {/* ── Brand ── */}
      <div className="brand-container">
        <img src="/favicon.svg" alt="Logo Toko" className="brand-logo" />
        <div className="brand-text">
          <h1 className="brand-title">{storeProfile.name || 'Nota Percetakan'}</h1>
          {storeProfile.subtitle && (
            <p className="brand-subtitle">{storeProfile.subtitle}</p>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <nav className="header-nav-segment" aria-label="Navigasi Utama">
        {/* Order Kasir */}
        <button
          type="button"
          className={`nav-tab-btn${currentPage === 'editor' && activeMobileTab === 'order' ? ' active' : ''}`}
          onClick={() => {
            onNavigate('editor');
            if (onSwitchMobileTab) onSwitchMobileTab('order');
          }}
          aria-current={currentPage === 'editor' && activeMobileTab === 'order' ? 'page' : undefined}
          aria-label="Order Kasir"
        >
          <i className="ri-shopping-bag-3-line" aria-hidden="true" />
          <span className="nav-tab-label">Order Kasir</span>
        </button>

        {/* Preview Nota — mobile only */}
        <button
          type="button"
          className={`nav-tab-btn mobile-only-tab${currentPage === 'editor' && activeMobileTab === 'preview' ? ' active' : ''}`}
          onClick={() => {
            onNavigate('editor');
            if (onSwitchMobileTab) onSwitchMobileTab('preview');
          }}
          aria-current={currentPage === 'editor' && activeMobileTab === 'preview' ? 'page' : undefined}
          aria-label="Preview Nota"
        >
          <i className="ri-file-text-line" aria-hidden="true" />
          <span className="nav-tab-label">Preview</span>
        </button>

        {/* Dashboard — superadmin only */}
        {isSuperAdmin && (
          <button
            type="button"
            className={`nav-tab-btn${currentPage === 'dashboard' ? ' active' : ''}`}
            onClick={() => onNavigate('dashboard')}
            aria-current={currentPage === 'dashboard' ? 'page' : undefined}
            aria-label="Dashboard"
          >
            <i className="ri-dashboard-3-line" aria-hidden="true" />
            <span className="nav-tab-label">Dashboard</span>
          </button>
        )}
      </nav>

      {/* ── Right: Grouped User Profile / Avatar Dropdown ── */}
      <div className="header-user-wrapper" ref={userMenuRef}>
        <button
          type="button"
          className={`header-avatar-btn${isUserMenuOpen ? ' active' : ''}`}
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          aria-haspopup="true"
          aria-expanded={isUserMenuOpen}
          aria-label="Menu Pengguna & Pengaturan"
        >
          <div className="avatar-circle">
            <span className="avatar-initial">{userInitial}</span>
            <span className={`avatar-status-dot ${isCloudConnected ? 'online' : 'offline'}`} />
          </div>
          <i className={`ri-arrow-down-s-line avatar-chevron${isUserMenuOpen ? ' rotate' : ''}`} aria-hidden="true" />
        </button>

        {/* Floating User Menu Dropdown */}
        {isUserMenuOpen && (
          <div className="header-user-dropdown" role="menu" aria-label="Menu Akun & Pengaturan">
            {/* Header User Profile Info */}
            <div className="user-dropdown-profile">
              <div className="user-dropdown-avatar">
                <i className={isSuperAdmin ? 'ri-shield-keyhole-line' : 'ri-user-3-line'} aria-hidden="true" />
              </div>
              <div className="user-dropdown-details">
                <strong className="user-dropdown-name">{userName}</strong>
                <span className="user-dropdown-role">
                  {isSuperAdmin ? 'Superadmin (Akses Penuh)' : 'Kasir / Operator'}
                </span>
              </div>
            </div>

            <div className="user-dropdown-divider" />

            {/* Cloud Database Status */}
            <div className="user-dropdown-item">
              <div className="dropdown-item-left">
                <span className={`pulse-dot ${isCloudConnected ? 'online' : 'offline'}`} aria-hidden="true" />
                <div className="dropdown-item-text">
                  <span className="dropdown-item-title">Database Sync</span>
                  <small className="dropdown-item-desc">
                    {isCloudConnected ? 'Supabase Cloud DB Aktif' : 'Penyimpanan Offline (Lokal)'}
                  </small>
                </div>
              </div>
              <span className={`status-pill-mini ${isCloudConnected ? 'connected' : 'local'}`}>
                <i className={isCloudConnected ? 'ri-cloud-line' : 'ri-cloud-off-line'} aria-hidden="true" />
                {isCloudConnected ? 'Cloud' : 'Lokal'}
              </span>
            </div>

            <div className="user-dropdown-divider" />

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="user-dropdown-action-btn"
              onClick={onToggleTheme}
              role="menuitem"
            >
              <div className="dropdown-action-left">
                <i className={theme === 'dark' ? 'ri-sun-line text-warning' : 'ri-moon-line text-primary'} aria-hidden="true" />
                <span>Mode Tampilan</span>
              </div>
              <span className="dropdown-badge-theme">
                {theme === 'dark' ? 'Gelap' : 'Terang'}
              </span>
            </button>

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                className="user-dropdown-action-btn logout-btn"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                role="menuitem"
              >
                <div className="dropdown-action-left">
                  <i className="ri-logout-box-r-line" aria-hidden="true" />
                  <span>Keluar dari Sesi</span>
                </div>
                <i className="ri-arrow-right-s-line" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
