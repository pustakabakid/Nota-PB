import React from 'react';

/**
 * MobileNavTabBar — Persistent Bottom Navigation Bar for Mobile Viewports (< 768px)
 *
 * Implements Apple HIG principles for thumb-friendly mobile navigation:
 * - Order Kasir (with item count badge)
 * - Preview Nota (with draft/unsaved indicator dot)
 * - Dashboard (superadmin only)
 *
 * Safe-area aware (supports notch, dynamic island, and gesture home indicator).
 */
export default function MobileNavTabBar({
  currentPage = 'editor',
  activeMobileTab = 'order',
  dashboardTab = 'history',
  onNavigate,
  onSwitchMobileTab,
  onSwitchDashboardTab,
  isSuperAdmin = true,
  itemCount = 0,
  isSaved = true
}) {
  const isOrderActive = currentPage === 'editor' && activeMobileTab === 'order';
  const isPreviewActive = currentPage === 'editor' && activeMobileTab === 'preview';
  const isFinanceActive = currentPage === 'dashboard' && dashboardTab === 'finance';
  const isDashboardActive = currentPage === 'dashboard' && dashboardTab !== 'finance';

  const handleOrderClick = () => {
    if (onNavigate) onNavigate('editor');
    if (onSwitchMobileTab) onSwitchMobileTab('order');
  };

  const handlePreviewClick = () => {
    if (onNavigate) onNavigate('editor');
    if (onSwitchMobileTab) onSwitchMobileTab('preview');
  };

  const handleFinanceClick = () => {
    if (onNavigate) onNavigate('dashboard');
    if (onSwitchDashboardTab) onSwitchDashboardTab('finance');
  };

  const handleDashboardClick = () => {
    if (onNavigate) onNavigate('dashboard');
    if (dashboardTab === 'finance' && onSwitchDashboardTab) {
      onSwitchDashboardTab('history');
    }
  };

  return (
    <nav className="mobile-nav-tabbar no-print" role="navigation" aria-label="Navigasi Utama">
      <div className="mobile-nav-tabbar-inner">
        {/* Tab 1: Order Kasir */}
        <button
          type="button"
          className={`mobile-tab-item${isOrderActive ? ' active' : ''}`}
          onClick={handleOrderClick}
          aria-current={isOrderActive ? 'page' : undefined}
          aria-label={`Order Kasir${itemCount > 0 ? `, ${itemCount} item` : ''}`}
        >
          <div className="mobile-tab-icon-wrapper">
            <span className="material-symbols-outlined mobile-tab-icon" aria-hidden="true">
              shopping_bag
            </span>
            {itemCount > 0 && (
              <span className="mobile-tab-badge" aria-hidden="true">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </div>
          <span className="mobile-tab-label">Order Kasir</span>
          {isOrderActive && <span className="mobile-tab-indicator" aria-hidden="true" />}
        </button>

        {/* Tab 2: Preview Nota */}
        <button
          type="button"
          className={`mobile-tab-item${isPreviewActive ? ' active' : ''}`}
          onClick={handlePreviewClick}
          aria-current={isPreviewActive ? 'page' : undefined}
          aria-label={itemCount > 0 && !isSaved ? "Preview Dokumen Nota (Draf belum disimpan)" : "Preview Dokumen Nota"}
        >
          <div className="mobile-tab-icon-wrapper">
            <span className="material-symbols-outlined mobile-tab-icon" aria-hidden="true">
              description
            </span>
            {itemCount > 0 && !isSaved && (
              <span className="mobile-tab-dot" aria-hidden="true" />
            )}
          </div>
          <span className="mobile-tab-label">Preview</span>
          {isPreviewActive && <span className="mobile-tab-indicator" aria-hidden="true" />}
        </button>

        {/* Tab 3: Keuangan (Superadmin only) */}
        {isSuperAdmin && (
          <button
            type="button"
            className={`mobile-tab-item${isFinanceActive ? ' active' : ''}`}
            onClick={handleFinanceClick}
            aria-current={isFinanceActive ? 'page' : undefined}
            aria-label="Keuangan Arus Kas & Biaya"
          >
            <div className="mobile-tab-icon-wrapper">
              <span className="material-symbols-outlined mobile-tab-icon" aria-hidden="true">
                account_balance
              </span>
            </div>
            <span className="mobile-tab-label">Keuangan</span>
            {isFinanceActive && <span className="mobile-tab-indicator" aria-hidden="true" />}
          </button>
        )}

        {/* Tab 4: Dashboard (Superadmin only) */}
        {isSuperAdmin && (
          <button
            type="button"
            className={`mobile-tab-item${isDashboardActive ? ' active' : ''}`}
            onClick={handleDashboardClick}
            aria-current={isDashboardActive ? 'page' : undefined}
            aria-label="Dashboard Laporan & Pengaturan"
          >
            <div className="mobile-tab-icon-wrapper">
              <span className="material-symbols-outlined mobile-tab-icon" aria-hidden="true">
                dashboard
              </span>
            </div>
            <span className="mobile-tab-label">Dashboard</span>
            {isDashboardActive && <span className="mobile-tab-indicator" aria-hidden="true" />}
          </button>
        )}
      </div>
    </nav>
  );
}
