/* ==========================================================================
   Google Sheets & Apps Script Repository Layer
   Offline-First Dexie.js + Fast Stale-While-Revalidate Cloud Synchronization
   ========================================================================== */

import {
  callAppsScriptApi,
  saveSessionToken,
  clearSessionToken,
  isAppsScriptConnected
} from './appsScriptClient';

import {
  loginDirect,
  fetchUsersDirect,
  fetchNotesDirect,
  fetchCatalogDirect,
  fetchStoreProfileDirect,
  deleteNoteDirect,
  uploadDriveFileDirect,
  saveUserDirect,
  deleteUserDirect
} from './googleSheetsDirectApi';

import {
  getStoredStoreProfile,
  saveStoredStoreProfile,
  getStoredCatalog,
  saveStoredCatalog,
  getStoredHistory,
  saveStoredHistory
} from './storage';

// --------------------------------------------------------------------------
// STORE PROFILE REPOSITORY
// --------------------------------------------------------------------------
export const fetchStoreProfileApi = async () => {
  const localProfile = getStoredStoreProfile();

  try {
    const cloudStore = await fetchStoreProfileDirect();
    if (cloudStore) {
      const profile = {
        ...localProfile,
        name: cloudStore.name || localProfile.name || 'PUSTAKA BAKID',
        subtitle: cloudStore.subtitle || '',
        address: cloudStore.address || '',
        phone: cloudStore.phone || '',
        footerMsg: cloudStore.footerMsg || 'Terima kasih. Cetakan tidak dapat dibatalkan.',
        logoUrl: cloudStore.logoUrl || '',
        qrisUrl: cloudStore.qrisUrl || ''
      };
      saveStoredStoreProfile(profile);
      return profile;
    }
  } catch (err) {
    console.warn('Direct store profile fetch failed, using fallback:', err);
  }

  if (isAppsScriptConnected()) {
    // Background async revalidation fallback
    callAppsScriptApi('getStoreProfile').then(res => {
      if (res && res.success && res.data) {
        const cloudStore = res.data;
        const profile = {
          ...localProfile,
          name: cloudStore.name || localProfile.name || 'PUSTAKA BAKID',
          subtitle: cloudStore.subtitle || '',
          address: cloudStore.address || '',
          phone: cloudStore.phone || '',
          footerMsg: cloudStore.footerMsg || 'Terima kasih. Cetakan tidak dapat dibatalkan.',
          logoUrl: cloudStore.logoUrl || '',
          qrisUrl: cloudStore.qrisUrl || ''
        };
        saveStoredStoreProfile(profile);
      }
    }).catch(err => {
      console.warn('Background store profile sync failed:', err);
    });
  }

  return localProfile;
};

export const saveStoreProfileApi = async (profile) => {
  saveStoredStoreProfile(profile);
  if (isAppsScriptConnected()) {
    try {
      await callAppsScriptApi('updateStoreProfile', profile);
    } catch (err) {
      console.error('Failed to sync store profile to AppsScript:', err);
    }
  }
  return profile;
};

// --------------------------------------------------------------------------
// CATALOG PRESETS REPOSITORY
// --------------------------------------------------------------------------
export const fetchCatalogApi = async () => {
  const localCatalog = getStoredCatalog();

  try {
    const cloudCatalog = await fetchCatalogDirect();
    if (Array.isArray(cloudCatalog) && cloudCatalog.length > 0) {
      saveStoredCatalog(cloudCatalog);
      return cloudCatalog;
    }
  } catch (err) {
    console.warn('Direct catalog fetch failed, using fallback:', err);
  }

  if (isAppsScriptConnected()) {
    // Background async revalidation fallback
    callAppsScriptApi('getCatalog').then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        const catalog = res.data.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          unit: item.unit || 'pcs',
          type: item.unit || 'pcs',
          finishing: item.description || ''
        }));
        saveStoredCatalog(catalog);
      }
    }).catch(err => {
      console.warn('Background catalog sync failed:', err);
    });
  }

  return localCatalog;
};

export const saveCatalogPresetApi = async (preset, currentCatalog) => {
  const exists = currentCatalog.some(c => c.id === preset.id);
  const updatedCatalog = exists
    ? currentCatalog.map(c => c.id === preset.id ? preset : c)
    : [...currentCatalog, preset];

  saveStoredCatalog(updatedCatalog);

  if (isAppsScriptConnected()) {
    try {
      await callAppsScriptApi('saveCatalog', {
        id: String(preset.id),
        name: preset.name,
        price: preset.price,
        unit: preset.type || preset.unit || 'pcs',
        description: preset.finishing || ''
      });
    } catch (err) {
      console.error('Failed to sync catalog preset to AppsScript:', err);
    }
  }

  return updatedCatalog;
};

export const deleteCatalogPresetApi = async (id, currentCatalog) => {
  const updatedCatalog = currentCatalog.filter(c => c.id !== id);
  saveStoredCatalog(updatedCatalog);

  if (isAppsScriptConnected()) {
    try {
      await callAppsScriptApi('deleteCatalog', { id: String(id) });
    } catch (err) {
      console.error('Failed to delete catalog preset from AppsScript:', err);
    }
  }

  return updatedCatalog;
};

// --------------------------------------------------------------------------
// TRANSACTIONS & HISTORY REPOSITORY
// --------------------------------------------------------------------------
export const fetchHistoryApi = async (limit = 50, offset = 0) => {
  const localHistory = getStoredHistory();

  // Try Ultra-Fast Direct REST API first (No cold start!)
  try {
    const cloudNotes = await fetchNotesDirect();
    if (Array.isArray(cloudNotes) && cloudNotes.length > 0) {
      const currentLocal = getStoredHistory();
      const unsynced = currentLocal.filter(loc => loc && loc.id && !cloudNotes.some(c => c.id === loc.id || c.noNota === loc.noNota));
      const merged = [...unsynced, ...cloudNotes];
      saveStoredHistory(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Direct Google Sheets notes fetch failed, fallback to AppsScript:', err);
  }

  if (isAppsScriptConnected()) {
    try {
      const page = Math.floor(offset / limit) + 1;
      const res = await callAppsScriptApi('getNotes', { limit, page });
      if (res && res.success && res.data && Array.isArray(res.data.notes)) {
        const cloudNotes = res.data.notes.map(note => ({
          id: note.id,
          noNota: note.noNota,
          publicToken: note.publicToken,
          date: note.date,
          custName: note.custName || '',
          custPhone: note.custPhone || '',
          custAddress: note.custAddress || '',
          orderStatus: 'Proses Cetak',
          payStatus: note.payStatus || 'Lunas',
          payMethod: note.payMethod || 'Cash',
          discount: Number(note.discount || 0),
          dp: Number(note.dp || 0),
          grandTotal: Number(note.grandTotal || 0),
          subtotal: Number(note.subtotal || note.grandTotal),
          sisa: note.payStatus === 'Lunas' ? 0 : Math.max(0, Number(note.grandTotal) - Number(note.dp)),
          catatan: note.catatan || '',
          items: note.items || []
        }));

        const currentLocal = getStoredHistory();
        const unsynced = currentLocal.filter(loc => loc && loc.id && !cloudNotes.some(c => c.id === loc.id || c.noNota === loc.noNota));
        const merged = [...unsynced, ...cloudNotes];
        saveStoredHistory(merged);
        return merged;
      }
    } catch (err) {
      console.warn('History cloud sync error:', err);
    }
  }

  return localHistory;
};

export const fetchTransactionByNoNotaApi = async (noNota) => {
  if (!noNota) return null;
  const cleanNota = String(noNota).trim();

  const localHistory = getStoredHistory();
  const foundLocal = localHistory.find(h => String(h.noNota).trim().toUpperCase() === cleanNota.toUpperCase());

  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getPublicNote', { public_token: cleanNota });
      if (res.success && res.data && res.data.note) {
        const note = res.data.note;
        const mapped = {
          id: note.id,
          noNota: note.noNota,
          publicToken: note.publicToken,
          date: note.date,
          custName: note.custName || '',
          custPhone: note.custPhone || '',
          custAddress: note.custAddress || '',
          orderStatus: 'Proses Cetak',
          payStatus: note.payStatus || 'Lunas',
          payMethod: note.payMethod || 'Cash',
          discount: Number(note.discount || 0),
          dp: Number(note.dp || 0),
          grandTotal: Number(note.grandTotal || 0),
          subtotal: Number(note.subtotal || note.grandTotal),
          sisa: note.sisa || 0,
          catatan: note.catatan || '',
          items: note.items || []
        };
        return mapped;
      }
    } catch (err) {
      console.warn('AppsScript single transaction fetch failed, fallback to local:', err);
    }
  }

  return foundLocal || null;
};

export const saveTransactionApi = async (transactionRecord, currentHistory) => {
  const exists = currentHistory.some(h => h.id === transactionRecord.id);
  const updatedHistory = exists
    ? currentHistory.map(h => h.id === transactionRecord.id ? transactionRecord : h)
    : [transactionRecord, ...currentHistory];

  saveStoredHistory(updatedHistory);

  if (isAppsScriptConnected()) {
    try {
      await callAppsScriptApi('createNote', transactionRecord);
    } catch (err) {
      console.error('Failed to sync transaction to AppsScript cloud:', err);
      throw new Error(`Nota ${transactionRecord.noNota} tersimpan di lokal, namun gagal terkirim ke Cloud: ${err.message}`);
    }
  }

  return updatedHistory;
};

export const deleteTransactionApi = async (id, currentHistory) => {
  const updatedHistory = currentHistory.filter(h => h.id !== id);
  saveStoredHistory(updatedHistory);

  // Trigger both Direct API and AppsScript in background for instant UI response & redundancy
  deleteNoteDirect(id).catch(err => console.warn('Direct delete note warning:', err));
  if (isAppsScriptConnected()) {
    callAppsScriptApi('deleteNote', { id: id, reason: 'Manual delete from history tab' }).catch(err => {
      console.error('Failed to delete transaction from AppsScript:', err);
    });
  }

  return updatedHistory;
};

// --------------------------------------------------------------------------
// AUTHENTICATION REPOSITORY
// --------------------------------------------------------------------------
export const loginApi = async (username, password) => {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '');

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      error: 'Username dan Password wajib diisi.'
    };
  }

  // ⚡ Try Instant Direct Google Sheets REST API Login (< 300ms, no cold start!)
  try {
    const directRes = await loginDirect(cleanUser, cleanPass);
    if (directRes.success && directRes.user) {
      saveSessionToken(directRes.token);
      return {
        success: true,
        user: directRes.user
      };
    } else if (directRes.error) {
      return directRes;
    }
  } catch (err) {
    console.warn('Direct REST login failed, fallback to AppsScript:', err);
  }

  // Fallback to AppsScript Gateway
  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('login', { username: cleanUser, password: cleanPass });
      if (res.success && res.token && res.user) {
        saveSessionToken(res.token);
        return {
          success: true,
          user: res.user
        };
      }
      return {
        success: false,
        error: res.error || 'Username atau Password salah.'
      };
    } catch (err) {
      return {
        success: false,
        error: 'Gagal menghubungkan ke server Google Apps Script: ' + err.message
      };
    }
  }

  return {
    success: false,
    error: 'Sistem database tidak terhubung. Periksa konfigurasi Google API / AppsScript.'
  };
};

export const logoutApi = async () => {
  clearSessionToken();
  return { success: true };
};

// --------------------------------------------------------------------------
// USER ACCOUNTS REPOSITORY
// --------------------------------------------------------------------------
export const fetchAccountsApi = async () => {
  try {
    const directUsers = await fetchUsersDirect();
    if (Array.isArray(directUsers) && directUsers.length > 0) {
      return directUsers;
    }
  } catch (err) {
    console.warn('Direct fetchUsers failed, fallback to AppsScript:', err);
  }

  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getUsers');
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('AppsScript getUsers failed:', err);
    }
  }
  return [];
};

export const saveAccountApi = async (accountData) => {
  try {
    const directRes = await saveUserDirect(accountData);
    if (directRes.success) {
      return directRes.data;
    } else if (directRes.error) {
      throw new Error(directRes.error);
    }
  } catch (err) {
    if (err.message && err.message.includes('Username')) {
      throw err;
    }
    console.warn('Direct saveUser failed, fallback to AppsScript:', err);
  }

  if (isAppsScriptConnected()) {
    const res = await callAppsScriptApi('saveUser', accountData);
    if (!res.success) {
      throw new Error(res.error || 'Gagal menyimpan akun.');
    }
    return await fetchAccountsApi();
  }

  return await fetchAccountsApi();
};

export const deleteAccountApi = async (id) => {
  try {
    const directRes = await deleteUserDirect(id);
    if (directRes.success) {
      return directRes.data;
    }
  } catch (err) {
    console.warn('Direct deleteUser failed, fallback to AppsScript:', err);
  }

  if (isAppsScriptConnected()) {
    const res = await callAppsScriptApi('deleteUser', { id });
    if (!res.success) {
      throw new Error(res.error || 'Gagal menghapus akun.');
    }
    return await fetchAccountsApi();
  }

  return await fetchAccountsApi();
};

export const DRIVE_UPLOAD_FOLDER_ID = '1oWayragc2gZQ6VoThNVvejUKyNFpMToS';

// --------------------------------------------------------------------------
// DRIVE ASSET UPLOAD REPOSITORY
// --------------------------------------------------------------------------
export const uploadDriveAssetApi = async (base64Data, filename) => {
  if (!isAppsScriptConnected()) {
    throw new Error('Google Apps Script / Drive API belum terhubung. Buka Tab Cloud Config.');
  }

  const res = await callAppsScriptApi('uploadDriveFile', {
    base64Data: base64Data,
    filename: filename || 'asset-' + Date.now() + '.png',
    folderId: DRIVE_UPLOAD_FOLDER_ID
  });

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Gagal mengunggah gambar ke Google Drive.');
  }

  return res.data;
};

// --------------------------------------------------------------------------
// PURCHASES — Pembelian P2 ke P1
// --------------------------------------------------------------------------

/**
 * Uploads a vendor nota file (PDF/JPG/PNG) directly to target Google Drive folder.
 * Returns { fileId, fileUrl, previewUrl, thumbnailUrl } on success.
 */
export const uploadVendorNotaApi = async (base64Data, filename, mimeType) => {
  if (!isAppsScriptConnected()) {
    throw new Error('Google Apps Script belum terhubung. Aktifkan cloud di Tab Cloud Config terlebih dahulu.');
  }

  const res = await callAppsScriptApi('uploadDriveFile', {
    base64Data,
    filename: filename || 'nota-vendor-' + Date.now(),
    mimeType: mimeType || 'image/jpeg',
    folderId: DRIVE_UPLOAD_FOLDER_ID,
    folderName: 'Nota_Vendor_P1'
  });

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Gagal mengunggah nota ke Google Drive.');
  }

  return res.data; // { fileId, fileUrl, previewUrl, thumbnailUrl }
};

/**
 * Saves a single purchase to localStorage (offline-first).
 * Cloud sync to GAS can be added in future.
 */
export const savePurchaseApi = async (purchase) => {
  const { getStoredPurchases, saveStoredPurchases } = await import('./storage');
  const all = getStoredPurchases();
  const idx = all.findIndex(p => p.id === purchase.id);
  if (idx >= 0) {
    all[idx] = purchase;
  } else {
    all.unshift(purchase);
  }
  saveStoredPurchases(all);
  return all;
};

/**
 * Deletes a purchase by id from localStorage.
 */
export const deletePurchaseApi = async (id) => {
  const { getStoredPurchases, saveStoredPurchases } = await import('./storage');
  const all = getStoredPurchases().filter(p => p.id !== id);
  saveStoredPurchases(all);
  return all;
};

// --------------------------------------------------------------------------
// EXPENSES — Pengeluaran lain
// --------------------------------------------------------------------------

/**
 * Saves a single expense to localStorage (offline-first).
 */
export const saveExpenseApi = async (expense) => {
  const { getStoredExpenses, saveStoredExpenses } = await import('./storage');
  const all = getStoredExpenses();
  const idx = all.findIndex(e => e.id === expense.id);
  if (idx >= 0) {
    all[idx] = expense;
  } else {
    all.unshift(expense);
  }
  saveStoredExpenses(all);
  return all;
};

/**
 * Deletes an expense by id from localStorage.
 */
export const deleteExpenseApi = async (id) => {
  const { getStoredExpenses, saveStoredExpenses } = await import('./storage');
  const all = getStoredExpenses().filter(e => e.id !== id);
  saveStoredExpenses(all);
  return all;
};

