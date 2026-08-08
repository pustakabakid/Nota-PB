import React, { useState, useEffect } from 'react';
import { formatRupiah, formatDateId } from '../services/storage';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConnected, SQL_SCHEMA_QUERY } from '../services/supabaseClient';
import CustomTooltip from './ui/CustomTooltip';
import CustomSelect from './ui/CustomSelect';

const ITEM_TYPE_OPTIONS = [
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Pcs / Satuan' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Cetak Buku / Booklet' }
];

export default function DashboardModal({
  isOpen,
  onClose,
  initialTab = 'history',
  // Store Profile props
  storeProfile,
  onSaveStoreProfile,
  // Catalog props
  catalog = [],
  onSavePreset,
  onDeletePreset,
  // History props
  history = [],
  onLoadTransaction,
  onDeleteTransaction,
  onExportDataJSON,
  // Cloud DB props
  onReloadData,
  onShowToast
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  // Search & Filter state for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Catalog Form state
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
  const [catalogSearch, setCatalogSearch] = useState('');

  // Store Profile Form state
  const [storeForm, setStoreForm] = useState({ name: '', subtitle: '', address: '', phone: '', footerMsg: '' });

  // Cloud Credentials state
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Sync store profile form
      if (storeProfile) {
        setStoreForm({ ...storeProfile });
      }
      // Sync cloud config
      const config = getSupabaseConfig();
      setCloudUrl(config.url);
      setCloudKey(config.key);
      setCopiedSql(false);
    }
  }, [isOpen, initialTab, storeProfile]);

  if (!isOpen) return null;

  const isConnected = isSupabaseConnected();

  // --------------------------------------------------------------------------
  // HANDLERS: Store Profile
  // --------------------------------------------------------------------------
  const handleStoreSubmit = (e) => {
    e.preventDefault();
    if (!storeForm.name.trim()) {
      if (onShowToast) onShowToast('Nama Toko tidak boleh kosong.', 'warning');
      return;
    }
    onSaveStoreProfile(storeForm);
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Catalog Preset
  // --------------------------------------------------------------------------
  const handleOpenPresetForm = (preset = null) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetForm({ ...preset });
    } else {
      setEditingPreset(null);
      setPresetForm({
        id: 'preset-' + Date.now(),
        name: '',
        type: 'm2',
        price: 0,
        finishing: ''
      });
    }
  };

  const handleSavePresetForm = (e) => {
    e.preventDefault();
    if (!presetForm.name.trim()) {
      if (onShowToast) onShowToast('Nama produk preset tidak boleh kosong.', 'warning');
      return;
    }
    onSavePreset({
      ...presetForm,
      price: parseFloat(presetForm.price) || 0
    });
    setEditingPreset(null);
    setPresetForm({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
    if (onShowToast) onShowToast('Preset katalog berhasil disimpan!', 'success');
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Cloud Config
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------------------------------
  const filteredHistory = history.filter(item => {
    const searchLower = historySearch.toLowerCase();
    const matchesSearch = (
      (item.noNota || '').toLowerCase().includes(searchLower) ||
      (item.custName || '').toLowerCase().includes(searchLower) ||
      (item.custPhone || '').toLowerCase().includes(searchLower)
    );
    const matchesStatus = historyStatusFilter === 'ALL' || item.payStatus === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCatalog = catalog.filter(item => {
    const searchLower = catalogSearch.toLowerCase();
    return (
      (item.name || '').toLowerCase().includes(searchLower) ||
      (item.finishing || '').toLowerCase().includes(searchLower) ||
      (item.type || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content dashboard-modal" style={{ maxWidth: '920px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header & Navigation Tabs */}
        <div className="modal-header" style={{ paddingBottom: 0, flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <i className="ri-dashboard-3-line" style={{ color: 'var(--primary)' }}></i> Dashboard Toko & Pengaturan
            </h3>
            <button className="btn-close-modal" onClick={onClose}>
              <i className="ri-close-line"></i>
            </button>
          </div>

          {/* Navigation Bar Tabs */}
          <div className="dashboard-tabs">
            <button
              className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <i className="ri-history-line"></i> Riwayat Nota ({history.length})
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <i className="ri-price-tag-3-line"></i> Katalog Tarif ({catalog.length})
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'store' ? 'active' : ''}`}
              onClick={() => setActiveTab('store')}
            >
              <i className="ri-store-2-line"></i> Profil Toko
            </button>
            <button
              className={`dashboard-tab ${activeTab === 'cloud' ? 'active' : ''}`}
              onClick={() => setActiveTab('cloud')}
            >
              <i className={isConnected ? "ri-cloud-fill" : "ri-cloud-line"} style={{ color: isConnected ? 'var(--primary)' : 'inherit' }}></i> 
              Cloud DB {isConnected && <span className="tab-badge-online">Active</span>}
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '1.25rem' }}>

          {/* ================================================================== */}
          {/* TAB 1: RIWAYAT TRANSAKSI NOTA */}
          {/* ================================================================== */}
          {activeTab === 'history' && (
            <div>
              {/* History Toolbar / Filters */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '260px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <i className="ri-search-line" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cari no nota, nama pelanggan..."
                        style={{ paddingLeft: '2.25rem' }}
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <select
                    className="form-control"
                    style={{ width: '140px' }}
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Lunas">Lunas</option>
                    <option value="DP">Uang Muka (DP)</option>
                    <option value="Belum Bayar">Belum Bayar</option>
                  </select>
                </div>

                <button type="button" className="btn btn-secondary btn-sm" onClick={onExportDataJSON}>
                  <i className="ri-download-cloud-line"></i> Backup JSON
                </button>
              </div>

              {/* History Table List */}
              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <i className="ri-file-history-line" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}></i>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {historySearch || historyStatusFilter !== 'ALL' 
                      ? 'Tidak ditemukan nota yang sesuai dengan pencarian/filter.' 
                      : 'Belum ada riwayat transaksi nota yang tersimpan.'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>No Nota</th>
                        <th>Tanggal</th>
                        <th>Pelanggan</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((rec, idx) => (
                        <tr key={rec.id || idx}>
                          <td><strong>{rec.noNota}</strong></td>
                          <td>{formatDateId(rec.date)}</td>
                          <td>
                            <div>{rec.custName || 'Pelanggan Umum'}</div>
                            {rec.custPhone && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.custPhone}</span>}
                          </td>
                          <td>
                            <span className={`status-badge ${rec.payStatus === 'Lunas' ? 'status-lunas' : (rec.payStatus === 'DP' ? 'status-dp' : 'status-proses')}`}>
                              {rec.payStatus}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }} className="num-tabular">
                            {formatRupiah(rec.grandTotal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                              <CustomTooltip text="Buka Nota Ke Form">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.45rem' }}
                                  onClick={() => {
                                    onLoadTransaction(rec);
                                    onClose();
                                  }}
                                >
                                  <i className="ri-eye-line"></i>
                                </button>
                              </CustomTooltip>
                              <CustomTooltip text="Hapus Nota Ini">
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '0.2rem 0.45rem' }}
                                  onClick={() => onDeleteTransaction(idx)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </CustomTooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 2: KATALOG PRESET TARIF */}
          {/* ================================================================== */}
          {activeTab === 'catalog' && (
            <div>
              {/* Preset Form & Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ position: 'relative', width: '260px' }}>
                  <i className="ri-search-line" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari preset barang..."
                    style={{ paddingLeft: '2.25rem' }}
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenPresetForm()}>
                  <i className="ri-add-line"></i> Tambah Preset Baru
                </button>
              </div>

              {/* Add / Edit Form Modal Inline Card */}
              {(editingPreset || presetForm.id) && (
                <form onSubmit={handleSavePresetForm} style={{ background: 'var(--bg-surface-solid)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary)', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--primary)' }}>
                    <i className="ri-edit-line"></i> {editingPreset ? 'Edit Preset Katalog' : 'Tambah Preset Produk Baru'}
                  </h4>
                  <div className="catalog-form-grid">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Nama Barang / Produk</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: Banner Flexi 280g Standard"
                        value={presetForm.name}
                        onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipe Perhitungan</label>
                      <CustomSelect
                        options={ITEM_TYPE_OPTIONS}
                        value={presetForm.type}
                        onChange={(val) => setPresetForm(prev => ({ ...prev, type: val }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Harga Default (Rp)</label>
                      <input
                        type="number"
                        className="form-control num-tabular"
                        placeholder="20000"
                        value={presetForm.price}
                        onChange={(e) => setPresetForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Finishing Default (Opsional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Contoh: Mata Ayam 4 Sudut, Polosan"
                        value={presetForm.finishing}
                        onChange={(e) => setPresetForm(prev => ({ ...prev, finishing: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPreset(null)}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <i className="ri-save-line"></i> Simpan Preset
                    </button>
                  </div>
                </form>
              )}

              {/* Catalog Table */}
              {filteredCatalog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <i className="ri-price-tag-3-line" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}></i>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {catalogSearch ? 'Tidak ada preset katalog yang sesuai.' : 'Belum ada tarif katalog. Klik "Tambah Preset Baru" di atas untuk menambah.'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Produk</th>
                        <th>Tipe</th>
                        <th style={{ textAlign: 'right' }}>Harga Satuan</th>
                        <th>Finishing</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalog.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.name}</strong></td>
                          <td><span className="item-type-badge">{item.type}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }} className="num-tabular">
                            {formatRupiah(item.price)}
                          </td>
                          <td>{item.finishing || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.2rem 0.45rem' }}
                                onClick={() => handleOpenPresetForm(item)}
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '0.2rem 0.45rem' }}
                                onClick={() => onDeletePreset(item.id)}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 3: PROFIL TOKO */}
          {/* ================================================================== */}
          {activeTab === 'store' && (
            <form onSubmit={handleStoreSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nama Toko / Usaha Percetakan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Pustaka Bakid Digital Printing"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Sub-Judul / Tagline Toko</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Digital Printing, Banner, Offset, & Merchandise"
                  value={storeForm.subtitle}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Alamat Lengkap Toko</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Jl. Raya Cetak No. 88, Karanganyar"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                ></textarea>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nomor Telepon / WhatsApp Toko</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="0812-3456-7890"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Pesan Catatan Footer Nota</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Terima kasih. Cetakan tidak dapat dibatalkan."
                  value={storeForm.footerMsg}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, footerMsg: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">
                  <i className="ri-save-line"></i> Simpan Perubahan Profil Toko
                </button>
              </div>
            </form>
          )}

          {/* ================================================================== */}
          {/* TAB 4: KONEKSI CLOUD DB (SUPABASE) */}
          {/* ================================================================== */}
          {activeTab === 'cloud' && (
            <div>
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
                <label className="form-label">Supabase Project URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://xyzcompany.supabase.co"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Supabase Anon / Public API Key</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={cloudKey}
                  onChange={(e) => setCloudKey(e.target.value)}
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
                      onClick={handleCopySqlScript}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                {isConnected ? (
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleClearCloudConfig}>
                    <i className="ri-delete-bin-line"></i> Putus Koneksi Cloud
                  </button>
                ) : <div />}
                <button type="button" className="btn btn-primary" onClick={handleSaveCloudConfig}>
                  <i className="ri-save-line"></i> Simpan Koneksi DB
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
