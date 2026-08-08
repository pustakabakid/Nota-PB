import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CustomerForm from './components/CustomerForm';
import ItemCalculator from './components/ItemCalculator';
import NotaPreview from './components/NotaPreview';
import DashboardPage from './components/DashboardPage';
import PublicNotaView from './components/PublicNotaView';
import LoginModal from './components/LoginModal';
import {
  fetchStoreProfileApi,
  saveStoreProfileApi,
  fetchCatalogApi,
  saveCatalogPresetApi,
  deleteCatalogPresetApi,
  fetchHistoryApi,
  saveTransactionApi,
  deleteTransactionApi
} from './services/api';
import { isSupabaseConnected } from './services/supabaseClient';
import { generateReceiptNumber, calculateItemTotal, getStoredAccounts, saveStoredAccounts } from './services/storage';

import Toast from './components/ui/Toast';
import ConfirmModal from './components/ui/ConfirmModal';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('nota_percetakan_theme') || 'light');
  const [currentPage, setCurrentPage] = useState('editor'); // 'editor' | 'dashboard'
  const [publicNotaNo, setPublicNotaNo] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('nota') || null;
  });
  const [publicRecord, setPublicRecord] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Clear old localStorage keys to enforce tab-based session
    localStorage.removeItem('nota_kasir_authenticated');
    localStorage.removeItem('nota_kasir_user');
    return sessionStorage.getItem('nota_kasir_authenticated') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('nota_kasir_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accounts, setAccounts] = useState(getStoredAccounts);
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

  // Custom Toast System
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };
  const handleDismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Custom Confirm Modal System
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    variant: 'primary',
    onConfirm: null
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Transaction Form State
  const [transaction, setTransaction] = useState(() => ({
    noNota: generateReceiptNumber(),
    custName: '',
    custPhone: '',
    custAddress: '',
    date: new Date().toISOString().split('T')[0],
    orderStatus: 'Proses Cetak',
    payStatus: 'Lunas',
    payMethod: 'Transfer',
    bankName: '',
    pickupMethod: 'Ditunggu',
    discount: 0,
    dp: 0,
    catatan: ''
  }));

  const [items, setItems] = useState([
    {
      id: 'item-1',
      presetId: '',
      name: '',
      type: 'm2',
      length: 100,
      width: 100,
      qty: 1,
      price: 0,
      finishing: '',
      customDetails: []
    }
  ]);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nota_percetakan_theme', theme);
  }, [theme]);

  // Theme switcher
  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    showToast(`Mode tampilan diubah ke ${theme === 'light' ? 'Gelap (Dark)' : 'Terang (Light)'}`, 'info');
  };

  // Load Initial Data from API (Cloud DB or Local Fallback)
  const loadAllData = async () => {
    setIsCloudConnected(isSupabaseConnected());
    const profile = await fetchStoreProfileApi();
    if (profile) setStoreProfile(profile);

    const cat = await fetchCatalogApi();
    if (cat) setCatalog(cat);

    const hist = await fetchHistoryApi();
    if (hist) {
      setHistory(hist);
      if (publicNotaNo) {
        const found = hist.find(h => String(h.noNota) === String(publicNotaNo));
        if (found) setPublicRecord(found);
      }
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Store profile update
  const handleSaveStoreProfile = async (newProfile) => {
    setStoreProfile(newProfile);
    await saveStoreProfileApi(newProfile);
    showToast('Profil toko berhasil diperbarui!', 'success');
  };

  // Catalog preset save (create / update)
  const handleSavePreset = async (presetData) => {
    const updated = await saveCatalogPresetApi(presetData, catalog);
    setCatalog(updated);
  };

  const handleDeletePreset = (id) => {
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
        showToast('Preset katalog berhasil dihapus.', 'info');
      }
    });
  };

  // Transaction field changes
  const handleChangeTransaction = (field, value) => {
    setIsCurrentNotaSaved(false);
    setTransaction(prev => ({ ...prev, [field]: value }));
  };

  // Items changes
  const handleAddItem = () => {
    setIsCurrentNotaSaved(false);
    setItems(prev => [
      ...prev,
      {
        id: 'item-' + Date.now(),
        presetId: '',
        name: '',
        type: 'm2',
        length: 100,
        width: 100,
        qty: 1,
        price: 20000,
        finishing: '',
        customDetails: []
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      showToast('Minimal harus ada 1 item pesanan pada nota.', 'warning');
      return;
    }
    setIsCurrentNotaSaved(false);
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, updatedFields) => {
    setIsCurrentNotaSaved(false);
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updatedFields } : item));
  };

  // Calculation totals
  const subtotal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  const grandTotal = Math.max(0, subtotal - transaction.discount);
  const dpAmount = transaction.payStatus === 'DP' ? transaction.dp : (transaction.payStatus === 'Lunas' ? grandTotal : 0);
  const sisa = transaction.payStatus === 'Lunas' ? 0 : Math.max(0, grandTotal - dpAmount);

  // Save Transaction to History
  const handleSaveTransaction = async () => {
    const finalCustName = transaction.custName.trim() || 'Pelanggan Umum';

    const newRecord = {
      id: `trx-${Date.now()}`,
      noNota: transaction.noNota,
      date: transaction.date,
      custName: finalCustName,
      custPhone: transaction.custPhone.trim(),
      orderStatus: transaction.orderStatus,
      payStatus: transaction.payStatus,
      items: items,
      subtotal,
      discount: transaction.discount,
      grandTotal,
      dp: dpAmount,
      sisa,
      catatan: transaction.catatan.trim()
    };

    const updatedHistory = await saveTransactionApi(newRecord, history);
    setHistory(updatedHistory);
    setIsCurrentNotaSaved(true);

    if (transaction.custName.trim() === '') {
      setTransaction(prev => ({ ...prev, custName: 'Pelanggan Umum' }));
    }

    showToast(`Nota ${transaction.noNota} berhasil diterbitkan & tersimpan di Cloud!`, 'success');
  };

  const handleResetForm = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Form Nota',
      message: 'Apakah Anda yakin ingin mengosongkan semua isian form nota saat ini?',
      variant: 'danger',
      onConfirm: () => {
        setTransaction({
          noNota: generateReceiptNumber(),
          custName: '',
          custPhone: '',
          custAddress: '',
          date: new Date().toISOString().split('T')[0],
          orderStatus: 'Proses Cetak',
          payStatus: 'Lunas',
          payMethod: 'Transfer',
          bankName: '',
          pickupMethod: 'Ditunggu',
          discount: 0,
          dp: 0,
          catatan: ''
        });
        setItems([
          {
            id: 'item-1',
            presetId: '',
            name: '',
            type: 'm2',
            length: 100,
            width: 100,
            qty: 1,
            price: 20000,
            finishing: '',
            customDetails: []
          }
        ]);
        setIsCurrentNotaSaved(false);
        closeConfirmModal();
        showToast('Isian form nota telah di-reset.', 'info');
      }
    });
  };

  const handleLoadTransaction = (rec) => {
    setTransaction({
      noNota: rec.noNota,
      custName: rec.custName,
      custPhone: rec.custPhone || '',
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Nota ${rec.noNota} berhasil dimuat ke Halaman Cetak Nota!`, 'info');
  };

  const handleDeleteHistory = (index) => {
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
        showToast('Transaksi berhasil dihapus dari riwayat.', 'info');
      }
    });
  };

  const handleExportDataJSON = () => {
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
    showToast('Data backup JSON berhasil diunduh!', 'success');
  };

  // Authentication Handlers
  const handleLoginSuccess = (userAcc) => {
    sessionStorage.setItem('nota_kasir_authenticated', 'true');
    sessionStorage.setItem('nota_kasir_user', JSON.stringify(userAcc));
    setIsAuthenticated(true);
    setCurrentUser(userAcc);
    showToast(`Berhasil masuk sebagai ${userAcc.role === 'superadmin' ? 'Superadmin' : 'Admin Kasir'} (${userAcc.username})!`, 'success');
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Keluar Sesi Kasir',
      message: 'Keluar dari sesi kasir? Anda harus memasukkan password kembali untuk mengakses aplikasi.',
      variant: 'danger',
      onConfirm: () => {
        sessionStorage.removeItem('nota_kasir_authenticated');
        sessionStorage.removeItem('nota_kasir_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentPage('editor');
        closeConfirmModal();
        showToast('Sesi kasir telah dikunci.', 'info');
      }
    });
  };

  // Account Management Handlers
  const handleSaveAccount = (accData) => {
    const exists = accounts.some(a => a.id === accData.id);
    const updated = exists
      ? accounts.map(a => a.id === accData.id ? accData : a)
      : [...accounts, accData];
    setAccounts(updated);
    saveStoredAccounts(updated);
    showToast(`Akun "${accData.username}" berhasil disimpan!`, 'success');
  };

  const handleDeleteAccount = (id) => {
    const target = accounts.find(a => a.id === id);
    if (!target) return;
    if (target.username === 'pustakabakid') {
      showToast('Akun Superadmin utama tidak dapat dihapus!', 'danger');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Akun',
      message: `Hapus akun "${target.username}" dari sistem?`,
      variant: 'danger',
      onConfirm: () => {
        const updated = accounts.filter(a => a.id !== id);
        setAccounts(updated);
        saveStoredAccounts(updated);
        closeConfirmModal();
        showToast(`Akun "${target.username}" telah dihapus.`, 'info');
      }
    });
  };

  if (publicNotaNo) {
    return (
      <div>
        <Toast toasts={toasts} onDismiss={handleDismissToast} />
        <PublicNotaView
          storeProfile={storeProfile}
          record={publicRecord}
          onBackToApp={() => {
            window.history.pushState({}, '', window.location.pathname);
            setPublicNotaNo(null);
            setPublicRecord(null);
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <Toast toasts={toasts} onDismiss={handleDismissToast} />
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const isSuperAdmin = !currentUser || currentUser.role === 'superadmin';
  const activePage = isSuperAdmin ? currentPage : 'editor';

  return (
    <div>
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />

      <Header
        storeProfile={storeProfile}
        currentPage={activePage}
        onNavigate={setCurrentPage}
        isCloudConnected={isCloudConnected}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {activePage === 'editor' ? (
        <main className="app-container">
          <section className="form-container">
            <CustomerForm
              transaction={transaction}
              onChange={handleChangeTransaction}
            />

            <ItemCalculator
              items={items}
              catalog={catalog}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onUpdateItem={handleUpdateItem}
              discount={transaction.discount}
              paymentStatus={transaction.payStatus}
              dp={transaction.dp}
              catatan={transaction.catatan}
              onChangeTransaction={handleChangeTransaction}
              subtotal={subtotal}
              grandTotal={grandTotal}
              sisa={sisa}
              isSaved={isCurrentNotaSaved}
              onSaveTransaction={handleSaveTransaction}
              onResetForm={handleResetForm}
            />
          </section>

          <NotaPreview
            storeProfile={storeProfile}
            transaction={transaction}
            items={items}
            selectedPaper={selectedPaper}
            onSelectPaper={setSelectedPaper}
            subtotal={subtotal}
            grandTotal={grandTotal}
            sisa={sisa}
            isSaved={isCurrentNotaSaved}
            onSaveTransaction={handleSaveTransaction}
            onResetForm={handleResetForm}
            onShowToast={showToast}
          />
        </main>
      ) : (
        <DashboardPage
          storeProfile={storeProfile}
          onSaveStoreProfile={handleSaveStoreProfile}
          catalog={catalog}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
          history={history}
          onLoadTransaction={handleLoadTransaction}
          onDeleteTransaction={handleDeleteHistory}
          onExportDataJSON={handleExportDataJSON}
          onReloadData={loadAllData}
          onShowToast={showToast}
          onNavigate={setCurrentPage}
          accounts={accounts}
          onSaveAccount={handleSaveAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </div>
  );
}
