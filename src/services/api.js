/* ==========================================================================
   Unified Database & API Layer (Supabase Cloud + LocalStorage Fallback)
   ========================================================================== */

import { getSupabase } from './supabaseClient';
import {
  getStoredStoreProfile,
  saveStoredStoreProfile,
  getStoredCatalog,
  saveStoredCatalog,
  getStoredHistory,
  saveStoredHistory
} from './storage';

// --------------------------------------------------------------------------
// STORE PROFILE API
// --------------------------------------------------------------------------
export const fetchStoreProfileApi = async () => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const profile = {
          name: data.name,
          subtitle: data.subtitle || '',
          address: data.address || '',
          phone: data.phone || '',
          footerMsg: data.footer_msg || 'Terima kasih atas kunjungan Anda.',
          defaultPaper: data.default_paper || data.settings?.defaultPaper || 'A4',
          customPaperName: data.custom_paper_name || data.settings?.customPaperName || 'Kustom',
          customPaperWidth: Number(data.custom_paper_width || data.settings?.customPaperWidth || 100),
          customPaperHeight: Number(data.custom_paper_height !== undefined ? data.custom_paper_height : (data.settings?.customPaperHeight !== undefined ? data.settings.customPaperHeight : 150)),
          customPaperMargin: Number(data.custom_paper_margin !== undefined ? data.custom_paper_margin : (data.settings?.customPaperMargin !== undefined ? data.settings.customPaperMargin : 4)),
          qrSize: data.qr_size || data.settings?.qrSize || 'medium',
          customQrSize: data.custom_qr_size !== undefined ? Number(data.custom_qr_size) : (data.settings?.customQrSize !== undefined ? Number(data.settings.customQrSize) : (Number(data.custom_qr_size_px) || 24)),
          customQrUnit: data.custom_qr_unit || data.settings?.customQrUnit || 'mm',
          customQrSizePx: Number(data.custom_qr_size_px || data.settings?.customQrSizePx || 80),
          qrPosition: data.qr_position || data.settings?.qrPosition || 'right',
          showQrCode: data.show_qr_code !== undefined ? data.show_qr_code : (data.settings?.showQrCode !== false),
          density: data.density || data.settings?.density || 'normal',
          bankName: data.bank_name || data.settings?.bankName || '',
          bankAccount: data.bank_account || data.settings?.bankAccount || '',
          bankHolder: data.bank_holder || data.settings?.bankHolder || ''
        };
        saveStoredStoreProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Cloud store profile fetch failed, using local backup:', err);
    }
  }
  return getStoredStoreProfile();
};

export const saveStoreProfileApi = async (profile) => {
  saveStoredStoreProfile(profile);
  const supabase = getSupabase();
  if (supabase) {
    try {
      const fullPayload = {
        id: 'default-store',
        name: profile.name,
        subtitle: profile.subtitle || '',
        address: profile.address || '',
        phone: profile.phone || '',
        footer_msg: profile.footerMsg || '',
        default_paper: profile.defaultPaper || 'A4',
        custom_paper_name: profile.customPaperName || 'Kustom',
        custom_paper_width: profile.customPaperWidth || 100,
        custom_paper_height: profile.customPaperHeight !== undefined ? profile.customPaperHeight : 150,
        custom_paper_margin: profile.customPaperMargin !== undefined ? profile.customPaperMargin : 4,
        qr_size: profile.qrSize || 'medium',
        custom_qr_size: profile.customQrSize !== undefined ? profile.customQrSize : 24,
        custom_qr_unit: profile.customQrUnit || 'mm',
        custom_qr_size_px: profile.customQrSizePx || 80,
        qr_position: profile.qrPosition || 'right',
        show_qr_code: profile.showQrCode !== false,
        density: profile.density || 'normal',
        bank_name: profile.bankName || '',
        bank_account: profile.bankAccount || '',
        bank_holder: profile.bankHolder || '',
        settings: {
          defaultPaper: profile.defaultPaper || 'A4',
          customPaperName: profile.customPaperName || 'Kustom',
          customPaperWidth: profile.customPaperWidth || 100,
          customPaperHeight: profile.customPaperHeight !== undefined ? profile.customPaperHeight : 150,
          customPaperMargin: profile.customPaperMargin !== undefined ? profile.customPaperMargin : 4,
          qrSize: profile.qrSize || 'medium',
          customQrSize: profile.customQrSize !== undefined ? profile.customQrSize : 24,
          customQrUnit: profile.customQrUnit || 'mm',
          customQrSizePx: profile.customQrSizePx || 80,
          qrPosition: profile.qrPosition || 'right',
          showQrCode: profile.showQrCode !== false,
          density: profile.density || 'normal',
          bankName: profile.bankName || '',
          bankAccount: profile.bankAccount || '',
          bankHolder: profile.bankHolder || ''
        },
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase.from('stores').upsert(fullPayload);
      if (upsertError) {
        console.warn('Full store upsert fallback to base schema:', upsertError.message);
        await supabase.from('stores').upsert({
          id: 'default-store',
          name: profile.name,
          subtitle: profile.subtitle || '',
          address: profile.address || '',
          phone: profile.phone || '',
          footer_msg: profile.footerMsg || '',
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to sync store profile to cloud:', err);
    }
  }
  return profile;
};

// --------------------------------------------------------------------------
// CATALOG PRESETS API
// --------------------------------------------------------------------------
export const fetchCatalogApi = async () => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('catalog_presets')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data)) {
        const catalog = data.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          price: Number(item.price),
          finishing: item.finishing || ''
        }));
        saveStoredCatalog(catalog);
        return catalog;
      }
    } catch (err) {
      console.warn('Cloud catalog fetch failed, using local backup:', err);
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

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('catalog_presets').upsert({
        id: String(preset.id),
        name: preset.name,
        type: preset.type,
        price: preset.price,
        finishing: preset.finishing || ''
      });
    } catch (err) {
      console.error('Failed to sync catalog preset to cloud:', err);
    }
  }

  return updatedCatalog;
};

export const deleteCatalogPresetApi = async (id, currentCatalog) => {
  const updatedCatalog = currentCatalog.filter(c => c.id !== id);
  saveStoredCatalog(updatedCatalog);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('catalog_presets').delete().eq('id', String(id));
    } catch (err) {
      console.error('Failed to delete catalog preset from cloud:', err);
    }
  }

  return updatedCatalog;
};

// Helper to parse and map raw database row into normalized transaction object
const mapTransactionRow = (trx) => {
  if (!trx) return null;
  const discountVal = Number(trx.discount || 0);
  const grandTotalVal = Number(trx.grand_total || 0);
  const rawSubtotal = Number(trx.subtotal || 0);
  const computedSubtotal = rawSubtotal > 0 ? rawSubtotal : (grandTotalVal + discountVal);

  let parsedItems = (trx.transaction_items || []).map(item => ({
    id: item.id,
    name: (item.name && item.name.trim()) ? item.name.trim() : 'Pekerjaan Cetak',
    type: item.type || 'pcs',
    length: Number(item.length || 0),
    width: Number(item.width || 0),
    qty: Number(item.qty || 1),
    price: Number(item.price || 0),
    finishing: item.finishing || '',
    bookTitle: item.book_title || '',
    bookSize: item.book_size || '',
    bookPages: item.book_pages || null,
    bookPaperInner: item.book_paper_inner || '',
    bookCover: item.book_cover || '',
    bookBinding: item.book_binding || '',
    customDetails: Array.isArray(item.customDetails) ? item.customDetails : (item.custom_details || [])
  }));

  // Fallback if items are empty in cloud DB but grandTotal exists
  if (parsedItems.length === 0 && grandTotalVal > 0) {
    parsedItems = [{
      id: `item-fallback-${trx.id}`,
      name: 'Pekerjaan Cetak',
      type: 'pcs',
      length: 100,
      width: 100,
      qty: 1,
      price: computedSubtotal,
      finishing: '',
      customDetails: []
    }];
  }

  return {
    id: trx.id,
    noNota: trx.no_nota,
    date: trx.date,
    custName: trx.cust_name || '',
    custPhone: trx.cust_phone || '',
    custAddress: trx.cust_address || '',
    orderStatus: trx.order_status || 'Proses Cetak',
    payStatus: trx.pay_status || 'Lunas',
    payMethod: trx.pay_method || 'Transfer',
    bankName: trx.bank_name || '',
    pickupMethod: trx.pickup_method || 'Ditunggu',
    discount: discountVal,
    dp: Number(trx.dp || 0),
    grandTotal: grandTotalVal,
    subtotal: computedSubtotal,
    sisa: Number(trx.sisa || 0),
    catatan: trx.catatan || '',
    items: parsedItems
  };
};

// --------------------------------------------------------------------------
// TRANSACTIONS & HISTORY API
// --------------------------------------------------------------------------
export const fetchHistoryApi = async (limit = 50, offset = 0) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      if (typeof limit === 'number' && limit > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        const cloudHistory = data.map(mapTransactionRow).filter(Boolean);
        const localHistory = getStoredHistory();
        // Preserve any local offline records that haven't reached cloud yet
        const unsynced = localHistory.filter(loc => loc && loc.id && !cloudHistory.some(c => c.id === loc.id || c.noNota === loc.noNota));
        const merged = [...unsynced, ...cloudHistory];
        saveStoredHistory(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Cloud history fetch failed, using local backup:', err);
    }
  }
  return getStoredHistory();
};

export const fetchTransactionByNoNotaApi = async (noNota) => {
  if (!noNota) return null;
  const cleanNota = String(noNota).trim();

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .eq('no_nota', cleanNota)
        .maybeSingle();

      if (!error && data) {
        return mapTransactionRow(data);
      }
    } catch (err) {
      console.warn('Cloud transaction single fetch failed, fallback to local:', err);
    }
  }

  // Fallback to local storage
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

  const supabase = getSupabase();
  if (supabase) {
    try {
      // Upsert transaction parent record
      const { error: trxErr } = await supabase.from('transactions').upsert({
        id: transactionRecord.id,
        no_nota: transactionRecord.noNota,
        date: transactionRecord.date,
        cust_name: transactionRecord.custName,
        cust_phone: transactionRecord.custPhone,
        cust_address: transactionRecord.custAddress,
        order_status: transactionRecord.orderStatus,
        pay_status: transactionRecord.payStatus,
        pay_method: transactionRecord.payMethod,
        bank_name: transactionRecord.bankName,
        pickup_method: transactionRecord.pickupMethod,
        discount: transactionRecord.discount,
        dp: transactionRecord.dp,
        grand_total: transactionRecord.grandTotal,
        sisa: transactionRecord.sisa,
        catatan: transactionRecord.catatan
      });

      if (!trxErr && Array.isArray(transactionRecord.items) && transactionRecord.items.length > 0) {
        // Delete old items then re-insert new items
        await supabase.from('transaction_items').delete().eq('transaction_id', transactionRecord.id);

        const itemsPayload = transactionRecord.items.map((item, idx) => ({
          id: item.id || `item-${Date.now()}-${idx}-${Math.random()}`,
          transaction_id: transactionRecord.id,
          name: (item.name && item.name.trim()) ? item.name.trim() : 'Pekerjaan Cetak',
          type: item.type || 'pcs',
          length: Number(item.length || 0),
          width: Number(item.width || 0),
          qty: Number(item.qty || 1),
          price: Number(item.price || 0),
          finishing: item.finishing || '',
          book_title: item.bookTitle || '',
          book_size: item.bookSize || '',
          book_pages: item.bookPages || null,
          book_paper_inner: item.bookPaperInner || '',
          book_cover: item.bookCover || '',
          book_binding: item.bookBinding || '',
          custom_details: item.customDetails || []
        }));

        await supabase.from('transaction_items').insert(itemsPayload);
      }
    } catch (err) {
      console.error('Failed to sync transaction to cloud:', err);
    }
  }

  return updatedHistory;
};

export const deleteTransactionApi = async (id, currentHistory) => {
  const updatedHistory = currentHistory.filter(h => h.id !== id);
  saveStoredHistory(updatedHistory);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (err) {
      console.error('Failed to delete transaction from cloud:', err);
    }
  }

  return updatedHistory;
};

// --------------------------------------------------------------------------
// AUTHENTICATION API (SINGLE AUTHENTICATION PATH VIA SUPABASE RPC)
// --------------------------------------------------------------------------
export const loginApi = async (username, password) => {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Koneksi ke Supabase Cloud belum terkonfigurasi. Hubungkan database cloud terlebih dahulu.'
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
    const { data, error } = await supabase.rpc('auth_login', {
      p_username: cleanUser,
      p_password: cleanPass,
      p_ip: '',
      p_device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser Client'
    });

    if (error) {
      console.error('Supabase auth_login RPC error:', error.message);
      return {
        success: false,
        error: error.message.includes('function public.auth_login')
          ? 'Fungsi autentikasi database (RPC auth_login) belum dipasang. Silakan jalankan script SQL Schema di menu "SQL Editor" pada Dashboard Supabase Anda.'
          : (error.message || 'Terjadi kesalahan sistem autentikasi.')
      };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || 'Username atau Password salah.'
      };
    }

    return {
      success: true,
      user: data.user
    };
  } catch (err) {
    console.error('Network / Supabase call failed:', err);
    return {
      success: false,
      error: 'Gagal menghubungi server database Supabase. Periksa koneksi internet Anda.'
    };
  }
};

// --------------------------------------------------------------------------
// USER ACCOUNTS API (SUPABASE CLOUD - SANITIZED EXPLICIT SELECT & RPC)
// --------------------------------------------------------------------------
export const fetchAccountsApi = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, username, name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      return data.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name || u.username,
        role: u.role || 'admin',
        isActive: u.is_active !== false,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));
    }
    if (error) {
      console.warn('Supabase user_accounts fetch error:', error.message);
    }
  } catch (err) {
    console.warn('Supabase user_accounts network error:', err);
  }

  return [];
};

export const saveAccountApi = async (accountData) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase Cloud tidak terhubung.');
  }

  if (accountData.isNew) {
    const { data, error } = await supabase.rpc('admin_create_account', {
      p_username: accountData.username.trim(),
      p_password: accountData.password,
      p_name: (accountData.name || accountData.username).trim(),
      p_role: accountData.role || 'admin'
    });

    if (error) {
      throw new Error(error.message || 'Gagal membuat akun baru di database.');
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Gagal membuat akun baru di database.');
    }
  } else {
    const { data, error } = await supabase.rpc('admin_update_account', {
      p_id: accountData.id,
      p_username: accountData.username.trim(),
      p_password: accountData.password && accountData.password.trim() ? accountData.password.trim() : null,
      p_name: (accountData.name || accountData.username).trim(),
      p_role: accountData.role || 'admin',
      p_is_active: accountData.isActive !== false
    });

    if (error) {
      throw new Error(error.message || 'Gagal memperbarui akun di database.');
    }
    if (!data?.success) {
      throw new Error(data?.error || 'Gagal memperbarui akun di database.');
    }
  }

  return await fetchAccountsApi();
};

export const deleteAccountApi = async (id) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase Cloud tidak terhubung.');
  }

  const { data, error } = await supabase.rpc('admin_delete_account', {
    p_id: id
  });

  if (error) {
    throw new Error(error.message || 'Gagal menghapus akun dari database.');
  }
  if (!data?.success) {
    throw new Error(data?.error || 'Gagal menghapus akun dari database.');
  }

  return await fetchAccountsApi();
};

