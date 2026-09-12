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

  // Top stats calculations
  const totalOmset = history.reduce((acc, h) => acc + (Number(h.grandTotal) || 0), 0);
  const totalLunas = history.filter(h => h.payStatus === 'Lunas').length;
  const totalSisa = history.reduce((acc, h) => acc + (Number(h.sisa) || 0), 0);

  return (
    <div className="dashboard-page-container">
      {/* 4 Overview Analytics Stat Cards */}
      <div className="dashboard-stats-grid">
        {/* Stat Card 1: Omset */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Omset Penjualan
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }} className="num-tabular text-ellipsis-single">
              {formatRupiah(totalOmset)}
            </div>
          </div>
        </div>

        {/* Stat Card 2: Total Nota */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Transaksi Nota
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }} className="text-ellipsis-single">
              {history.length} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>Nota</span>
            </div>
          </div>
        </div>

        {/* Stat Card 3: Status Bayar Lunas */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Nota Lunas
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }} className="text-ellipsis-single">
              {totalLunas} <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)' }}>Tuntas</span>
            </div>
          </div>
        </div>

        {/* Stat Card 4: Sisa Pelunasan */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sisa DP / Belum Lunas
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#EF4444', marginTop: '0.1rem' }} className="num-tabular text-ellipsis-single">
              {formatRupiah(totalSisa)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Card Container */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(1rem, 3vw, 1.35rem)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%'
      }}>
        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">history</span> Riwayat Transaksi ({history.length})
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">sell</span> Katalog Preset Tarif ({catalog.length})
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">storefront</span> Profil Toko
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <span className="material-symbols-outlined" style={{ color: isConnected ? 'var(--primary)' : 'inherit' }} aria-hidden="true">cloud</span> 
            Koneksi Cloud DB {isConnected && <span className="tab-badge-online">Active</span>}
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">manage_accounts</span> Manajemen Akun ({accounts.length})
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">account_balance</span> Keuangan
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

        {/* Tab 2: Catalog */}
        {activeTab === 'catalog' && (
          <CatalogTab
            catalog={catalog}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 3: Store Profile */}
        {activeTab === 'store' && (
          <StoreProfileTab
            storeProfile={storeProfile}
            onSaveStoreProfile={onSaveStoreProfile}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 4: Cloud Config */}
        {activeTab === 'cloud' && (
          <CloudConfigTab
            onReloadData={onReloadData}
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

        {/* Tab 6: Keuangan */}
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
      </div>
    </div>
  );
}
