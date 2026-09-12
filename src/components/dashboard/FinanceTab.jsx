import React, { useState, useRef, useMemo } from 'react';
import {
  formatRupiah,
  formatDateId,
  getLocalDateString,
  generatePurchaseNumber,
  calculateFinanceSummary,
  exportFinanceToCsv
} from '../../services/storage';
import {
  uploadVendorNotaApi
} from '../../services/googleSheetsApi';
import { isAppsScriptConnected } from '../../services/appsScriptClient';
import CustomDatePicker from '../ui/CustomDatePicker';
import ConfirmModal from '../ui/ConfirmModal';
import CustomTooltip from '../ui/CustomTooltip';

const PRESET_CATEGORIES = [
  'Pembelian P1',
  'Transport',
  'Bisyaroh Tim',
  'Bahan Baku',
  'Listrik & Utilitas',
  'Pemasaran',
  'Lainnya'
];

const PRESET_INCOME_CATEGORIES = [
  'Infaq / Hibah',
  'Modal / Cash-In',
  'Bonus Percetakan',
  'Pendapatan Jasa Lain',
  'Lainnya'
];

const isP1Category = (cat) => {
  if (!cat) return false;
  const s = String(cat).trim().toUpperCase();
  return s === 'P1' || s.includes('P1') || s.includes('PEMBELIAN');
};

const EMPTY_ITEM = { nama: '', hargaSatuan: '', jumlah: '' };
const genId = () => `fin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function calcTotal(items) {
  return (items || []).reduce((acc, it) => acc + (parseFloat(it.hargaSatuan) || 0) * (parseFloat(it.jumlah) || 0), 0);
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes Google Drive and file URLs for safe embedding in <img> and <iframe>.
 * - For Google Drive PDFs: converts /view to /preview so iframe won't be blocked by X-Frame-Options.
 * - For Google Drive Images: extracts fileId and converts to direct image stream via thumbnail/lh3 API.
 * - Uses dataBase64 as instant, offline-capable fallback.
 */
function getNormalizedFilePreviewUrl(file) {
  if (!file) return null;
  const { driveUrl, mimeType, dataBase64, fileName = '' } = file;

  const isImage = mimeType?.startsWith('image/') || 
                  (!mimeType && /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName));
  const isPdf = mimeType === 'application/pdf' || 
                (!mimeType && /\.pdf$/i.test(fileName));

  // If local base64 is available for images, prefer it for instant, zero-latency rendering
  if (isImage && dataBase64) {
    return {
      type: 'image',
      url: dataBase64,
      fallbackUrl: null,
      rawUrl: driveUrl || null
    };
  }

  // Parse Google Drive URL if present
  if (driveUrl && typeof driveUrl === 'string') {
    const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  driveUrl.match(/id=([a-zA-Z0-9_-]+)/) ||
                  driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;

    if (fileId) {
      if (isPdf) {
        return {
          type: 'pdf',
          url: `https://drive.google.com/file/d/${fileId}/preview`,
          rawUrl: driveUrl
        };
      } else {
        return {
          type: 'image',
          url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
          fallbackUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
          rawUrl: driveUrl
        };
      }
    }

    if (isPdf) {
      const previewUrl = driveUrl.replace(/\/view(\?.*)?$/, '/preview$1');
      return { type: 'pdf', url: previewUrl, rawUrl: driveUrl };
    } else {
      return { type: 'image', url: driveUrl, rawUrl: driveUrl };
    }
  }

  // Fallback to dataBase64 if available
  if (dataBase64) {
    return {
      type: isPdf ? 'pdf' : 'image',
      url: dataBase64,
      fallbackUrl: null,
      rawUrl: null
    };
  }

  return null;
}

export default function FinanceTab({
  purchases = [],
  expenses = [],
  otherIncome = [],
  history = [],
  onSavePurchase,
  onDeletePurchase,
  onSaveExpense,
  onDeleteExpense,
  onSaveOtherIncome,
  onDeleteOtherIncome,
  onShowToast
}) {
  // Main tabs: 'membayar' | 'menerima' | 'laporan'
  const [activeTab, setActiveTab] = useState('membayar');

  // Filter inside 'membayar' tab: 'semua' | 'p1' | 'operasional'
  const [payFilter, setPayFilter] = useState('semua');

  // Filter inside 'menerima' tab: 'semua' | 'nota' | 'lainnya'
  const [incomeFilter, setIncomeFilter] = useState('semua');

  // Unified Outgoing Form state
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState('Pembelian P1'); // Default manual category string
  
  // P1 fields
  const [p1Form, setP1Form] = useState(null);
  const [uploadState, setUploadState] = useState('idle');
  const fileInputRef = useRef(null);

  // General expense fields
  const [expenseForm, setExpenseForm] = useState(null);

  // Other Income Form state (Menerima)
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState(null);

  // Confirm delete states
  const [confirmDelPurchase, setConfirmDelPurchase] = useState(null);
  const [confirmDelExpense, setConfirmDelExpense] = useState(null);
  const [confirmDelIncome, setConfirmDelIncome] = useState(null);

  // Receipt modal state & handlers
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const openReceiptPreview = (item) => {
    if (!item || !item.notaFile) return;
    setPreviewReceipt({
      title: item.title || 'Nota Pembelian',
      refNo: item.subTitle || item.refNo || item.noPembelian || '',
      tanggal: item.tanggal,
      jumlah: item.jumlah || item.grandTotal || 0,
      file: item.notaFile
    });
  };

  const handleDownloadReceipt = (receipt) => {
    if (!receipt || !receipt.file) return;
    const fileObj = receipt.file;

    // If local base64 binary is present, download directly from memory
    if (fileObj.dataBase64) {
      const a = document.createElement('a');
      a.href = fileObj.dataBase64;
      const ext = fileObj.mimeType === 'application/pdf' ? 'pdf' : 'png';
      a.download = fileObj.fileName || `nota-p1-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // If only driveUrl exists, open drive direct download or viewer
    if (fileObj.driveUrl) {
      const match = fileObj.driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                    fileObj.driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
      const fileId = match ? match[1] : null;
      if (fileId) {
        window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank');
      } else {
        window.open(fileObj.driveUrl, '_blank');
      }
      return;
    }

    onShowToast('Berkas nota belum diunggah secara fisik.', 'warning');
  };

  // Report date filters
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  // ── Overall Finance Summary ──────────────────────────────────────────
  const summary = useMemo(() => {
    return calculateFinanceSummary(
      history, purchases, expenses, otherIncome,
      reportFrom || null,
      reportTo || null
    );
  }, [history, purchases, expenses, otherIncome, reportFrom, reportTo]);

  // ── Unified Outgoing List (Membayar) ──────────────────────────────────
  const mergedOutgoing = useMemo(() => {
    const pList = (purchases || []).map(p => ({
      type: 'p1',
      id: p.id,
      tanggal: p.tanggal,
      kategori: p.kategori || 'Pembelian P1',
      title: p.namaP1 || 'Percetakan P1',
      subTitle: `No: ${p.noPembelian}`,
      items: p.items || [],
      jumlah: p.grandTotal || 0,
      notaFile: p.notaFile,
      catatan: p.catatan,
      raw: p
    }));

    const eList = (expenses || []).map(e => ({
      type: 'expense',
      id: e.id,
      tanggal: e.tanggal,
      kategori: e.kategori || 'Operasional',
      title: e.keterangan || 'Pengeluaran',
      subTitle: null,
      items: [],
      jumlah: e.jumlah || 0,
      notaFile: null,
      catatan: null,
      raw: e
    }));

    const combined = [...pList, ...eList];
    combined.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    if (payFilter === 'p1') return combined.filter(i => i.type === 'p1');
    if (payFilter === 'operasional') return combined.filter(i => i.type === 'expense');
    return combined;
  }, [purchases, expenses, payFilter]);

  // ── Unified Incoming List (Menerima) ──────────────────────────────────
  const mergedIncoming = useMemo(() => {
    const notaList = (history || []).map(h => ({
      type: 'nota',
      id: h.id,
      tanggal: h.date,
      refNo: h.notaNumber,
      title: h.customerName || 'Pelanggan Umum',
      subTitle: h.paymentMethod || 'Tunai',
      items: h.items || [],
      jumlah: h.grandTotal || 0,
      raw: h
    }));

    const incList = (otherIncome || []).map(inc => ({
      type: 'other',
      id: inc.id,
      tanggal: inc.tanggal,
      refNo: inc.sumber || 'Pemasukan Lain',
      title: inc.keterangan || 'Pemasukan Lain',
      subTitle: inc.sumber || 'Kategori Lain',
      items: [],
      jumlah: inc.jumlah || 0,
      raw: inc
    }));

    const combined = [...notaList, ...incList];
    combined.sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || '')));

    if (incomeFilter === 'nota') return combined.filter(i => i.type === 'nota');
    if (incomeFilter === 'lainnya') return combined.filter(i => i.type === 'other');
    return combined;
  }, [history, otherIncome, incomeFilter]);

  // ── Form Trigger Helpers: Membayar ───────────────────────────────────
  const openNewOutgoing = (initialCat = 'Pembelian P1') => {
    setFormCategory(initialCat);
    if (isP1Category(initialCat)) {
      setP1Form({
        id: null,
        tanggal: getLocalDateString(),
        noPembelian: generatePurchaseNumber(purchases),
        namaP1: '',
        items: [{ ...EMPTY_ITEM }],
        grandTotal: 0,
        notaFile: null,
        catatan: ''
      });
      setUploadState('idle');
    } else {
      setExpenseForm({
        id: null,
        tanggal: getLocalDateString(),
        kategori: initialCat,
        keterangan: '',
        jumlah: ''
      });
    }
    setShowForm(true);
  };

  const openEditItem = (item) => {
    if (item.type === 'p1') {
      const cat = item.raw.kategori || 'Pembelian P1';
      setFormCategory(cat);
      setP1Form({
        ...item.raw,
        items: (item.raw.items || []).map(i => ({ ...i }))
      });
      setUploadState('idle');
    } else {
      const cat = item.raw.kategori || 'Transport';
      setFormCategory(cat);
      setExpenseForm({ ...item.raw });
    }
    setShowForm(true);
  };

  const handleCategoryChange = (newCat) => {
    setFormCategory(newCat);
    if (isP1Category(newCat) && !p1Form) {
      setP1Form({
        id: null,
        tanggal: expenseForm?.tanggal || getLocalDateString(),
        noPembelian: generatePurchaseNumber(purchases),
        namaP1: '',
        items: [{ ...EMPTY_ITEM }],
        grandTotal: 0,
        notaFile: null,
        catatan: ''
      });
    } else if (!isP1Category(newCat) && !expenseForm) {
      setExpenseForm({
        id: null,
        tanggal: p1Form?.tanggal || getLocalDateString(),
        kategori: newCat,
        keterangan: '',
        jumlah: ''
      });
    } else if (!isP1Category(newCat) && expenseForm) {
      setExpenseForm(prev => ({ ...prev, kategori: newCat }));
    }
  };

  // ── Form Trigger Helpers: Menerima (Pemasukan Lain) ──────────────────
  const openNewOtherIncome = () => {
    setIncomeForm({
      id: null,
      tanggal: getLocalDateString(),
      sumber: 'Infaq / Hibah',
      keterangan: '',
      jumlah: ''
    });
    setShowIncomeForm(true);
  };

  const openEditOtherIncome = (item) => {
    setIncomeForm({ ...item.raw });
    setShowIncomeForm(true);
  };

  const saveOtherIncome = async () => {
    if (!incomeForm) return;
    const toSave = {
      ...incomeForm,
      id: incomeForm.id || genId(),
      jumlah: parseFloat(incomeForm.jumlah) || 0
    };
    try {
      if (onSaveOtherIncome) await onSaveOtherIncome(toSave);
      setShowIncomeForm(false);
      onShowToast('Pemasukan lain berhasil disimpan.', 'success');
    } catch (err) {
      onShowToast('Gagal menyimpan pemasukan: ' + err.message, 'error');
    }
  };

  // ── Form Updaters: P1 ────────────────────────────────────────────────
  const updP1 = (key, value) => setP1Form(prev => {
    const next = { ...prev, [key]: value };
    if (key === 'items') next.grandTotal = calcTotal(value);
    return next;
  });

  const updP1Item = (idx, field, value) => setP1Form(prev => {
    const items = prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
    return { ...prev, items, grandTotal: calcTotal(items) };
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      onShowToast('Format tidak didukung. Gunakan PDF, JPG, atau PNG.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Ukuran file maksimal 10MB.', 'error');
      return;
    }
    e.target.value = '';

    try {
      // 1. Convert to Base64 first for instant offline preview
      const base64 = await fileToBase64(file);
      setP1Form(prev => ({
        ...prev,
        notaFile: {
          fileName: file.name,
          mimeType: file.type,
          dataBase64: base64,
          driveUrl: null,
          driveFileId: null
        }
      }));

      // 2. If cloud is not connected, keep local cache
      if (!isAppsScriptConnected()) {
        onShowToast('Cloud belum aktif. Nota tersimpan di cache lokal.', 'warning');
        return;
      }

      // 3. Upload to Google Drive asynchronously
      setUploadState('uploading');
      try {
        const result = await uploadVendorNotaApi(base64, file.name, file.type);
        setP1Form(prev => ({
          ...prev,
          notaFile: {
            fileName: file.name,
            mimeType: file.type,
            dataBase64: base64,
            driveUrl: result.fileUrl,
            driveFileId: result.fileId
          }
        }));
        setUploadState('done');
        onShowToast('Nota berhasil diunggah ke Google Drive.', 'success');
      } catch (err) {
        console.warn('Gagal upload Google Drive:', err);
        setUploadState('error');
        onShowToast('Upload Cloud tertunda (' + err.message + '). Nota tetap tersimpan di lokal.', 'warning');
      }
    } catch (readErr) {
      onShowToast('Gagal membaca file: ' + readErr.message, 'error');
    }
  };

  // ── Save Handlers: Membayar ──────────────────────────────────────────
  const saveOutgoing = async () => {
    if (isP1Category(formCategory)) {
      const toSave = {
        ...p1Form,
        id: p1Form.id || genId(),
        kategori: formCategory || 'Pembelian P1',
        grandTotal: calcTotal(p1Form.items),
        noPembelian: p1Form.noPembelian || generatePurchaseNumber(purchases)
      };
      try {
        await onSavePurchase(toSave);
        setShowForm(false);
        onShowToast('Pembelian ke P1 berhasil disimpan.', 'success');
      } catch (err) {
        onShowToast('Gagal menyimpan: ' + err.message, 'error');
      }
    } else {
      const toSave = {
        ...expenseForm,
        id: expenseForm.id || genId(),
        kategori: formCategory.trim() || 'Lainnya',
        jumlah: parseFloat(expenseForm.jumlah) || 0
      };
      try {
        await onSaveExpense(toSave);
        setShowForm(false);
        onShowToast('Pengeluaran berhasil disimpan.', 'success');
      } catch (err) {
        onShowToast('Gagal menyimpan: ' + err.message, 'error');
      }
    }
  };

  // ── Excel Export Handler ─────────────────────────────────────────────
  const handleExportExcel = () => {
    const csvContent = exportFinanceToCsv(
      summary,
      history,
      purchases,
      expenses,
      otherIncome,
      reportFrom,
      reportTo
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = getLocalDateString().replace(/-/g, '');
    a.download = `Laporan_Keuangan_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Laporan Keuangan berhasil di-export ke Excel (CSV).', 'success');
  };

  const canSaveP1 = p1Form &&
    p1Form.namaP1?.trim() &&
    p1Form.tanggal &&
    p1Form.items?.some(i => i.nama?.trim());

  const canSaveExpense = expenseForm &&
    expenseForm.tanggal &&
    formCategory?.trim() &&
    expenseForm.keterangan?.trim() &&
    expenseForm.jumlah;

  const canSaveOutgoing = isP1Category(formCategory) ? canSaveP1 : canSaveExpense;

  const canSaveIncome = incomeForm &&
    incomeForm.tanggal &&
    incomeForm.sumber?.trim() &&
    incomeForm.keterangan?.trim() &&
    incomeForm.jumlah;

  return (
    <div className="finance-tab">

      {/* ══ 1. FLUENT STAT CARDS (Executive Summary) ══════════════════════ */}
      <div className="dashboard-stats-grid finance-stats-grid">
        {/* Stat 1: Saldo Bersih */}
        <div className="fluent-card stat-card" style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: summary.labaBersih >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
            color: summary.labaBersih >= 0 ? '#10B981' : '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">
              {summary.labaBersih >= 0 ? 'trending_up' : 'trending_down'}
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px'
            }}>
              <span>Saldo Bersih (Laba)</span>
              <span className={`badge-status ${summary.labaBersih >= 0 ? 'lunas' : 'unpaid'}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                {summary.labaBersih >= 0 ? 'Surplus' : 'Defisit'}
              </span>
            </div>
            <div className={`num-tabular text-ellipsis-single ${summary.labaBersih >= 0 ? 'text-success' : 'text-danger'}`} style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              marginTop: '0.1rem'
            }}>
              {formatRupiah(summary.labaBersih)}
            </div>
          </div>
        </div>

        {/* Stat 2: Total Menerima */}
        <div className="fluent-card stat-card" style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(27, 189, 143, 0.14)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">south_west</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Menerima (Masuk)
            </div>
            <div className="num-tabular text-ellipsis-single text-success" style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              marginTop: '0.1rem'
            }}>
              {formatRupiah(summary.totalPemasukan)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.countNota} Nota P3 + {summary.countOtherIncome} Lainnya
            </div>
          </div>
        </div>

        {/* Stat 3: Total Membayar */}
        <div className="fluent-card stat-card" style={{
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.14)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">north_east</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Membayar (Keluar)
            </div>
            <div className="num-tabular text-ellipsis-single text-danger" style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              marginTop: '0.1rem'
            }}>
              {formatRupiah(summary.totalPengeluaran)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {summary.countPurchases} Cetak P1 + {summary.countExpenses} Ops
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. FLUENT PIVOT TABS ══════════════════════════════════════════ */}
      <div className="dashboard-tabs" style={{ marginBottom: 'var(--space-3)' }} role="tablist" aria-label="Navigasi Keuangan">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'membayar'}
          className={`dashboard-tab ${activeTab === 'membayar' ? 'active' : ''}`}
          onClick={() => { setActiveTab('membayar'); setShowForm(false); }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">payments</span>
          <span>Membayar ({purchases.length + expenses.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'menerima'}
          className={`dashboard-tab ${activeTab === 'menerima' ? 'active' : ''}`}
          onClick={() => { setActiveTab('menerima'); setShowIncomeForm(false); }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
          <span>Menerima ({history.length + (otherIncome || []).length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'laporan'}
          className={`dashboard-tab ${activeTab === 'laporan' ? 'active' : ''}`}
          onClick={() => setActiveTab('laporan')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">insights</span>
          <span>Laporan Keuangan</span>
        </button>
      </div>

      {/* ══ 3. TAB CONTENT: MEMBAYAR (PENGELUARAN UNIFIED) ══════════════ */}
      {activeTab === 'membayar' && (
        <div className="finance-panel">
          
          {/* Form Create / Edit */}
          {showForm ? (
            <div className="finance-form-card">
              <div className="finance-form-header">
                <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                <span>
                  {isP1Category(formCategory)
                    ? (p1Form?.id ? 'Edit Pembelian ke P1' : 'Catat Membayar — Pembelian ke P1')
                    : (expenseForm?.id ? 'Edit Pengeluaran' : 'Catat Membayar — Pengeluaran Operasional')
                  }
                </span>
              </div>

              {/* Input Manual Jenis / Kategori Pengeluaran (Tanpa Dropdown / Tanpa Icon) */}
              <div className="finance-form-group finance-form-full" style={{ marginBottom: '1.25rem' }}>
                <label className="finance-label">Jenis / Kategori Pengeluaran *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formCategory}
                  onChange={e => handleCategoryChange(e.target.value)}
                  placeholder="Ketik jenis pengeluaran (contoh: Transport, Pembelian P1, Gaji, dll)"
                />
                <div className="finance-suggestion-group">
                  <span className="finance-suggestion-label">Pilihan Cepat:</span>
                  <div className="finance-suggestion-chips">
                    {PRESET_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`finance-suggestion-btn ${formCategory === cat ? 'active' : ''}`}
                        onClick={() => handleCategoryChange(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Form: P1 Purchase */}
              {isP1Category(formCategory) && p1Form && (
                <>
                  <div className="finance-form-grid">
                    <div className="finance-form-group">
                      <label className="finance-label">Tanggal *</label>
                      <CustomDatePicker
                        value={p1Form.tanggal}
                        onChange={v => updP1('tanggal', v)}
                        placeholder="Pilih Tanggal"
                      />
                    </div>
                    <div className="finance-form-group">
                      <label className="finance-label">No. Pembelian</label>
                      <input
                        className="form-control"
                        value={p1Form.noPembelian}
                        onChange={e => updP1('noPembelian', e.target.value)}
                        placeholder="Otomatis jika kosong"
                      />
                    </div>
                    <div className="finance-form-group finance-form-full">
                      <label className="finance-label">Nama Percetakan / Supplier (P1) *</label>
                      <input
                        className="form-control"
                        value={p1Form.namaP1}
                        onChange={e => updP1('namaP1', e.target.value)}
                        placeholder="Contoh: CV Maju Jaya Printing"
                      />
                    </div>
                  </div>

                  <div className="finance-items-section">
                    <div className="finance-items-header">
                      <span className="finance-label">Rincian Cetak / Produk dari P1 *</span>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => updP1('items', [...p1Form.items, { ...EMPTY_ITEM }])}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">add</span> Tambah Baris
                      </button>
                    </div>

                    <div className="finance-items-table-wrap">
                      <table className="finance-items-table">
                        <thead>
                          <tr>
                            <th>Nama Buku / Produk</th>
                            <th>Harga Satuan (Rp)</th>
                            <th>Jumlah</th>
                            <th>Total</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {p1Form.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={item.nama}
                                  onChange={e => updP1Item(idx, 'nama', e.target.value)}
                                  placeholder="Nama buku / produk"
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm num-tabular"
                                  type="number"
                                  min="0"
                                  value={item.hargaSatuan}
                                  onChange={e => updP1Item(idx, 'hargaSatuan', e.target.value)}
                                  placeholder="0"
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm num-tabular"
                                  type="number"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={e => updP1Item(idx, 'jumlah', e.target.value)}
                                  placeholder="1"
                                />
                              </td>
                              <td className="num-tabular finance-item-total">
                                {formatRupiah((parseFloat(item.hargaSatuan) || 0) * (parseFloat(item.jumlah) || 0))}
                              </td>
                              <td>
                                {p1Form.items.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-icon-xs"
                                    onClick={() => updP1('items', p1Form.items.filter((_, i) => i !== idx))}
                                    aria-label="Hapus baris"
                                  >
                                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="finance-grand-total">
                      <span>Total Pembelian P1:</span>
                      <span className="num-tabular">{formatRupiah(calcTotal(p1Form.items))}</span>
                    </div>
                  </div>

                  <div className="finance-form-group finance-form-full">
                    <label className="finance-label">Upload Nota dari P1 (Opsional)</label>
                    <div className="finance-upload-zone">
                      {p1Form.notaFile ? (
                        <div className="finance-nota-preview">
                          <span className="material-symbols-outlined finance-nota-icon" aria-hidden="true">
                            {p1Form.notaFile.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                          </span>
                          <div className="finance-nota-info">
                            <span className="finance-nota-name">{p1Form.notaFile.fileName}</span>
                            <div className="finance-nota-actions-row">
                              <button
                                type="button"
                                className="finance-nota-preview-link-btn"
                                onClick={() => openReceiptPreview({
                                  title: 'Pratinjau Nota Terpilih',
                                  subTitle: p1Form.supplier || 'Pembelian P1',
                                  tanggal: p1Form.tanggal || new Date().toISOString().split('T')[0],
                                  jumlah: calcTotal(p1Form.items),
                                  notaFile: p1Form.notaFile
                                })}
                                title="Lihat Pratinjau Nota"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
                                <span>Lihat Nota</span>
                              </button>
                              {p1Form.notaFile.driveUrl ? (
                                <a href={p1Form.notaFile.driveUrl} target="_blank" rel="noopener noreferrer" className="finance-nota-link">
                                  <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>Buka di Drive
                                </a>
                              ) : (
                                <span className="finance-nota-pending">Tersimpan lokal</span>
                              )}
                            </div>
                          </div>
                          <button type="button" className="btn btn-ghost btn-icon-xs" onClick={() => updP1('notaFile', null)} aria-label="Hapus nota">
                            <span className="material-symbols-outlined" aria-hidden="true">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`finance-upload-btn ${uploadState === 'uploading' ? 'uploading' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadState === 'uploading'}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {uploadState === 'uploading' ? 'sync' : 'upload_file'}
                          </span>
                          <span>{uploadState === 'uploading' ? 'Mengunggah ke Drive...' : 'Pilih File Nota (PDF / JPG / PNG)'}</span>
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="finance-file-input"
                        onChange={handleFileSelect}
                        aria-label="Upload nota vendor"
                      />
                    </div>
                  </div>

                  <div className="finance-form-group finance-form-full">
                    <label className="finance-label">Catatan</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={p1Form.catatan}
                      onChange={e => updP1('catatan', e.target.value)}
                      placeholder="Catatan tambahan (opsional)"
                    />
                  </div>
                </>
              )}

              {/* Dynamic Form: General / Operational Expense */}
              {!isP1Category(formCategory) && expenseForm && (
                <div className="finance-form-grid">
                  <div className="finance-form-group">
                    <label className="finance-label">Tanggal *</label>
                    <CustomDatePicker
                      value={expenseForm.tanggal}
                      onChange={v => setExpenseForm(p => ({ ...p, tanggal: v }))}
                      placeholder="Pilih Tanggal"
                    />
                  </div>

                  <div className="finance-form-group">
                    <label className="finance-label">Jumlah Pembayaran (Rp) *</label>
                    <input
                      className="form-control num-tabular"
                      type="number"
                      min="0"
                      value={expenseForm.jumlah}
                      onChange={e => setExpenseForm(p => ({ ...p, jumlah: e.target.value }))}
                      placeholder="0"
                    />
                  </div>

                  <div className="finance-form-group finance-form-full">
                    <label className="finance-label">Keterangan Pengeluaran *</label>
                    <input
                      className="form-control"
                      value={expenseForm.keterangan}
                      onChange={e => setExpenseForm(p => ({ ...p, keterangan: e.target.value }))}
                      placeholder="Contoh: Transport kirim buku ke pelanggan, bisyaroh tim, dll"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="finance-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="button" className="btn btn-primary" onClick={saveOutgoing} disabled={!canSaveOutgoing}>
                  <span className="material-symbols-outlined" aria-hidden="true">save</span> Simpan Pembayaran
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dense Toolbar (Fluent) */}
              <div className="dense-toolbar finance-dense-toolbar">
                <div className="finance-toolbar-filters">
                  {/* Sub-filter pills */}
                  <div className="finance-subfilter-group" role="tablist" aria-label="Filter jenis pengeluaran">
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${payFilter === 'semua' ? 'active' : ''}`}
                      onClick={() => setPayFilter('semua')}
                    >
                      Semua ({purchases.length + expenses.length})
                    </button>
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${payFilter === 'p1' ? 'active' : ''}`}
                      onClick={() => setPayFilter('p1')}
                    >
                      Cetak P1 ({purchases.length})
                    </button>
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${payFilter === 'operasional' ? 'active' : ''}`}
                      onClick={() => setPayFilter('operasional')}
                    >
                      Operasional ({expenses.length})
                    </button>
                  </div>

                  <div className="finance-subfilter-summary num-tabular">
                    Subtotal: <strong className="text-danger">{formatRupiah(mergedOutgoing.reduce((acc, it) => acc + (it.jumlah || 0), 0))}</strong>
                  </div>
                </div>

                <div className="finance-toolbar-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openNewOutgoing('Pembelian P1')}>
                    <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pengeluaran
                  </button>
                </div>
              </div>

              {/* Table / Empty List */}
              {mergedOutgoing.length === 0 ? (
                <div className="finance-empty" style={{ background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <span className="material-symbols-outlined finance-empty-icon" aria-hidden="true">payments</span>
                  <p>Belum ada catatan pengeluaran / pembayaran.</p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openNewOutgoing('Pembelian P1')}>
                    <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pembayaran Pertama
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (>= 768px) */}
                  <div className="dense-table-container finance-desktop-table">
                    <table className="dense-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '110px' }}>Tanggal</th>
                          <th style={{ width: '130px' }}>Kategori</th>
                          <th>Keterangan / Supplier</th>
                          <th>Rincian Produk / Detail</th>
                          <th style={{ textAlign: 'right', width: '130px' }}>Total Bayar</th>
                          <th style={{ width: '130px', textAlign: 'center' }}>Nota P1</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedOutgoing.map(item => (
                          <tr key={`${item.type}_${item.id}`}>
                            <td className="finance-date-cell" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDateId(item.tanggal)}
                            </td>
                            <td>
                              <span className={`finance-chip ${item.type === 'p1' ? 'chip-p1' : 'chip-ops'}`}>
                                {item.kategori}
                              </span>
                            </td>
                            <td>
                              <div className="finance-title-bold" style={{ fontSize: 'var(--text-xs)' }}>{item.title}</div>
                              {item.subTitle && <div className="finance-sub-text num-tabular">{item.subTitle}</div>}
                            </td>
                            <td>
                              {item.type === 'p1' ? (
                                <div className="finance-items-summary">
                                  {(item.items || []).map((it, i) => (
                                    <span key={i} className="finance-item-chip">
                                      {it.nama} × {it.jumlah}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="finance-detail-text">{item.title}</span>
                              )}
                            </td>
                            <td className="num-tabular finance-total-cell text-danger" style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatRupiah(item.jumlah)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.type === 'p1' && item.notaFile ? (
                                <button
                                  type="button"
                                  className="finance-nota-btn"
                                  onClick={() => openReceiptPreview(item)}
                                  title={`Pratinjau / Unduh Nota (${item.notaFile.fileName || 'Berkas Nota'})`}
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">
                                    {item.notaFile.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'attach_file'}
                                  </span>
                                  <span className="finance-nota-btn-text">
                                    {item.notaFile.fileName ? (item.notaFile.fileName.length > 14 ? item.notaFile.fileName.substring(0, 11) + '...' : item.notaFile.fileName) : 'Lihat Nota'}
                                  </span>
                                </button>
                              ) : (
                                <span className="finance-no-nota">—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                                <CustomTooltip text="Edit Pembayaran">
                                  <button
                                    type="button"
                                    className="btn-icon-action"
                                    onClick={() => openEditItem(item)}
                                    aria-label="Edit"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                  </button>
                                </CustomTooltip>
                                <CustomTooltip text="Hapus Pembayaran">
                                  <button
                                    type="button"
                                    className="btn-icon-action danger"
                                    onClick={() => {
                                      if (item.type === 'p1') setConfirmDelPurchase(item.raw);
                                      else setConfirmDelExpense(item.raw);
                                    }}
                                    aria-label="Hapus"
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

                  {/* Mobile Cards View (< 768px - No Horizontal Scroll!) */}
                  <div className="finance-mobile-list">
                    {mergedOutgoing.map(item => (
                      <div key={`m_${item.type}_${item.id}`} className="finance-mobile-card">
                        <div className="finance-mobile-card-header">
                          <span className={`finance-chip ${item.type === 'p1' ? 'chip-p1' : 'chip-ops'}`}>
                            {item.kategori}
                          </span>
                          <span className="finance-mobile-card-date">{formatDateId(item.tanggal)}</span>
                        </div>

                        <div className="finance-mobile-card-title">{item.title}</div>
                        {item.subTitle && <div className="finance-mobile-card-sub num-tabular">{item.subTitle}</div>}

                        {item.type === 'p1' && item.items && item.items.length > 0 && (
                          <div className="finance-mobile-card-items">
                            {item.items.map((it, i) => (
                              <span key={i} className="finance-item-chip">
                                {it.nama} × {it.jumlah}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.type === 'p1' && item.notaFile && (
                          <div className="finance-mobile-card-nota">
                            <button
                              type="button"
                              className="finance-nota-quick-pill"
                              onClick={() => openReceiptPreview(item)}
                              title={`Lihat Nota (${item.notaFile.fileName || 'Berkas Nota'})`}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                {item.notaFile.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image'}
                              </span>
                              <span>Lihat Nota P1</span>
                            </button>
                          </div>
                        )}

                        <div className="finance-mobile-card-footer">
                          <div className="finance-mobile-card-amount num-tabular text-danger">
                            {formatRupiah(item.jumlah)}
                          </div>
                          <div className="finance-mobile-card-actions">
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => openEditItem(item)}
                              aria-label="Edit"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action danger"
                              onClick={() => {
                                if (item.type === 'p1') setConfirmDelPurchase(item.raw);
                                else setConfirmDelExpense(item.raw);
                              }}
                              aria-label="Hapus"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ 4. TAB CONTENT: MENERIMA (PEMASUKAN / SALES NOTA P3 & LAINNYA) ══ */}
      {activeTab === 'menerima' && (
        <div className="finance-panel">
          {showIncomeForm && incomeForm ? (
            <div className="finance-form-card">
              <div className="finance-form-header">
                <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
                <span>{incomeForm.id ? 'Edit Pemasukan Lain' : 'Catat Pemasukan Lain (Non-Nota)'}</span>
              </div>

              {/* Input Manual Kategori / Sumber Pemasukan */}
              <div className="finance-form-group finance-form-full" style={{ marginBottom: '1.25rem' }}>
                <label className="finance-label">Sumber / Kategori Pemasukan *</label>
                <input
                  type="text"
                  className="form-control"
                  value={incomeForm.sumber}
                  onChange={e => setIncomeForm(p => ({ ...p, sumber: e.target.value }))}
                  placeholder="Ketik sumber pemasukan (contoh: Infaq, Modal, Cash-In, dll)"
                />
                <div className="finance-suggestion-group">
                  <span className="finance-suggestion-label">Pilihan Cepat:</span>
                  <div className="finance-suggestion-chips">
                    {PRESET_INCOME_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        className={`finance-suggestion-btn ${incomeForm.sumber === cat ? 'active' : ''}`}
                        onClick={() => setIncomeForm(p => ({ ...p, sumber: cat }))}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="finance-form-grid">
                <div className="finance-form-group">
                  <label className="finance-label">Tanggal *</label>
                  <CustomDatePicker
                    value={incomeForm.tanggal}
                    onChange={v => setIncomeForm(p => ({ ...p, tanggal: v }))}
                    placeholder="Pilih Tanggal"
                  />
                </div>

                <div className="finance-form-group">
                  <label className="finance-label">Jumlah Pemasukan (Rp) *</label>
                  <input
                    className="form-control num-tabular"
                    type="number"
                    min="0"
                    value={incomeForm.jumlah}
                    onChange={e => setIncomeForm(p => ({ ...p, jumlah: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                <div className="finance-form-group finance-form-full">
                  <label className="finance-label">Keterangan Pemasukan *</label>
                  <input
                    className="form-control"
                    value={incomeForm.keterangan}
                    onChange={e => setIncomeForm(p => ({ ...p, keterangan: e.target.value }))}
                    placeholder="Contoh: Tambahan modal dari pemilik, infaq percetakan, dll"
                  />
                </div>
              </div>

              <div className="finance-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIncomeForm(false)}>
                  Batal
                </button>
                <button type="button" className="btn btn-primary" onClick={saveOtherIncome} disabled={!canSaveIncome}>
                  <span className="material-symbols-outlined" aria-hidden="true">save</span> Simpan Pemasukan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dense Toolbar (Fluent) */}
              <div className="dense-toolbar finance-dense-toolbar">
                <div className="finance-toolbar-filters">
                  {/* Sub-filter pills for income */}
                  <div className="finance-subfilter-group" role="tablist" aria-label="Filter jenis pemasukan">
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${incomeFilter === 'semua' ? 'active' : ''}`}
                      onClick={() => setIncomeFilter('semua')}
                    >
                      Semua ({history.length + (otherIncome || []).length})
                    </button>
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${incomeFilter === 'nota' ? 'active' : ''}`}
                      onClick={() => setIncomeFilter('nota')}
                    >
                      Nota P3 ({history.length})
                    </button>
                    <button
                      type="button"
                      className={`finance-subfilter-btn ${incomeFilter === 'lainnya' ? 'active' : ''}`}
                      onClick={() => setIncomeFilter('lainnya')}
                    >
                      Pemasukan Lain ({(otherIncome || []).length})
                    </button>
                  </div>

                  <div className="finance-subfilter-summary num-tabular">
                    Subtotal: <strong className="text-success">{formatRupiah(mergedIncoming.reduce((acc, it) => acc + (it.jumlah || 0), 0))}</strong>
                  </div>
                </div>

                <div className="finance-toolbar-actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={openNewOtherIncome}>
                    <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pemasukan Lain
                  </button>
                </div>
              </div>

              {mergedIncoming.length === 0 ? (
                <div className="finance-empty" style={{ background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <span className="material-symbols-outlined finance-empty-icon" aria-hidden="true">receipt_long</span>
                  <p>Belum ada catatan pemasukan.</p>
                  <span className="finance-sub-text">Nota P3 yang dibuat aplikasi dan pemasukan manual akan tercatat di sini.</span>
                </div>
              ) : (
                <>
                  {/* Desktop Table View (>= 768px) */}
                  <div className="dense-table-container finance-desktop-table">
                    <table className="dense-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '110px' }}>Tanggal</th>
                          <th style={{ width: '140px' }}>Sumber / No. Nota</th>
                          <th>Pelanggan / Keterangan</th>
                          <th>Rincian Produk / Detail</th>
                          <th style={{ width: '120px' }}>Metode</th>
                          <th style={{ textAlign: 'right', width: '130px' }}>Total Menerima</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedIncoming.map(item => (
                          <tr key={`${item.type}_${item.id}`}>
                            <td className="finance-date-cell" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatDateId(item.tanggal)}
                            </td>
                            <td className="num-tabular finance-title-bold" style={{ fontSize: 'var(--text-xs)' }}>
                              {item.refNo}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-xs)' }}>
                                {item.title}
                              </div>
                            </td>
                            <td>
                              {item.type === 'nota' ? (
                                <div className="finance-items-summary">
                                  {(item.items || []).map((it, i) => (
                                    <span key={i} className="finance-item-chip">
                                      {it.name} × {it.qty}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="finance-detail-text">{item.title}</span>
                              )}
                            </td>
                            <td>
                              <span className="finance-chip chip-income">
                                {item.subTitle}
                              </span>
                            </td>
                            <td className="num-tabular finance-total-cell text-success" style={{ textAlign: 'right', fontWeight: 700 }}>
                              {formatRupiah(item.jumlah || 0)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.type === 'other' ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem' }}>
                                  <CustomTooltip text="Edit Pemasukan">
                                    <button
                                      type="button"
                                      className="btn-icon-action"
                                      onClick={() => openEditOtherIncome(item)}
                                      aria-label="Edit"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                    </button>
                                  </CustomTooltip>
                                  <CustomTooltip text="Hapus Pemasukan">
                                    <button
                                      type="button"
                                      className="btn-icon-action danger"
                                      onClick={() => setConfirmDelIncome(item.raw)}
                                      aria-label="Hapus"
                                    >
                                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                    </button>
                                  </CustomTooltip>
                                </div>
                              ) : (
                                <span className="badge-status lunas" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                  Nota P3
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View (< 768px - No Horizontal Scroll!) */}
                  <div className="finance-mobile-list">
                    {mergedIncoming.map(item => (
                      <div key={`m_${item.type}_${item.id}`} className="finance-mobile-card">
                        <div className="finance-mobile-card-header">
                          <span className="finance-chip chip-income">
                            {item.type === 'nota' ? 'Nota Penjualan' : (item.subTitle || 'Pemasukan')}
                          </span>
                          <span className="finance-mobile-card-date">{formatDateId(item.tanggal)}</span>
                        </div>

                        <div className="finance-mobile-card-title">{item.title}</div>
                        {item.refNo && <div className="finance-mobile-card-sub num-tabular">Ref: {item.refNo}</div>}

                        {item.type === 'nota' && item.items && item.items.length > 0 && (
                          <div className="finance-mobile-card-items">
                            {item.items.map((it, i) => (
                              <span key={i} className="finance-item-chip">
                                {it.name} × {it.qty}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="finance-mobile-card-footer">
                          <div className="finance-mobile-card-amount num-tabular text-success">
                            {formatRupiah(item.jumlah || 0)}
                          </div>
                          <div className="finance-mobile-card-actions">
                            {item.type === 'other' ? (
                              <>
                                <button
                                  type="button"
                                  className="btn-icon-action"
                                  onClick={() => openEditOtherIncome(item)}
                                  aria-label="Edit"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon-action danger"
                                  onClick={() => setConfirmDelIncome(item.raw)}
                                  aria-label="Hapus"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                                </button>
                              </>
                            ) : (
                              <span className="badge-status lunas" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                Nota P3
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ 5. TAB CONTENT: LAPORAN KEUANGAN (FLUENT) ═════════════════════ */}
      {activeTab === 'laporan' && (
        <div className="finance-panel">
          {/* Dense Toolbar (Fluent) */}
          <div className="dense-toolbar finance-dense-toolbar">
            <div className="finance-toolbar-filters">
              <div className="toolbar-date-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <div className="toolbar-date-field" style={{ minWidth: '135px', maxWidth: '170px' }}>
                  <CustomDatePicker value={reportFrom} onChange={setReportFrom} placeholder="Dari Tanggal" />
                </div>
                <span className="toolbar-date-separator" style={{ color: 'var(--text-muted)' }}>-</span>
                <div className="toolbar-date-field" style={{ minWidth: '135px', maxWidth: '170px' }}>
                  <CustomDatePicker value={reportTo} onChange={setReportTo} placeholder="Sampai Tanggal" />
                </div>
                {(reportFrom || reportTo) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon-only"
                    onClick={() => { setReportFrom(''); setReportTo(''); }}
                    aria-label="Reset Filter"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                )}
              </div>
            </div>

            <div className="finance-toolbar-actions">
              <CustomTooltip text="Download file Excel / CSV">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportExcel}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">download</span>
                  <span>Export Excel (.csv)</span>
                </button>
              </CustomTooltip>
            </div>
          </div>

          {/* KPI Summary Cards (Fluent) */}
          <div className="dashboard-stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
            {/* Laba Bersih Featured */}
            <div className="fluent-card stat-card" style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: `4px solid ${summary.labaBersih >= 0 ? '#10B981' : '#EF4444'}`
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: summary.labaBersih >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                color: summary.labaBersih >= 0 ? '#10B981' : '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {summary.labaBersih >= 0 ? 'emoji_events' : 'warning'}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '0.725rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Laba Bersih Akhir</span>
                  <span className={`badge-status ${summary.labaBersih >= 0 ? 'lunas' : 'unpaid'}`} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                    {summary.labaBersih >= 0 ? 'Surplus' : 'Defisit'}
                  </span>
                </div>
                <div className={`num-tabular text-ellipsis-single ${summary.labaBersih >= 0 ? 'text-success' : 'text-danger'}`} style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 800,
                  marginTop: '0.15rem'
                }}>
                  {formatRupiah(summary.labaBersih)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Total Menerima − Total Membayar
                </div>
              </div>
            </div>

            {/* Total Arus Masuk */}
            <div className="fluent-card stat-card" style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(27, 189, 143, 0.14)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" aria-hidden="true">call_received</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Arus Masuk
                </div>
                <div className="num-tabular text-ellipsis-single text-success" style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  marginTop: '0.15rem'
                }}>
                  {formatRupiah(summary.totalPemasukan)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {summary.countNota} Nota P3 ({formatRupiah(summary.totalNotaSales)}) + Lainnya
                </div>
              </div>
            </div>

            {/* Total Arus Keluar */}
            <div className="fluent-card stat-card" style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.14)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <span className="material-symbols-outlined" aria-hidden="true">call_made</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Arus Keluar
                </div>
                <div className="num-tabular text-ellipsis-single text-danger" style={{
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  marginTop: '0.15rem'
                }}>
                  {formatRupiah(summary.totalPengeluaran)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {summary.countPurchases} P1 ({formatRupiah(summary.totalPembelian)}) + Ops
                </div>
              </div>
            </div>
          </div>

          {/* Arus Kas Streams Breakdown (Side by Side Fluent Cards) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            {/* Arus Masuk Card */}
            <div className="fluent-card" style={{ padding: 'var(--space-4)' }}>
              <div className="card-title" style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>
                <span className="material-symbols-outlined" style={{ color: '#10B981' }}>call_received</span>
                <span>Rincian Arus Masuk</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Penjualan Nota P3</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{summary.countNota} transaksi tercatat</div>
                  </div>
                  <div className="num-tabular text-success" style={{ fontWeight: 700 }}>{formatRupiah(summary.totalNotaSales)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Pemasukan Lain (Non-Nota)</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{summary.countOtherIncome} transaksi tercatat</div>
                  </div>
                  <div className="num-tabular text-success" style={{ fontWeight: 700 }}>{formatRupiah(summary.totalOtherIncome)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  <span>Total Pemasukan</span>
                  <span className="num-tabular text-success">{formatRupiah(summary.totalPemasukan)}</span>
                </div>
              </div>
            </div>

            {/* Arus Keluar Card */}
            <div className="fluent-card" style={{ padding: 'var(--space-4)' }}>
              <div className="card-title" style={{ color: 'var(--text-main)', marginBottom: 'var(--space-3)' }}>
                <span className="material-symbols-outlined" style={{ color: '#EF4444' }}>call_made</span>
                <span>Rincian Arus Keluar</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Pembelian Cetak ke P1</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{summary.countPurchases} transaksi ke vendor</div>
                  </div>
                  <div className="num-tabular text-danger" style={{ fontWeight: 700 }}>{formatRupiah(summary.totalPembelian)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--text-xs)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Pengeluaran Operasional</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{summary.countExpenses} item pengeluaran</div>
                  </div>
                  <div className="num-tabular text-danger" style={{ fontWeight: 700 }}>{formatRupiah(summary.totalPengeluaranLain)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  <span>Total Pengeluaran</span>
                  <span className="num-tabular text-danger">{formatRupiah(summary.totalPengeluaran)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Calculation Box (Fluent Card) */}
          <div className="fluent-card" style={{ padding: 'var(--space-4)' }}>
            <div className="card-title" style={{ marginBottom: 'var(--space-3)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>calculate</span>
              <span>Rekapitulasi Perhitungan Laba Bersih</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>💰 Total Penjualan Nota P3</span>
                <span className="num-tabular text-success font-bold">{formatRupiah(summary.totalNotaSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>➕ Pemasukan Lain (Non-Nota)</span>
                <span className="num-tabular text-success font-bold">+{formatRupiah(summary.totalOtherIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>📦 Pembelian Cetak ke P1</span>
                <span className="num-tabular text-danger font-bold">− {formatRupiah(summary.totalPembelian)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>💸 Pengeluaran Operasional & Lainnya</span>
                <span className="num-tabular text-danger font-bold">− {formatRupiah(summary.totalPengeluaranLain)}</span>
              </div>
              <div style={{ height: '1px', borderTop: '1px dashed var(--border-color)', margin: 'var(--space-1) 0' }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>🏆 Laba Bersih (Surplus/Defisit)</span>
                <span className={`num-tabular ${summary.labaBersih >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 800, fontSize: 'var(--text-md)' }}>
                  {formatRupiah(summary.labaBersih)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {confirmDelPurchase && (
        <ConfirmModal
          isOpen
          type="danger"
          title="Hapus Catatan Pembelian?"
          message={`Pembelian dari "${confirmDelPurchase.namaP1}" senilai ${formatRupiah(confirmDelPurchase.grandTotal)} akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={async () => {
            await onDeletePurchase(confirmDelPurchase.id);
            setConfirmDelPurchase(null);
            onShowToast('Catatan pembelian dihapus.', 'success');
          }}
          onCancel={() => setConfirmDelPurchase(null)}
        />
      )}
      {confirmDelExpense && (
        <ConfirmModal
          isOpen
          type="danger"
          title="Hapus Pengeluaran?"
          message={`Pengeluaran "${confirmDelExpense.keterangan}" senilai ${formatRupiah(confirmDelExpense.jumlah)} akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={async () => {
            await onDeleteExpense(confirmDelExpense.id);
            setConfirmDelExpense(null);
            onShowToast('Pengeluaran dihapus.', 'success');
          }}
          onCancel={() => setConfirmDelExpense(null)}
        />
      )}
      {confirmDelIncome && (
        <ConfirmModal
          isOpen
          type="danger"
          title="Hapus Pemasukan Lain?"
          message={`Pemasukan "${confirmDelIncome.keterangan}" senilai ${formatRupiah(confirmDelIncome.jumlah)} akan dihapus permanen.`}
          confirmLabel="Hapus"
          onConfirm={async () => {
            if (onDeleteOtherIncome) await onDeleteOtherIncome(confirmDelIncome.id);
            setConfirmDelIncome(null);
            onShowToast('Pemasukan lain dihapus.', 'success');
          }}
          onCancel={() => setConfirmDelIncome(null)}
        />
      )}

      {/* ── In-App Receipt Viewer Modal ────────────────────────────────────── */}
      {previewReceipt && (() => {
        const previewInfo = getNormalizedFilePreviewUrl(previewReceipt.file);
        return (
          <div className="receipt-modal-overlay" onClick={() => setPreviewReceipt(null)}>
            <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
              <div className="receipt-modal-header">
                <div className="receipt-modal-title">
                  <span className="material-symbols-outlined" aria-hidden="true">description</span>
                  <div>
                    <h3>Pratinjau Struk / Nota Pembelian P1</h3>
                    <p>{previewReceipt.title} — {previewReceipt.refNo} ({formatDateId(previewReceipt.tanggal)})</p>
                  </div>
                </div>
                <button type="button" className="receipt-modal-close" onClick={() => setPreviewReceipt(null)} aria-label="Tutup">
                  <span className="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </div>

              <div className="receipt-modal-body">
                {previewInfo ? (
                  previewInfo.type === 'pdf' ? (
                    <div className="receipt-pdf-container">
                      <iframe
                        src={previewInfo.url}
                        className="receipt-iframe-preview"
                        title="Pratinjau PDF Nota"
                      />
                      <div className="receipt-preview-hint">
                        <span>Pratinjau dokumen PDF terintegrasi.</span>
                        {previewReceipt.file.driveUrl && (
                          <a
                            href={previewReceipt.file.driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="receipt-hint-link"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span> Buka Layar Penuh di Drive
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="receipt-image-container">
                      <img
                        src={previewInfo.url}
                        alt="Nota Vendor P1"
                        className="receipt-img-preview"
                        loading="lazy"
                        onError={(e) => {
                          if (previewInfo.fallbackUrl && e.currentTarget.src !== previewInfo.fallbackUrl) {
                            e.currentTarget.src = previewInfo.fallbackUrl;
                          } else if (previewReceipt.file?.dataBase64 && e.currentTarget.src !== previewReceipt.file.dataBase64) {
                            e.currentTarget.src = previewReceipt.file.dataBase64;
                          }
                        }}
                      />
                    </div>
                  )
                ) : (
                  <div className="receipt-no-preview-box">
                    <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
                    <p><strong>{previewReceipt.file?.fileName || 'Berkas Nota'}</strong></p>
                    <p className="text-muted">Berkas fisik belum tersimpan di Google Drive atau cache lokal.</p>
                    <p className="receipt-no-preview-hint">
                      💡 <em>File ini dicatat sebelum fitur cache aktif atau saat koneksi cloud terputus. Anda dapat mengunggah berkas fisik nota ini melalui tombol <strong>Edit</strong> pada baris transaksi.</em>
                    </p>
                  </div>
                )}
              </div>

              <div className="receipt-modal-footer">
                <div className="receipt-modal-info">
                  <span>Total Bayar:</span>
                  <strong className="text-danger num-tabular">{formatRupiah(previewReceipt.jumlah)}</strong>
                </div>
                <div className="receipt-modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setPreviewReceipt(null)}>
                    Tutup
                  </button>
                  {previewReceipt.file?.driveUrl && (
                    <a
                      href={previewReceipt.file.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">cloud</span> Buka di Drive
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleDownloadReceipt(previewReceipt)}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">download</span> Unduh Nota
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
