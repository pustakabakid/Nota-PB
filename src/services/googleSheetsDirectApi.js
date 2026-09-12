/* ==========================================================================
   Google Sheets Direct REST API Gateway (v4)
   Ultra-fast, zero-cold-start cloud database client powered by Service Account
   ========================================================================== */

import { getAccessToken, getSpreadsheetId } from './googleSheetsAuth';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SECRET_SALT = 'NOTA_PUSTAKA_BAKI_SECURE_SALT_2026';

// Helper: Hash password using native SHA-256 matching Google Apps Script algorithm
async function hashPasswordJs(password, salt = SECRET_SALT) {
  const textToHash = (salt || SECRET_SALT) + ':' + (password || '');
  const encoder = new TextEncoder();
  const data = encoder.encode(textToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Fetch sheet values via Google Sheets REST API v4
async function fetchSheetValues(range) {
  const token = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Sheets API read error [${range}]: ${res.statusText}`);
  }

  const data = await res.json();
  return data.values || [];
}

// Helper: Update a single cell or range in Google Sheets
async function updateSheetValues(range, values) {
  const token = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: values
    })
  });

  if (!res.ok) {
    throw new Error(`Sheets API update error [${range}]: ${res.statusText}`);
  }

  return await res.json();
}

// Helper: Append row(s) to a sheet
async function appendSheetValues(range, values) {
  const token = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: values
    })
  });

  if (!res.ok) {
    throw new Error(`Sheets API append error [${range}]: ${res.statusText}`);
  }

  return await res.json();
}

// --------------------------------------------------------------------------
// 1. FAST INSTANT LOGIN
// --------------------------------------------------------------------------
export const loginDirect = async (username, password) => {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '');

  if (!cleanUser || !cleanPass) {
    return { success: false, error: 'Username dan Password wajib diisi.' };
  }

  const rows = await fetchSheetValues('users!A1:I50');
  if (!rows || rows.length <= 1) {
    return { success: false, error: 'Data user tidak ditemukan di database.' };
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const uName = String(row[1] || '').trim().toLowerCase();

    if (uName === cleanUser) {
      const isActive = row[6] === true || String(row[6]).toLowerCase() === 'true';
      if (!isActive) {
        return { success: false, error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' };
      }

      const salt = row[3] || SECRET_SALT;
      const storedHash = String(row[2] || '');
      const inputHash = await hashPasswordJs(cleanPass, salt);

      if (storedHash === inputHash || storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        const token = `token-${row[0]}-${Date.now()}`;
        return {
          success: true,
          token: token,
          user: {
            id: row[0],
            username: row[1],
            name: row[4] || row[1],
            role: row[5] || 'kasir',
            is_active: isActive
          }
        };
      } else {
        return { success: false, error: 'Username atau Password salah.' };
      }
    }
  }

  return { success: false, error: 'Username atau Password salah.' };
};

// --------------------------------------------------------------------------
// 2. FAST INSTANT NOTES & HISTORY FETCH
// --------------------------------------------------------------------------
export const fetchNotesDirect = async () => {
  const [notesRows, itemsRows] = await Promise.all([
    fetchSheetValues('sales_notes!A1:T2000'),
    fetchSheetValues('sales_note_items!A1:I5000')
  ]);

  if (!notesRows || notesRows.length <= 1) {
    return [];
  }

  // Map items by note_id
  const itemsMap = {};
  if (itemsRows && itemsRows.length > 1) {
    for (let i = 1; i < itemsRows.length; i++) {
      const row = itemsRows[i];
      const noteId = String(row[1] || '');
      if (!noteId) continue;
      if (!itemsMap[noteId]) itemsMap[noteId] = [];

      itemsMap[noteId].push({
        id: row[0],
        note_id: noteId,
        nama: row[2] || '',
        description: row[3] || '',
        rincian: row[3] || '',
        qty: Number(row[4] || 1),
        satuan: row[5] || 'pcs',
        harga: Number(row[6] || 0),
        discount: Number(row[7] || 0),
        subtotal: Number(row[8] || 0),
        totalHarga: Number(row[8] || 0)
      });
    }
  }

  const notes = [];
  for (let i = 1; i < notesRows.length; i++) {
    const row = notesRows[i];
    const status = String(row[19] || 'active').toLowerCase();
    if (status === 'deleted') continue; // Soft Delete Filter

    const noteId = String(row[0]);
    notes.push({
      id: noteId,
      publicToken: row[1] || noteId,
      noNota: row[2] || '',
      date: String(row[7] || row[17] || new Date().toISOString()),
      custName: row[4] || 'Pelanggan Umum',
      custPhone: row[5] || '',
      custAddress: row[6] || '',
      subtotal: Number(row[8] || 0),
      discount: Number(row[9] || 0),
      tax: Number(row[10] || 0),
      dp: Number(row[11] || 0),
      grandTotal: Number(row[12] || 0),
      payStatus: row[13] || 'Lunas',
      payMethod: row[14] || 'Tunai',
      catatan: row[15] || '',
      orderStatus: 'Proses Cetak',
      sisa: row[13] === 'Lunas' ? 0 : Math.max(0, Number(row[12] || 0) - Number(row[11] || 0)),
      items: itemsMap[noteId] || []
    });
  }

  return notes;
};

// --------------------------------------------------------------------------
// 3. FAST CATALOG FETCH
// --------------------------------------------------------------------------
export const fetchCatalogDirect = async () => {
  const rows = await fetchSheetValues('catalog_presets!A1:H500');
  if (!rows || rows.length <= 1) return [];

  const catalog = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const isActive = row[5] === true || String(row[5]).toLowerCase() === 'true';
    if (!isActive && row[5] !== undefined && row[5] !== '') continue;

    catalog.push({
      id: row[0],
      name: row[1],
      price: Number(row[2] || 0),
      unit: row[3] || 'pcs',
      type: row[3] || 'pcs',
      finishing: row[4] || ''
    });
  }

  return catalog;
};

// --------------------------------------------------------------------------
// 4. FAST STORE PROFILE FETCH
// --------------------------------------------------------------------------
export const fetchStoreProfileDirect = async () => {
  const rows = await fetchSheetValues('store_profile!A1:I5');
  if (!rows || rows.length <= 1) return null;

  const row = rows[1];
  return {
    id: row[0],
    name: row[1] || 'PUSTAKA BAKID',
    address: row[2] || '',
    phone: row[3] || '',
    subtitle: row[4] || '',
    footerMsg: row[5] || 'Terima kasih. Cetakan tidak dapat dibatalkan.',
    logoUrl: row[6] || '',
    qrisUrl: row[7] || ''
  };
};

// --------------------------------------------------------------------------
// 5. DIRECT SOFT DELETE NOTE
// --------------------------------------------------------------------------
export const deleteNoteDirect = async (noteId) => {
  const rows = await fetchSheetValues('sales_notes!A1:A2000');
  if (!rows) return false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(noteId)) {
      const rowIndex = i + 1;
      const nowIso = new Date().toISOString();
      await updateSheetValues(`sales_notes!S${rowIndex}:T${rowIndex}`, [[nowIso, 'deleted']]);
      return true;
    }
  }

  return false;
};
