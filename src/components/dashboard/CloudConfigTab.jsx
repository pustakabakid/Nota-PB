import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConnected, SQL_SCHEMA_QUERY } from '../../services/supabaseClient';

export default function CloudConfigTab({
  onReloadData,
  onShowToast
}) {
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [showCloudKey, setShowCloudKey] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setCloudUrl(config.url);
    setCloudKey(config.key);
  }, []);

  const isConnected = isSupabaseConnected();

  const handleSaveCloudConfig = async () => {
    saveSupabaseConfig(cloudUrl, cloudKey);
    if (onShowToast) {
      if (cloudUrl && cloudKey) {
        onShowToast('Pengaturan database cloud berhasil disimpan!', 'success');
      } else {
        onShowToast('Mode database diubah ke Penyimpanan Lokal (Browser).', 'info');
      }
    }
    if (onReloadData) await onReloadData();
  };

  const handleClearCloudConfig = async () => {
    setCloudUrl('');
    setCloudKey('');
    saveSupabaseConfig('', '');
    if (onShowToast) onShowToast('Koneksi Cloud dihapus. Kembali ke Penyimpanan Lokal.', 'info');
    if (onReloadData) await onReloadData();
  };

  const handleCopySqlScript = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_QUERY);
    setCopiedSql(true);
    if (onShowToast) onShowToast('Script SQL Schema berhasil disalin!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="cloud-config-wrapper">
      {/* Status Header Banner (Full Width) */}
      <div className={`cloud-status-banner ${isConnected ? 'connected' : 'disconnected'}`}>
        <div className="cloud-status-banner-left">
          <span className={`pulse-dot ${isConnected ? 'online' : 'offline'}`} />
          <div>
            <strong className="cloud-status-title">
              {isConnected ? 'Terhubung ke Database Cloud (Supabase)' : 'Mode Penyimpanan Lokal (Browser)'}
            </strong>
            <p className="cloud-status-desc">
              {isConnected 
                ? 'Data toko, katalog produk, riwayat transaksi, dan akun tersinkronisasi otomatis secara realtime.' 
                : 'Data hanya tersimpan di penyimpanan lokal browser perangkat ini (belum tersinkronisasi ke cloud).'}
            </p>
          </div>
        </div>
        <span className={`status-pill-mini ${isConnected ? 'connected' : 'local'}`}>
          <i className={isConnected ? 'ri-cloud-line' : 'ri-cloud-off-line'} />
          {isConnected ? 'Online Sync' : 'Offline'}
        </span>
      </div>

      {/* 2-Column Responsive Grid (Warning Left, Form Right) */}
      <div className="cloud-main-grid">
        {/* Column 1: CRITICAL WARNING BANNER */}
        <div className="cloud-critical-warning">
          <div className="warning-icon-box">
            <i className="ri-alarm-warning-fill" aria-hidden="true" />
          </div>
          <div className="warning-text-content">
            <h4 className="warning-title">PERINGATAN PENTING & KRITIS</h4>
            <p className="warning-desc">
              Konfigurasi ini menghubungkan seluruh sistem kasir ke server database produksi. 
              <strong> DILARANG KERAS melakukan uji coba, merubah, atau menghapus</strong> kredensial URL & API Key ini secara sembarangan.
            </p>
            <ul className="warning-bullet-list">
              <li>Perubahan sembarangan akan <strong>memutuskan koneksi transaksi seluruh kasir seketika</strong>.</li>
              <li>Dapat mengakibatkan kegagalan penyimpanan nota baru dan data tidak tersinkronisasi.</li>
              <li>Hanya ubah jika Anda adalah Administrator Database yang berwenang.</li>
            </ul>
          </div>
        </div>

        {/* Column 2: Form Inputs Card */}
        <div className="cloud-form-card">
          <div className="cloud-form-header">
            <h4 className="cloud-form-title">
              <i className="ri-database-2-line" style={{ color: 'var(--primary)' }} /> Parameter Kredensial Supabase
            </h4>
            <span className="cloud-form-subtitle">
              Masukkan Project URL dan API Key anon dari dashboard project Supabase Anda.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="cloud-url">
              <i className="ri-link-m" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Supabase Project URL
            </label>
            <input
              type="text"
              id="cloud-url"
              className="form-control"
              placeholder="https://xyzcompany.supabase.co"
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
              spellCheck="false"
              autoComplete="off"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.25rem' }}>
            <label className="form-label" htmlFor="cloud-key">
              <i className="ri-key-2-line" style={{ color: 'var(--primary)', marginRight: '4px' }} /> Supabase Anon / Public API Key
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showCloudKey ? "text" : "password"}
                id="cloud-key"
                className="form-control"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={cloudKey}
                onChange={(e) => setCloudKey(e.target.value)}
                spellCheck="false"
                autoComplete="off"
                style={{ paddingRight: '2.5rem', fontFamily: showCloudKey ? 'var(--font-mono, monospace)' : 'inherit', fontSize: 'var(--text-xs)' }}
              />
              <button
                type="button"
                onClick={() => setShowCloudKey(!showCloudKey)}
                aria-label={showCloudKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                <i className={showCloudKey ? "ri-eye-off-line" : "ri-eye-line"} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SQL Script Schema Box (Full Width) */}
      <div className="cloud-sql-box">
        <div className="cloud-sql-header">
          <span className="cloud-sql-title">
            <i className="ri-code-s-slash-line" style={{ color: 'var(--primary)' }} /> Script SQL Schema Database
          </span>
          <div className="cloud-sql-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSql(!showSql)}
            >
              <i className={showSql ? "ri-eye-off-line" : "ri-eye-line"} /> {showSql ? 'Sembunyikan' : 'Lihat SQL'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCopySqlScript}
            >
              <i className={copiedSql ? "ri-check-line" : "ri-file-copy-line"} /> {copiedSql ? 'Tersalin!' : 'Salin Script SQL'}
            </button>
          </div>
        </div>
        <p className="cloud-sql-desc">
          Jalankan script SQL ini di menu <strong>SQL Editor</strong> pada Dashboard Supabase Anda untuk membuat tabel & hak akses otomatis.
        </p>

        {showSql && (
          <div className="cloud-sql-code-wrapper">
            <pre className="cloud-sql-code">
              {SQL_SCHEMA_QUERY}
            </pre>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="cloud-action-bar">
        {isConnected ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={handleClearCloudConfig}>
            <i className="ri-delete-bin-line" /> Putus Koneksi
          </button>
        ) : <div />}
        <button type="button" className="btn btn-primary" onClick={handleSaveCloudConfig}>
          <i className="ri-save-line" /> Simpan Koneksi DB
        </button>
      </div>
    </div>
  );
}
