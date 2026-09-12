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
      title: item.title,
      refNo: item.subTitle || item.refNo || '',
      tanggal: item.tanggal,
      jumlah: item.jumlah,
      file: item.notaFile
    });
  };

  const handleDownloadReceipt = (receipt) => {
    if (!receipt || !receipt.file) return;
    const fileObj = receipt.file;

    if (fileObj.driveUrl) {
      window.open(fileObj.driveUrl, '_blank');
      return;
    }

    if (fileObj.dataBase64) {
      const a = document.createElement('a');
      a.href = fileObj.dataBase64;
      a.download = fileObj.fileName || `nota-p1-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
    setP1Form(prev => ({
      ...prev,
      notaFile: { fileName: file.name, mimeType: file.type, driveUrl: null, driveFileId: null }
    }));
    if (!isAppsScriptConnected()) {
      onShowToast('Cloud belum aktif. Nama file tersimpan, upload Drive dilewati.', 'warning');
      return;
    }
    setUploadState('uploading');
    try {
      const base64 = await fileToBase64(file);
      const result = await uploadVendorNotaApi(base64, file.name, file.type);
      setP1Form(prev => ({
        ...prev,
        notaFile: { fileName: file.name, mimeType: file.type, driveUrl: result.fileUrl, driveFileId: result.fileId }
      }));
      setUploadState('done');
      onShowToast('Nota berhasil diunggah ke Google Drive.', 'success');
    } catch (err) {
      setUploadState('error');
      onShowToast('Gagal upload ke Drive: ' + err.message, 'error');
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

      {/* ══ 1. TOP HIGHLIGHT BANNER (Visual Hierarchy Focus) ════════════ */}
      <div className="finance-banner-grid">
        <div className="finance-banner-card banner-income">
          <div className="banner-icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">call_received</span>
          </div>
          <div className="banner-content">
            <span className="banner-label">Menerima (Pemasukan)</span>
            <span className="banner-value num-tabular">{formatRupiah(summary.totalPemasukan)}</span>
            <span className="banner-sub">Nota P3 ({formatRupiah(summary.totalNotaSales)}) + Lainnya</span>
          </div>
        </div>

        <div className="finance-banner-card banner-expense">
          <div className="banner-icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">call_made</span>
          </div>
          <div className="banner-content">
            <span className="banner-label">Membayar (Pengeluaran)</span>
            <span className="banner-value num-tabular">{formatRupiah(summary.totalPengeluaran)}</span>
            <span className="banner-sub">P1 ({formatRupiah(summary.totalPembelian)}) + Operasional</span>
          </div>
        </div>

        <div className={`finance-banner-card banner-profit ${summary.labaBersih >= 0 ? 'profit-pos' : 'profit-neg'}`}>
          <div className="banner-icon-wrap">
            <span className="material-symbols-outlined" aria-hidden="true">
              {summary.labaBersih >= 0 ? 'trending_up' : 'trending_down'}
            </span>
          </div>
          <div className="banner-content">
            <span className="banner-label">Laba Bersih</span>
            <span className="banner-value num-tabular">{formatRupiah(summary.labaBersih)}</span>
            <span className="banner-sub">Pemasukan − Total Pengeluaran</span>
          </div>
        </div>
      </div>

      {/* ══ 2. SEGMENTED TABS: Membayar | Menerima | Laporan ═════════════ */}
      <div className="finance-panel-tabs" role="tablist" aria-label="Navigasi Keuangan">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'membayar'}
          className={`finance-panel-tab ${activeTab === 'membayar' ? 'active' : ''}`}
          onClick={() => setActiveTab('membayar')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">payments</span>
          <span>Membayar</span>
          <span className="finance-badge">{purchases.length + expenses.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'menerima'}
          className={`finance-panel-tab ${activeTab === 'menerima' ? 'active' : ''}`}
          onClick={() => setActiveTab('menerima')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
          <span>Menerima</span>
          <span className="finance-badge">{history.length + (otherIncome || []).length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'laporan'}
          className={`finance-panel-tab ${activeTab === 'laporan' ? 'active' : ''}`}
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
                            {p1Form.notaFile.driveUrl ? (
                              <a href={p1Form.notaFile.driveUrl} target="_blank" rel="noopener noreferrer" className="finance-nota-link">
                                <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>Buka di Drive
                              </a>
                            ) : (
                              <span className="finance-nota-pending">Tersimpan lokal</span>
                            )}
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
              {/* Toolbar */}
              <div className="finance-toolbar">
                <div className="finance-toolbar-left">
                  <div className="finance-toolbar-title">
                    <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                    <span>Daftar Membayar (Pengeluaran)</span>
                  </div>

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
                </div>

                <button type="button" className="btn btn-primary btn-sm" onClick={() => openNewOutgoing('Pembelian P1')}>
                  <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pengeluaran
                </button>
              </div>

              {/* Table / Empty List */}
              {mergedOutgoing.length === 0 ? (
                <div className="finance-empty">
                  <span className="material-symbols-outlined finance-empty-icon" aria-hidden="true">payments</span>
                  <p>Belum ada catatan pengeluaran / pembayaran.</p>
                  <button type="button" className="btn btn-primary" onClick={() => openNewOutgoing('Pembelian P1')}>
                    <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pembayaran Pertama
                  </button>
                </div>
              ) : (
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Keterangan / Supplier</th>
                        <th>Rincian Produk / Detail</th>
                        <th>Total Bayar</th>
                        <th>Nota P1</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedOutgoing.map(item => (
                        <tr key={`${item.type}_${item.id}`}>
                          <td className="finance-date-cell">{formatDateId(item.tanggal)}</td>
                          <td>
                            <span className={`finance-chip ${item.type === 'p1' ? 'chip-p1' : 'chip-ops'}`}>
                              {item.kategori}
                            </span>
                          </td>
                          <td>
                            <div className="finance-title-bold">{item.title}</div>
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
                          <td className="num-tabular finance-total-cell text-danger">
                            {formatRupiah(item.jumlah)}
                          </td>
                          <td>
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
                          <td>
                            <div className="finance-row-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon-sm"
                                onClick={() => openEditItem(item)}
                                aria-label="Edit"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon-sm finance-btn-delete"
                                onClick={() => {
                                  if (item.type === 'p1') setConfirmDelPurchase(item.raw);
                                  else setConfirmDelExpense(item.raw);
                                }}
                                aria-label="Hapus"
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
              <div className="finance-toolbar">
                <div className="finance-toolbar-left">
                  <div className="finance-toolbar-title">
                    <span className="material-symbols-outlined" aria-hidden="true">account_balance</span>
                    <span>Daftar Menerima (Pemasukan)</span>
                  </div>

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
                </div>

                <button type="button" className="btn btn-primary btn-sm" onClick={openNewOtherIncome}>
                  <span className="material-symbols-outlined" aria-hidden="true">add</span> Catat Pemasukan Lain
                </button>
              </div>

              {mergedIncoming.length === 0 ? (
                <div className="finance-empty">
                  <span className="material-symbols-outlined finance-empty-icon" aria-hidden="true">receipt_long</span>
                  <p>Belum ada catatan pemasukan.</p>
                  <span className="finance-sub-text">Nota P3 yang dibuat aplikasi dan pemasukan manual akan tercatat di sini.</span>
                </div>
              ) : (
                <div className="finance-table-wrap">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Sumber / No. Nota</th>
                        <th>Pelanggan / Keterangan</th>
                        <th>Rincian Produk / Detail</th>
                        <th>Metode / Format</th>
                        <th>Total Menerima</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mergedIncoming.map(item => (
                        <tr key={`${item.type}_${item.id}`}>
                          <td className="finance-date-cell">{formatDateId(item.tanggal)}</td>
                          <td className="num-tabular finance-title-bold">{item.refNo}</td>
                          <td>{item.title}</td>
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
                          <td className="num-tabular finance-total-cell text-success">
                            {formatRupiah(item.jumlah || 0)}
                          </td>
                          <td>
                            {item.type === 'other' ? (
                              <div className="finance-row-actions">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon-sm"
                                  onClick={() => openEditOtherIncome(item)}
                                  aria-label="Edit"
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-icon-sm finance-btn-delete"
                                  onClick={() => setConfirmDelIncome(item.raw)}
                                  aria-label="Hapus"
                                >
                                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                                </button>
                              </div>
                            ) : (
                              <span className="finance-no-nota">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ 5. TAB CONTENT: LAPORAN KEUANGAN ═════════════════════════════ */}
      {activeTab === 'laporan' && (
        <div className="finance-panel">
          <div className="finance-toolbar finance-toolbar-wrap">
            <div className="finance-toolbar-title">
              <span className="material-symbols-outlined" aria-hidden="true">insights</span>
              <span>Laporan & Analisis Keuangan</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <div className="finance-report-filter">
                <CustomDatePicker value={reportFrom} onChange={setReportFrom} placeholder="Dari Tanggal" />
                <span className="finance-filter-sep">–</span>
                <CustomDatePicker value={reportTo} onChange={setReportTo} placeholder="Sampai Tanggal" />
                {(reportFrom || reportTo) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setReportFrom(''); setReportTo(''); }}
                    aria-label="Reset filter"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleExportExcel}
                title="Download file Excel / CSV"
              >
                <span className="material-symbols-outlined" aria-hidden="true">download</span> Export Excel (.csv)
              </button>
            </div>
          </div>

          <div className="finance-summary-grid">
            <div className="finance-summary-card finance-card-income">
              <div className="finance-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">call_received</span>
              </div>
              <div className="finance-card-body">
                <div className="finance-card-label">Total Menerima (Pemasukan)</div>
                <div className="finance-card-value num-tabular">{formatRupiah(summary.totalPemasukan)}</div>
                <div className="finance-card-sub">{summary.countNota} Nota P3 + {summary.countOtherIncome} Pemasukan Lain</div>
              </div>
            </div>

            <div className="finance-summary-card finance-card-purchase">
              <div className="finance-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">shopping_cart</span>
              </div>
              <div className="finance-card-body">
                <div className="finance-card-label">Membayar P1 (Pembelian Cetak)</div>
                <div className="finance-card-value num-tabular">{formatRupiah(summary.totalPembelian)}</div>
                <div className="finance-card-sub">{summary.countPurchases} transaksi ke P1</div>
              </div>
            </div>

            <div className="finance-summary-card finance-card-expense">
              <div className="finance-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
              </div>
              <div className="finance-card-body">
                <div className="finance-card-label">Membayar Operasional</div>
                <div className="finance-card-value num-tabular">{formatRupiah(summary.totalPengeluaranLain)}</div>
                <div className="finance-card-sub">{summary.countExpenses} item pengeluaran</div>
              </div>
            </div>

            <div className="finance-summary-card finance-card-total-out">
              <div className="finance-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">call_made</span>
              </div>
              <div className="finance-card-body">
                <div className="finance-card-label">Total Membayar (Pengeluaran)</div>
                <div className="finance-card-value num-tabular">{formatRupiah(summary.totalPengeluaran)}</div>
                <div className="finance-card-sub">P1 + Operasional</div>
              </div>
            </div>

            <div className={`finance-summary-card finance-card-profit ${summary.labaBersih >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              <div className="finance-card-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {summary.labaBersih >= 0 ? 'emoji_events' : 'warning'}
                </span>
              </div>
              <div className="finance-card-body">
                <div className="finance-card-label">Laba / Rugi Bersih</div>
                <div className="finance-card-value finance-card-value-lg num-tabular">{formatRupiah(summary.labaBersih)}</div>
                <div className="finance-card-sub">Total Menerima − Total Membayar</div>
              </div>
            </div>
          </div>

          <div className="finance-formula-box">
            <div className="finance-formula-title">
              <span className="material-symbols-outlined" aria-hidden="true">calculate</span>
              Rincian Perhitungan Laba Keuangan
            </div>
            <div className="finance-formula-row">
              <span>💰 Total Penjualan Nota P3</span>
              <span className="num-tabular text-success">{formatRupiah(summary.totalNotaSales)}</span>
            </div>
            <div className="finance-formula-row">
              <span>➕ Pemasukan Lain (Non-Nota)</span>
              <span className="num-tabular text-success">+{formatRupiah(summary.totalOtherIncome)}</span>
            </div>
            <div className="finance-formula-row finance-formula-minus">
              <span>📦 Pembelian Cetak ke P1</span>
              <span className="num-tabular text-danger">− {formatRupiah(summary.totalPembelian)}</span>
            </div>
            <div className="finance-formula-row finance-formula-minus">
              <span>💸 Pengeluaran Operasional & Lainnya</span>
              <span className="num-tabular text-danger">− {formatRupiah(summary.totalPengeluaranLain)}</span>
            </div>
            <div className="finance-formula-divider" />
            <div className={`finance-formula-row finance-formula-result ${summary.labaBersih >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              <span>🏆 Laba Bersih</span>
              <span className="num-tabular">{formatRupiah(summary.labaBersih)}</span>
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
      {previewReceipt && (
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
              {previewReceipt.file.driveUrl ? (
                previewReceipt.file.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewReceipt.file.driveUrl}
                    className="receipt-iframe-preview"
                    title="Pratinjau PDF Nota"
                  />
                ) : (
                  <img
                    src={previewReceipt.file.driveUrl}
                    alt="Nota Vendor P1"
                    className="receipt-img-preview"
                  />
                )
              ) : previewReceipt.file.dataBase64 ? (
                previewReceipt.file.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewReceipt.file.dataBase64}
                    className="receipt-iframe-preview"
                    title="Pratinjau PDF Nota"
                  />
                ) : (
                  <img
                    src={previewReceipt.file.dataBase64}
                    alt="Nota Vendor P1"
                    className="receipt-img-preview"
                  />
                )
              ) : (
                <div className="receipt-no-preview-box">
                  <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
                  <p><strong>{previewReceipt.file.fileName || 'Berkas Nota'}</strong></p>
                  <p className="text-muted">Pratinjau visual terbatas, klik tombol unduh di bawah untuk melihat file.</p>
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownloadReceipt(previewReceipt)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">download</span> Unduh Berkas Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
