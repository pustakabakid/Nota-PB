import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import QRCode from 'qrcode';
import { formatRupiah, formatDateId, calculateItemTotal, generateNotaText } from '../services/storage';
import { exportSingleNotaPdf } from '../services/reportExporter';
import { PAPER_TAB_OPTIONS } from '../constants/appConstants';
import CustomTooltip from './ui/CustomTooltip';

function NotaPreview({
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
  hidePaperSelector = false,
  onSwitchMobileTab
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const printableRef = useRef(null);

  // Calculate dynamic density class based on item count to fit 1-page A4 aspect ratio without scroll
  const displayItems = useMemo(() => {
    const rawItems = Array.isArray(items) ? items : [];
    return rawItems.length > 0 
      ? rawItems 
      : (grandTotal > 0 ? [{
          id: 'fallback-item',
          name: 'Pekerjaan Cetak',
          type: 'pcs',
          qty: 1,
          price: grandTotal + (transaction.discount || 0),
          length: 100,
          width: 100
        }] : []);
  }, [items, grandTotal, transaction.discount]);

  const itemsSum = displayItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const computedSubtotal = subtotal > 0 ? subtotal : (itemsSum > 0 ? itemsSum : (grandTotal + (transaction.discount || 0)));
  const computedGrandTotal = grandTotal > 0 ? grandTotal : Math.max(0, computedSubtotal - (transaction.discount || 0));

  const qrDimension = useMemo(() => {
    const scale = storeProfile?.qrSize || 'medium';
    if (scale === 'custom') {
      const unit = storeProfile?.customQrUnit || 'mm';
      const val = Number(storeProfile?.customQrSize) || (unit === 'mm' ? 24 : 80);
      return `${val}${unit}`;
    }
    if (selectedPaper === '58mm') {
      return scale === 'small' ? '16mm' : (scale === 'large' ? '24mm' : '20mm');
    }
    if (selectedPaper === '80mm') {
      return scale === 'small' ? '18mm' : (scale === 'large' ? '28mm' : '24mm');
    }
    if (selectedPaper === 'A5') {
      return scale === 'small' ? '18mm' : (scale === 'large' ? '26mm' : '22mm');
    }
    if (selectedPaper === 'custom') {
      return scale === 'small' ? '18mm' : (scale === 'large' ? '26mm' : '22mm');
    }
    // A4
    return scale === 'small' ? '20mm' : (scale === 'large' ? '30mm' : '24mm');
  }, [selectedPaper, storeProfile?.qrSize, storeProfile?.customQrSize, storeProfile?.customQrUnit]);

  const customPaperStyle = useMemo(() => {
    if (selectedPaper !== 'custom') return {};
    const widthMm = Number(storeProfile?.customPaperWidth) || 100;
    const marginMm = storeProfile?.customPaperMargin !== undefined ? Number(storeProfile.customPaperMargin) : 4;
    return {
      width: `${widthMm}mm`,
      maxWidth: `${widthMm}mm`,
      padding: `${marginMm}mm`,
      boxSizing: 'border-box'
    };
  }, [selectedPaper, storeProfile?.customPaperWidth, storeProfile?.customPaperMargin]);

  const qrPositionClass = useMemo(() => {
    if (storeProfile?.qrSize === 'custom' && storeProfile?.qrPosition) {
      return `qr-pos-${storeProfile.qrPosition}`;
    }
    if (selectedPaper === '58mm' || selectedPaper === '80mm') return 'qr-pos-center';
    return 'qr-pos-right';
  }, [selectedPaper, storeProfile?.qrSize, storeProfile?.qrPosition]);

  useEffect(() => {
    let isCancelled = false;
    try {
      const storeTitle = storeProfile && storeProfile.name ? storeProfile.name : 'Pustaka Bakid';
      const custStr = transaction.custName ? transaction.custName.trim() : 'Pelanggan Umum';
      const dateStr = formatDateId(transaction.date);
      const totalStr = formatRupiah(computedGrandTotal);
      const statusStr = transaction.payStatus || 'Lunas';

      // Standardized, high-scannability structured QR payload
      const qrData = [
        storeTitle,
        `No. Nota: ${transaction.noNota}`,
        `Pelanggan: ${custStr}`,
        `Tanggal: ${dateStr}`,
        `Total: ${totalStr}`,
        `Status: ${statusStr}`
      ].join('\n');

      QRCode.toDataURL(qrData, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error, url) => {
        if (!isCancelled) {
          if (error) {
            console.error('QR code generation failed:', error);
            if (onShowToast) onShowToast('Gagal memproses QR Code pada nota.', 'warning');
          } else {
            setQrDataUrl(url);
          }
        }
      });
    } catch (err) {
      if (!isCancelled) {
        console.error('QR code generation sync error:', err);
        if (onShowToast) onShowToast('Gagal memproses QR Code.', 'warning');
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [transaction.noNota, transaction.custName, transaction.date, transaction.payStatus, storeProfile, computedGrandTotal, onShowToast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = printableRef.current || document.getElementById('printableNota');
    if (!element) {
      if (onShowToast) onShowToast('Elemen nota tidak ditemukan.', 'danger');
      return;
    }

    try {
      await exportSingleNotaPdf(
        storeProfile,
        transaction,
        displayItems,
        selectedPaper,
        computedGrandTotal,
        sisa,
        element
      );
      if (onShowToast) onShowToast('E-Nota PDF berhasil diunduh!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      if (onShowToast) onShowToast('Gagal mengunduh PDF: ' + (err?.message || 'Gunakan tombol Cetak.'), 'danger');
    }
  };

  const handleShareWa = () => {
    const text = generateNotaText(storeProfile, transaction, displayItems, computedGrandTotal, sisa);
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

  let densityClass = 'density-normal';
  if (displayItems.length >= 5) {
    densityClass = 'density-compact';
  } else if (displayItems.length >= 3) {
    densityClass = 'density-dense';
  }

  return (
    <div className="preview-sticky-wrapper">
      {/* Mobile Return to Order Bar */}
      {onSwitchMobileTab && (
        <div style={{ marginBottom: '0.65rem', width: '100%', maxWidth: '680px', margin: '0 auto 0.65rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSwitchMobileTab('order')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <i className="ri-arrow-left-line" aria-hidden="true" />
            <span>Form Order Kasir</span>
          </button>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            PREVIEW NOTA
          </span>
        </div>
      )}

      {/* 1. Paper selector bar */}
      {!hidePaperSelector && (
        <div className="paper-selector-bar">
          <div className="paper-selector-label">
            <i className="ri-layout-3-line" aria-hidden="true" />
            <span>Format Kertas:</span>
          </div>
          <div className="paper-tabs" role="tablist" aria-label="Pilihan Format Kertas">
            {PAPER_TAB_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.id}
                role="tab"
                aria-selected={selectedPaper === item.id}
                className={`paper-tab ${selectedPaper === item.id ? 'active' : ''}`}
                onClick={() => onSelectPaper(item.id)}
                aria-label={`Pilih format ${item.label}`}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.id === 'custom' ? (storeProfile?.customPaperName || 'Kustom') : item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Preview Stage (Natural paper sheet display without height clipping) */}
      <div className="preview-stage">
        <div
          id="printableNota"
          ref={printableRef}
          className={`nota-canvas ${densityClass}`}
          data-paper={selectedPaper}
          style={customPaperStyle}
        >
            
            {/* Top Header Section */}
            <div className="nota-header-view">
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <img src="/favicon.svg" alt="Logo Toko" style={{ height: '44px', width: 'auto', objectFit: 'contain' }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="nota-invoice-accent">Invoice</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', marginTop: '0.3rem', lineHeight: '1.35' }}>
                  <div style={{ fontWeight: 600 }}>{transaction.noNota}</div>
                  <div>{formatDateId(transaction.date)}</div>
                </div>
              </div>
            </div>

            {/* Store Name Title & Greeting Message */}
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#000000', margin: '0 0 0.3rem 0' }}>
                {storeProfile.name || 'Nota Percetakan'}
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.4', maxWidth: '340px' }}>
                Halo, {transaction.custName || 'Customer'}.<br />
                Terima Kasih Telah Menggunakan Jasa Kami.
              </div>
            </div>

            {/* Responsive Billing Metadata (BILLING INFORMATION & PAYMENT METHOD) */}
            <div className="nota-meta-grid">
              <div>
                <div className="nota-meta-section-title">BILLING INFORMATION</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.45' }}>
                  <div style={{ fontWeight: 600 }}>{transaction.custName || 'Pelanggan Umum'}</div>
                  {transaction.custAddress && <div>{transaction.custAddress}</div>}
                  <div>No: {transaction.custPhone || '-'}</div>
                </div>
              </div>
              <div>
                <div className="nota-meta-section-title">PAYMENT METHOD</div>
                <div style={{ fontSize: '0.8rem', color: '#000000', lineHeight: '1.45' }}>
                  <div>{transaction.payMethod || 'Transfer'}</div>
                  {transaction.payMethod === 'Transfer' && (transaction.bankName || storeProfile.bankName) && (
                    <div style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>
                      Rek: {transaction.bankName || storeProfile.bankName} {storeProfile.bankAccount ? storeProfile.bankAccount : ''} {storeProfile.bankHolder ? `(a.n ${storeProfile.bankHolder})` : ''}
                    </div>
                  )}
                  <div>
                    Status: {' '}
                    <u style={{ color: transaction.payStatus === 'Lunas' ? '#1BBD8F' : (transaction.payStatus === 'DP' ? '#b45309' : '#b91c1c'), fontWeight: 700 }}>
                      {transaction.payStatus === 'Lunas' ? 'LUNAS' : transaction.payStatus.toUpperCase()}
                    </u>
                  </div>
                  <div>Pengambilan: {transaction.pickupMethod || 'Ditunggu'}</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="nota-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Nama Barang</th>
                  <th className="text-right" style={{ width: '50px', textAlign: 'center' }}>Qty</th>
                  <th className="text-right" style={{ width: '90px' }}>Harga</th>
                  <th className="text-right" style={{ width: '100px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => {
                  const itemTotal = calculateItemTotal(item);
                  const areaM2 = item.type === 'm2' ? (item.length / 100) * (item.width / 100) : 0;

                  // Build material / dimension specs
                  const specsParts = [];
                  if (item.type === 'm2') {
                    specsParts.push(`${item.length}×${item.width}cm (${areaM2.toFixed(2)}m²)`);
                  } else if (item.type === 'buku') {
                    if (item.bookSize) specsParts.push(item.bookSize);
                    if (item.bookPages) specsParts.push(`${item.bookPages} hlm`);
                    if (item.bookPaperInner) specsParts.push(`Isi: ${item.bookPaperInner}`);
                    if (item.bookCover) specsParts.push(`Cover: ${item.bookCover}`);
                    if (item.bookBinding) specsParts.push(item.bookBinding);
                  } else {
                    specsParts.push(item.type.toUpperCase());
                  }

                  // Finishing & Opsi Tambahan
                  const extraDetails = [];
                  if (item.finishing) {
                    extraDetails.push(`Finishing: ${item.finishing}`);
                  }
                  (item.customDetails || []).forEach(d => {
                    if (d.key && d.value) {
                      extraDetails.push(`${d.key}: ${d.value}`);
                    }
                  });

                  const bookTitle = item.type === 'buku' && item.bookTitle ? item.bookTitle : '';
                  const hasDetails = bookTitle || specsParts.length > 0 || extraDetails.length > 0;

                  return (
                    <React.Fragment key={idx}>
                      <tr className="nota-item-main-row">
                        <td>
                          <strong className="nota-item-title">
                            {displayItems.length > 1 ? `${idx + 1}. ` : ''}{item.name || 'Pekerjaan Cetak'}
                          </strong>
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
                      {hasDetails && (
                        <tr className="nota-item-detail-row">
                          <td colSpan="4">
                            <div className="nota-item-detail-box">
                              {bookTitle && (
                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.15rem' }}>
                                  {bookTitle}
                                </div>
                              )}
                              {specsParts.length > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>
                                  {specsParts.join('  |  ')}
                                </div>
                              )}
                              {extraDetails.length > 0 && (
                                <div style={{ fontStyle: 'italic', color: '#475569', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                                  {extraDetails.join(', ')}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Totals & Payment Summary */}
            <div className="nota-totals-view">
              <div className="nota-total-row">
                <span>Subtotal</span>
                <span className="num-tabular">{formatRupiah(computedSubtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="nota-total-row" style={{ color: 'var(--figma-accent-red)' }}>
                  <span>Potongan Harga (Diskon)</span>
                  <span className="num-tabular">- {formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="nota-total-row grand-total">
                <span>TOTAL HARGA</span>
                <span className="num-tabular">{formatRupiah(computedGrandTotal)}</span>
              </div>
              <div className="nota-total-row" style={{ borderTop: '1px dotted #ccc', paddingTop: '0.3rem', marginTop: '0.3rem' }}>
                <span>Status Pembayaran</span>
                <span style={{ fontWeight: 700, color: transaction.payStatus === 'Lunas' ? '#008800' : '#cc0000' }}>
                  {transaction.payStatus === 'Lunas' ? '✓ LUNAS' : (transaction.payStatus === 'DP' ? `UANG MUKA (DP ${formatRupiah(transaction.dp)})` : 'BELUM BAYAR')}
                </span>
              </div>
              {transaction.payMethod && (
                <div className="nota-total-row" style={{ fontSize: '0.75rem', color: '#555555' }}>
                  <span>Metode Pembayaran</span>
                  <span>{transaction.payMethod} {transaction.bankName ? `(${transaction.bankName})` : ''}</span>
                </div>
              )}
              <div className="nota-total-row" style={{ fontWeight: 600 }}>
                <span>Jumlah Dibayar</span>
                <span className="num-tabular" style={{ color: transaction.payStatus === 'Lunas' ? '#000000' : '#cc0000' }}>
                  {formatRupiah(transaction.payStatus === 'Lunas' ? computedGrandTotal : (transaction.payStatus === 'DP' ? transaction.dp : 0))}
                </span>
              </div>
              <div className="nota-total-row" style={{ fontWeight: 700, color: '#000000', fontSize: '0.9rem' }}>
                <span>{transaction.payStatus === 'Lunas' ? 'Kembali' : 'Sisa Pelunasan'}</span>
                <span className="num-tabular" style={{ color: transaction.payStatus === 'Lunas' ? '#000000' : '#cc0000' }}>
                  {formatRupiah(transaction.payStatus === 'Lunas' ? 0 : sisa)}
                </span>
              </div>
            </div>

            {transaction.catatan && (
              <div style={{ fontSize: '0.8rem', background: '#F9FAFB', padding: '0.6rem 0.75rem', borderRadius: '6px', marginBottom: '1rem', borderLeft: '3.5px solid var(--figma-primary)', wordBreak: 'break-word' }}>
                <strong>Catatan:</strong> {transaction.catatan}
              </div>
            )}

            {/* Footer & QR Code */}
            <div className={`nota-footer-view ${qrPositionClass}`}>
              <div>
                <p style={{ fontSize: '0.775rem', color: '#5B5B5B', margin: 0, fontWeight: 500 }}>
                  {storeProfile.footerMsg || 'Terima kasih atas kunjungan Anda.'}
                </p>
              </div>
              {storeProfile.showQrCode !== false && qrDataUrl && (
                <div
                  className="qr-code-box"
                  style={{
                    width: qrDimension,
                    height: qrDimension,
                    minWidth: qrDimension,
                    minHeight: qrDimension,
                    maxWidth: qrDimension,
                    maxHeight: qrDimension,
                    flexShrink: 0
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="QR Code Verifikasi Nota"
                    style={{
                      width: '100%',
                      height: '100%',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      {/* 3. Save & Quick Action Buttons Section */}
      {onSaveTransaction && (
        <div className="preview-actions-bar">
          {!isSaved ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onSaveTransaction}>
                <i className="ri-save-line" aria-hidden="true"></i>
                <span>Simpan Transaksi & Terbitkan Nota</span>
              </button>
              {onResetForm && (
                <CustomTooltip text="Reset Form">
                  <button type="button" className="btn btn-secondary" onClick={onResetForm} aria-label="Reset Form">
                    <i className="ri-refresh-line" aria-hidden="true"></i> Reset
                  </button>
                </CustomTooltip>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
              {/* 4 Quick Action Buttons: Cetak, PDF, WA, Review - Replaces Save button after nota is saved */}
              <div className="quick-action-toolbar" style={{ margin: 0 }}>
                <div className="quick-action-toolbar-inner">
                  <CustomTooltip text="Cetak Langsung Ke Printer">
                    <button type="button" className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={handlePrint}>
                      <i className="ri-printer-line" aria-hidden="true"></i> Cetak
                    </button>
                  </CustomTooltip>
                  <CustomTooltip text="Unduh Dokumen PDF">
                    <button type="button" className="btn btn-success btn-sm" style={{ width: '100%' }} onClick={handleDownloadPdf}>
                      <i className="ri-file-pdf-line" aria-hidden="true"></i> PDF
                    </button>
                  </CustomTooltip>
                  <CustomTooltip text="Kirim Nota via WhatsApp">
                    <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleShareWa}>
                      <i className="ri-whatsapp-line" aria-hidden="true"></i> WA
                    </button>
                  </CustomTooltip>
                  <CustomTooltip text="Review / Buka E-Nota Publik">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => window.open(`?nota=${encodeURIComponent(transaction.noNota)}`, '_blank')}
                    >
                      <i className="ri-eye-line" aria-hidden="true"></i> Review
                    </button>
                  </CustomTooltip>
                </div>
              </div>

              {/* Secondary Update & New Nota Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onSaveTransaction}>
                  <i className="ri-save-line" aria-hidden="true"></i>
                  <span>Update & Simpan Perubahan Nota</span>
                </button>
                {onResetForm && (
                  <CustomTooltip text="Buat Nota Baru">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onResetForm} aria-label="Buat Nota Baru">
                      <i className="ri-add-line" aria-hidden="true"></i> Nota Baru
                    </button>
                  </CustomTooltip>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default memo(NotaPreview);
