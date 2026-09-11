import React, { useState, useEffect } from 'react';
import { getAppsScriptConfig, saveAppsScriptConfig, isAppsScriptConnected } from '../../services/appsScriptClient';

export default function CloudConfigTab({
  onReloadData,
  onShowToast
}) {
  const [webAppUrl, setWebAppUrl] = useState('');

  useEffect(() => {
    const config = getAppsScriptConfig();
    setWebAppUrl(config.url);
  }, []);

  const isConnected = isAppsScriptConnected();

  const handleSaveCloudConfig = async () => {
    saveAppsScriptConfig(webAppUrl);
    if (onShowToast) {
      if (webAppUrl) {
        onShowToast('Pengaturan Google Apps Script Web App berhasil disimpan!', 'success');
      } else {
        onShowToast('Mode database diubah ke Penyimpanan Lokal (Browser).', 'info');
      }
    }
    if (onReloadData) await onReloadData();
  };

  const handleClearCloudConfig = async () => {
    setWebAppUrl('');
    saveAppsScriptConfig('');
    if (onShowToast) onShowToast('Koneksi Cloud dihapus. Kembali ke Penyimpanan Lokal.', 'info');
    if (onReloadData) await onReloadData();
  };

  return (
    <div className="cloud-config-wrapper">
      {/* Status Header Banner (Full Width) */}
      <div className={`cloud-status-banner ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="cloud-status-banner-left">
          <span className={`pulse-dot ${isConnected ? 'online' : 'offline'}`} />
          <div>
            <strong className="cloud-status-title">
              {isConnected ? 'Terhubung ke Database Cloud (Google Sheets + Apps Script)' : 'Mode Penyimpanan Lokal (Browser)'}
            </strong>
            <p className="cloud-status-desc">
              {isConnected 
                ? 'Data toko, katalog produk, riwayat transaksi, dan akun tersinkronisasi otomatis ke Google Sheets.' 
                : 'Data hanya tersimpan di penyimpanan lokal browser perangkat ini (belum tersinkronisasi ke cloud).'}
            </p>
          </div>
        </div>
        <span className={`status-pill-mini ${isConnected ? 'connected' : 'local'}`}>
          <span className="material-symbols-outlined">{isConnected ? 'cloud' : 'cloud_off'}</span>
          {isConnected ? 'Online Sync' : 'Offline'}
        </span>
      </div>

      {/* 2-Column Responsive Grid */}
      <div className="cloud-main-grid">
        {/* Column 1: WARNING BANNER */}
        <div className="cloud-critical-warning">
          <div className="warning-icon-box">
            <span className="material-symbols-outlined" aria-hidden="true">warning</span>
          </div>
          <div className="warning-text-content">
            <h4 className="warning-title">PERINGATAN KONFIGURASI BACKEND</h4>
            <p className="warning-desc">
              Konfigurasi ini menghubungkan aplikasi ke Google Apps Script Web App. 
              <strong> DILARANG KERAS merubah atau menghapus URL ini</strong> secara sembarangan.
            </p>
            <ul className="warning-bullet-list">
              <li>Perubahan sembarangan akan <strong>memutuskan koneksi transaksi seluruh kasir seketika</strong>.</li>
              <li>Data nota baru akan tersimpan lokal di browser kasir (Offline-First Dexie.js).</li>
              <li>Hanya ubah jika Anda adalah Administrator Database yang berwenang.</li>
            </ul>
          </div>
        </div>

        {/* Column 2: Form Inputs Card */}
        <div className="cloud-form-card">
          <div className="cloud-form-header">
            <h4 className="cloud-form-title">
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>dns</span> Parameter Google Apps Script Web App
            </h4>
            <span className="cloud-form-subtitle">
              Masukkan Deployment Web App URL dari Apps Script Editor project Google Sheets Anda.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="cloud-url">
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', marginRight: '4px' }}>link</span> Web App Deployment URL
            </label>
            <input
              type="text"
              id="cloud-url"
              className="form-control"
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              spellCheck="false"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="cloud-action-bar">
        {isConnected ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={handleClearCloudConfig}>
            <span className="material-symbols-outlined">link_off</span> Putuskan Koneksi
          </button>
        ) : (
          <div />
        )}
        <button type="button" className="btn btn-primary" onClick={handleSaveCloudConfig}>
          <span className="material-symbols-outlined">save</span> Simpan Pengaturan Cloud
        </button>
      </div>
    </div>
  );
}
