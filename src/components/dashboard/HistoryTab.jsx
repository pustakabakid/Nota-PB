import React, { useState, useRef, useEffect } from 'react';
import { formatRupiah, formatDateId } from '../../services/storage';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../../services/reportExporter';
import { HISTORY_STATUS_OPTIONS } from '../../constants/appConstants';
import CustomTooltip from '../ui/CustomTooltip';
import CustomSelect from '../ui/CustomSelect';
import CustomDatePicker from '../ui/CustomDatePicker';

const formatWaLink = (phone) => {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return `https://wa.me/${clean}`;
};

export default function HistoryTab({
  history = [],
  storeProfile = {},
  onLoadTransaction,
  onDeleteTransaction,
  onExportDataJSON,
  onNavigate,
  onShowToast
}) {
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Click outside & Escape key listeners for Export Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen]);

  const filteredHistory = history.filter(item => {
    const searchLower = historySearch.toLowerCase();
    const matchesSearch = (
      String(item.noNota || '').toLowerCase().includes(searchLower) ||
      String(item.custName || '').toLowerCase().includes(searchLower) ||
      String(item.custPhone || '').toLowerCase().includes(searchLower)
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

  const paginatedHistory = filteredHistory.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  return (
    <div>
      {/* Dense Toolbar */}
      <div className="dense-toolbar history-toolbar">
        {/* Search input */}
        <div className="toolbar-search-box">
          <span className="material-symbols-outlined toolbar-search-icon" aria-hidden="true">search</span>
          <input
            type="text"
            className="form-control toolbar-search-input"
            placeholder="Cari no nota, customer, HP..."
            value={historySearch}
            onChange={(e) => {
              setHistorySearch(e.target.value);
              setVisibleCount(50);
            }}
          />
        </div>

        {/* Status Filter */}
        <div className="toolbar-status-box">
          <CustomSelect
            options={HISTORY_STATUS_OPTIONS}
            value={historyStatusFilter}
            onChange={(val) => {
              setHistoryStatusFilter(val);
              setVisibleCount(50);
            }}
            placeholder="Semua Status"
          />
        </div>

        {/* Date Filters */}
        <div className="toolbar-date-group">
          <div className="toolbar-date-field">
            <CustomDatePicker
              value={historyDateFrom}
              onChange={(dateStr) => {
                setHistoryDateFrom(dateStr);
                setVisibleCount(50);
              }}
              placeholder="Dari Tanggal"
            />
          </div>

          <span className="toolbar-date-separator">-</span>

          <div className="toolbar-date-field">
            <CustomDatePicker
              value={historyDateTo}
              onChange={(dateStr) => {
                setHistoryDateTo(dateStr);
                setVisibleCount(50);
              }}
              placeholder="Sampai Tanggal"
            />
          </div>

          {(historyDateFrom || historyDateTo) && (
            <CustomTooltip text="Reset Filter Tanggal">
              <button
                type="button"
                className="btn btn-secondary btn-sm toolbar-btn-reset-date"
                onClick={() => {
                  setHistoryDateFrom('');
                  setHistoryDateTo('');
                  setVisibleCount(50);
                }}
                aria-label="Reset tanggal"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </CustomTooltip>
          )}
        </div>

        {/* Action Buttons: Nota Baru (CTA Utama) + Dropdown Ekspor & Backup */}
        <div className="toolbar-actions-group">
          <CustomTooltip text="Buat Nota Baru">
            <button
              type="button"
              className="btn btn-primary btn-sm toolbar-action-btn toolbar-btn-new"
              onClick={() => onNavigate && onNavigate('editor')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              <span>Nota Baru</span>
            </button>
          </CustomTooltip>

          <div className="toolbar-dropdown-wrapper" ref={exportMenuRef}>
            <button
              type="button"
              className={`btn btn-secondary btn-sm toolbar-action-btn toolbar-dropdown-trigger${isExportMenuOpen ? ' active' : ''}`}
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              aria-haspopup="true"
              aria-expanded={isExportMenuOpen}
              title="Menu Ekspor & Backup Data"
            >
              <span className="material-symbols-outlined" aria-hidden="true">ios_share</span>
              <span className="dropdown-trigger-text-full">Ekspor & Backup</span>
              <span className="dropdown-trigger-text-short">Ekspor</span>
              <span className={`material-symbols-outlined dropdown-chevron${isExportMenuOpen ? ' rotate' : ''}`} aria-hidden="true">expand_more</span>
            </button>

            {isExportMenuOpen && (
              <div className="toolbar-floating-menu" role="menu" aria-label="Menu Ekspor & Backup">
                <div className="toolbar-menu-header">
                  <span>Opsi Ekspor & Backup</span>
                </div>

                <button
                  type="button"
                  className="toolbar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    exportTransactionsToExcel(filteredHistory, storeProfile, onShowToast);
                  }}
                >
                  <span className="material-symbols-outlined menu-item-icon text-success" aria-hidden="true">table_chart</span>
                  <div className="menu-item-text">
                    <strong className="menu-item-title">Ekspor ke Excel</strong>
                    <small className="menu-item-desc">Unduh spreadsheet (.xlsx)</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="toolbar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    exportTransactionsToPdf(filteredHistory, storeProfile, onShowToast);
                  }}
                >
                  <span className="material-symbols-outlined menu-item-icon text-danger" aria-hidden="true">picture_as_pdf</span>
                  <div className="menu-item-text">
                    <strong className="menu-item-title">Ekspor Laporan PDF</strong>
                    <small className="menu-item-desc">Dokumen laporan siap cetak</small>
                  </div>
                </button>

                <div className="toolbar-menu-divider" />

                <button
                  type="button"
                  className="toolbar-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExportDataJSON();
                  }}
                >
                  <span className="material-symbols-outlined menu-item-icon text-primary" aria-hidden="true">cloud_download</span>
                  <div className="menu-item-text">
                    <strong className="menu-item-title">Unduh Backup JSON</strong>
                    <small className="menu-item-desc">Cadangan data transaksi</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty State vs Table View */}
      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}>inventory_2</span>
          <h4 style={{ margin: '0.75rem 0 0.25rem 0', color: 'var(--text-main)', fontSize: 'var(--text-md)' }}>
            Tidak Ada Transaksi Nota
          </h4>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            {historySearch || historyStatusFilter !== 'ALL' || historyDateFrom || historyDateTo
              ? 'Tidak ada data transaksi yang sesuai dengan filter pencarian.' 
              : 'Belum ada transaksi nota yang pernah dibuat & disimpan.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="dense-table-container history-desktop-table">
            <table className="dense-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>No Nota</th>
                  <th>Customer</th>
                  <th style={{ width: '110px' }}>Tanggal</th>
                  <th style={{ width: '130px' }}>Status Bayar</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Sisa</th>
                  <th style={{ textAlign: 'center', width: '120px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((rec, idx) => (
                  <tr key={rec.id || idx}>
                    <td>
                      <CustomTooltip text="Buka & Edit Form Transaksi">
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
                            fontSize: 'var(--text-xs)'
                          }}
                          onClick={() => onLoadTransaction(rec, false)}
                        >
                          {rec.noNota}
                        </button>
                      </CustomTooltip>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-xs)' }} className="text-wrap-break">
                        {rec.custName || 'Pelanggan Umum'}
                      </div>
                      {rec.custPhone && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          No: {rec.custPhone}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {formatDateId(rec.date)}
                    </td>
                    <td>
                      <span className={`badge-status ${
                        rec.payStatus === 'Lunas' 
                          ? 'lunas' 
                          : (rec.payStatus === 'DP' ? 'dp' : (rec.payStatus === 'Dibatalkan' ? 'cancelled' : 'unpaid'))
                      }`}>
                        {rec.payStatus === 'Lunas' ? '✓ LUNAS' : (rec.payStatus === 'DP' ? 'UANG MUKA' : String(rec.payStatus || '').toUpperCase())}
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
                        <CustomTooltip text="Lihat E-Nota Publik">
                          <button
                            type="button"
                            className="btn-icon-action"
                            style={{ color: 'var(--primary)' }}
                            onClick={() => window.open(`?nota=${encodeURIComponent(rec.noNota)}`, '_blank')}
                            aria-label="Lihat E-Nota Publik"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>open_in_new</span>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Cetak Nota Langsung">
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => onLoadTransaction(rec, true)}
                            aria-label="Cetak Nota"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>print</span>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Edit Form Transaksi">
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => onLoadTransaction(rec, false)}
                            aria-label="Edit Transaksi"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Hapus Nota">
                          <button
                            type="button"
                            className="btn-icon-action danger"
                            onClick={() => onDeleteTransaction(idx)}
                            aria-label="Hapus Nota"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                          </button>
                        </CustomTooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Native Cards View (< 768px - No Horizontal Scroll!) */}
          <div className="history-mobile-list" role="feed" aria-label="Daftar Riwayat Transaksi">
            {paginatedHistory.map((rec, idx) => {
              const isLunas = rec.payStatus === 'Lunas';
              const isDp = rec.payStatus === 'DP';
              const isCancelled = rec.payStatus === 'Dibatalkan';
              const statusClass = isLunas ? 'lunas' : (isDp ? 'dp' : (isCancelled ? 'cancelled' : 'unpaid'));
              const statusLabel = isLunas ? '✓ LUNAS' : (isDp ? 'UANG MUKA' : String(rec.payStatus || '').toUpperCase());
              const waUrl = formatWaLink(rec.custPhone);

              return (
                <article key={`hm_${rec.id || idx}`} className="history-mobile-card">
                  {/* Top Bar: No Nota + Status Badge */}
                  <div className="hmc-header">
                    <div className="hmc-nota-wrapper">
                      <button
                        type="button"
                        className="hmc-nota-btn"
                        onClick={() => onLoadTransaction(rec, false)}
                        title="Edit transaksi nota ini"
                      >
                        <span className="material-symbols-outlined hmc-nota-icon" aria-hidden="true">receipt_long</span>
                        <span className="hmc-nota-num">{rec.noNota}</span>
                      </button>
                      <span className="hmc-date">{formatDateId(rec.date)}</span>
                    </div>
                    <span className={`badge-status ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="hmc-customer-row">
                    <div className="hmc-customer-info">
                      <span className="material-symbols-outlined hmc-cust-icon" aria-hidden="true">person</span>
                      <div className="hmc-customer-text">
                        <strong className="hmc-cust-name text-wrap-break">{rec.custName || 'Pelanggan Umum'}</strong>
                        {rec.custPhone && (
                          waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hmc-cust-phone"
                              title="Hubungi via WhatsApp"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }} aria-hidden="true">chat</span>
                              <span>{String(rec.custPhone)}</span>
                            </a>
                          ) : (
                            <span className="hmc-cust-phone" style={{ color: 'var(--text-muted)' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }} aria-hidden="true">call</span>
                              <span>{String(rec.custPhone)}</span>
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Amount Row */}
                  <div className="hmc-amount-row">
                    <div className="hmc-amount-item">
                      <span className="hmc-amount-label">Grand Total</span>
                      <span className="hmc-amount-value num-tabular">{formatRupiah(rec.grandTotal)}</span>
                    </div>
                    {rec.sisa > 0 ? (
                      <div className="hmc-amount-item hmc-sisa-item">
                        <span className="hmc-amount-label">Sisa Pelunasan</span>
                        <span className="hmc-amount-sisa num-tabular">{formatRupiah(rec.sisa)}</span>
                      </div>
                    ) : (
                      <div className="hmc-amount-item hmc-lunas-chip">
                        <span className="material-symbols-outlined" style={{ fontSize: '0.95rem' }} aria-hidden="true">check_circle</span>
                        <span>Lunas Penuh</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button Row (Touch-target min 44x44px Apple HIG) */}
                  <div className="hmc-actions-row">
                    <button
                      type="button"
                      className="hmc-action-btn hmc-btn-view"
                      onClick={() => window.open(`?nota=${encodeURIComponent(rec.noNota)}`, '_blank')}
                      aria-label="Buka E-Nota Publik"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                      <span>E-Nota</span>
                    </button>
                    <button
                      type="button"
                      className="hmc-action-btn hmc-btn-print"
                      onClick={() => onLoadTransaction(rec, true)}
                      aria-label="Cetak Struk Nota"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">print</span>
                      <span>Cetak</span>
                    </button>
                    <button
                      type="button"
                      className="hmc-action-btn hmc-btn-edit"
                      onClick={() => onLoadTransaction(rec, false)}
                      aria-label="Edit Transaksi Nota"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="hmc-action-btn hmc-btn-delete"
                      onClick={() => onDeleteTransaction(idx)}
                      aria-label="Hapus Nota Ini"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                      <span>Hapus</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination / Load More Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.75rem 0.5rem 0 0.5rem',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)'
          }}>
            <span>
              Menampilkan <strong>{paginatedHistory.length}</strong> dari <strong>{filteredHistory.length}</strong> transaksi
            </span>
            {filteredHistory.length > visibleCount && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadMore}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">expand_more</span>
                Muat 50 Transaksi Lebih Banyak
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
