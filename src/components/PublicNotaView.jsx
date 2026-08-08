import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import NotaPreview from './NotaPreview';
import CustomTooltip from './ui/CustomTooltip';

export default function PublicNotaView({
  storeProfile,
  record,
  onBackToApp
}) {
  const printableRef = useRef(null);

  if (!record) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-surface-solid)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          maxWidth: '480px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <i className="ri-file-search-line" style={{ fontSize: '3.5rem', color: 'var(--danger)' }}></i>
          <h3 style={{ margin: '1rem 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-color)' }}>
            Nota Digital Tidak Ditemukan
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Nomor nota yang Anda tuju tidak terdaftar atau telah dihapus dari sistem database.
          </p>
          <button type="button" className="btn btn-primary" onClick={onBackToApp}>
            <i className="ri-home-4-line"></i> Buka Aplikasi Utama
          </button>
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

  const handleDownloadPdf = () => {
    const element = document.getElementById('printableNota');
    if (!element) return;
    const opt = {
      margin: 5,
      filename: `E-Nota_${transaction.noNota}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="public-nota-page">
      {/* Top Header Bar for Public Nota View */}
      <div style={{
        width: 'min(92vw, 640px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        padding: '0.65rem 0.85rem',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/favicon.svg" alt="Logo" style={{ height: '28px', width: 'auto' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-color)' }}>
            E-Nota Digital
          </span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.775rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          onClick={onBackToApp}
        >
          <i className="ri-home-4-line"></i> Buka Aplikasi Utama
        </button>
      </div>

      {/* Render Public Nota HTML Canvas with Proportional Scaler */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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
