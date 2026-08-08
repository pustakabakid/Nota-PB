import React from 'react';
import { formatRupiah, formatDateId } from '../services/storage';
import CustomTooltip from './ui/CustomTooltip';

export default function HistoryTable({ history, onLoadTransaction, onDeleteTransaction, onExportDataJSON }) {
  return (
    <section className="history-section">
      <div className="fluent-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>
            <i className="ri-history-line"></i> Riwayat Transaksi Nota Percetakan
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={onExportDataJSON}>
            <i className="ri-download-cloud-line"></i> Backup Data (JSON / Sheets Ready)
          </button>
        </div>

        <div className="table-responsive">
          <table className="fluent-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Status Order</th>
                <th>Status Bayar</th>
                <th className="text-right">Grand Total</th>
                <th className="text-right">Sisa Tagihan</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                history.map((rec, idx) => (
                  <tr key={idx}>
                    <td><strong className="receipt-number">{rec.noNota}</strong></td>
                    <td className="receipt-date">{formatDateId(rec.date)}</td>
                    <td>{rec.custName}</td>
                    <td><span className="status-badge status-proses">{rec.orderStatus}</span></td>
                    <td>
                      <span className={`status-badge ${rec.payStatus === 'Lunas' ? 'status-lunas' : (rec.payStatus === 'DP' ? 'status-dp' : 'status-proses')}`}>
                        {rec.payStatus}
                      </span>
                    </td>
                    <td className="text-right num-tabular" style={{ fontWeight: 600 }}>{formatRupiah(rec.grandTotal)}</td>
                    <td className="text-right num-tabular" style={{ color: rec.sisa > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatRupiah(rec.sisa)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <CustomTooltip text="Muat Transaksi ke Preview">
                          <button className="btn btn-secondary btn-sm" onClick={() => onLoadTransaction(rec)}>
                            <i className="ri-eye-line"></i>
                          </button>
                        </CustomTooltip>
                        <CustomTooltip text="Hapus Transaksi Ini">
                          <button className="btn btn-danger btn-sm" onClick={() => onDeleteTransaction(idx)}>
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </CustomTooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
