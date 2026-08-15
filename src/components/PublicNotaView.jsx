import React, { useRef } from 'react';
import { exportSingleNotaPdf } from '../services/reportExporter';
import NotaPreview from './NotaPreview';
import CustomTooltip from './ui/CustomTooltip';

export default function PublicNotaView({
  storeProfile,
  record,
  isLoading = false,
  onBackToApp
}) {
  const printableRef = useRef(null);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: 'calc(var(--space-4) + var(--sat)) var(--space-4) calc(var(--space-4) + var(--sab)) var(--space-4)',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(2rem, 5vw, 3rem) clamp(1.5rem, 4vw, 2.5rem)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', color: 'var(--text-main)' }}>
            Memuat E-Nota Digital...
          </h3>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Mengambil rincian data nota transaksi dari server cloud...
          </p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        padding: 'calc(var(--space-4) + var(--sat)) var(--space-4) calc(var(--space-4) + var(--sab)) var(--space-4)',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(1.5rem, 5vw, 2.5rem) clamp(1rem, 4vw, 2rem)',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <i className="ri-file-search-line" style={{ fontSize: '3.5rem', color: 'var(--danger)' }} aria-hidden="true"></i>
          <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: 'var(--text-lg)', color: 'var(--text-main)' }}>
            Nota Digital Tidak Ditemukan
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
            Nomor nota yang Anda tuju tidak terdaftar atau telah dihapus dari sistem database.
          </p>
          {onBackToApp && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '1.5rem' }}
              onClick={onBackToApp}
            >
              <i className="ri-arrow-left-line" aria-hidden="true"></i> Kembali ke Aplikasi
            </button>
          )}
        </div>
      </div>
    );
  }

  // Extract record items and transaction metadata
  const transaction = {
    noNota: record.noNota,
    custName: record.custName,
    custPhone: record.custPhone || '',
    custAddress: record.custAddress || '',
    date: record.date,
    orderStatus: record.orderStatus || 'Proses Cetak',
    payStatus: record.payStatus || 'Lunas',
    payMethod: record.payMethod || 'Transfer',
    bankName: record.bankName || '',
    pickupMethod: record.pickupMethod || 'Ditunggu',
    discount: Number(record.discount) || 0,
    dp: Number(record.dp) || 0,
    catatan: record.catatan || ''
  };

  const items = Array.isArray(record.items) ? record.items : [];
  const grandTotal = Number(record.grandTotal) || 0;
  const subtotal = Number(record.subtotal) || grandTotal;
  const sisa = Number(record.sisa) || 0;

  const handleDownloadPdf = async () => {
    try {
      await exportSingleNotaPdf(
        storeProfile,
        transaction,
        items,
        'A4',
        grandTotal,
        sisa
      );
    } catch (err) {
      console.error('Public PDF Export Error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="public-nota-page">
      {/* Top Action Bar for Public E-Nota */}
      <div className="no-print" style={{
        maxWidth: '680px',
        width: '100%',
        margin: '0 auto 1.25rem auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: 'var(--bg-card)',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <i className="ri-file-text-line" style={{ color: 'var(--primary)', fontSize: '1.25rem' }} aria-hidden="true"></i>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }} className="text-ellipsis-single">
            E-Nota Digital #{transaction.noNota}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: 'auto' }}>
          <CustomTooltip text="Cetak E-Nota">
            <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <i className="ri-printer-line" aria-hidden="true"></i> Cetak
            </button>
          </CustomTooltip>

          <CustomTooltip text="Unduh berkas PDF E-Nota">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleDownloadPdf}>
              <i className="ri-file-download-line" aria-hidden="true"></i> Unduh PDF
            </button>
          </CustomTooltip>
        </div>
      </div>

      {/* Render Public Nota Canvas with Proportional Scaler */}
      <div ref={printableRef} style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <NotaPreview
          storeProfile={storeProfile}
          transaction={transaction}
          items={items}
          selectedPaper="A4"
          onSelectPaper={() => {}}
          subtotal={subtotal}
          grandTotal={grandTotal}
          sisa={sisa}
          isSaved={true}
          onSaveTransaction={() => {}}
          onShowToast={() => {}}
          hidePaperSelector={true}
        />
      </div>
    </div>
  );
}
