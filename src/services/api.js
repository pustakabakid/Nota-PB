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
  saveStoredHistory,
  getStoredAccounts,
  saveStoredAccounts
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
          subtitle: data.subtitle,
          address: data.address,
          phone: data.phone,
          footerMsg: data.footer_msg
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
      await supabase.from('stores').upsert({
        id: 'default-store',
        name: profile.name,
        subtitle: profile.subtitle,
        address: profile.address,
        phone: profile.phone,
        footer_msg: profile.footerMsg,
        updated_at: new Date().toISOString()
      });
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

// --------------------------------------------------------------------------
// TRANSACTIONS & HISTORY API
// --------------------------------------------------------------------------
export const fetchHistoryApi = async () => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, transaction_items(*)')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const history = data.map(trx => ({
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
          discount: Number(trx.discount || 0),
          dp: Number(trx.dp || 0),
          grandTotal: Number(trx.grand_total || 0),
          sisa: Number(trx.sisa || 0),
          catatan: trx.catatan || '',
          items: (trx.transaction_items || []).map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
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
          }))
        }));

        saveStoredHistory(history);
        return history;
      }
    } catch (err) {
      console.warn('Cloud history fetch failed, using local backup:', err);
    }
  }
  return getStoredHistory();
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

      if (!trxErr && Array.isArray(transactionRecord.items)) {
        // Delete old items then re-insert new items
        await supabase.from('transaction_items').delete().eq('transaction_id', transactionRecord.id);

        const itemsPayload = transactionRecord.items.map(item => ({
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          transaction_id: transactionRecord.id,
          name: item.name,
          type: item.type,
          length: item.length || 0,
          width: item.width || 0,
          qty: item.qty || 1,
          price: item.price || 0,
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
// USER ACCOUNTS API (SUPABASE CLOUD SYNC)
// --------------------------------------------------------------------------
export const fetchAccountsApi = async () => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const accounts = data.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          role: u.role || 'admin',
          name: u.name || u.username
        }));
        saveStoredAccounts(accounts);
        return accounts;
      }
    } catch (err) {
      console.warn('Cloud user_accounts fetch failed, using local backup:', err);
    }
  }
  return getStoredAccounts();
};

export const saveAccountApi = async (account, currentAccounts) => {
  const exists = currentAccounts.some(a => a.id === account.id);
  const updatedAccounts = exists
    ? currentAccounts.map(a => a.id === account.id ? account : a)
    : [...currentAccounts, account];

  saveStoredAccounts(updatedAccounts);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('user_accounts').upsert({
        id: String(account.id),
        username: account.username,
        password: account.password,
        role: account.role,
        name: account.name || account.username,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to sync user_account to cloud:', err);
    }
  }

  return updatedAccounts;
};

export const deleteAccountApi = async (id, currentAccounts) => {
  const updatedAccounts = currentAccounts.filter(a => a.id !== id);
  saveStoredAccounts(updatedAccounts);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('user_accounts').delete().eq('id', String(id));
    } catch (err) {
      console.error('Failed to delete user_account from cloud:', err);
    }
  }

  return updatedAccounts;
};

