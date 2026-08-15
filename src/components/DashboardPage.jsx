import React, { useState } from 'react';
import { formatRupiah } from '../services/storage';
import { isSupabaseConnected } from '../services/supabaseClient';
import HistoryTab from './dashboard/HistoryTab';
import CatalogTab from './dashboard/CatalogTab';
import StoreProfileTab from './dashboard/StoreProfileTab';
import CloudConfigTab from './dashboard/CloudConfigTab';
import AccountManagementTab from './dashboard/AccountManagementTab';

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
  onDeleteAccount
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
            <i className="ri-money-dollar-circle-line" aria-hidden="true"></i>
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
            <i className="ri-file-text-line" aria-hidden="true"></i>
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
            <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
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
            <i className="ri-time-line" aria-hidden="true"></i>
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
            <i className="ri-history-line" aria-hidden="true"></i> Riwayat Transaksi ({history.length})
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <i className="ri-price-tag-3-line" aria-hidden="true"></i> Katalog Preset Tarif ({catalog.length})
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'store' ? 'active' : ''}`}
            onClick={() => setActiveTab('store')}
          >
            <i className="ri-store-2-line" aria-hidden="true"></i> Profil Toko
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <i className={isConnected ? "ri-cloud-fill" : "ri-cloud-line"} style={{ color: isConnected ? 'var(--primary)' : 'inherit' }} aria-hidden="true"></i> 
            Koneksi Cloud DB {isConnected && <span className="tab-badge-online">Active</span>}
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            <i className="ri-user-settings-line" aria-hidden="true"></i> Manajemen Akun ({accounts.length})
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
      </div>
    </div>
  );
}
