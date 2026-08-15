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
  footerMsg: 'Terima kasih atas kunjungan Anda.',
  defaultPaper: 'A4',
  customPaperName: 'Kustom',
  customPaperWidth: 100, // mm
  customPaperHeight: 150, // mm (0 = continuous roll)
  customPaperMargin: 4, // mm
  qrSize: 'medium', // 'small' | 'medium' | 'large' | 'custom'
  customQrSize: 24, // number
  customQrUnit: 'mm', // 'mm' | 'px'
  customQrSizePx: 80, // px fallback
  qrPosition: 'right', // 'center' | 'right' | 'left'
  showQrCode: true,
  density: 'normal', // 'compact' | 'normal' | 'spacious'
  bankName: '',
  bankAccount: '',
  bankHolder: ''
};

export const defaultCatalog = [];

/**
 * Safe local storage setter with quota guard & graceful trimming
 */
export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`LocalStorage quota exceeded for key "${key}". Trimming old data:`, err);
    if (key === KEYS.HISTORY) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 100) {
          const trimmed = parsed.slice(0, 100);
          localStorage.setItem(key, JSON.stringify(trimmed));
        }
      } catch (innerErr) {
        console.error('Failed to save trimmed history to LocalStorage:', innerErr);
      }
    }
  }
};

/**
 * Normalizes customer phone numbers to clean digits with country code format (08xx -> 628xx)
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '628' + clean.slice(1);
  }
  return clean;
};

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
  safeSetItem(KEYS.STORE, JSON.stringify(profile));
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
  safeSetItem(KEYS.CATALOG, JSON.stringify(catalog));
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
  safeSetItem(KEYS.HISTORY, JSON.stringify(history));
};

export const calculateItemTotal = (item) => {
  if (!item) return 0;
  const qty = Math.max(0, parseInt(item.qty, 10) || 0);
  const price = Math.max(0, parseFloat(item.price) || 0);
  if (item.type === 'm2') {
    const lengthM = Math.max(0, parseFloat(item.length) || 0) / 100;
    const widthM = Math.max(0, parseFloat(item.width) || 0) / 100;
    return Math.round(lengthM * widthM * qty * price);
  }
  // buku, pcs, rim, pack — semua qty × price
  return Math.round(qty * price);
};

// Helper: format book detail line for text output
export const formatBookDetailText = (item) => {
  if (!item) return '';
  const parts = [];
  if (item.bookTitle) parts.push(`"${item.bookTitle}"`);
  if (item.bookSize) parts.push(item.bookSize);
  if (item.bookPages) parts.push(`${item.bookPages} hlm`);
  if (item.bookPaperInner) parts.push(`Isi: ${item.bookPaperInner}`);
  if (item.bookCover) parts.push(`Cover: ${item.bookCover}`);
  if (item.bookBinding) parts.push(`Jilid: ${item.bookBinding}`);
  return parts.length > 0 ? parts.join(' | ') : '';
};

// Helper: format custom details for text output
export const formatCustomDetailsText = (item) => {
  if (!item || !item.customDetails || item.customDetails.length === 0) return '';
  return item.customDetails
    .filter(d => d.key && d.value)
    .map(d => `${d.key}: ${d.value}`)
    .join(' | ');
};

/**
 * Centralized item summary formatter for Receipt Preview, WA Share, and Excel Reports
 * @param {Object} item - Transaction item object
 * @param {'full' | 'single-line' | 'specs'} mode - Formatting target
 * @returns {string}
 */
export const formatItemSummary = (item, mode = 'full') => {
  if (!item) return '';
  const total = calculateItemTotal(item);
  const name = item.name || 'Pekerjaan Cetak';
  const qty = item.qty || 1;
  const unit = (item.type || 'pcs').toUpperCase();

  if (mode === 'single-line') {
    return `${name} (${qty} ${unit}) = ${formatRupiah(total)}`;
  }

  if (mode === 'specs') {
    const specs = [];
    if (item.type === 'm2') {
      specs.push(`${item.length || 0}×${item.width || 0} cm`);
    } else if (item.type === 'buku') {
      const bookDet = formatBookDetailText(item);
      if (bookDet) specs.push(bookDet);
    }
    if (item.finishing) specs.push(`Finishing: ${item.finishing}`);
    const customDet = formatCustomDetailsText(item);
    if (customDet) specs.push(customDet);
    return specs.join(' | ');
  }

  // mode === 'full'
  let line = `${name} `;
  if (item.type === 'm2') {
    line += `(${item.length || 0}×${item.width || 0} cm) × ${qty} = ${formatRupiah(total)}`;
  } else if (item.type === 'buku') {
    line += `× ${qty} Eksemplar = ${formatRupiah(total)}`;
  } else {
    line += `× ${qty} ${unit} = ${formatRupiah(total)}`;
  }

  const extraParts = [];
  if (item.type === 'buku') {
    const bookDet = formatBookDetailText(item);
    if (bookDet) extraParts.push(bookDet);
  }
  if (item.finishing) extraParts.push(`Finishing: ${item.finishing}`);
  const customDet = formatCustomDetailsText(item);
  if (customDet) extraParts.push(customDet);

  if (extraParts.length > 0) {
    line += `\n   ${extraParts.join('\n   ')}`;
  }
  return line;
};

export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

/**
 * Returns clean local YYYY-MM-DD date string without UTC shift issues
 */
export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generates collision-free receipt number against existing history
 */
export const generateReceiptNumber = (existingHistory = []) => {
  const today = new Date();
  const dateStr = today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  
  let random = Math.floor(100 + Math.random() * 900);
  let receiptNo = `NOTA-${dateStr}-${random}`;

  if (Array.isArray(existingHistory) && existingHistory.length > 0) {
    const existingNos = new Set(existingHistory.map(h => h.noNota));
    let attempts = 0;
    while (existingNos.has(receiptNo) && attempts < 100) {
      random = Math.floor(100 + Math.random() * 900);
      receiptNo = `NOTA-${dateStr}-${random}`;
      attempts++;
    }
  }

  return receiptNo;
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
    text += `${idx + 1}. ${formatItemSummary(i, 'full')}\n`;
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
  if (transaction.payStatus === 'DP' || transaction.payStatus === 'Belum Lunas' || transaction.payStatus === 'Belum Bayar') {
    text += ` Sisa:${formatRupiah(sisa)}`;
  }

  return text.trim();
};
