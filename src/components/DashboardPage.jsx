import React, { useState } from 'react';
import { formatRupiah } from '../services/storage';
import { isSupabaseConnected } from '../services/api';
import HistoryTab from './dashboard/HistoryTab';
import CatalogTab from './dashboard/CatalogTab';
import StoreProfileTab from './dashboard/StoreProfileTab';
import CloudConfigTab from './dashboard/CloudConfigTab';
import AccountManagementTab from './dashboard/AccountManagementTab';
import FinanceTab from './dashboard/FinanceTab';

export default function DashboardPage({
  storeProfile,
  onSaveStoreProfile,
  catalog = [],
  onSavePreset,
  onDeletePreset,
  history = [],
  onLoadTransaction,
  onDeleteTransaction,
  onExportDataJSON,
  onReloadData,
  onShowToast,
  onNavigate,
  accounts = [],
  currentUser,
  onSaveAccount,
  onDeleteAccount,
  purchases = [],
  expenses = [],
  otherIncome = [],
  onSavePurchase,
  onDeletePurchase,
  onSaveExpense,
  onDeleteExpense,
  onSaveOtherIncome,
  onDeleteOtherIncome
}) {
  const [activeTab, setActiveTab] = useState('history');
  const isConnected = isSupabaseConnected();

  // Top stats calculations (excluding cancelled notes)
  const activeHistory = history.filter(h => h.payStatus !== 'Dibatalkan');
  const totalOmset = activeHistory.reduce((acc, h) => acc + (Number(h.grandTotal) || 0), 0);
  const totalLunas = activeHistory.filter(h => h.payStatus === 'Lunas').length;
  const totalSisa = activeHistory.reduce((acc, h) => acc + (Number(h.sisa) || 0), 0);

  return (
    <div className="dashboard-page-container">
      {/* 4 Overview Analytics Stat Cards */}
      <div className="dashboard-stats-grid">
        {/* Stat Card 1: Omset */}
        <div className="dashboard-stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div className="dashboard-stat-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(27, 189, 143, 0.14)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">payments</span>
          </div>
          <div className="dashboard-stat-content" style={{ minWidth: 0 }}>
            <div className="dashboard-stat-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span className="stat-label-desktop">Total Omset Penjualan</span>
              <span className="stat-label-mobile">Total Omset</span>
            </div>
            <div className="dashboard-stat-value num-tabular text-ellipsis-single" style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {formatRupiah(totalOmset)}
            </div>
          </div>
        </div>

        {/* Stat Card 2: Total Nota */}
        <div className="dashboard-stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div className="dashboard-stat-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.14)',
            color: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">description</span>
          </div>
          <div className="dashboard-stat-content" style={{ minWidth: 0 }}>
            <div className="dashboard-stat-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span className="stat-label-desktop">Total Transaksi Nota</span>
              <span className="stat-label-mobile">Total Nota</span>
            </div>
            <div className="dashboard-stat-value text-ellipsis-single" style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {history.length} <span className="dashboard-stat-unit" style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>Nota</span>
            </div>
          </div>
        </div>

        {/* Stat Card 3: Status Bayar Lunas */}
        <div className="dashboard-stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div className="dashboard-stat-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.14)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
          </div>
          <div className="dashboard-stat-content" style={{ minWidth: 0 }}>
            <div className="dashboard-stat-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nota Lunas
            </div>
            <div className="dashboard-stat-value text-ellipsis-single" style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              {totalLunas} <span className="dashboard-stat-unit" style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>Tuntas</span>
            </div>
          </div>
        </div>

        {/* Stat Card 4: Sisa Pelunasan */}
        <div className="dashboard-stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div className="dashboard-stat-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.14)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">pending</span>
          </div>
          <div className="dashboard-stat-content" style={{ minWidth: 0 }}>
            <div className="dashboard-stat-label" style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span className="stat-label-desktop">Sisa DP / Belum Lunas</span>
              <span className="stat-label-mobile">Belum Lunas</span>
            </div>
            <div className="dashboard-stat-value num-tabular text-ellipsis-single" style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#EF4444', marginTop: '0.1rem' }}>
              {formatRupiah(totalSisa)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Card Container */}
      <div className="dashboard-main-card">
        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-tabs dashboard-main-tabs" role="tablist" aria-label="Menu Dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            title="Riwayat Transaksi"
          >
            <span className="material-symbols-outlined" aria-hidden="true">history</span>
            <span className="dashboard-tab-label">
              <span className="tab-label-desktop">Riwayat Transaksi ({history.length})</span>
              <span className="tab-label-mobile">Riwayat ({history.length})</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'finance'}
            className={`dashboard-tab ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
            title="Keuangan"
          >
            <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
            <span className="dashboard-tab-label">Keuangan</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            className={`dashboard-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
            title="Katalog Preset Tarif"
          >
            <span className="material-symbols-outlined" aria-hidden="true">sell</span>
            <span className="dashboard-tab-label">
              <span className="tab-label-desktop">Katalog Preset Tarif ({catalog.length})</span>
              <span className="tab-label-mobile">Katalog ({catalog.length})</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'store'}
            className={`dashboard-tab ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
            title="Profil Toko"
          >
            <span className="material-symbols-outlined" aria-hidden="true">storefront</span>
            <span className="dashboard-tab-label">
              <span className="tab-label-desktop">Profil Toko</span>
              <span className="tab-label-mobile">Toko</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'accounts'}
            className={`dashboard-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
            title="Manajemen Akun"
          >
            <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span>
            <span className="dashboard-tab-label">
              <span className="tab-label-desktop">Manajemen Akun ({accounts.length})</span>
              <span className="tab-label-mobile">Akun ({accounts.length})</span>
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cloud'}
            className={`dashboard-tab ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
            title="Koneksi Cloud DB"
          >
            <span className="material-symbols-outlined" style={{ color: isConnected ? 'var(--primary)' : 'inherit' }} aria-hidden="true">cloud</span> 
            <span className="dashboard-tab-label">
              <span className="tab-label-desktop">Koneksi Cloud DB {isConnected && <span className="tab-badge-online">Active</span>}</span>
              <span className="tab-label-mobile">Cloud {isConnected && <span className="tab-badge-online">Active</span>}</span>
            </span>
          </button>
        </div>

        {/* Tab 1: History */}
        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            storeProfile={storeProfile}
            onLoadTransaction={onLoadTransaction}
            onDeleteTransaction={onDeleteTransaction}
            onExportDataJSON={onExportDataJSON}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 2: Keuangan */}
        {activeTab === 'finance' && (
          <FinanceTab
            purchases={purchases}
            expenses={expenses}
            otherIncome={otherIncome}
            history={history}
            onSavePurchase={onSavePurchase}
            onDeletePurchase={onDeletePurchase}
            onSaveExpense={onSaveExpense}
            onDeleteExpense={onDeleteExpense}
            onSaveOtherIncome={onSaveOtherIncome}
            onDeleteOtherIncome={onDeleteOtherIncome}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 3: Catalog */}
        {activeTab === 'catalog' && (
          <CatalogTab
            catalog={catalog}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 4: Store Profile */}
        {activeTab === 'store' && (
          <StoreProfileTab
            storeProfile={storeProfile}
            onSaveStoreProfile={onSaveStoreProfile}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 5: Account Management */}
        {activeTab === 'accounts' && (
          <AccountManagementTab
            accounts={accounts}
            currentUser={currentUser}
            onSaveAccount={onSaveAccount}
            onDeleteAccount={onDeleteAccount}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 6: Cloud Config */}
        {activeTab === 'cloud' && (
          <CloudConfigTab
            onReloadData={onReloadData}
            onShowToast={onShowToast}
          />
        )}
      </div>
    </div>
  );
}
