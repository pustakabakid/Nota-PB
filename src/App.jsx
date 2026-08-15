import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CustomerForm from './components/CustomerForm';
import ItemCalculator from './components/ItemCalculator';
import NotaPreview from './components/NotaPreview';
import DashboardPage from './components/DashboardPage';
import PublicNotaView from './components/PublicNotaView';
import LoginModal from './components/LoginModal';
import MobileBottomBar from './components/ui/MobileBottomBar';
import Toast from './components/ui/Toast';
import ConfirmModal from './components/ui/ConfirmModal';
import { useBreakpoint } from './hooks/useBreakpoint';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { TransactionProvider } from './context/TransactionContext';
import { useTransaction } from './hooks/useTransaction';
import { fetchTransactionByNoNotaApi } from './services/api';

function AppContent({
  theme,
  onToggleTheme,
  toasts,
  onDismissToast,
  confirmModal,
  closeConfirmModal,
  showToast,
  publicNotaNo,
  setPublicNotaNo,
  publicRecord,
  setPublicRecord,
  isPublicLoading
}) {
  const { isMobile } = useBreakpoint();
  const { isAuthenticated, currentUser, accounts, handleLoginSuccess, handleLogout } = useAuth();
  const {
    storeProfile,
    catalog,
    history,
    isCloudConnected,
    selectedPaper,
    setSelectedPaper,
    isCurrentNotaSaved,
    transaction,
    items,
    subtotal,
    grandTotal,
    sisa,
    currentPage,
    setCurrentPage,
    activeMobileTab,
    setActiveMobileTab,
    pendingAutoPrint,
    setPendingAutoPrint,
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
    loadAllData
  } = useTransaction();

  // Trigger print safely once editor has mounted and rendered the loaded nota
  useEffect(() => {
    if (pendingAutoPrint && currentPage === 'editor') {
      const timer = setTimeout(() => {
        window.print();
        setPendingAutoPrint(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoPrint, currentPage, setPendingAutoPrint]);

  if (publicNotaNo) {
    return (
      <div>
        <Toast toasts={toasts} onDismiss={onDismissToast} />
        <PublicNotaView
          storeProfile={storeProfile}
          record={publicRecord}
          isLoading={isPublicLoading}
          onBackToApp={() => {
            window.history.pushState({}, '', window.location.pathname);
            setPublicNotaNo(null);
            setPublicRecord(null);
            setCurrentPage('editor');
          }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <Toast toasts={toasts} onDismiss={onDismissToast} />
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const isSuperAdmin = !currentUser || currentUser.role === 'superadmin';
  const activePage = isSuperAdmin ? currentPage : 'editor';

  return (
    <div className="app-shell">
      <Toast toasts={toasts} onDismiss={onDismissToast} />

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
        onToggleTheme={onToggleTheme}
        onLogout={handleLogout}
        currentUser={currentUser}
        activeMobileTab={activeMobileTab}
        onSwitchMobileTab={setActiveMobileTab}
      />

      {activePage === 'editor' ? (
        <>
          {/*
           * MAIN EDITOR WORKSPACE
           *
           * Mobile  : In-page tab switching (Order Kasir ↔ Preview Nota, NO overlay).
           *           - 'order' tab: Form POS (Items first, then Customer).
           *           - 'preview' tab: Full-width containerless Nota Preview.
           *
           * Desktop : Two-column grid — form left, preview right (side-by-side).
           */}
          <main className={`app-container${isMobile ? ' mobile-editor' : ''}`}>
            {/* ── FORM PANEL (Desktop OR Mobile 'order' tab) ── */}
            {(!isMobile || activeMobileTab === 'order') && (
              <section className="form-container">
                {isMobile ? (
                  /* MOBILE: Items first → then Customer (POS workflow priority) */
                  <>
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
                      isMobile={true}
                    />
                    <CustomerForm
                      transaction={transaction}
                      onChange={handleChangeTransaction}
                      isMobile={true}
                      onSwitchMobileTab={setActiveMobileTab}
                    />
                  </>
                ) : (
                  /* DESKTOP / TABLET: Customer first → then Items (original order) */
                  <>
                    <CustomerForm
                      transaction={transaction}
                      onChange={handleChangeTransaction}
                      isMobile={false}
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
                      isMobile={false}
                    />
                  </>
                )}
              </section>
            )}

            {/* ── PREVIEW WORKSPACE (Desktop side-by-side OR Mobile 'preview' tab) ── */}
            {(!isMobile || activeMobileTab === 'preview') && (
              <aside className="preview-workspace" aria-label="Preview Dokumen Nota">
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
                  onSwitchMobileTab={isMobile ? setActiveMobileTab : undefined}
                />
              </aside>
            )}
          </main>

          {/* ── MOBILE: Sticky Bottom Bar (Order tab only, no overlay) ── */}
          {isMobile && activeMobileTab === 'order' && (
            <MobileBottomBar
              itemCount={items.length}
              grandTotal={grandTotal}
              payStatus={transaction.payStatus}
              isSaved={isCurrentNotaSaved}
              onSaveTransaction={handleSaveTransaction}
              onAddItem={handleAddItem}
              onOpenPreview={() => setActiveMobileTab('preview')}
            />
          )}
        </>
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
          currentUser={currentUser}
          onSaveAccount={handleSaveAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('nota_percetakan_theme') || 'light');
  const [publicNotaNo, setPublicNotaNo] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('nota') || null;
  });
  const [publicRecord, setPublicRecord] = useState(null);
  const [isPublicLoading, setIsPublicLoading] = useState(Boolean(publicNotaNo));

  // Minimized Single-Toast System (clean, non-intrusive, auto-replaces older toast, 2.2s duration)
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts([{ id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2200);
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

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nota_percetakan_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Fetch Public Nota automatically when publicNotaNo is present in URL
  useEffect(() => {
    let isMounted = true;
    if (!publicNotaNo) {
      setIsPublicLoading(false);
      setPublicRecord(null);
      return;
    }

    const loadPublicNota = async () => {
      setIsPublicLoading(true);
      try {
        const record = await fetchTransactionByNoNotaApi(publicNotaNo);
        if (isMounted) {
          setPublicRecord(record);
        }
      } catch (err) {
        console.error('Failed to load public nota:', err);
        if (isMounted) {
          setPublicRecord(null);
        }
      } finally {
        if (isMounted) {
          setIsPublicLoading(false);
        }
      }
    };

    loadPublicNota();

    return () => {
      isMounted = false;
    };
  }, [publicNotaNo]);

  return (
    <AuthProvider onShowToast={showToast}>
      <TransactionProvider
        onShowToast={showToast}
        setConfirmModal={setConfirmModal}
        closeConfirmModal={closeConfirmModal}
      >
        <AppContent
          theme={theme}
          onToggleTheme={handleToggleTheme}
          toasts={toasts}
          onDismissToast={handleDismissToast}
          confirmModal={confirmModal}
          closeConfirmModal={closeConfirmModal}
          showToast={showToast}
          publicNotaNo={publicNotaNo}
          setPublicNotaNo={setPublicNotaNo}
          publicRecord={publicRecord}
          setPublicRecord={setPublicRecord}
          isPublicLoading={isPublicLoading}
        />
      </TransactionProvider>
    </AuthProvider>
  );
}
