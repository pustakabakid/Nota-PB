import React, { useState } from 'react';
import { formatRupiah, formatDateId } from '../../services/storage';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../../services/reportExporter';
import { HISTORY_STATUS_OPTIONS } from '../../constants/appConstants';
import CustomTooltip from '../ui/CustomTooltip';
import CustomSelect from '../ui/CustomSelect';
import CustomDatePicker from '../ui/CustomDatePicker';

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
          <i className="ri-search-line toolbar-search-icon" aria-hidden="true"></i>
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

        {/* Date Range */}
        <div className="toolbar-date-range">
          <div className="toolbar-date-item">
            <span className="toolbar-date-label">Dari:</span>
            <CustomDatePicker
              value={historyDateFrom}
              onChange={(val) => {
                setHistoryDateFrom(val);
                setVisibleCount(50);
              }}
              placeholder="Dari tgl..."
            />
          </div>

          <div className="toolbar-date-item">
            <span className="toolbar-date-label">s/d:</span>
            <CustomDatePicker
              value={historyDateTo}
              onChange={(val) => {
                setHistoryDateTo(val);
                setVisibleCount(50);
              }}
              placeholder="Sampai tgl..."
            />
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
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </CustomTooltip>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="toolbar-actions-group">
          <CustomTooltip text="Ekspor Transaksi Ke Excel">
            <button
              type="button"
              className="btn btn-success btn-sm toolbar-action-btn"
              onClick={() => exportTransactionsToExcel(filteredHistory, storeProfile, onShowToast)}
            >
              <i className="ri-file-excel-line" aria-hidden="true"></i> <span>Excel</span>
            </button>
          </CustomTooltip>

          <CustomTooltip text="Ekspor Laporan PDF">
            <button
              type="button"
              className="btn btn-primary btn-sm toolbar-action-btn"
              onClick={() => exportTransactionsToPdf(filteredHistory, storeProfile, onShowToast)}
            >
              <i className="ri-file-pdf-line" aria-hidden="true"></i> <span>Laporan PDF</span>
            </button>
          </CustomTooltip>

          <CustomTooltip text="Buat Nota Baru">
            <button
              type="button"
              className="btn btn-primary btn-sm toolbar-action-btn"
              onClick={() => onNavigate && onNavigate('editor')}
            >
              <i className="ri-add-line" aria-hidden="true"></i> <span>Nota Baru</span>
            </button>
          </CustomTooltip>

          <CustomTooltip text="Backup JSON">
            <button
              type="button"
              className="btn btn-secondary btn-sm toolbar-action-btn toolbar-btn-icon-only"
              onClick={onExportDataJSON}
              aria-label="Backup JSON"
            >
              <i className="ri-download-cloud-line" aria-hidden="true"></i>
            </button>
          </CustomTooltip>
        </div>
      </div>

      {/* Empty State vs Table View */}
      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
          <i className="ri-inbox-archive-line" style={{ fontSize: '3rem', color: 'var(--text-muted)' }}></i>
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
          <div className="dense-table-container">
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
                        <CustomTooltip text="Lihat E-Nota Publik">
                          <button
                            type="button"
                            className="btn-icon-action"
                            style={{ color: 'var(--primary)' }}
                            onClick={() => window.open(`?nota=${encodeURIComponent(rec.noNota)}`, '_blank')}
                            aria-label="Lihat E-Nota Publik"
                          >
                            <i className="ri-external-link-line"></i>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Cetak Nota Langsung">
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => onLoadTransaction(rec, true)}
                            aria-label="Cetak Nota"
                          >
                            <i className="ri-printer-line"></i>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Edit Form Transaksi">
                          <button
                            type="button"
                            className="btn-icon-action"
                            onClick={() => onLoadTransaction(rec, false)}
                            aria-label="Edit Transaksi"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Hapus Nota">
                          <button
                            type="button"
                            className="btn-icon-action danger"
                            onClick={() => onDeleteTransaction(idx)}
                            aria-label="Hapus Nota"
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
                <i className="ri-arrow-down-line" aria-hidden="true"></i>
                Muat 50 Transaksi Lebih Banyak
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
