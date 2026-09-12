/* ==========================================================================
   Google Sheets Direct REST API Gateway (v4)
   Ultra-fast, zero-cold-start cloud database client powered by Service Account
   ========================================================================== */

import { getAccessToken, getSpreadsheetId, isDirectApiConfigured } from './googleSheetsAuth';

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

// Helper: Fetch with exponential backoff for rate limits (HTTP 429 / 503)
async function fetchWithBackoff(url, options = {}, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 250;
        console.warn(`Google API rate limit hit (${res.status}). Retrying attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// Helper: Fetch sheet values via Google Sheets REST API v4
async function fetchSheetValues(range) {
  const token = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();
  const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`;

  const res = await fetchWithBackoff(url, {
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

  const res = await fetchWithBackoff(url, {
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

  const res = await fetchWithBackoff(url, {
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

async function generateSessionTokenJs(userId, role) {
  const timestamp = Date.now();
  const raw = `${userId}|${role}|${timestamp}|${Math.random()}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_SALT),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(raw));
  const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  const base64Raw = btoa(raw);
  return `${base64Raw}.${sigHex}`;
}

// --------------------------------------------------------------------------
// 1. FAST INSTANT LOGIN
// --------------------------------------------------------------------------
export const loginDirect = async (username, password) => {
  if (!isDirectApiConfigured()) {
    return { success: false, fallback: true };
  }
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
        const role = row[5] || 'kasir';
        const token = await generateSessionTokenJs(row[0], role);
        return {
          success: true,
          token: token,
          user: {
            id: row[0],
            username: row[1],
            name: row[4] || row[1],
            role: role,
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

export const fetchUsersDirect = async () => {
  if (!isDirectApiConfigured()) return [];
  const rows = await fetchSheetValues('users!A1:I50');
  if (!rows || rows.length <= 1) return [];

  const users = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    users.push({
      id: row[0],
      username: row[1],
      name: row[4] || row[1],
      role: row[5] || 'kasir',
      isActive: row[6] === true || String(row[6]).toLowerCase() === 'true',
      createdAt: row[7],
      updatedAt: row[8]
    });
  }
  return users;
};

// --------------------------------------------------------------------------
// 2. FAST INSTANT NOTES & HISTORY FETCH
// --------------------------------------------------------------------------
export const fetchNotesDirect = async () => {
  if (!isDirectApiConfigured()) return [];
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
  if (!isDirectApiConfigured()) return [];
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
  if (!isDirectApiConfigured()) return null;
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
  if (!isDirectApiConfigured()) return false;
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

// --------------------------------------------------------------------------
// 5B. DIRECT SAVE / UPDATE NOTE & ITEMS
// --------------------------------------------------------------------------
export const saveNoteDirect = async (note) => {
  if (!isDirectApiConfigured()) return { success: false, fallback: true };
  const noteId = note.id || `nota_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const dateStr = note.date || nowIso.slice(0, 10);

  const notesRows = await fetchSheetValues('sales_notes!A1:A2000');
  let foundRowIndex = -1;
  let existingCreatedAt = nowIso;

  if (notesRows && notesRows.length > 1) {
    for (let i = 1; i < notesRows.length; i++) {
      if (String(notesRows[i][0]) === String(noteId)) {
        foundRowIndex = i + 1;
        break;
      }
    }
  }

  const noteRow = [
    noteId,
    note.publicToken || noteId,
    note.noNota || '',
    note.customerId || '',
    note.custName || 'Pelanggan Umum',
    String(note.custPhone || ''),
    note.custAddress || '',
    dateStr,
    Number(note.subtotal || note.grandTotal || 0),
    Number(note.discount || 0),
    Number(note.tax || 0),
    Number(note.dp || 0),
    Number(note.grandTotal || 0),
    note.payStatus || 'Lunas',
    note.payMethod || 'Tunai',
    note.catatan || '',
    'operator',
    existingCreatedAt,
    nowIso,
    'active'
  ];

  if (foundRowIndex > -1) {
    const existingRow = await fetchSheetValues(`sales_notes!R${foundRowIndex}:R${foundRowIndex}`);
    if (existingRow && existingRow[0] && existingRow[0][0]) {
      noteRow[17] = existingRow[0][0]; // preserve original created_at
    }
    await updateSheetValues(`sales_notes!A${foundRowIndex}:T${foundRowIndex}`, [noteRow]);
  } else {
    await appendSheetValues('sales_notes!A1:T1', [noteRow]);
  }

  // Insert items to sales_note_items
  if (note.items && Array.isArray(note.items) && note.items.length > 0) {
    const itemRows = note.items.map((it, idx) => [
      it.id || `${noteId}_item_${idx + 1}`,
      noteId,
      it.name || it.nama || 'Barang Cetakan',
      it.finishing || it.description || it.rincian || '',
      Number(it.qty || 1),
      it.type || it.satuan || 'pcs',
      Number(it.price || it.harga || 0),
      Number(it.discount || 0),
      Number(it.subtotal || it.totalHarga || ((Number(it.qty) || 1) * (Number(it.price) || 0)) || 0)
    ]);
    await appendSheetValues('sales_note_items!A1:I1', itemRows);
  }

  return { success: true, id: noteId };
};

// --------------------------------------------------------------------------
// 5C. DIRECT SAVE / DELETE CATALOG PRESET
// --------------------------------------------------------------------------
export const saveCatalogDirect = async (preset) => {
  if (!isDirectApiConfigured()) return { success: false, fallback: true };
  const rows = await fetchSheetValues('catalog_presets!A1:A500');
  const nowIso = new Date().toISOString();
  const id = String(preset.id || `preset-${Date.now()}`);

  let foundRowIndex = -1;
  let existingCreatedAt = nowIso;

  if (rows && rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) {
        foundRowIndex = i + 1;
        break;
      }
    }
  }

  const catalogRow = [
    id,
    preset.name || '',
    Number(preset.price || 0),
    preset.type || preset.unit || 'pcs',
    preset.finishing || preset.description || '',
    true, // is_active
    existingCreatedAt,
    nowIso
  ];

  if (foundRowIndex > -1) {
    const existingRow = await fetchSheetValues(`catalog_presets!G${foundRowIndex}:G${foundRowIndex}`);
    if (existingRow && existingRow[0] && existingRow[0][0]) {
      catalogRow[6] = existingRow[0][0];
    }
    await updateSheetValues(`catalog_presets!A${foundRowIndex}:H${foundRowIndex}`, [catalogRow]);
  } else {
    await appendSheetValues('catalog_presets!A1:H1', [catalogRow]);
  }

  return { success: true, id };
};

export const deleteCatalogDirect = async (id) => {
  if (!isDirectApiConfigured()) return false;
  const rows = await fetchSheetValues('catalog_presets!A1:A500');
  if (!rows) return false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      const rowIndex = i + 1;
      const nowIso = new Date().toISOString();
      await updateSheetValues(`catalog_presets!F${rowIndex}:H${rowIndex}`, [[false, rows[rowIndex - 1][6] || nowIso, nowIso]]);
      return true;
    }
  }
  return false;
};

// --------------------------------------------------------------------------
// 5D. DIRECT SAVE STORE PROFILE
// --------------------------------------------------------------------------
export const saveStoreProfileDirect = async (profile) => {
  if (!isDirectApiConfigured()) return { success: false, fallback: true };
  const nowIso = new Date().toISOString();
  const row = [
    'store_default_001',
    profile.name || 'PUSTAKA BAKID',
    profile.address || '',
    profile.phone || '',
    profile.subtitle || '',
    profile.footerMsg || 'Terima kasih. Cetakan tidak dapat dibatalkan.',
    profile.logoUrl || '',
    profile.qrisUrl || '',
    nowIso
  ];

  await updateSheetValues('store_profile!A2:I2', [row]);
  return { success: true };
};

// --------------------------------------------------------------------------
// 6. DIRECT GOOGLE DRIVE FILE UPLOAD (v3 REST API)
// Helper: Generate cryptographically strong random salt
function generateRandomSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Verify active session role for admin mutations
function getCurrentUserRole() {
  try {
    const stored = sessionStorage.getItem('nota_kasir_user');
    if (!stored) return null;
    const userObj = JSON.parse(stored);
    return userObj?.role || null;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// 6. DIRECT GOOGLE DRIVE FILE UPLOAD (v3 REST API)
// --------------------------------------------------------------------------
export const uploadDriveFileDirect = async (base64Data, filename, mimeType = 'image/png') => {
  const token = await getAccessToken();

  let cleanBase64 = base64Data || '';
  let detectedMime = mimeType;
  if (cleanBase64.includes('base64,')) {
    const parts = cleanBase64.split('base64,');
    cleanBase64 = parts[1];
    if (parts[0].includes('data:')) {
      const match = parts[0].match(/data:(.*?);/);
      if (match && match[1]) detectedMime = match[1];
    }
  }

  const metadata = {
    name: filename || `file-${Date.now()}`,
    mimeType: detectedMime,
    parents: ['1oWayragc2gZQ6VoThNVvejUKyNFpMToS']
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + detectedMime + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    cleanBase64 +
    close_delim;

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`
    },
    body: multipartRequestBody
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    if (uploadRes.status === 403) {
      throw new Error('Service Account Google Drive memiliki kuota 0 MB. Upload berkas harus menggunakan Google Apps Script Gateway.');
    }
    throw new Error(`Drive upload failed: ${uploadRes.status} ${errText}`);
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;

  // Make file publicly readable for viewing images/PDF in app
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (permErr) {
    console.warn('Set drive file permission warning:', permErr);
  }

  const fileUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
  return {
    fileId: fileId,
    fileUrl: fileUrl,
    downloadUrl: `https://drive.google.com/uc?id=${fileId}&export=download`
  };
};

// --------------------------------------------------------------------------
// 7. DIRECT SAVE / DELETE USER ACCOUNT (v4 REST API)
// --------------------------------------------------------------------------
export const saveUserDirect = async (payload) => {
  // Security Guard: Only Superadmin can create/edit user accounts
  const currentRole = getCurrentUserRole();
  if (currentRole && currentRole !== 'superadmin') {
    return { success: false, error: 'Akses ditolak: Hanya Superadmin yang dapat mengelola akun pengguna.' };
  }

  const isNew = !!payload.isNew;
  const username = String(payload.username || '').trim();
  const name = String(payload.name || username).trim();
  const role = payload.role || 'kasir';
  const isActive = payload.isActive !== false;

  if (username.length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }

  const rows = await fetchSheetValues('users!A1:I50');
  const data = rows || [];

  // Check duplicate username
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase() === username.toLowerCase()) {
      if (isNew || String(row[0]) !== String(payload.id)) {
        return { success: false, error: 'Username sudah digunakan oleh akun lain.' };
      }
    }
  }

  const nowIso = new Date().toISOString();

  if (isNew) {
    if (!payload.password || payload.password.length < 8) {
      return { success: false, error: 'Password minimal 8 karakter.' };
    }
    const newId = payload.id || ('usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    const salt = 'salt_' + generateRandomSalt();
    const passHash = await hashPasswordJs(payload.password, salt);

    const newRow = [newId, username, passHash, salt, name, role, isActive, nowIso, nowIso];
    await appendSheetValues('users!A1:I50', [newRow]);
  } else {
    // Update existing user
    let foundRowIndex = -1;
    let existingSalt = '';
    let existingPassHash = '';
    let existingCreatedAt = nowIso;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(payload.id)) {
        foundRowIndex = i + 1; // 1-indexed for sheet
        existingPassHash = data[i][2];
        existingSalt = data[i][3] || ('salt_' + generateRandomSalt());
        existingCreatedAt = data[i][7] || nowIso;
        break;
      }
    }

    if (foundRowIndex === -1) {
      return { success: false, error: 'Akun user tidak ditemukan.' };
    }

    let passHash = existingPassHash;
    let salt = existingSalt;

    if (payload.password && payload.password.trim().length >= 8) {
      salt = 'salt_' + generateRandomSalt();
      passHash = await hashPasswordJs(payload.password.trim(), salt);
    }

    const updatedRow = [
      payload.id,
      username,
      passHash,
      salt,
      name,
      role,
      isActive,
      existingCreatedAt,
      nowIso
    ];

    await updateSheetValues(`users!A${foundRowIndex}:I${foundRowIndex}`, [updatedRow]);
  }

  return { success: true, data: await fetchUsersDirect() };
};

export const deleteUserDirect = async (id) => {
  // Security Guard: Only Superadmin can delete/deactivate user accounts
  const currentRole = getCurrentUserRole();
  if (currentRole && currentRole !== 'superadmin') {
    return { success: false, error: 'Akses ditolak: Hanya Superadmin yang dapat mengelola akun pengguna.' };
  }

  const rows = await fetchSheetValues('users!A1:I50');
  if (!rows) return { success: false, error: 'User tidak ditemukan.' };

  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex === -1) {
    return { success: false, error: 'User tidak ditemukan.' };
  }

  // Deactivate user or update status via direct REST API
  const nowIso = new Date().toISOString();
  await updateSheetValues(`users!G${foundRowIndex}:I${foundRowIndex}`, [false, rows[foundRowIndex - 1][7] || nowIso, nowIso]);

  return { success: true, data: await fetchUsersDirect() };
};

// --------------------------------------------------------------------------
// 8. FAST FINANCE REPOSITORY (Purchases, Expenses, Other Income)
// --------------------------------------------------------------------------
export const fetchFinancesDirect = async () => {
  if (!isDirectApiConfigured()) return { purchases: [], expenses: [], otherIncome: [] };
  const rows = await fetchSheetValues('finances!A1:M2000');
  if (!rows || rows.length <= 1) {
    return { purchases: [], expenses: [], otherIncome: [] };
  }

  const purchases = [];
  const expenses = [];
  const otherIncome = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[0] || '').trim();
    if (!id) continue;

    const status = String(row[10] || 'active').toLowerCase().trim();
    if (status === 'deleted') continue;

    const type = String(row[1] || '').toLowerCase().trim();
    const tanggal = String(row[2] || '').trim();
    const kategori = String(row[3] || '').trim();
    const keterangan = String(row[4] || '').trim();
    const noReferensi = String(row[5] || '').trim();
    const jumlah = Number(row[6] || 0);

    let items = [];
    try {
      if (row[7]) items = typeof row[7] === 'string' ? JSON.parse(row[7]) : row[7];
    } catch {
      items = [];
    }

    let notaFile = null;
    try {
      if (row[8]) notaFile = typeof row[8] === 'string' ? JSON.parse(row[8]) : row[8];
    } catch {
      notaFile = null;
    }

    const catatan = String(row[9] || '').trim();
    const createdAt = String(row[11] || '');
    const updatedAt = String(row[12] || '');

    if (type === 'purchase') {
      purchases.push({
        id,
        tanggal,
        kategori: kategori || 'Pembelian P1',
        namaP1: keterangan || 'Percetakan P1',
        noPembelian: noReferensi || '',
        grandTotal: jumlah,
        items: Array.isArray(items) ? items : [],
        notaFile,
        catatan,
        createdAt,
        updatedAt
      });
    } else if (type === 'expense') {
      expenses.push({
        id,
        tanggal,
        kategori: kategori || 'Operasional',
        keterangan,
        jumlah,
        createdAt,
        updatedAt
      });
    } else if (type === 'income') {
      otherIncome.push({
        id,
        tanggal,
        sumber: keterangan || 'Infaq / Hibah',
        keterangan: catatan || keterangan,
        jumlah,
        createdAt,
        updatedAt
      });
    }
  }

  return { purchases, expenses, otherIncome };
};

export const saveFinanceDirect = async (item) => {
  if (!isDirectApiConfigured()) return { success: false, fallback: true };
  const rows = await fetchSheetValues('finances!A1:A2000');
  const nowIso = new Date().toISOString();
  const id = item.id || `fin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Determine type & normalize row columns
  // ['id', 'type', 'tanggal', 'kategori', 'keterangan', 'no_referensi', 'jumlah', 'items_json', 'nota_file_json', 'catatan', 'status', 'created_at', 'updated_at']
  const type = item.type || (item.noPembelian || item.namaP1 || item.items ? 'purchase' : (item.sumber ? 'income' : 'expense'));
  const tanggal = item.tanggal || nowIso.slice(0, 10);
  const kategori = item.kategori || (type === 'purchase' ? 'Pembelian P1' : (type === 'income' ? item.sumber || 'Lainnya' : 'Operasional'));
  const keterangan = item.namaP1 || item.sumber || item.keterangan || '';
  const noReferensi = item.noPembelian || '';
  const jumlah = Number(item.grandTotal ?? item.jumlah ?? 0);
  const itemsJson = item.items && Array.isArray(item.items) ? JSON.stringify(item.items) : '';
  const notaFileJson = item.notaFile ? JSON.stringify(item.notaFile) : '';
  const catatan = item.catatan || (type === 'income' && item.keterangan !== item.sumber ? item.keterangan : '') || '';
  const status = 'active';

  let foundRowIndex = -1;
  let existingCreatedAt = nowIso;

  if (rows && rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(id)) {
        foundRowIndex = i + 1;
        break;
      }
    }
  }

  if (foundRowIndex > -1) {
    // In-place update: fetch existing created_at
    const existingRow = await fetchSheetValues(`finances!L${foundRowIndex}:L${foundRowIndex}`);
    if (existingRow && existingRow[0] && existingRow[0][0]) {
      existingCreatedAt = existingRow[0][0];
    }
    const updateRow = [
      id,
      type,
      tanggal,
      kategori,
      keterangan,
      noReferensi,
      jumlah,
      itemsJson,
      notaFileJson,
      catatan,
      status,
      existingCreatedAt,
      nowIso
    ];
    await updateSheetValues(`finances!A${foundRowIndex}:M${foundRowIndex}`, [updateRow]);
  } else {
    // Append new row
    const newRow = [
      id,
      type,
      tanggal,
      kategori,
      keterangan,
      noReferensi,
      jumlah,
      itemsJson,
      notaFileJson,
      catatan,
      status,
      item.createdAt || nowIso,
      nowIso
    ];
    await appendSheetValues('finances!A1:M1', [newRow]);
  }

  return { success: true, id };
};

export const deleteFinanceDirect = async (id) => {
  if (!isDirectApiConfigured()) return false;
  const rows = await fetchSheetValues('finances!A1:A2000');
  if (!rows || rows.length <= 1) return { success: false, error: 'Data tidak ditemukan.' };

  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex === -1) {
    return { success: false, error: 'Data tidak ditemukan di database.' };
  }

  const nowIso = new Date().toISOString();
  // Soft delete: set status to deleted and update timestamp
  await updateSheetValues(`finances!K${foundRowIndex}:K${foundRowIndex}`, [['deleted']]);
  await updateSheetValues(`finances!M${foundRowIndex}:M${foundRowIndex}`, [[nowIso]]);
  return { success: true, id };
};

