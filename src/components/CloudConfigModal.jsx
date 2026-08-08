import React, { useState, useEffect } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConnected, SQL_SCHEMA_QUERY } from '../services/supabaseClient';

export default function CloudConfigModal({ isOpen, onClose, onShowToast, onReloadData }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setKey(config.key);
      setCopiedSql(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = isSupabaseConnected();

  const handleSave = async () => {
    saveSupabaseConfig(url, key);
    if (onShowToast) {
      if (url && key) {
        onShowToast('Pengaturan database cloud berhasil disimpan!', 'success');
      } else {
        onShowToast('Mode database diubah ke Penyimpanan Lokal (Browser).', 'info');
      }
    }
    if (onReloadData) {
      await onReloadData();
    }
    onClose();
  };

  const handleClear = async () => {
    setUrl('');
    setKey('');
    saveSupabaseConfig('', '');
    if (onShowToast) {
      onShowToast('Koneksi Cloud dihapus. Kembali menggunakan Penyimpanan Lokal.', 'info');
    }
    if (onReloadData) {
      await onReloadData();
    }
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_QUERY);
    setCopiedSql(true);
    if (onShowToast) {
      onShowToast('Script SQL Schema berhasil disalin ke clipboard!', 'success');
    }
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="ri-cloud-line" style={{ color: 'var(--primary)' }}></i> Pengaturan Cloud Database (Supabase)
          </h3>
          <button className="btn-close-modal" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Connection Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: isConnected ? 'rgba(27, 189, 143, 0.1)' : 'var(--bg-surface-solid)',
            border: `1px solid ${isConnected ? 'rgba(27, 189, 143, 0.3)' : 'var(--border-color)'}`,
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={isConnected ? "ri-checkbox-circle-fill" : "ri-hard-drive-2-line"} 
                 style={{ fontSize: '1.3rem', color: isConnected ? 'var(--primary)' : 'var(--text-muted)' }}></i>
              <div>
                <strong style={{ fontSize: '0.9rem', color: isConnected ? 'var(--primary)' : 'var(--text-color)' }}>
                  {isConnected ? 'Terhubung ke Database Cloud (Supabase)' : 'Mode Penyimpanan Lokal (Browser)'}
                </strong>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {isConnected 
                    ? 'Data toko, katalog, & transaksi otomatis ter-sync ke cloud terpusat.' 
                    : 'Data disimpan di penyimpanan lokal browser ini.'}
                </div>
              </div>
            </div>
          </div>

          {/* Form Credentials */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Supabase Project URL
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">
              Supabase Anon / Public API Key
            </label>
            <input
              type="password"
              className="form-control"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>

          {/* SQL Setup Helper Section */}
          <div style={{
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-color)' }}>
                <i className="ri-code-s-slash-line" style={{ color: 'var(--primary)' }}></i> Script SQL Schema Database
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setShowSql(!showSql)}
                >
                  <i className={showSql ? "ri-eye-off-line" : "ri-eye-line"}></i> {showSql ? 'Sembunyikan' : 'Lihat SQL'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                  onClick={handleCopySql}
                >
                  <i className={copiedSql ? "ri-check-line" : "ri-file-copy-line"}></i> {copiedSql ? 'Tersalin!' : 'Salin Script SQL'}
                </button>
              </div>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              Jalankan script SQL ini di menu <strong>SQL Editor</strong> di Dashboard Supabase Anda untuk membuat tabel otomatis (`stores`, `catalog_presets`, `transactions`, `transaction_items`).
            </p>

            {showSql && (
              <pre style={{
                fontSize: '0.75rem',
                background: '#1E293B',
                color: '#E2E8F0',
                padding: '0.75rem',
                borderRadius: '6px',
                marginTop: '0.75rem',
                maxHeight: '180px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {SQL_SCHEMA_QUERY}
              </pre>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          {isConnected ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={handleClear}>
              <i className="ri-delete-bin-line"></i> Putus Koneksi Cloud
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className="ri-save-line"></i> Simpan Koneksi DB
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
