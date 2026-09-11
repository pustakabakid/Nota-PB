/* ==========================================================================
   Google Sheets & Apps Script Repository Layer
   Offline-First Dexie.js + Cloud Synchronization
   ========================================================================== */

import {
  callAppsScriptApi,
  saveSessionToken,
  clearSessionToken,
  isAppsScriptConnected
} from './appsScriptClient';

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
  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getStoreProfile');
      if (res.success && res.data) {
        const cloudStore = res.data;
        const profile = {
          name: cloudStore.name || 'PUSTAKA BAKID',
          subtitle: cloudStore.subtitle || '',
          address: cloudStore.address || '',
          phone: cloudStore.phone || '',
          footerMsg: cloudStore.footerMsg || 'Terima kasih. Cetakan tidak dapat dibatalkan.',
          logoUrl: cloudStore.logoUrl || '',
          qrisUrl: cloudStore.qrisUrl || '',
          defaultPaper: 'A4',
          customPaperName: 'Kustom',
          customPaperWidth: 100,
          customPaperHeight: 150,
          customPaperMargin: 4,
          qrSize: 'medium',
          customQrSize: 24,
          customQrUnit: 'mm',
          customQrSizePx: 80,
          qrPosition: 'right',
          showQrCode: true,
          density: 'normal'
        };
        saveStoredStoreProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('AppsScript store profile fetch failed, fallback to local:', err);
    }
  }
  return getStoredStoreProfile();
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
  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getCatalog');
      if (res.success && Array.isArray(res.data)) {
        const catalog = res.data.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          unit: item.unit || 'pcs',
          type: item.unit || 'pcs',
          finishing: item.description || ''
        }));
        saveStoredCatalog(catalog);
        return catalog;
      }
    } catch (err) {
      console.warn('AppsScript catalog fetch failed, using local backup:', err);
    }
  }
  return getStoredCatalog();
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
  if (isAppsScriptConnected()) {
    try {
      const page = Math.floor(offset / limit) + 1;
      const res = await callAppsScriptApi('getNotes', { limit, page });
      
      if (res.success && res.data && Array.isArray(res.data.notes)) {
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

        const localHistory = getStoredHistory();
        const unsynced = localHistory.filter(loc => loc && loc.id && !cloudNotes.some(c => c.id === loc.id || c.noNota === loc.noNota));
        const merged = [...unsynced, ...cloudNotes];
        saveStoredHistory(merged);
        return merged;
      }
    } catch (err) {
      console.warn('AppsScript history fetch failed, using local backup:', err);
    }
  }
  return getStoredHistory();
};

export const fetchTransactionByNoNotaApi = async (noNota) => {
  if (!noNota) return null;
  const cleanNota = String(noNota).trim();

  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getPublicNote', { public_token: cleanNota });
      if (res.success && res.data && res.data.note) {
        const note = res.data.note;
        return {
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
      }
    } catch (err) {
      console.warn('AppsScript single transaction fetch failed, fallback to local:', err);
    }
  }

  const localHistory = getStoredHistory();
  const found = localHistory.find(h => String(h.noNota).trim().toUpperCase() === cleanNota.toUpperCase());
  return found || null;
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
    }
  }

  return updatedHistory;
};

export const deleteTransactionApi = async (id, currentHistory) => {
  const updatedHistory = currentHistory.filter(h => h.id !== id);
  saveStoredHistory(updatedHistory);

  if (isAppsScriptConnected()) {
    try {
      await callAppsScriptApi('deleteNote', { id: id, reason: 'Manual delete from history tab' });
    } catch (err) {
      console.error('Failed to delete transaction from AppsScript:', err);
    }
  }

  return updatedHistory;
};

// --------------------------------------------------------------------------
// AUTHENTICATION REPOSITORY
// --------------------------------------------------------------------------
export const loginApi = async (username, password) => {
  if (!isAppsScriptConnected()) {
    return {
      success: false,
      error: 'Google Apps Script belum terkonfigurasi. Buka Tab Cloud Config untuk mengonfigurasi Web App URL.'
    };
  }

  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '');

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      error: 'Username dan Password wajib diisi.'
    };
  }

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
};

export const logoutApi = async () => {
  clearSessionToken();
  return { success: true };
};

// --------------------------------------------------------------------------
// USER ACCOUNTS REPOSITORY
// --------------------------------------------------------------------------
export const fetchAccountsApi = async () => {
  if (isAppsScriptConnected()) {
    try {
      const res = await callAppsScriptApi('getUsers');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('AppsScript getUsers failed:', err);
    }
  }
  return [];
};

export const saveAccountApi = async (accountData) => {
  if (!isAppsScriptConnected()) {
    throw new Error('Google Apps Script belum terhubung.');
  }

  const res = await callAppsScriptApi('saveUser', accountData);
  if (!res.success) {
    throw new Error(res.error || 'Gagal menyimpan akun.');
  }

  return await fetchAccountsApi();
};

export const deleteAccountApi = async (id) => {
  if (!isAppsScriptConnected()) {
    throw new Error('Google Apps Script belum terhubung.');
  }

  const res = await callAppsScriptApi('deleteUser', { id });
  if (!res.success) {
    throw new Error(res.error || 'Gagal menghapus akun.');
  }

  return await fetchAccountsApi();
};

// --------------------------------------------------------------------------
// DRIVE ASSET UPLOAD REPOSITORY
// --------------------------------------------------------------------------
export const uploadDriveAssetApi = async (base64Data, filename) => {
  if (!isAppsScriptConnected()) {
    throw new Error('Google Apps Script belum terhubung.');
  }

  const res = await callAppsScriptApi('uploadDriveFile', {
    base64Data: base64Data,
    filename: filename || 'asset-' + Date.now() + '.png'
  });

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Gagal mengunggah gambar ke Google Drive.');
  }

  return res.data;
};
