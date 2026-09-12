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
    mimeType: detectedMime
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

