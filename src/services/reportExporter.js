/* ==========================================================================
   Report Exporter Service - Real Excel (.xls HTML Spreadsheet) & PDF Reports
   ========================================================================== */

import QRCode from 'qrcode';
import html2pdf from 'html2pdf.js';
import { formatRupiah, formatDateId, calculateItemTotal, formatItemSummary } from './storage';

/**
 * Formats item list into a transparent single-line text summary for reports
 */
const formatItemsSummary = (items) => {
  if (!Array.isArray(items) || items.length === 0) return 'Pekerjaan Cetak';
  return items.map((item, idx) => `${idx + 1}. ${formatItemSummary(item, 'single-line')}`).join(' | ');
};

/**
 * Helper to escape HTML characters in cell text
 */
const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Exports all transactions to a real, formatted Microsoft Excel Spreadsheet (.xls)
 * with gridlines, colored headers, KPI cards, and proper numeric formatting.
 */
export const exportTransactionsToExcel = (history = [], storeProfile = {}, onShowToast = null) => {
  if (!Array.isArray(history) || history.length === 0) {
    if (typeof onShowToast === 'function') {
      onShowToast('Belum ada data riwayat transaksi untuk diekspor.', 'warning');
    } else {
      console.warn('Belum ada data riwayat transaksi untuk diekspor.');
    }
    return;
  }

  const storeName = storeProfile.name || 'Pustaka Bakid';
  const storeAddress = storeProfile.address || '';
  const storePhone = storeProfile.phone || '';
  const exportDate = new Date().toISOString().split('T')[0];

  let totalGrandTotal = 0;
  let totalPaid = 0;
  let totalSisa = 0;

  const tableRowsHtml = history.map((rec, idx) => {
    const items = Array.isArray(rec.items) ? rec.items : [];
    const grandTotal = Number(rec.grandTotal) || 0;
    const subtotal = Number(rec.subtotal) || grandTotal;
    const discount = Number(rec.discount) || 0;
    const sisa = Number(rec.sisa) || 0;

    let dibayar = 0;
    if (rec.payStatus === 'Lunas') {
      dibayar = grandTotal;
    } else if (rec.payStatus === 'DP') {
      dibayar = Number(rec.dp) || 0;
    }

    totalGrandTotal += grandTotal;
    totalPaid += dibayar;
    totalSisa += sisa;

    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    const statusBg = rec.payStatus === 'Lunas' ? '#DCFCE7' : (rec.payStatus === 'DP' ? '#FEF3C7' : '#FEE2E2');
    const statusColor = rec.payStatus === 'Lunas' ? '#15803D' : (rec.payStatus === 'DP' ? '#B45309' : '#B91C1C');

    return `
      <tr style="background-color: ${bg}; height: 26px;">
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; font-weight: bold; text-align: center;">${escapeHtml(rec.noNota)}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: center;">${escapeHtml(formatDateId(rec.date))}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; font-weight: bold;">${escapeHtml(rec.custName || 'Pelanggan Umum')}</td>
        <td class="phone" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: center;">${escapeHtml(rec.custPhone || '-')}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px;">${escapeHtml(rec.custAddress || '-')}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: center;">${escapeHtml(rec.orderStatus || 'Proses Cetak')}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: center; background-color: ${statusBg}; color: ${statusColor}; font-weight: bold;">${escapeHtml(rec.payStatus || 'Lunas')}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: center;">${escapeHtml(rec.payMethod || 'Transfer')} ${rec.bankName ? `(${escapeHtml(rec.bankName)})` : ''}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px;">${escapeHtml(formatItemsSummary(items))}</td>
        <td class="num" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: right;">${subtotal}</td>
        <td class="num" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: right;">${discount}</td>
        <td class="num" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: right; font-weight: bold; background-color: #F1F5F9;">${grandTotal}</td>
        <td class="num" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: right; color: #16A34A;">${dibayar}</td>
        <td class="num" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px; text-align: right; color: ${sisa > 0 ? '#DC2626' : '#64748B'}; font-weight: bold;">${sisa}</td>
        <td class="text" style="border: 0.5pt solid #CBD5E1; padding: 4px 8px;">${escapeHtml(rec.catatan || '-')}</td>
      </tr>
    `;
  }).join('');

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan Penjualan</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; }
        .header-title { font-size: 16pt; font-weight: bold; color: #0F172A; text-transform: uppercase; }
        .header-sub { font-size: 10pt; color: #475569; }
        .kpi-table td { padding: 8px 12px; font-weight: bold; border: 1pt solid #94A3B8; background-color: #F1F5F9; }
        .th-header { background-color: #0F172A; color: #FFFFFF; font-weight: bold; text-align: center; padding: 8px; border: 0.5pt solid #64748B; }
        .num { mso-number-format: "\\#\\,\\#\\#0"; text-align: right; }
        .phone { mso-number-format: "\\@"; text-align: center; }
        .text { mso-number-format: "\\@"; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <td colspan="15" class="header-title">${escapeHtml(storeName)}</td>
        </tr>
        <tr>
          <td colspan="15" class="header-sub">REKAPITULASI LAPORAN PENJUALAN TRANSAKSI PERCETAKAN | Tanggal Ekspor: ${exportDate} ${storeAddress ? `| ${escapeHtml(storeAddress)}` : ''} ${storePhone ? `| WA: ${escapeHtml(storePhone)}` : ''}</td>
        </tr>
        <tr><td colspan="15"></td></tr>

        <!-- Summary KPI Section -->
        <tr class="kpi-table">
          <td colspan="3" style="background-color: #EFF6FF; color: #1E40AF;">TOTAL TRANSAKSI: ${history.length} Nota</td>
          <td colspan="4" style="background-color: #F0FDF4; color: #166534;">TOTAL OMSET (GRAND TOTAL): Rp ${totalGrandTotal.toLocaleString('id-ID')}</td>
          <td colspan="4" style="background-color: #F0F9FF; color: #075985;">TOTAL PEMBAYARAN MASUK: Rp ${totalPaid.toLocaleString('id-ID')}</td>
          <td colspan="4" style="background-color: #FEF2F2; color: #991B1B;">TOTAL PIUTANG / SISA: Rp ${totalSisa.toLocaleString('id-ID')}</td>
        </tr>
        <tr><td colspan="15"></td></tr>

        <!-- Table Header -->
        <thead>
          <tr>
            <th class="th-header" style="width: 140px;">No. Nota</th>
            <th class="th-header" style="width: 110px;">Tanggal</th>
            <th class="th-header" style="width: 180px;">Nama Pelanggan</th>
            <th class="th-header" style="width: 120px;">No. Telepon / WA</th>
            <th class="th-header" style="width: 160px;">Alamat</th>
            <th class="th-header" style="width: 110px;">Status Pesanan</th>
            <th class="th-header" style="width: 120px;">Status Bayar</th>
            <th class="th-header" style="width: 130px;">Metode Bayar</th>
            <th class="th-header" style="width: 260px;">Rincian Pesanan</th>
            <th class="th-header" style="width: 110px;">Subtotal (Rp)</th>
            <th class="th-header" style="width: 100px;">Diskon (Rp)</th>
            <th class="th-header" style="width: 130px;">Grand Total (Rp)</th>
            <th class="th-header" style="width: 130px;">Dibayar / DP (Rp)</th>
            <th class="th-header" style="width: 120px;">Sisa Tagihan (Rp)</th>
            <th class="th-header" style="width: 150px;">Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
          <!-- Grand Total Summary Row at Bottom -->
          <tr style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; height: 30px;">
            <td colspan="9" style="text-align: right; padding: 6px 12px;">TOTAL KESELURUHAN:</td>
            <td class="num" style="padding: 6px; text-align: right; color: #FFFFFF;">${history.reduce((a, b) => a + (Number(b.subtotal) || Number(b.grandTotal) || 0), 0)}</td>
            <td class="num" style="padding: 6px; text-align: right; color: #FFFFFF;">${history.reduce((a, b) => a + (Number(b.discount) || 0), 0)}</td>
            <td class="num" style="padding: 6px; text-align: right; color: #4ADE80; font-size: 11pt;">${totalGrandTotal}</td>
            <td class="num" style="padding: 6px; text-align: right; color: #60A5FA;">${totalPaid}</td>
            <td class="num" style="padding: 6px; text-align: right; color: #F87171; font-size: 11pt;">${totalSisa}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  const safeStoreName = String(storeName || 'Pustaka_Bakid').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'Percetakan';
  const blob = new Blob(['\uFEFF' + excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Laporan_Penjualan_${safeStoreName}_${exportDate}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Builds clean, pure HTML (without CSS flexbox) for PDF rendering
 */
const buildPdfReportHtml = (history, storeProfile) => {
  const storeName = storeProfile.name || 'Pustaka Bakid';
  const storeAddress = storeProfile.address || '';
  const storePhone = storeProfile.phone || '';
  const nowFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let totalGrandTotal = 0;
  let totalPaid = 0;
  let totalSisa = 0;

  history.forEach((rec) => {
    const grandTotal = Number(rec.grandTotal) || 0;
    const sisa = Number(rec.sisa) || 0;
    let dibayar = 0;
    if (rec.payStatus === 'Lunas') {
      dibayar = grandTotal;
    } else if (rec.payStatus === 'DP') {
      dibayar = Number(rec.dp) || 0;
    }
    totalGrandTotal += grandTotal;
    totalPaid += dibayar;
    totalSisa += sisa;
  });

  const tableRowsHtml = history.map((rec, idx) => {
    const items = Array.isArray(rec.items) ? rec.items : [];
    const grandTotal = Number(rec.grandTotal) || 0;
    const sisa = Number(rec.sisa) || 0;
    const statusBg = rec.payStatus === 'Lunas' ? '#dcfce7' : (rec.payStatus === 'DP' ? '#fef3c7' : '#fee2e2');
    const statusColor = rec.payStatus === 'Lunas' ? '#15803d' : (rec.payStatus === 'DP' ? '#b45309' : '#b91c1c');
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${bg};">
        <td style="padding: 6px 8px; font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">${escapeHtml(rec.noNota)}</td>
        <td style="padding: 6px 8px; font-size: 10.5px; font-family: Arial, sans-serif;">${escapeHtml(formatDateId(rec.date))}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-family: Arial, sans-serif;">
          <strong style="display: block; color: #0f172a;">${escapeHtml(rec.custName || 'Pelanggan Umum')}</strong>
          ${rec.custPhone ? `<span style="font-size: 9.5px; color: #64748b;">${escapeHtml(rec.custPhone)}</span>` : ''}
        </td>
        <td style="padding: 6px 8px; font-size: 10px; color: #334155; max-width: 200px; word-break: break-word; font-family: Arial, sans-serif;">
          ${escapeHtml(formatItemsSummary(items))}
        </td>
        <td style="padding: 6px 8px; text-align: center;">
          <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 9.5px; font-weight: bold; background-color: ${statusBg}; color: ${statusColor}; font-family: Arial, sans-serif;">
            ${escapeHtml(rec.payStatus || 'Lunas')}
          </span>
        </td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11px; font-family: Arial, sans-serif;">${formatRupiah(grandTotal)}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; font-size: 11px; color: ${sisa > 0 ? '#dc2626' : '#16a34a'}; font-family: Arial, sans-serif;">
          ${sisa > 0 ? formatRupiah(sisa) : '0'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="width: 750px; margin: 0 auto; background: #ffffff; color: #000000; padding: 20px; box-sizing: border-box; font-family: Arial, sans-serif;">
      <!-- Header Table (Pure Table, NO Flexbox) -->
      <table style="width: 100%; border-bottom: 2.5px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: bottom; text-align: left;">
            <h2 style="margin: 0 0 4px 0; font-size: 22px; font-weight: bold; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">${escapeHtml(storeName)}</h2>
            <p style="margin: 0; font-size: 11px; color: #475569;">${escapeHtml(storeAddress)} ${storePhone ? `| Telp: ${escapeHtml(storePhone)}` : ''}</p>
          </td>
          <td style="vertical-align: bottom; text-align: right;">
            <h3 style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #1e293b; text-transform: uppercase;">REKAPITULASI LAPORAN PENJUALAN</h3>
            <p style="margin: 0; font-size: 10px; color: #64748b;">Dicetak: ${nowFormatted}</p>
          </td>
        </tr>
      </table>

      <!-- KPI Summary Table (Pure Table, NO Flexbox) -->
      <table style="width: 100%; border-spacing: 6px; border-collapse: separate; margin-bottom: 14px;">
        <tr>
          <td style="width: 25%; background-color: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; vertical-align: top;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block;">Total Transaksi</span>
            <strong style="font-size: 14px; color: #0f172a; display: block; margin-top: 2px;">${history.length} Nota</strong>
          </td>
          <td style="width: 25%; background-color: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #16a34a; vertical-align: top;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block;">Total Omset</span>
            <strong style="font-size: 14px; color: #16a34a; display: block; margin-top: 2px;">${formatRupiah(totalGrandTotal)}</strong>
          </td>
          <td style="width: 25%; background-color: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; vertical-align: top;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block;">Total Terbayar</span>
            <strong style="font-size: 14px; color: #0284c7; display: block; margin-top: 2px;">${formatRupiah(totalPaid)}</strong>
          </td>
          <td style="width: 25%; background-color: #f8fafc; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; vertical-align: top;">
            <span style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block;">Total Piutang (Sisa)</span>
            <strong style="font-size: 14px; color: #dc2626; display: block; margin-top: 2px;">${formatRupiah(totalSisa)}</strong>
          </td>
        </tr>
      </table>

      <!-- Data Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 4px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase;">
            <th style="padding: 7px 8px; text-align: left; width: 14%;">No. Nota</th>
            <th style="padding: 7px 8px; text-align: left; width: 12%;">Tanggal</th>
            <th style="padding: 7px 8px; text-align: left; width: 18%;">Pelanggan</th>
            <th style="padding: 7px 8px; text-align: left; width: 26%;">Rincian Pesanan</th>
            <th style="padding: 7px 8px; text-align: center; width: 10%;">Status</th>
            <th style="padding: 7px 8px; text-align: right; width: 10%;">Grand Total</th>
            <th style="padding: 7px 8px; text-align: right; width: 10%;">Sisa Tagihan</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <!-- Footer Table (Pure Table, NO Flexbox) -->
      <table style="width: 100%; margin-top: 16px; padding-top: 8px; border-top: 1.5px solid #cbd5e1; font-size: 9.5px; color: #64748b; border-collapse: collapse;">
        <tr>
          <td style="text-align: left;">Laporan Resmi Percetakan - Dokumen Rekapitulasi Internal</td>
          <td style="text-align: right;">Jumlah Data: ${history.length} Transaksi</td>
        </tr>
      </table>
    </div>
  `;
};

/**
 * Exports all transactions to a transparent, beautifully formatted A4 PDF summary report.
 * Uses 100% table layout (no flexbox) + in-flow DOM rendering to guarantee pdf content is never blank.
 */
export const exportTransactionsToPdf = (history = [], storeProfile = {}, onShowToast = null) => {
  if (!Array.isArray(history) || history.length === 0) {
    if (typeof onShowToast === 'function') {
      onShowToast('Belum ada data riwayat transaksi untuk diekspor.', 'warning');
    } else {
      console.warn('Belum ada data riwayat transaksi untuk diekspor.');
    }
    return;
  }

  const storeName = storeProfile.name || 'Pustaka Bakid';
  const exportDate = new Date().toISOString().split('T')[0];

  // Remove existing report container if present
  const existing = document.getElementById('pdfReportRenderRoot');
  if (existing) existing.remove();

  // Create in-flow DOM element attached at the end of document.body
  const reportContainer = document.createElement('div');
  reportContainer.id = 'pdfReportRenderRoot';
  reportContainer.style.position = 'absolute';
  reportContainer.style.top = '0';
  reportContainer.style.left = '0';
  reportContainer.style.width = '790px';
  reportContainer.style.zIndex = '999999';
  reportContainer.style.background = '#ffffff';
  reportContainer.style.boxSizing = 'border-box';

  reportContainer.innerHTML = buildPdfReportHtml(history, storeProfile);
  document.body.appendChild(reportContainer);

  const prevScrollX = window.scrollX || 0;
  const prevScrollY = window.scrollY || 0;
  window.scrollTo(0, 0);

  // 300ms delay guarantees the browser reflows and paints the table DOM before html2canvas captures
  setTimeout(() => {
    const safeStoreName = String(storeName || 'Pustaka_Bakid').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'Percetakan';
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `Laporan_Rekap_Penjualan_${safeStoreName}_${exportDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
        x: 0,
        y: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    let isFinished = false;
    const timeoutId = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        window.scrollTo(prevScrollX, prevScrollY);
        if (document.body.contains(reportContainer)) {
          document.body.removeChild(reportContainer);
        }
        openPrintReportWindow(history, storeProfile, onShowToast);
      }
    }, 12000);

    try {
      html2pdf()
        .from(reportContainer)
        .set(opt)
        .save()
        .then(() => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeoutId);
            window.scrollTo(prevScrollX, prevScrollY);
            if (document.body.contains(reportContainer)) {
              document.body.removeChild(reportContainer);
            }
          }
        })
        .catch((err) => {
          if (!isFinished) {
            isFinished = true;
            clearTimeout(timeoutId);
            console.error('PDF export error:', err);
            window.scrollTo(prevScrollX, prevScrollY);
            if (document.body.contains(reportContainer)) {
              document.body.removeChild(reportContainer);
            }
            // Fallback: Open Print Report Window if html2pdf fails
            openPrintReportWindow(history, storeProfile, onShowToast);
          }
        });
    } catch (err) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timeoutId);
        console.error('PDF export sync error:', err);
        window.scrollTo(prevScrollX, prevScrollY);
        if (document.body.contains(reportContainer)) {
          document.body.removeChild(reportContainer);
        }
        openPrintReportWindow(history, storeProfile, onShowToast);
      }
    }
  }, 300);
};

/**
 * Fallback / Direct Print Window for Laporan PDF
 */

const openPrintReportWindow = (history, storeProfile, onShowToast = null) => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    if (typeof onShowToast === 'function') {
      onShowToast('Popup terblokir oleh browser. Mohon izinkan popup untuk mencetak PDF laporan.', 'warning');
    } else {
      console.warn('Popup terblokir oleh browser.');
    }
    return;
  }
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan Rekapitulasi Penjualan</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: Arial, sans-serif; background: #ffffff; color: #000000; margin: 0; padding: 10px; }
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #f1f5f9; padding: 10px; text-align: right; border-bottom: 1px solid #cbd5e1; margin-bottom: 15px;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">
          🖨️ Cetak / Simpan Ke PDF
        </button>
      </div>
      ${buildPdfReportHtml(history, storeProfile)}
    </body>
    </html>
  `;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

// ==========================================================================
// DEDICATED SINGLE NOTA PDF EXPORTER (INDEPENDENT RENDER LAYER)
// ==========================================================================

/**
 * Generates an ultra-crisp QR code Data URL for export
 */
export const generateQrDataUrl = async (qrText) => {
  try {
    return await QRCode.toDataURL(qrText, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR Data URL:', err);
    return '';
  }
};

/**
 * Builds clean, unconstrained, pure HTML for single nota export (independent of UI DOM)
 */
export const buildSingleNotaHtml = (storeProfile, transaction, items = [], selectedPaper = 'A4', computedGrandTotal, sisa, qrDataUrl = '') => {
  const storeName = storeProfile?.name || 'Pustaka Bakid';
  const storeSubtitle = storeProfile?.subtitle || '';
  const storeAddress = storeProfile?.address || '';
  const storePhone = storeProfile?.phone || '';
  const footerMsg = storeProfile?.footerMsg || 'Terima kasih atas kunjungan Anda.';

  const isThermal = selectedPaper === '58mm' || selectedPaper === '80mm';
  const formattedDate = formatDateId(transaction.date);
  const discount = Number(transaction.discount) || 0;
  const grandTotal = Number(computedGrandTotal) || 0;
  const dp = Number(transaction.dp) || 0;
  const payStatus = transaction.payStatus || 'Lunas';
  const orderStatus = transaction.orderStatus || 'Proses Cetak';
  const payMethod = transaction.payMethod || 'Transfer';

  const subtotal = items.reduce((acc, it) => acc + calculateItemTotal(it), 0);

  const statusBg = payStatus === 'Lunas' ? '#dcfce7' : (payStatus === 'DP' ? '#fef3c7' : '#fee2e2');
  const statusColor = payStatus === 'Lunas' ? '#15803d' : (payStatus === 'DP' ? '#b45309' : '#b91c1c');

  const showQr = storeProfile?.showQrCode !== false;
  const qrScale = storeProfile?.qrSize || 'medium';
  const thermalQrPx = qrScale === 'small' ? '54px' : (qrScale === 'large' ? '74px' : '64px');

  if (isThermal) {
    const is58 = selectedPaper === '58mm';
    const paperWidth = is58 ? '54mm' : '76mm';
    const fontSize = is58 ? '8pt' : '9pt';

    const itemRows = items.map((it, idx) => {
      const itTotal = calculateItemTotal(it);
      let dimText = '';
      if (it.type === 'm2') {
        dimText = `${it.length || 0}x${it.width || 0}cm`;
      } else if (it.type === 'buku') {
        dimText = `${it.bookPages ? `${it.bookPages}hlm ` : ''}${it.bookSize || ''}`.trim();
      }
      return `
        <div style="margin-bottom: 5px; border-bottom: 1px dashed #cccccc; padding-bottom: 4px;">
          <div style="font-weight: bold; color: #000000;">${idx + 1}. ${escapeHtml(it.name || 'Pekerjaan Cetak')}</div>
          ${dimText ? `<div style="font-size: 7.5pt; color: #555555;">${escapeHtml(dimText)}</div>` : ''}
          ${it.finishing ? `<div style="font-size: 7.5pt; color: #555555;">Finishing: ${escapeHtml(it.finishing)}</div>` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>${it.qty || 1} x ${formatRupiah(it.price || 0)}</span>
            <span style="font-weight: bold;">${formatRupiah(itTotal)}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="width: ${paperWidth}; max-width: 100%; margin: 0 auto; background: #ffffff; color: #000000; font-family: 'Courier New', Courier, monospace, Arial; font-size: ${fontSize}; line-height: 1.35; padding: 6px; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 1.5px dashed #000000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">${escapeHtml(storeName)}</div>
          ${storeSubtitle ? `<div style="font-size: 7.5pt; color: #333333;">${escapeHtml(storeSubtitle)}</div>` : ''}
          ${storeAddress ? `<div style="font-size: 7.5pt; color: #333333; margin-top: 1px;">${escapeHtml(storeAddress)}</div>` : ''}
          ${storePhone ? `<div style="font-size: 7.5pt; color: #333333;">Telp: ${escapeHtml(storePhone)}</div>` : ''}
        </div>

        <!-- Meta -->
        <div style="font-size: 8pt; margin-bottom: 6px; border-bottom: 1px dashed #000000; padding-bottom: 4px;">
          <div style="display: flex; justify-content: space-between;">
            <span>No: <strong>${escapeHtml(transaction.noNota)}</strong></span>
            <span>${escapeHtml(formattedDate)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>Cust: <strong>${escapeHtml(transaction.custName || 'Umum')}</strong></span>
            <span>${escapeHtml(payStatus.toUpperCase())}</span>
          </div>
        </div>

        <!-- Items -->
        <div style="margin-bottom: 6px;">
          ${itemRows}
        </div>

        <!-- Summary -->
        <div style="border-top: 1px dashed #000000; padding-top: 4px; margin-bottom: 6px; font-size: 8.5pt;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>${formatRupiah(subtotal)}</span>
          </div>
          ${discount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #15803d;">
              <span>Diskon:</span>
              <span>-${formatRupiah(discount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 9.5pt; border-top: 1px solid #000000; margin-top: 3px; padding-top: 2px;">
            <span>TOTAL:</span>
            <span>${formatRupiah(grandTotal)}</span>
          </div>
          ${payStatus === 'DP' ? `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>DP:</span>
              <span>${formatRupiah(dp)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #dc2626;">
              <span>Sisa:</span>
              <span>${formatRupiah(sisa)}</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Status:</span>
              <span>${escapeHtml(payStatus)} (${escapeHtml(payMethod)})</span>
            </div>
          `}
        </div>

        ${transaction.catatan ? `
          <div style="font-size: 7.5pt; background: #f1f5f9; padding: 4px; margin-bottom: 6px; border-left: 2px solid #000000;">
            <strong>Cat:</strong> ${escapeHtml(transaction.catatan)}
          </div>
        ` : ''}

        <!-- QR & Footer -->
        <div style="text-align: center; border-top: 1px dashed #000000; padding-top: 6px; margin-top: 6px;">
          ${showQr && qrDataUrl ? `
            <div style="margin-bottom: 4px;">
              <img src="${qrDataUrl}" alt="QR" style="width: ${thermalQrPx}; height: ${thermalQrPx}; display: inline-block;" />
            </div>
          ` : ''}
          <div style="font-size: 7.5pt; color: #444444;">${escapeHtml(footerMsg)}</div>
        </div>
      </div>
    `;
  }

  // A4 / A5 Layout
  const isA5 = selectedPaper === 'A5';
  const paperWidth = isA5 ? '500px' : '700px';
  const fontSize = isA5 ? '9.5px' : '11px';

  const tableRowsHtml = items.map((it, idx) => {
    const itTotal = calculateItemTotal(it);
    let spec = '';
    if (it.type === 'm2') {
      spec = `${it.length || 0} x ${it.width || 0} cm (${it.type})`;
    } else if (it.type === 'buku') {
      spec = `Buku ${it.bookPages ? `${it.bookPages} Halaman` : ''} ${it.bookSize ? `(${it.bookSize})` : ''}`.trim();
    } else {
      spec = (it.type || 'Pcs').toUpperCase();
    }
    if (it.finishing) {
      spec += ` | ${it.finishing}`;
    }

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: ${fontSize};">
        <td style="padding: 6px 8px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${escapeHtml(it.name || 'Pekerjaan Cetak')}</td>
        <td style="padding: 6px 8px; color: #475569;">${escapeHtml(spec)}</td>
        <td style="padding: 6px 8px; text-align: center; font-weight: 600;">${it.qty || 1}</td>
        <td style="padding: 6px 8px; text-align: right; color: #334155;">${formatRupiah(it.price || 0)}</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #0f172a;">${formatRupiah(itTotal)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="width: ${paperWidth}; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 20px; box-sizing: border-box; font-family: Arial, sans-serif; font-size: ${fontSize}; line-height: 1.35;">
      <!-- Header -->
      <table style="width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; text-align: left; width: 60%;">
            <div style="margin-bottom: 2px;">
              <h1 style="margin: 0; font-size: 15px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(storeName)}</h1>
              ${storeSubtitle ? `<p style="margin: 1px 0 0 0; font-size: 9.5px; color: #64748b;">${escapeHtml(storeSubtitle)}</p>` : ''}
            </div>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #475569; line-height: 1.3;">
              ${escapeHtml(storeAddress)} ${storePhone ? `<br/><strong>Telp / WA:</strong> ${escapeHtml(storePhone)}` : ''}
            </p>
          </td>
          <td style="vertical-align: top; text-align: right; width: 40%;">
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase;">INVOICE</div>
            <div style="font-size: 10px; font-weight: bold; color: #0f172a; margin-top: 1px;">#${escapeHtml(transaction.noNota)}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 1px;">Tanggal: <strong>${escapeHtml(formattedDate)}</strong></div>
            <div style="margin-top: 3px;">
              <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8.5px; font-weight: bold; background-color: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
                ${escapeHtml(payStatus)}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Customer Info Bar -->
      <table style="width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 10px; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div style="font-size: 8.5px; color: #64748b; font-weight: bold; text-transform: uppercase;">Kepada Yth:</div>
            <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 1px;">${escapeHtml(transaction.custName || 'Pelanggan Umum')}</div>
            ${transaction.custPhone ? `<div style="font-size: 9px; color: #475569;">Telp / WA: ${escapeHtml(transaction.custPhone)}</div>` : ''}
            ${transaction.custAddress ? `<div style="font-size: 9px; color: #475569;">Alamat: ${escapeHtml(transaction.custAddress)}</div>` : ''}
          </td>
          <td style="width: 50%; vertical-align: top; text-align: right;">
            <div style="font-size: 9px; color: #475569;"><strong>Status Pesanan:</strong> ${escapeHtml(orderStatus)}</div>
            <div style="font-size: 9px; color: #475569; margin-top: 1px;">
              <strong>Metode Bayar:</strong> ${escapeHtml(payMethod)} ${transaction.bankName ? `(${escapeHtml(transaction.bankName)})` : ''}
            </div>
            ${payMethod === 'Transfer' && (transaction.bankName || storeProfile?.bankName) ? `
              <div style="font-size: 8.5px; color: #1e293b; margin-top: 1px;">
                Rek: <strong>${escapeHtml(transaction.bankName || storeProfile.bankName)}</strong> ${escapeHtml(storeProfile.bankAccount || '')} ${storeProfile.bankHolder ? `(${escapeHtml(storeProfile.bankHolder)})` : ''}
              </div>
            ` : ''}
            <div style="font-size: 9px; color: #475569; margin-top: 1px;"><strong>Pengambilan:</strong> ${escapeHtml(transaction.pickupMethod || 'Ditunggu')}</div>
          </td>
        </tr>
      </table>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-size: 9px; text-transform: uppercase;">
            <th style="padding: 6px 8px; text-align: center; width: 5%;">No</th>
            <th style="padding: 6px 8px; text-align: left; width: 35%;">Deskripsi Pesanan</th>
            <th style="padding: 6px 8px; text-align: left; width: 25%;">Spesifikasi / Jenis</th>
            <th style="padding: 6px 8px; text-align: center; width: 8%;">Qty</th>
            <th style="padding: 6px 8px; text-align: right; width: 13%;">Harga</th>
            <th style="padding: 6px 8px; text-align: right; width: 14%;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <!-- Totals Table -->
      <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td style="width: 55%; vertical-align: top; padding-right: 10px;">
            ${transaction.catatan ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #2563eb; padding: 5px 8px; border-radius: 4px; font-size: 9px;">
                <strong>Catatan:</strong> ${escapeHtml(transaction.catatan)}
              </div>
            ` : ''}
          </td>
          <td style="width: 45%; vertical-align: top;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <tr>
                <td style="padding: 2px 0; color: #64748b;">Subtotal:</td>
                <td style="padding: 2px 0; text-align: right; font-weight: 600;">${formatRupiah(subtotal)}</td>
              </tr>
              ${discount > 0 ? `
                <tr>
                  <td style="padding: 2px 0; color: #15803d;">Diskon:</td>
                  <td style="padding: 2px 0; text-align: right; font-weight: 600; color: #15803d;">-${formatRupiah(discount)}</td>
                </tr>
              ` : ''}
              <tr style="border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; font-size: 12px;">
                <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">GRAND TOTAL:</td>
                <td style="padding: 4px 0; text-align: right; font-weight: bold; color: #0f172a;">${formatRupiah(grandTotal)}</td>
              </tr>
              ${payStatus === 'DP' ? `
                <tr>
                  <td style="padding: 2px 0; color: #475569;">Uang Muka (DP):</td>
                  <td style="padding: 2px 0; text-align: right; font-weight: 600; color: #0284c7;">${formatRupiah(dp)}</td>
                </tr>
                <tr>
                  <td style="padding: 2px 0; font-weight: bold; color: #dc2626;">Sisa Pelunasan:</td>
                  <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #dc2626;">${formatRupiah(sisa)}</td>
                </tr>
              ` : `
                <tr>
                  <td style="padding: 2px 0; color: #64748b;">Status Pelunasan:</td>
                  <td style="padding: 2px 0; text-align: right; font-weight: bold; color: #15803d;">LUNAS</td>
                </tr>
              `}
            </table>
          </td>
        </tr>
      </table>

      <!-- Footer & QR -->
      <table style="width: 100%; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle; text-align: left;">
            <p style="margin: 0; font-size: 9px; color: #475569; font-weight: 500;">
              ${escapeHtml(footerMsg)}
            </p>
            <p style="margin: 2px 0 0 0; font-size: 8px; color: #94a3b8;">
              E-Nota ini sah dan diterbitkan secara digital oleh sistem POS Percetakan.
            </p>
          </td>
          ${showQr && qrDataUrl ? `
            <td style="vertical-align: middle; text-align: right; width: 90px;">
              <img src="${qrDataUrl}" alt="QR Code Nota" style="width: ${qrScale === 'small' ? (isA5 ? '60px' : '68px') : (qrScale === 'large' ? (isA5 ? '84px' : '92px') : (isA5 ? '72px' : '80px'))}; height: ${qrScale === 'small' ? (isA5 ? '60px' : '68px') : (qrScale === 'large' ? (isA5 ? '84px' : '92px') : (isA5 ? '72px' : '80px'))}; display: inline-block;" />
            </td>
          ` : ''}
        </tr>
      </table>
    </div>
  `;
};

/**
 * Extracts QR canvas data URL from a live DOM element (the printable nota)
 */
const extractQrDataUrlFromElement = (element) => {
  try {
    if (element) {
      const canvas = element.querySelector('canvas');
      if (canvas) {
        return canvas.toDataURL('image/png');
      }
    }
  } catch {
    // Canvas tainted or unavailable
  }
  return '';
};

/**
 * High-fidelity PDF Exporter for single nota.
 * Guaranteed 100% single page layout, exact dimensions, and properly sized QR code.
 */
export const exportSingleNotaPdfFromElement = async (
  element,
  filename = 'E-Nota.pdf',
  selectedPaper = 'A4',
  storeProfile = {},
  transaction = {},
  items = [],
  computedGrandTotal = 0,
  sisa = 0
) => {
  // 1. Extract QR as Data URL from the live canvas if available, or generate it dynamically
  let qrDataUrl = element ? extractQrDataUrlFromElement(element) : '';
  if (!qrDataUrl) {
    const custStr = transaction.custName || 'Pelanggan Umum';
    const totalStr = formatRupiah(computedGrandTotal || 0);
    const statusStr = transaction.payStatus === 'Lunas' ? 'Lunas' : (transaction.payStatus === 'DP' ? `DP (Sisa: ${formatRupiah(sisa)})` : 'Belum Lunas');
    const qrPayload = [
      `NOTA: ${transaction.noNota || 'NOTA'}`,
      `Pelanggan: ${custStr}`,
      `Total: ${totalStr}`,
      `Status: ${statusStr}`
    ].join('\n');
    qrDataUrl = await generateQrDataUrl(qrPayload);
  }

  // 2. Build clean HTML string – no CSS class dependencies
  const htmlContent = buildSingleNotaHtml(
    storeProfile,
    transaction,
    items,
    selectedPaper,
    computedGrandTotal,
    sisa,
    qrDataUrl
  );

  // 3. Remove any stale render container
  const existing = document.getElementById('singleNotaPdfRenderRoot');
  if (existing) existing.remove();

  // 4. Determine pixel width for the container based on paper size
  let containerPx = '720px';
  let windowWidth = 760;
  let jsPdfFormat = 'a4';
  let margin = [4, 4, 4, 4]; // [top, right, bottom, left] in mm

  if (selectedPaper === '58mm') {
    containerPx = '210px';
    windowWidth = 230;
    jsPdfFormat = [58, 260];
    margin = [2, 2, 2, 2];
  } else if (selectedPaper === '80mm') {
    containerPx = '300px';
    windowWidth = 320;
    jsPdfFormat = [80, 297];
    margin = [3, 3, 3, 3];
  } else if (selectedPaper === 'A5') {
    containerPx = '520px';
    windowWidth = 550;
    jsPdfFormat = 'a5';
    margin = [4, 4, 4, 4];
  } else {
    // A4
    containerPx = '720px';
    windowWidth = 760;
    jsPdfFormat = 'a4';
    margin = [4, 4, 4, 4];
  }

  // 5. Create isolated render container mounted in-flow (top: 0, left: 0, z-index: 999999)
  const reportContainer = document.createElement('div');
  reportContainer.id = 'singleNotaPdfRenderRoot';
  reportContainer.style.cssText = [
    'position: absolute',
    'top: 0',
    'left: 0',
    `width: ${containerPx}`,
    'height: auto',
    'overflow: visible',
    'background: #ffffff',
    'box-sizing: border-box',
    'z-index: 999999',
    'padding: 0',
    'margin: 0',
    'font-family: Arial, sans-serif',
  ].join('; ');

  reportContainer.innerHTML = htmlContent;
  document.body.appendChild(reportContainer);

  const prevScrollX = window.scrollX || 0;
  const prevScrollY = window.scrollY || 0;
  window.scrollTo(0, 0);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const opt = {
        margin: margin,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: windowWidth,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0
        },
        jsPDF: {
          unit: 'mm',
          format: jsPdfFormat,
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all'] }
      };

      const pdfExporter = typeof html2pdf === 'function' ? html2pdf : (html2pdf?.default || window.html2pdf);
      pdfExporter()
        .from(reportContainer)
        .set(opt)
        .save()
        .then(() => {
          window.scrollTo(prevScrollX, prevScrollY);
          if (document.body.contains(reportContainer)) {
            document.body.removeChild(reportContainer);
          }
          resolve(true);
        })
        .catch((err) => {
          console.error('PDF export error:', err);
          window.scrollTo(prevScrollX, prevScrollY);
          if (document.body.contains(reportContainer)) {
            document.body.removeChild(reportContainer);
          }
          reject(err);
        });
    }, 300);
  });
};

/**
 * Main PDF Exporter for single nota.
 * Captures live rendered DOM element with strict 1-page bounds, avoiding blank pages and pagebreaks.
 */
export const exportSingleNotaPdf = async (
  storeProfile,
  transaction,
  items = [],
  selectedPaper = 'A4',
  computedGrandTotal = 0,
  sisa = 0,
  targetElement = null
) => {
  const cleanNotaNo = String(transaction?.noNota || 'NOTA').replace(/^NOTA-/i, 'PB-');
  const filename = `E-Nota_${cleanNotaNo}.pdf`;
  const domElement = targetElement || document.getElementById('printableNota');

  if (!domElement) return false;

  let jsPdfFormat = 'a4';
  let margin = [4, 4, 4, 4];

  if (selectedPaper === '58mm') {
    jsPdfFormat = [58, 220];
    margin = [2, 2, 2, 2];
  } else if (selectedPaper === '80mm') {
    jsPdfFormat = [80, 260];
    margin = [3, 3, 3, 3];
  } else if (selectedPaper === 'A5') {
    jsPdfFormat = 'a5';
    margin = [4, 4, 4, 4];
  } else if (selectedPaper === 'custom') {
    const customWidth = Number(storeProfile?.customPaperWidth) || 100;
    const customHeight = Number(storeProfile?.customPaperHeight) || 200;
    const customMargin = storeProfile?.customPaperMargin !== undefined ? Number(storeProfile.customPaperMargin) : 4;
    jsPdfFormat = [customWidth, customHeight > 0 ? customHeight : 200];
    margin = [customMargin, customMargin, customMargin, customMargin];
  }

  const opt = {
    margin: margin,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    },
    jsPDF: {
      unit: 'mm',
      format: jsPdfFormat,
      orientation: 'portrait',
      compress: true
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  const pdfExporter = typeof html2pdf === 'function' ? html2pdf : (html2pdf?.default || window.html2pdf);
  return await pdfExporter().from(domElement).set(opt).save();
};
