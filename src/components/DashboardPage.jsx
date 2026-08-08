import React, { useState, useEffect } from 'react';
import { formatRupiah, formatDateId } from '../services/storage';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConnected, SQL_SCHEMA_QUERY } from '../services/supabaseClient';
import CustomTooltip from './ui/CustomTooltip';
import CustomSelect from './ui/CustomSelect';
import CustomDatePicker from './ui/CustomDatePicker';

const ITEM_TYPE_OPTIONS = [
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Pcs / Satuan' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Cetak Buku / Booklet' }
];

const HISTORY_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'Lunas', label: 'LUNAS' },
  { value: 'DP', label: 'Uang Muka (DP)' },
  { value: 'Belum Bayar', label: 'BELUM LUNAS' },
  { value: 'Dibatalkan', label: 'DIBATALKAN' }
];

const CATALOG_TYPE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Jenis' },
  { value: 'm2', label: 'Meter Persegi (m²)' },
  { value: 'pcs', label: 'Satuan (pcs)' },
  { value: 'rim', label: 'Rim' },
  { value: 'pack', label: 'Pack / Box' },
  { value: 'buku', label: 'Buku / Booklet' }
];

const getProductCueIcon = (name = '', type = '') => {
  const n = (name || '').toLowerCase();
  if (type === 'buku' || n.includes('buku') || n.includes('booklet') || n.includes('novel') || n.includes('majalah')) return 'ri-book-3-line';
  if (n.includes('brosur') || n.includes('flyer') || n.includes('leaflets') || n.includes('poster')) return 'ri-file-text-line';
  if (n.includes('card') || n.includes('kartu') || n.includes('id card') || n.includes('namecard')) return 'ri-id-card-line';
  if (n.includes('modul') || n.includes('katalog') || n.includes('proposal')) return 'ri-file-list-3-line';
  if (type === 'pack' || n.includes('box') || n.includes('kemasan') || n.includes('dus')) return 'ri-box-3-line';
  if (type === 'm2' || n.includes('banner') || n.includes('mmt') || n.includes('spanduk') || n.includes('stiker')) return 'ri-flag-line';
  return 'ri-price-tag-3-line';
};

const parseFinishingChips = (finishingStr) => {
  if (!finishingStr || !finishingStr.trim()) return ['Tanpa Finishing'];
  return finishingStr.split(/[,|\/]+/).map(s => s.trim()).filter(Boolean);
};

export default function DashboardPage({
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
  onShowToast,
  // Page Navigation
  onNavigate,
  onOpenAccounts
}) {
  const [activeTab, setActiveTab] = useState('history');

  // Search & Filter state for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');

  // Catalog Form & Filter state
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('ALL');

  // Store Profile Form state
  const [storeForm, setStoreForm] = useState({ name: '', subtitle: '', address: '', phone: '', footerMsg: '' });

  // Cloud Credentials state
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (storeProfile) {
      setStoreForm({ ...storeProfile });
    }
    const config = getSupabaseConfig();
    setCloudUrl(config.url);
    setCloudKey(config.key);
  }, [storeProfile]);

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
      price: parseFloat(presetForm.price) || 0,
      updatedAt: new Date().toISOString()
    });
    setEditingPreset(null);
    setPresetForm({ id: '', name: '', type: 'm2', price: 0, finishing: '' });
    if (onShowToast) onShowToast('Preset katalog berhasil disimpan!', 'success');
  };

  const handleDuplicatePreset = (item) => {
    const duplicated = {
      ...item,
      id: 'preset-' + Date.now(),
      name: `${item.name} (Salinan)`,
      updatedAt: new Date().toISOString()
    };
    onSavePreset(duplicated);
    if (onShowToast) onShowToast(`Preset "${item.name}" berhasil diduplikasi!`, 'success');
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
  // FILTERED & PAGINATED DATA
  // --------------------------------------------------------------------------
  const filteredHistory = history.filter(item => {
    const searchLower = historySearch.toLowerCase();
    const matchesSearch = (
      (item.noNota || '').toLowerCase().includes(searchLower) ||
      (item.custName || '').toLowerCase().includes(searchLower) ||
      (item.custPhone || '').toLowerCase().includes(searchLower)
    );
    const matchesStatus = historyStatusFilter === 'ALL' || item.payStatus === historyStatusFilter;

    let matchesDate = true;
    if (historyDateFrom && item.date) {
      matchesDate = matchesDate && item.date >= historyDateFrom;
    }
    if (historyDateTo && item.date) {
      matchesDate = matchesDate && item.date <= historyDateTo;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredCatalog = catalog.filter(item => {
    const searchLower = catalogSearch.toLowerCase();
    const matchesSearch = (
      (item.name || '').toLowerCase().includes(searchLower) ||
      (item.finishing || '').toLowerCase().includes(searchLower)
    );
    const matchesType = catalogTypeFilter === 'ALL' || item.type === catalogTypeFilter;
    return matchesSearch && matchesType;
  });

  // Stats calculations
  const totalOmset = history.reduce((acc, h) => acc + (Number(h.grandTotal) || 0), 0);
  const totalLunas = history.filter(h => h.payStatus === 'Lunas').length;
  const totalSisa = history.reduce((acc, h) => acc + (Number(h.sisa) || 0), 0);

  return (
    <div className="dashboard-page-container" style={{ padding: '1rem', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* 4 Overview Analytics Stat Cards */}
      <div className="dashboard-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.85rem',
        marginBottom: '1rem'
      }}>
        {/* Stat Card 1: Omset */}
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(27, 189, 143, 0.12)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem'
          }}>
            <i className="ri-money-dollar-circle-line"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Omset Penjualan
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '0.1rem' }} className="num-tabular">
              {formatRupiah(totalOmset)}
            </div>
          </div>
        </div>

        {/* Stat Card 2: Total Nota */}
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem'
          }}>
            <i className="ri-file-text-line"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Transaksi Nota
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '0.1rem' }}>
              {history.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Nota</span>
            </div>
          </div>
        </div>

        {/* Stat Card 3: Status Bayar Lunas */}
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem'
          }}>
            <i className="ri-checkbox-circle-line"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Nota Lunas
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-color)', marginTop: '0.1rem' }}>
              {totalLunas} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Tuntas</span>
            </div>
          </div>
        </div>

        {/* Stat Card 4: Sisa Pelunasan */}
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem'
          }}>
            <i className="ri-time-line"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sisa DP / Belum Lunas
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444', marginTop: '0.1rem' }} className="num-tabular">
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
        padding: '1.15rem',
        boxShadow: 'var(--shadow-sm)'
      }}>

        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-tabs" style={{ marginBottom: '1.15rem' }}>
          <button
            className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <i className="ri-history-line"></i> Riwayat Transaksi ({history.length})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <i className="ri-price-tag-3-line"></i> Katalog Preset Tarif ({catalog.length})
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
            Koneksi Cloud DB {isConnected && <span className="tab-badge-online">Active</span>}
          </button>
          {onOpenAccounts && (
            <button
              className="dashboard-tab"
              onClick={onOpenAccounts}
              style={{ color: 'var(--primary)', fontWeight: 600 }}
            >
              <i className="ri-user-settings-line"></i> Manajemen Akun
            </button>
          )}
        </div>

        {/* ================================================================== */}
        {/* TAB 1: RIWAYAT TRANSAKSI (COMPACT SAAS DENSE TABLE) */}
        {/* ================================================================== */}
        {activeTab === 'history' && (
          <div>
            {/* Single Row Horizontal Dense Toolbar */}
            <div className="dense-toolbar">
              {/* Search input */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <i className="ri-search-line" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari no nota, customer, HP..."
                  style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.825rem' }}
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div style={{ width: '150px' }}>
                <CustomSelect
                  options={HISTORY_STATUS_OPTIONS}
                  value={historyStatusFilter}
                  onChange={(val) => setHistoryStatusFilter(val)}
                  placeholder="Semua Status"
                />
              </div>

              {/* Date From */}
              <div className="dense-toolbar-item">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dari:</span>
                <CustomDatePicker
                  value={historyDateFrom}
                  onChange={setHistoryDateFrom}
                  placeholder="Dari tgl..."
                />
              </div>

              {/* Date To */}
              <div className="dense-toolbar-item">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>s/d:</span>
                <CustomDatePicker
                  value={historyDateTo}
                  onChange={setHistoryDateTo}
                  placeholder="Sampai tgl..."
                />
                {(historyDateFrom || historyDateTo) && (
                  <CustomTooltip text="Reset Filter Tanggal">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ height: '34px', padding: '0 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => { setHistoryDateFrom(''); setHistoryDateTo(''); }}
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  </CustomTooltip>
                )}
              </div>

              {/* Action Buttons right aligned */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                <CustomTooltip text="Buat Nota Baru">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ height: '34px', padding: '0 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={() => onNavigate && onNavigate('editor')}
                  >
                    <i className="ri-add-line"></i> + Tambah Nota
                  </button>
                </CustomTooltip>

                <CustomTooltip text="Unduh Backup Data JSON">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ height: '34px', padding: '0 0.65rem', fontSize: '0.8rem' }}
                    onClick={onExportDataJSON}
                  >
                    <i className="ri-download-cloud-line"></i>
                  </button>
                </CustomTooltip>
              </div>
            </div>

            {/* Dense Table */}
            {filteredHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                <i className="ri-inbox-archive-line" style={{ fontSize: '2.8rem', color: 'var(--text-muted)' }}></i>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {historySearch || historyStatusFilter !== 'ALL' || historyDateFrom || historyDateTo
                    ? 'Tidak ada transaksi yang cocok dengan filter.' 
                    : 'Belum ada transaksi nota tersimpan.'}
                </p>
              </div>
            ) : (
              <div className="dense-table-container">
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th style={{ width: '155px' }}>No Nota</th>
                      <th>Customer</th>
                      <th style={{ width: '110px' }}>Tanggal</th>
                      <th style={{ width: '130px' }}>Status Pembayaran</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Total</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Sisa Bayar</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((rec, idx) => (
                      <tr key={rec.id || idx}>
                        <td>
                          <CustomTooltip text="Buka & Edit Nota">
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                              onClick={() => onLoadTransaction(rec)}
                            >
                              {rec.noNota}
                            </button>
                          </CustomTooltip>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.875rem' }}>
                            {rec.custName || 'Pelanggan Umum'}
                          </div>
                          {rec.custPhone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                              No: {rec.custPhone}
                            </div>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {formatDateId(rec.date)}
                        </td>
                        <td>
                          <span className={`badge-status ${
                            rec.payStatus === 'Lunas' 
                              ? 'lunas' 
                              : (rec.payStatus === 'DP' ? 'dp' : (rec.payStatus === 'Dibatalkan' ? 'cancelled' : 'unpaid'))
                          }`}>
                            {rec.payStatus === 'Lunas' ? '✓ LUNAS' : (rec.payStatus === 'DP' ? 'UANG MUKA' : rec.payStatus.toUpperCase())}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="num-tabular">
                          {formatRupiah(rec.grandTotal)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="num-tabular">
                          {rec.sisa > 0 ? (
                            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                              {formatRupiah(rec.sisa)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                            <CustomTooltip text="Buka & Cetak Nota">
                              <button
                                type="button"
                                className="btn-icon-action"
                                onClick={() => onLoadTransaction(rec)}
                              >
                                <i className="ri-printer-line"></i>
                              </button>
                            </CustomTooltip>
                            <CustomTooltip text="Edit Transaksi">
                              <button
                                type="button"
                                className="btn-icon-action"
                                onClick={() => onLoadTransaction(rec)}
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                            </CustomTooltip>
                            <CustomTooltip text="Hapus Nota">
                              <button
                                type="button"
                                className="btn-icon-action danger"
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
        {/* TAB 2: KATALOG PRESET TARIF (PRODUCT CATALOG MANAGEMENT) */}
        {/* ================================================================== */}
        {activeTab === 'catalog' && (
          <div>
            {/* Dense Horizontal Toolbar */}
            <div className="dense-toolbar">
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                <i className="ri-search-line" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari preset produk..."
                  style={{ paddingLeft: '2rem', height: '34px', fontSize: '0.825rem' }}
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>

              {/* Filter Jenis / Tipe */}
              <div style={{ width: '160px' }}>
                <CustomSelect
                  options={CATALOG_TYPE_FILTER_OPTIONS}
                  value={catalogTypeFilter}
                  onChange={(val) => setCatalogTypeFilter(val)}
                  placeholder="Semua Jenis"
                />
              </div>

              {/* Add Button */}
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ height: '34px', padding: '0 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  onClick={() => handleOpenPresetForm()}
                >
                  <i className="ri-add-line"></i> + Tambah Preset Baru
                </button>
              </div>
            </div>

            {/* Add / Edit Form Inline Card */}
            {(editingPreset || presetForm.id) && (
              <form onSubmit={handleSavePresetForm} style={{
                background: 'var(--bg-surface-solid)',
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--primary)',
                marginBottom: '1rem',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <i className="ri-edit-box-line"></i> {editingPreset ? 'Edit Preset Produk' : 'Tambah Preset Produk Baru'}
                  </h4>
                  <CustomTooltip text="Tutup Form">
                    <button type="button" className="btn-remove-item" onClick={() => setEditingPreset(null)}>
                      <i className="ri-close-line"></i>
                    </button>
                  </CustomTooltip>
                </div>

                <div className="catalog-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Nama Barang / Produk Cetakan</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nama produk cetakan"
                      value={presetForm.name}
                      onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipe Perhitungan Satuan</label>
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
                    <label className="form-label">Finishing Default (Gunakan koma untuk memisah)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Finishing default (opsional)"
                      value={presetForm.finishing}
                      onChange={(e) => setPresetForm(prev => ({ ...prev, finishing: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingPreset(null)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <i className="ri-save-line"></i> Simpan Preset
                  </button>
                </div>
              </form>
            )}

            {/* Dense Catalog Table */}
            {filteredCatalog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                <i className="ri-price-tag-3-line" style={{ fontSize: '2.8rem', color: 'var(--text-muted)' }}></i>
                <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {catalogSearch || catalogTypeFilter !== 'ALL'
                    ? 'Tidak ada produk preset yang cocok.' 
                    : 'Belum ada tarif katalog.'}
                </p>
              </div>
            ) : (
              <div className="dense-table-container">
                <table className="dense-table">
                  <thead>
                    <tr>
                      <th>Nama Produk</th>
                      <th style={{ width: '140px' }}>Kategori</th>
                      <th style={{ width: '80px' }}>Satuan</th>
                      <th style={{ textAlign: 'right', width: '130px' }}>Harga Default</th>
                      <th>Finishing</th>
                      <th style={{ width: '110px' }}>Terakhir Diubah</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map((item) => {
                      const cueIcon = getProductCueIcon(item.name, item.type);
                      const chips = parseFinishingChips(item.finishing);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <i className={cueIcon} style={{ color: 'var(--primary)', fontSize: '1rem' }}></i>
                              <strong style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>{item.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="item-type-badge">{item.type}</span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {item.type}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }} className="num-tabular">
                            {formatRupiah(item.price)}
                          </td>
                          <td>
                            <div className="chip-group">
                              {chips.map((chip, cIdx) => (
                                <span key={cIdx} className="chip-finishing">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {item.updatedAt ? formatDateId(item.updatedAt.slice(0, 10)) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem' }}>
                              <CustomTooltip text="Edit Preset">
                                <button
                                  type="button"
                                  className="btn-icon-action"
                                  onClick={() => handleOpenPresetForm(item)}
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                              </CustomTooltip>
                              <CustomTooltip text="Duplikat Preset">
                                <button
                                  type="button"
                                  className="btn-icon-action"
                                  onClick={() => handleDuplicatePreset(item)}
                                >
                                  <i className="ri-file-copy-line"></i>
                                </button>
                              </CustomTooltip>
                              <CustomTooltip text="Hapus Preset">
                                <button
                                  type="button"
                                  className="btn-icon-action danger"
                                  onClick={() => onDeletePreset(item.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </CustomTooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
          <form onSubmit={handleStoreSubmit} style={{ maxWidth: '840px' }}>
            <div style={{
              background: 'var(--bg-surface-solid)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.25rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <i className="ri-store-2-line"></i> Identitas & Informasi Usaha Percetakan
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {/* Left Column: Identitas & Kontak */}
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Nama Toko / Usaha Percetakan</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nama toko / usaha percetakan"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Sub-Judul / Tagline Toko</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Sub-judul / tagline toko"
                      value={storeForm.subtitle}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Nomor Telepon / WhatsApp Toko</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="0812-3456-7890"
                      value={storeForm.phone}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Right Column: Alamat & Footer Nota */}
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Alamat Lengkap Toko</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Jl. Raya Cetak No. 88, Karanganyar"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                    ></textarea>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label">Pesan Catatan Footer Nota</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Terima kasih. Cetakan tidak dapat dibatalkan."
                      value={storeForm.footerMsg}
                      onChange={(e) => setStoreForm(prev => ({ ...prev, footerMsg: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="ri-save-line"></i> Simpan Perubahan Profil Toko
              </button>
            </div>
          </form>
        )}

        {/* ================================================================== */}
        {/* TAB 4: KONEKSI CLOUD DB (SUPABASE) */}
        {/* ================================================================== */}
        {activeTab === 'cloud' && (
          <div style={{ maxWidth: '680px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: isConnected ? 'rgba(27, 189, 143, 0.1)' : 'var(--bg-surface-solid)',
              border: `1px solid ${isConnected ? 'rgba(27, 189, 143, 0.3)' : 'var(--border-color)'}`,
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <i className={isConnected ? "ri-checkbox-circle-fill" : "ri-hard-drive-2-line"} 
                   style={{ fontSize: '1.4rem', color: isConnected ? 'var(--primary)' : 'var(--text-muted)' }}></i>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: isConnected ? 'var(--primary)' : 'var(--text-color)' }}>
                    {isConnected ? 'Terhubung ke Database Cloud (Supabase)' : 'Mode Penyimpanan Lokal (Browser)'}
                  </strong>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {isConnected 
                      ? 'Data toko, katalog, & transaksi otomatis tersinkronisasi ke cloud.' 
                      : 'Data hanya tersimpan di penyimpanan lokal browser.'}
                  </div>
                </div>
              </div>
            </div>

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

            <div style={{
              background: 'var(--bg-surface-solid)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-color)' }}>
                  <i className="ri-code-s-slash-line" style={{ color: 'var(--primary)' }}></i> Script SQL Schema Database
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.725rem', padding: '0.2rem 0.55rem' }}
                    onClick={() => setShowSql(!showSql)}
                  >
                    <i className={showSql ? "ri-eye-off-line" : "ri-eye-line"}></i> {showSql ? 'Sembunyikan' : 'Lihat SQL'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.725rem', padding: '0.2rem 0.55rem' }}
                    onClick={handleCopySqlScript}
                  >
                    <i className={copiedSql ? "ri-check-line" : "ri-file-copy-line"}></i> {copiedSql ? 'Tersalin!' : 'Salin Script SQL'}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                Jalankan script SQL ini di menu <strong>SQL Editor</strong> pada Dashboard Supabase Anda untuk membuat tabel otomatis.
              </p>

              {showSql && (
                <pre style={{
                  fontSize: '0.725rem',
                  background: '#1E293B',
                  color: '#E2E8F0',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginTop: '0.65rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>
                  {SQL_SCHEMA_QUERY}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
  );
}
