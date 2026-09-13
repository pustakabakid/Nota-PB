import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  fetchStoreProfileApi,
  saveStoreProfileApi,
  fetchCatalogApi,
  saveCatalogPresetApi,
  deleteCatalogPresetApi,
  fetchHistoryApi,
  saveTransactionApi,
  fetchAccountsApi,
  saveAccountApi,
  deleteAccountApi,
  fetchFinancesApi,
  savePurchaseApi,
  deletePurchaseApi,
  saveExpenseApi,
  deleteExpenseApi,
  saveOtherIncomeApi,
  deleteOtherIncomeApi
} from '../services/api';
import { isSupabaseConnected } from '../services/api';
import { generateReceiptNumber, calculateItemTotal, getLocalDateString, getStoredHistory, getStoredPurchases, saveStoredPurchases, getStoredExpenses, saveStoredExpenses, getStoredOtherIncome, saveStoredOtherIncome } from '../services/storage';
import { TransactionContext } from './transactionContextInstance';
import { useAuth } from '../hooks/useAuth';

export function TransactionProvider({
  children,
  onShowToast,
  setConfirmModal,
  closeConfirmModal
}) {
  const { accounts = [], setAccounts, currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('editor'); // 'editor' | 'dashboard'
  const [activeMobileTab, setActiveMobileTab] = useState('order'); // 'order' | 'preview'
  const [pendingAutoPrint, setPendingAutoPrint] = useState(false);

  const [storeProfile, setStoreProfile] = useState({
    name: 'NAMA TOKO PERCETAKAN',
    subtitle: '',
    address: '',
    phone: '',
    footerMsg: 'Terima kasih atas kunjungan Anda.'
  });
  const [catalog, setCatalog] = useState([]);
  const [history, setHistory] = useState([]);
  const [isCloudConnected, setIsCloudConnected] = useState(isSupabaseConnected);
  const [selectedPaper, setSelectedPaper] = useState('80mm');
  const [isCurrentNotaSaved, setIsCurrentNotaSaved] = useState(false);

  // Finance state (offline-first localStorage)
  const [purchases, setPurchases] = useState(() => getStoredPurchases());
  const [expenses, setExpenses] = useState(() => getStoredExpenses());
  const [otherIncome, setOtherIncome] = useState(() => getStoredOtherIncome());

  // Transaction Form State
  const [transaction, setTransaction] = useState(() => ({
    noNota: generateReceiptNumber(getStoredHistory()),
    custName: '',
    custPhone: '',
    custAddress: '',
    date: getLocalDateString(),
    orderStatus: 'Proses Cetak',
    payStatus: 'Lunas',
    payMethod: 'Transfer',
    bankName: '',
    pickupMethod: 'Ditunggu',
    discount: 0,
    dp: 0,
    catatan: ''
  }));

  const [items, setItems] = useState([]);

  // Load Initial Data from API (Cloud DB or Local Fallback)
  const loadAllData = useCallback(async () => {
    setIsCloudConnected(isSupabaseConnected());
    const profile = await fetchStoreProfileApi();
    if (profile) {
      setStoreProfile(profile);
      if (profile.defaultPaper) {
        setSelectedPaper(profile.defaultPaper);
      }
    }

    const cat = await fetchCatalogApi();
    if (cat) setCatalog(cat);

    const accs = await fetchAccountsApi();
    if (accs && setAccounts) setAccounts(accs);

    const hist = await fetchHistoryApi();
    if (hist) {
      setHistory(hist);
      setTransaction(prev => {
        if (!prev.id && !prev.custName) {
          return { ...prev, noNota: generateReceiptNumber(hist) };
        }
        return prev;
      });
    }

    try {
      const fin = await fetchFinancesApi();
      if (fin) {
        if (Array.isArray(fin.purchases)) setPurchases(fin.purchases);
        if (Array.isArray(fin.expenses)) setExpenses(fin.expenses);
        if (Array.isArray(fin.otherIncome)) setOtherIncome(fin.otherIncome);
      }
    } catch (err) {
      console.warn('Finance data load failed:', err);
    }
  }, [setAccounts]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Store profile update
  const handleSaveStoreProfile = useCallback(async (newProfile) => {
    setStoreProfile(newProfile);
    if (newProfile?.defaultPaper) {
      setSelectedPaper(newProfile.defaultPaper);
    }
    await saveStoreProfileApi(newProfile);
    if (onShowToast) onShowToast('Profil toko berhasil diperbarui!', 'success');
  }, [onShowToast]);

  // Catalog preset save (create / update)
  const handleSavePreset = useCallback(async (presetData) => {
    const updated = await saveCatalogPresetApi(presetData, catalog);
    setCatalog(updated);
  }, [catalog]);

  const handleDeletePreset = useCallback((id) => {
    const presetToDelete = catalog.find(c => c.id === id);
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Preset Katalog',
      message: `Hapus preset "${presetToDelete ? presetToDelete.name : 'ini'}" dari katalog?`,
      variant: 'danger',
      onConfirm: async () => {
        const updated = await deleteCatalogPresetApi(id, catalog);
        setCatalog(updated);
        closeConfirmModal();
        if (onShowToast) onShowToast('Preset katalog berhasil dihapus.', 'info');
      }
    });
  }, [catalog, closeConfirmModal, onShowToast, setConfirmModal]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  }, [items]);

  const effectiveDiscount = Math.min(Math.max(0, transaction.discount || 0), subtotal);
  const grandTotal = Math.max(0, subtotal - effectiveDiscount);
  const dpAmount = transaction.payStatus === 'DP'
    ? Math.min(Math.max(0, transaction.dp || 0), grandTotal)
    : (transaction.payStatus === 'Lunas' ? grandTotal : 0);
  const sisa = transaction.payStatus === 'Lunas' ? 0 : Math.max(0, grandTotal - dpAmount);

  // Transaction field changes
  const handleChangeTransaction = useCallback((field, value) => {
    setIsCurrentNotaSaved(false);
    if (field === 'discount') {
      const numVal = Math.max(0, parseFloat(value) || 0);
      if (numVal > subtotal && subtotal > 0) {
        if (onShowToast) onShowToast('Potongan diskon tidak boleh melebihi total subtotal pesanan!', 'warning');
        setTransaction(prev => ({ ...prev, discount: subtotal }));
        return;
      }
      setTransaction(prev => ({ ...prev, discount: numVal }));
      return;
    }
    setTransaction(prev => ({ ...prev, [field]: value }));
  }, [onShowToast, subtotal]);

  // Items changes
  const handleAddItem = useCallback(() => {
    setIsCurrentNotaSaved(false);
    setItems(prev => [
      ...prev,
      {
        id: 'item-' + Date.now(),
        presetId: '',
        name: '',
        type: 'pcs',
        length: 0,
        width: 0,
        qty: 1,
        price: 0,
        finishing: '',
        customDetails: []
      }
    ]);
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setIsCurrentNotaSaved(false);
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateItem = useCallback((index, updatedFields) => {
    setIsCurrentNotaSaved(false);
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updatedFields } : item));
  }, []);

  // Save Transaction to History
  const handleSaveTransaction = useCallback(async () => {
    if (!items || items.length === 0) {
      if (onShowToast) onShowToast('Tambahkan minimal 1 item pesanan sebelum menyimpan nota.', 'warning');
      return;
    }

    const finalCustName = transaction.custName.trim() || 'Pelanggan Umum';
    const trxId = transaction.id || `trx-${Date.now()}`;

    const newRecord = {
      id: trxId,
      noNota: transaction.noNota,
      date: transaction.date,
      custName: finalCustName,
      custPhone: transaction.custPhone.trim(),
      custAddress: transaction.custAddress ? transaction.custAddress.trim() : '',
      payMethod: transaction.payMethod || 'Transfer',
      bankName: transaction.bankName || '',
      pickupMethod: transaction.pickupMethod || 'Ditunggu',
      orderStatus: transaction.orderStatus,
      payStatus: transaction.payStatus,
      items: items,
      subtotal,
      discount: effectiveDiscount,
      grandTotal,
      dp: dpAmount,
      sisa,
      catatan: transaction.catatan.trim()
    };

    try {
      const updatedHistory = await saveTransactionApi(newRecord, history);
      setHistory(updatedHistory);
      setIsCurrentNotaSaved(true);
      if (onShowToast) onShowToast(`Nota ${transaction.noNota} berhasil tersimpan & siap dicetak!`, 'success');
    } catch (syncErr) {
      setIsCurrentNotaSaved(true);
      if (onShowToast) onShowToast(syncErr.message, 'warning');
    }

    setTransaction(prev => ({
      ...prev,
      id: trxId,
      custName: finalCustName
    }));

    setActiveMobileTab('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dpAmount, effectiveDiscount, grandTotal, history, items, onShowToast, sisa, subtotal, transaction]);

  const handleResetForm = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Form Nota',
      message: 'Apakah Anda yakin ingin mengosongkan semua isian form nota saat ini?',
      variant: 'danger',
      onConfirm: () => {
        setTransaction({
          id: null,
          noNota: generateReceiptNumber(history),
          custName: '',
          custPhone: '',
          custAddress: '',
          date: getLocalDateString(),
          orderStatus: 'Proses Cetak',
          payStatus: 'Lunas',
          payMethod: 'Transfer',
          bankName: '',
          pickupMethod: 'Ditunggu',
          discount: 0,
          dp: 0,
          catatan: ''
        });
        setItems([]);
        setIsCurrentNotaSaved(false);
        if (storeProfile?.defaultPaper) {
          setSelectedPaper(storeProfile.defaultPaper);
        }
        closeConfirmModal();
        if (onShowToast) onShowToast('Isian form nota telah di-reset.', 'info');
      }
    });
  }, [closeConfirmModal, history, onShowToast, setConfirmModal, storeProfile?.defaultPaper]);

  const handleLoadTransaction = useCallback((rec, autoPrint = false) => {
    setTransaction({
      id: rec.id,
      noNota: rec.noNota,
      custName: rec.custName,
      custPhone: rec.custPhone || '',
      custAddress: rec.custAddress || '',
      payMethod: rec.payMethod || 'Transfer',
      bankName: rec.bankName || '',
      pickupMethod: rec.pickupMethod || 'Ditunggu',
      date: rec.date,
      orderStatus: rec.orderStatus,
      payStatus: rec.payStatus,
      discount: rec.discount || 0,
      dp: rec.dp || 0,
      catatan: rec.catatan || ''
    });
    setItems(rec.items || []);
    setIsCurrentNotaSaved(true);
    setCurrentPage('editor');
    setActiveMobileTab(autoPrint ? 'preview' : 'order');
    if (autoPrint) {
      setPendingAutoPrint(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDeleteHistory = useCallback((index) => {
    const itemToDelete = history[index];
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Riwayat Transaksi',
      message: `Apakah Anda yakin ingin menghapus nota ${itemToDelete ? itemToDelete.noNota : ''} dari riwayat?`,
      variant: 'danger',
      onConfirm: async () => {
        if (itemToDelete && itemToDelete.id) {
          const updated = await deleteTransactionApi(itemToDelete.id, history);
          setHistory(updated);
        } else {
          const updated = history.filter((_, i) => i !== index);
          setHistory(updated);
        }
        closeConfirmModal();
        if (onShowToast) onShowToast('Transaksi berhasil dihapus dari riwayat.', 'info');
      }
    });
  }, [closeConfirmModal, history, onShowToast, setConfirmModal]);

  const handleExportDataJSON = useCallback(() => {
    const exportData = {
      app: "Web Nota Percetakan (React)",
      version: "2.0",
      exportDate: new Date().toISOString(),
      storeProfile,
      catalogPresets: catalog,
      historyTransactions: history
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_nota_percetakan_react_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (onShowToast) onShowToast('Data backup JSON berhasil diunduh!', 'success');
  }, [catalog, history, onShowToast, storeProfile]);

  // Account Management Handlers
  const handleSaveAccount = useCallback(async (accData) => {
    try {
      const updated = await saveAccountApi(accData);
      if (setAccounts) setAccounts(updated);
      if (onShowToast) onShowToast(`Akun "${accData.username}" berhasil disimpan ke database Cloud!`, 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Gagal menyimpan akun ke database.', 'danger');
    }
  }, [onShowToast, setAccounts]);

  const handleDeleteAccount = useCallback((id) => {
    const target = accounts.find(a => a.id === id);
    if (!target) return;

    if (currentUser && target.id === currentUser.id) {
      if (onShowToast) onShowToast('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!', 'danger');
      return;
    }

    if (target.role === 'superadmin') {
      const superCount = accounts.filter(a => a.role === 'superadmin').length;
      if (superCount <= 1) {
        if (onShowToast) onShowToast('Akun Superadmin utama terakhir tidak dapat dihapus!', 'danger');
        return;
      }
    }

    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus akun "${target.username}" secara permanen?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const updated = await deleteAccountApi(id, accounts);
          if (setAccounts) setAccounts(updated);
          closeConfirmModal();
          if (onShowToast) onShowToast(`Akun "${target.username}" berhasil dihapus.`, 'info');
        } catch (err) {
          if (onShowToast) onShowToast(err.message || 'Gagal menghapus akun.', 'danger');
        }
      }
    });
  }, [accounts, closeConfirmModal, currentUser, onShowToast, setAccounts, setConfirmModal]);

  const handleSavePurchase = useCallback(async (purchase) => {
    setPurchases(prev => {
      const all = prev.filter(p => p.id !== purchase.id);
      const existing = prev.find(p => p.id === purchase.id);
      const next = existing ? [purchase, ...all] : [purchase, ...prev];
      saveStoredPurchases(next);
      return next;
    });

    try {
      await savePurchaseApi(purchase);
    } catch (err) {
      console.warn('Sync purchase to Google Sheets warning:', err);
      if (onShowToast) onShowToast('Catatan disimpan lokal. Sinkronisasi cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const handleDeletePurchase = useCallback(async (id) => {
    setPurchases(prev => {
      const next = prev.filter(p => p.id !== id);
      saveStoredPurchases(next);
      return next;
    });

    try {
      await deletePurchaseApi(id);
    } catch (err) {
      console.warn('Delete purchase from Google Sheets warning:', err);
      if (onShowToast) onShowToast('Penghapusan cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const handleSaveExpense = useCallback(async (expense) => {
    setExpenses(prev => {
      const all = prev.filter(e => e.id !== expense.id);
      const existing = prev.find(e => e.id === expense.id);
      const next = existing ? [expense, ...all] : [expense, ...prev];
      saveStoredExpenses(next);
      return next;
    });

    try {
      await saveExpenseApi(expense);
    } catch (err) {
      console.warn('Sync expense to Google Sheets warning:', err);
      if (onShowToast) onShowToast('Pengeluaran disimpan lokal. Sinkronisasi cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const handleDeleteExpense = useCallback(async (id) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      saveStoredExpenses(next);
      return next;
    });

    try {
      await deleteExpenseApi(id);
    } catch (err) {
      console.warn('Delete expense from Google Sheets warning:', err);
      if (onShowToast) onShowToast('Penghapusan cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const handleSaveOtherIncome = useCallback(async (inc) => {
    setOtherIncome(prev => {
      const all = (prev || []).filter(i => i.id !== inc.id);
      const existing = (prev || []).find(i => i.id === inc.id);
      const next = existing ? [inc, ...all] : [inc, ...(prev || [])];
      saveStoredOtherIncome(next);
      return next;
    });

    try {
      await saveOtherIncomeApi(inc);
    } catch (err) {
      console.warn('Sync other income to Google Sheets warning:', err);
      if (onShowToast) onShowToast('Pemasukan disimpan lokal. Sinkronisasi cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const handleDeleteOtherIncome = useCallback(async (id) => {
    setOtherIncome(prev => {
      const next = (prev || []).filter(i => i.id !== id);
      saveStoredOtherIncome(next);
      return next;
    });

    try {
      await deleteOtherIncomeApi(id);
    } catch (err) {
      console.warn('Delete other income from Google Sheets warning:', err);
      if (onShowToast) onShowToast('Penghapusan cloud tertunda: ' + err.message, 'warning');
    }
  }, [onShowToast]);

  const value = {
    currentPage,
    setCurrentPage,
    activeMobileTab,
    setActiveMobileTab,
    pendingAutoPrint,
    setPendingAutoPrint,
    storeProfile,
    setStoreProfile,
    catalog,
    setCatalog,
    history,
    setHistory,
    isCloudConnected,
    selectedPaper,
    setSelectedPaper,
    isCurrentNotaSaved,
    setIsCurrentNotaSaved,
    transaction,
    setTransaction,
    items,
    setItems,
    subtotal,
    effectiveDiscount,
    grandTotal,
    dpAmount,
    sisa,
    handleChangeTransaction,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem,
    handleSaveTransaction,
    handleResetForm,
    handleLoadTransaction,
    handleDeleteHistory,
    handleSaveStoreProfile,
    handleSavePreset,
    handleDeletePreset,
    handleSaveAccount,
    handleDeleteAccount,
    handleExportDataJSON,
    loadAllData,
    purchases,
    expenses,
    handleSavePurchase,
    handleDeletePurchase,
    handleSaveExpense,
    handleDeleteExpense,
    otherIncome,
    handleSaveOtherIncome,
    handleDeleteOtherIncome
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}
