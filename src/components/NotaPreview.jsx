import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import { formatRupiah, formatDateId, calculateItemTotal, generateNotaText, generateCompactNotaText } from '../services/storage';
import CustomTooltip from './ui/CustomTooltip';

export default function NotaPreview({
  storeProfile,
  transaction,
  items,
  selectedPaper,
  onSelectPaper,
  subtotal,
  grandTotal,
  sisa,
  isSaved,
  onSaveTransaction,
  onResetForm,
  onShowToast,
  hidePaperSelector = false
}) {
  const qrCanvasRef = useRef(null);
  const printableRef = useRef(null);

  useEffect(() => {
    if (qrCanvasRef.current) {
      const qrData = `${transaction.noNota}|${transaction.custName || 'Pelanggan'}|${grandTotal}|${transaction.payStatus}`;
      QRCode.toCanvas(qrCanvasRef.current, qrData, {
        width: 65,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR code generation failed:', error);
      });
    }
  }, [transaction.noNota, transaction.custName, grandTotal, transaction.payStatus]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = printableRef.current;
    if (!element) return;
    const opt = {
      margin: 5,
      filename: `E-Nota_${transaction.noNota}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
    if (onShowToast) {
      onShowToast('Mengunduh berkas E-Nota PDF...', 'info');
    }
  };

  const handleShareWa = () => {
    const text = generateNotaText(storeProfile, transaction, items, grandTotal, sisa);

    const encodedText = encodeURIComponent(text);
    let waUrl = `https://wa.me/?text=${encodedText}`;
    if (transaction.custPhone) {
      let formattedPhone = transaction.custPhone.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.slice(1);
      }
      waUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;
    }

    window.open(waUrl, '_blank');
  };

  const handleCopyText = () => {
    const text = generateNotaText(storeProfile, transaction, items, grandTotal, sisa);
    navigator.clipboard.writeText(text);
    if (onShowToast) {
      onShowToast('Teks ringkasan nota berhasil disalin ke clipboard!', 'success');
    }
  };

  return (
    <section className="preview-container">
      <div className="preview-sticky-wrapper">
        
        {/* Paper selector bar */}
        {!hidePaperSelector && (
          <div className="paper-selector-bar">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <i className="ri-layout-3-line"></i> Format Cetak Kertas:
            </span>
            <div className="paper-tabs">
              {['80mm', '58mm', 'A5', 'A4'].map((size) => (
                <button
                  key={size}
                  className={`paper-tab ${selectedPaper === size ? 'active' : ''}`}
                  onClick={() => onSelectPaper(size)}
                >
                  {size === '80mm' ? 'Thermal 80mm' : (size === '58mm' ? 'Thermal 58mm' : `Kertas ${size}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printable Nota Canvas Wrapper (Proportional A4 Scaler for mobile & desktop) */}
        <div className="nota-a4-scaler">
          <div id="printableNota" ref={printableRef} className="nota-canvas" data-paper={selectedPaper}>
            
            {/* Figma Top Header Section */}
            <div className="nota-header-view">
              <div>
                {/* Logo Pustaka Bakid */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src="/favicon.svg" alt="Logo Toko" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="nota-invoice-accent">Invoice</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', marginTop: '0.4rem', lineHeight: '1.35' }}>
                  <div>{transaction.noNota}</div>
                  <div>{formatDateId(transaction.date)}</div>
                </div>
              </div>
            </div>

            {/* Store Name Title & Greeting Message */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000000', margin: '0 0 0.4rem 0' }}>
                {storeProfile.name}
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.45', maxWidth: '320px' }}>
                Halo, {transaction.custName || 'Customer'}.<br />
                Terima Kasih Telah Menggunakan Jasa Kami.
              </div>
            </div>

            {/* Figma Two Column Metadata (BILLING INFORMATION & PAYMENT METHOD) */}
            <div className="nota-meta-grid">
              <div style={{ width: '48%' }}>
                <div className="nota-meta-section-title">BILLING INFORMATION</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.45' }}>
                  <div>{transaction.custName || 'Pelanggan'}</div>
                  {transaction.custAddress && <div>{transaction.custAddress}</div>}
                  <div>No: {transaction.custPhone || '-'}</div>
                </div>
              </div>
              <div style={{ width: '48%', textAlign: 'right' }}>
                <div className="nota-meta-section-title">PAYMENT METHOD</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.45' }}>
                  <div>{transaction.payMethod || 'Transfer'}</div>
                  {transaction.payMethod === 'Transfer' && transaction.bankName && (
                    <div>Nama Bank: {transaction.bankName}</div>
                  )}
                  <div>
                    Status Pembayaran: {' '}
                    <span style={{ color: transaction.payStatus === 'Lunas' ? '#1BBD8F' : (transaction.payStatus === 'DP' ? '#b45309' : '#b91c1c'), fontWeight: 600 }}>
                      {transaction.payStatus === 'Lunas' ? 'LUNAS' : transaction.payStatus.toUpperCase()}
                    </span>
                  </div>
                  <div>Pengambilan: {transaction.pickupMethod || 'Ditunggu'}</div>
                </div>
              </div>
            </div>

            {/* Figma Items Table */}
            <table className="nota-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Nama Barang</th>
                  <th className="text-right" style={{ width: '60px', textAlign: 'center' }}>Jumlah</th>
                  <th className="text-right" style={{ width: '100px' }}>Harga</th>
                  <th className="text-right" style={{ width: '110px' }}>Total Harga</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemTotal = calculateItemTotal(item);
                  const areaM2 = item.type === 'm2' ? (item.length / 100) * (item.width / 100) : 0;

                  // Build type/dimension sub-text
                  let typeSub = '';
                  if (item.type === 'm2') {
                    typeSub = `${item.length}x${item.width}cm (${areaM2.toFixed(2)}m²)`;
                  } else if (item.type === 'buku') {
                    const bookParts = [];
                    if (item.bookSize) bookParts.push(item.bookSize);
                    if (item.bookPages) bookParts.push(`${item.bookPages} hlm`);
                    if (item.bookPaperInner) bookParts.push(`Isi: ${item.bookPaperInner}`);
                    if (item.bookCover) bookParts.push(`Cover: ${item.bookCover}`);
                    if (item.bookBinding) bookParts.push(item.bookBinding);
                    typeSub = bookParts.length > 0 ? bookParts.join(' | ') : 'BUKU';
                  } else {
                    typeSub = item.type.toUpperCase();
                  }

                  // Build custom details sub-text
                  const customDetailParts = (item.customDetails || [])
                    .filter(d => d.key && d.value)
                    .map(d => `${d.key}: ${d.value}`);

                  return (
                    <tr key={idx}>
                      <td>
                        <strong className="nota-item-title">
                          {items.length > 1 ? `${idx + 1}. ` : ''}{item.name || 'Pekerjaan Cetak'}
                        </strong>
                        {item.type === 'buku' && item.bookTitle && (
                          <span className="nota-item-sub" style={{ fontStyle: 'italic' }}>
                            &ldquo;{item.bookTitle}&rdquo;
                          </span>
                        )}
                        <span className="nota-item-sub">{typeSub}</span>
                        {item.finishing && (
                          <span className="nota-item-sub">Finishing: {item.finishing}</span>
                        )}
                        {customDetailParts.length > 0 && (
                          <span className="nota-item-sub">{customDetailParts.join(' | ')}</span>
                        )}
                      </td>
                      <td className="text-right num-tabular" style={{ textAlign: 'center', color: '#646A6E' }}>
                        {item.qty}
                      </td>
                      <td className="text-right num-tabular" style={{ color: '#1E2B33' }}>
                        {formatRupiah(item.price)}
                      </td>
                      <td className="text-right num-tabular" style={{ color: '#1E2B33', fontWeight: 600 }}>
                        {formatRupiah(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Figma Totals View */}
            <div className="nota-totals-view">
              <div className="nota-total-row">
                <span>Sub Total</span>
                <span className="num-tabular">{formatRupiah(subtotal)}</span>
              </div>
              <div className="nota-total-row">
                <span>Diskon</span>
                <span className="num-tabular">
                  {transaction.discount > 0 ? `- ${formatRupiah(transaction.discount)}` : 'Rp. -0'}
                </span>
              </div>
              <div className="nota-total-row grand-total">
                <span>Total Harga</span>
                <span className="num-tabular">{formatRupiah(grandTotal)}</span>
              </div>
              <div className="nota-total-row">
                <span>Bayar</span>
                <span className="num-tabular">
                  {formatRupiah(transaction.payStatus === 'Lunas' ? grandTotal : (transaction.payStatus === 'DP' ? transaction.dp : 0))}
                </span>
              </div>
              <div className="nota-total-row" style={{ fontWeight: 700, color: '#000000', fontSize: '0.95rem' }}>
                <span>{transaction.payStatus === 'Lunas' ? 'Kembali' : 'Sisa Pelunasan'}</span>
                <span className="num-tabular" style={{ color: transaction.payStatus === 'Lunas' ? '#000000' : '#cc0000' }}>
                  {formatRupiah(transaction.payStatus === 'Lunas' ? 0 : sisa)}
                </span>
              </div>
            </div>

            {transaction.catatan && (
              <div style={{ fontSize: '0.8rem', background: '#F9FAFB', padding: '0.6rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3.5px solid var(--figma-primary)' }}>
                <strong>Catatan:</strong> {transaction.catatan}
              </div>
            )}

            {/* Footer & QR Code */}
            <div className="nota-footer-view">
              <div>
                <p style={{ fontSize: '0.8rem', color: '#5B5B5B', margin: 0, fontWeight: 500 }}>
                  {storeProfile.footerMsg || 'Terima kasih.'}
                </p>
              </div>
              <div className="qr-code-box">
                <canvas ref={qrCanvasRef} />
                <span style={{ fontSize: '0.65rem', color: '#666', display: 'block', marginTop: '2px' }}>E-Nota Verifikasi</span>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons Section */}
        {!isSaved ? (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', width: '100%', maxWidth: '680px' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onSaveTransaction}>
              <i className="ri-save-line"></i>
              <span>Simpan Transaksi & Terbitkan Nota</span>
            </button>
            <CustomTooltip text="Reset Form">
              <button className="btn btn-secondary" onClick={onResetForm}>
                <i className="ri-refresh-line"></i> Reset
              </button>
            </CustomTooltip>
          </div>
        ) : (
          <div className="quick-action-toolbar-container">
            {/* Quick Action Toolbar */}
            <div className="quick-action-toolbar">
              <CustomTooltip text="Cetak Langsung Ke Printer">
                <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handlePrint}>
                  <i className="ri-printer-line"></i> Cetak
                </button>
              </CustomTooltip>
              <CustomTooltip text="Unduh Dokumen PDF">
                <button className="btn btn-success btn-sm" style={{ width: '100%' }} onClick={handleDownloadPdf}>
                  <i className="ri-file-pdf-line"></i> PDF
                </button>
              </CustomTooltip>
              <CustomTooltip text="Kirim Nota via WhatsApp">
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleShareWa}>
                  <i className="ri-whatsapp-line"></i> WA
                </button>
              </CustomTooltip>
              <CustomTooltip text="Salin Teks Nota Ke Clipboard">
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleCopyText}>
                  <i className="ri-file-copy-line"></i> Salin
                </button>
              </CustomTooltip>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
