/* ==========================================================================
   Storage Service - Data Management & Defaults
   ========================================================================== */

const KEYS = {
  STORE: 'nota_percetakan_store',
  CATALOG: 'nota_percetakan_catalog',
  HISTORY: 'nota_percetakan_history',
  THEME: 'nota_percetakan_theme'
};

export const defaultStore = {
  name: 'NAMA TOKO PERCETAKAN',
  subtitle: '',
  address: '',
  phone: '',
  footerMsg: 'Terima kasih atas kunjungan Anda.'
};

export const defaultCatalog = [];

export const getStoredStoreProfile = () => {
  try {
    const data = localStorage.getItem(KEYS.STORE);
    if (!data) return defaultStore;
    const parsed = JSON.parse(data);
    if (parsed && parsed.footerMsg && parsed.footerMsg.includes('Terima kasih atas kepercayaan Anda!')) {
      parsed.footerMsg = 'Terima kasih. Cetakan tidak dapat dibatalkan.';
    }
    return { ...defaultStore, ...parsed };
  } catch {
    return defaultStore;
  }
};

export const saveStoredStoreProfile = (profile) => {
  localStorage.setItem(KEYS.STORE, JSON.stringify(profile));
};

export const getStoredCatalog = () => {
  try {
    const data = localStorage.getItem(KEYS.CATALOG);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredCatalog = (catalog) => {
  localStorage.setItem(KEYS.CATALOG, JSON.stringify(catalog));
};

export const getStoredHistory = () => {
  try {
    const data = localStorage.getItem(KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveStoredHistory = (history) => {
  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
};

export const calculateItemTotal = (item) => {
  if (!item) return 0;
  if (item.type === 'm2') {
    const lengthM = (item.length || 0) / 100;
    const widthM = (item.width || 0) / 100;
    return lengthM * widthM * (item.qty || 0) * (item.price || 0);
  }
  // buku, pcs, rim, pack — semua qty × price
  return (item.qty || 0) * (item.price || 0);
};

// Helper: format book detail line for text output
const formatBookDetailText = (item) => {
  const parts = [];
  if (item.bookSize) parts.push(item.bookSize);
  if (item.bookPages) parts.push(`${item.bookPages} hlm`);
  if (item.bookPaperInner) parts.push(`Isi: ${item.bookPaperInner}`);
  if (item.bookCover) parts.push(`Cover: ${item.bookCover}`);
  if (item.bookBinding) parts.push(item.bookBinding);
  return parts.length > 0 ? parts.join(' | ') : '';
};

// Helper: format custom details for text output
const formatCustomDetailsText = (item) => {
  if (!item.customDetails || item.customDetails.length === 0) return '';
  return item.customDetails
    .filter(d => d.key && d.value)
    .map(d => `${d.key}: ${d.value}`)
    .join(' | ');
};

export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const generateReceiptNumber = () => {
  const today = new Date();
  const dateStr = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const random = Math.floor(100 + Math.random() * 900);
  return `NOTA-${dateStr}-${random}`;
};

export const formatDateId = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const generateNotaText = (storeProfile, transaction, items, grandTotal, sisa) => {
  const publicUrl = window.location.origin + window.location.pathname + '?nota=' + encodeURIComponent(transaction.noNota);

  let text = `*BUKTI PEMBAYARAN*\n`;
  text += `*${storeProfile?.name || 'PERCETAKAN'}*\n`;
  text += `--------------------------------------\n`;
  text += `No. Nota: ${transaction.noNota}\n`;
  text += `Pelanggan: ${transaction.custName || 'Pelanggan Umum'}\n`;
  text += `Tanggal: ${formatDateId(transaction.date)}\n\n\n`;

  text += `*RINCIAN PESANAN:*\n`;
  items.forEach((i, idx) => {
    const itemTotal = calculateItemTotal(i);
    text += `${idx + 1}. ${i.name || 'Pekerjaan Cetak'} `;
    if (i.type === 'm2') {
      text += `(${i.length || 0}x${i.width || 0}cm) x ${i.qty || 1} = ${formatRupiah(itemTotal)}\n`;
    } else if (i.type === 'buku') {
      text += `x ${i.qty || 1} Eksemplar = ${formatRupiah(itemTotal)}\n`;
      const bookDetail = formatBookDetailText(i);
      if (bookDetail) text += `   ${bookDetail}\n`;
    } else {
      text += `x ${i.qty || 1} ${(i.type || 'PCS').toUpperCase()} = ${formatRupiah(itemTotal)}\n`;
    }
    if (i.finishing) text += `   Finishing: ${i.finishing}\n`;
    const customDet = formatCustomDetailsText(i);
    if (customDet) text += `   ${customDet}\n`;
  });

  text += `--------------------------------------\n`;
  text += `*TOTAL: ${formatRupiah(grandTotal)}*\n`;
  if (sisa > 0) {
    text += `Uang Muka (DP): ${formatRupiah((transaction.dp || 0))}\n`;
    text += `*SISA TAGIHAN: ${formatRupiah(sisa)}*\n`;
  } else {
    text += `Status: *${(transaction.payStatus || 'LUNAS').toUpperCase()}*\n`;
  }
  text += `--------------------------------------\n\n`;

  text += `📄 *Detail nota:*\n`;
  text += `${publicUrl}\n\n`;
  text += `${storeProfile?.footerMsg || 'Terima kasih. Cetakan tidak dapat dibatalkan.'}`;

  return text;
};

// Minimalist QR text helper for Version 1 minimal module QR code
export const generateMinimalQrText = (transaction, grandTotal) => {
  return `NOTA:${transaction.noNota}\nTOTAL:${formatRupiah(grandTotal)}\nSTATUS:${transaction.payStatus}`;
};

// Compact minimalist text for QR Code (optimised for minimalist QR modules & instant scannability)
export const generateCompactNotaText = (storeProfile, transaction, items, grandTotal, sisa) => {
  let text = `E-NOTA [${storeProfile?.name || 'PERCETAKAN'}]\n`;
  text += `No: ${transaction.noNota}\n`;
  text += `Cust: ${transaction.custName || 'Umum'} (${formatDateId(transaction.date)})\n`;

  items.forEach((i, idx) => {
    const itemTotal = calculateItemTotal(i);
    const itemName = (i.name || 'Cetak').trim();
    if (i.type === 'm2') {
      text += `${idx + 1}.${itemName} ${i.length}x${i.width}cm x${i.qty}=${formatRupiah(itemTotal)}\n`;
    } else if (i.type === 'buku') {
      text += `${idx + 1}.${itemName} x${i.qty}eks=${formatRupiah(itemTotal)}`;
      if (i.bookPages) text += ` ${i.bookPages}hlm`;
      if (i.bookSize) text += ` ${i.bookSize}`;
      text += `\n`;
    } else {
      text += `${idx + 1}.${itemName} x${i.qty}=${formatRupiah(itemTotal)}\n`;
    }
  });

  text += `Total: ${formatRupiah(grandTotal)} (${transaction.payStatus})`;
  if (transaction.payStatus === 'DP' || transaction.payStatus === 'Belum Bayar') {
    text += ` Sisa:${formatRupiah(sisa)}`;
  }

  return text.trim();
};
