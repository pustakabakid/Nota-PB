/**
 * ============================================================================
 * GOOGLE APPS SCRIPT API GATEWAY & DATABASE CONTROLLER FOR NOTA (PUSTAKA BAKI)
 * ============================================================================
 * 
 * Instructions:
 * 1. Open Google Sheets (create a new blank Spreadsheet).
 * 2. Click Extensions -> Apps Script.
 * 3. Replace all contents of Code.gs with this script.
 * 4. Run 'setupDatabaseSheets' function ONCE from Apps Script editor to initialize sheets & headers.
 * 5. Click Deploy -> New Deployment -> Select Type: Web App.
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (or Anyone with link)
 * 6. Copy the Deployment Web App URL and paste it into the Cloud Settings tab of the Nota application.
 */

// Global Constant Configuration
var SHEET_NAMES = {
  USERS: 'users',
  STORE_PROFILE: 'store_profile',
  CATALOG_PRESETS: 'catalog_presets',
  CUSTOMERS: 'customers',
  SALES_NOTES: 'sales_notes',
  SALES_NOTE_ITEMS: 'sales_note_items',
  PAYMENTS: 'payments',
  LOGIN_LOGS: 'login_logs',
  AUDIT_LOGS: 'audit_logs'
};

var SPREADSHEET_ID = '1Qzh4XR8Eu3Pfp-LjurqZkI0pb1gI2kzHQmWjvGOqImk';
var SECRET_SALT = 'NOTA_PUSTAKA_BAKI_SECURE_SALT_2026';

function getSecretSalt() {
  if (typeof SECRET_SALT !== 'undefined' && SECRET_SALT) {
    return SECRET_SALT;
  }
  return 'NOTA_PUSTAKA_BAKI_SECURE_SALT_2026';
}

var _cachedDB = null;
function getDB() {
  if (_cachedDB) return _cachedDB;
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 0) {
    try {
      _cachedDB = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
      return _cachedDB;
    } catch (e) {
      Logger.log('Fallback to getActiveSpreadsheet: ' + e.toString());
    }
  }
  _cachedDB = SpreadsheetApp.getActiveSpreadsheet();
  return _cachedDB;
}

/**
 * Helper: Password Hashing using Apps Script Utilities (SHA-256 with Salt)
 */
function hashPassword(password, salt) {
  const textToHash = (salt || getSecretSalt()) + ':' + (password || '');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, textToHash, Utilities.Charset.UTF_8);
  return digest.map(function(byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

/**
 * Helper: Generates secure session token
 */
function generateSessionToken(userId, role) {
  const timestamp = new Date().getTime();
  const raw = userId + '|' + role + '|' + timestamp + '|' + Math.random();
  const signature = Utilities.computeHmacSha256Signature(raw, getSecretSalt());
  const sigHex = signature.map(function(byte) {
    const v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
  return Utilities.base64Encode(raw) + '.' + sigHex;
}

/**
 * Helper: Verifies session token
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return null;
  }
  try {
    const parts = token.split('.');
    const raw = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
    const expectedSig = Utilities.computeHmacSha256Signature(raw, getSecretSalt()).map(function(byte) {
      const v = (byte < 0 ? byte + 256 : byte).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');

    if (parts[1] !== expectedSig) {
      return null;
    }
    const elements = raw.split('|');
    return {
      userId: elements[0],
      role: elements[1],
      timestamp: parseInt(elements[2], 10)
    };
  } catch (err) {
    return null;
  }
}

/**
 * SETUP DATABASE SHEETS & INITIAL DATA
 * Run this function once from Apps Script Editor to set up all 9 sheets with column headers.
 */
function setupDatabaseSheets() {
  const ss = getDB();

  const schemas = [
    {
      name: SHEET_NAMES.USERS,
      headers: ['id', 'username', 'password_hash', 'salt', 'name', 'role', 'is_active', 'created_at', 'updated_at']
    },
    {
      name: SHEET_NAMES.STORE_PROFILE,
      headers: ['id', 'store_name', 'store_address', 'store_phone', 'store_header_text', 'store_footer_text', 'logo_drive_url', 'qris_drive_url', 'updated_at']
    },
    {
      name: SHEET_NAMES.CATALOG_PRESETS,
      headers: ['id', 'name', 'unit_price', 'unit', 'description', 'is_active', 'created_at', 'updated_at']
    },
    {
      name: SHEET_NAMES.CUSTOMERS,
      headers: ['id', 'name', 'phone', 'address', 'created_at', 'updated_at']
    },
    {
      name: SHEET_NAMES.SALES_NOTES,
      headers: ['id', 'public_token', 'invoice_number', 'customer_id', 'customer_name_snapshot', 'customer_phone_snapshot', 'customer_address_snapshot', 'transaction_date', 'subtotal', 'discount', 'tax', 'dp', 'total', 'payment_status', 'payment_method', 'notes', 'created_by', 'created_at', 'updated_at', 'status']
    },
    {
      name: SHEET_NAMES.SALES_NOTE_ITEMS,
      headers: ['id', 'note_id', 'item_name_snapshot', 'description', 'qty', 'unit', 'unit_price', 'discount', 'subtotal']
    },
    {
      name: SHEET_NAMES.PAYMENTS,
      headers: ['id', 'note_id', 'payment_date', 'amount', 'payment_method', 'notes', 'received_by', 'created_at']
    },
    {
      name: SHEET_NAMES.LOGIN_LOGS,
      headers: ['id', 'username', 'user_id', 'ip_address', 'user_agent', 'is_success', 'failure_reason', 'created_at']
    },
    {
      name: SHEET_NAMES.AUDIT_LOGS,
      headers: ['id', 'user_id', 'username', 'action', 'target_table', 'target_id', 'details_json', 'created_at']
    }
  ];

  schemas.forEach(function(schema) {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema.headers);
      sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight('bold').setBackground('#E2E8F0');
      sheet.setFrozenRows(1);
    }
  });

  // Seed default superadmin if users sheet is empty
  const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
  if (usersSheet.getLastRow() <= 1) {
    const salt = 'superadmin_salt_123';
    const passHash = hashPassword('pbmubakid123', salt);
    usersSheet.appendRow([
      'usr-superadmin-001',
      'superadmin',
      passHash,
      salt,
      'Super Administrator',
      'superadmin',
      true,
      new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  // Seed default store profile if store_profile sheet is empty
  const storeSheet = ss.getSheetByName(SHEET_NAMES.STORE_PROFILE);
  if (storeSheet.getLastRow() <= 1) {
    storeSheet.appendRow([
      'store-main',
      'PUSTAKA BAKID',
      'Jl. Raya Muba No. 123',
      '081234567890',
      'Terima kasih atas kunjungan Anda.',
      'Terima kasih. Cetakan tidak dapat dibatalkan.',
      '',
      '',
      new Date().toISOString()
    ]);
  }

  Logger.log('Setup Database Sheets completed successfully.');
}

/**
 * MAIN HTTP POST ROUTER
 */
function doPost(e) {
  let responseData = { success: false, error: 'Invalid request payload' };
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Empty post contents' });
    }

    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const token = request.token;
    const payload = request.payload || {};

    // Allow unauthenticated public actions
    const publicActions = ['login', 'getPublicNote', 'getStoreProfile', 'migrateSupabaseData'];
    let session = null;

    if (!publicActions.includes(action)) {
      session = verifySessionToken(token);
      if (!session) {
        return createJsonResponse({ success: false, error: 'Sesi login telah berakhir atau tidak valid. Silakan login kembali.' });
      }
    }

    switch (action) {
      case 'migrateSupabaseData':
        responseData = migrateSupabaseDataToSheets(payload);
        break;
      // Auth Actions
      case 'login':
        responseData = handleLogin(payload);
        break;
      case 'getUsers':
        responseData = handleGetUsers(session);
        break;
      case 'saveUser':
        responseData = handleSaveUser(payload, session);
        break;
      case 'deleteUser':
        responseData = handleDeleteUser(payload, session);
        break;

      // Store Profile Actions
      case 'getStoreProfile':
        responseData = handleGetStoreProfile();
        break;
      case 'updateStoreProfile':
        responseData = handleUpdateStoreProfile(payload, session);
        break;

      // Catalog Actions
      case 'getCatalog':
        responseData = handleGetCatalog();
        break;
      case 'saveCatalog':
        responseData = handleSaveCatalog(payload, session);
        break;
      case 'deleteCatalog':
        responseData = handleDeleteCatalog(payload, session);
        break;

      // Customer Actions
      case 'getCustomers':
        responseData = handleGetCustomers(payload);
        break;

      // Transaction Actions
      case 'createNote':
        responseData = handleCreateNote(payload, session);
        break;
      case 'getNotes':
        responseData = handleGetNotes(payload);
        break;
      case 'getNoteById':
        responseData = handleGetNoteById(payload);
        break;
      case 'deleteNote':
        responseData = handleDeleteNote(payload, session);
        break;
      case 'addPayment':
        responseData = handleAddPayment(payload, session);
        break;

      // Public Nota Action
      case 'getPublicNote':
        responseData = handleGetPublicNote(payload);
        break;

      // Report Action
      case 'getSalesReport':
        responseData = handleGetSalesReport(payload);
        break;

      // File Upload Action (Drive)
      case 'uploadDriveFile':
        responseData = handleUploadDriveFile(payload, session);
        break;

      default:
        responseData = { success: false, error: 'Action "' + action + '" tidak dikenali.' };
    }
  } catch (err) {
    responseData = { success: false, error: 'Server Error: ' + err.toString() };
  }

  return createJsonResponse(responseData);
}

function doGet(e) {
  return createJsonResponse({ success: true, message: 'Google Apps Script API Server Nota Online' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------------
// ACTION HANDLERS IMPLEMENTATION
// ----------------------------------------------------------------------------

function handleLogin(payload) {
  const username = String(payload.username || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!username || !password) {
    return { success: false, error: 'Username dan Password wajib diisi.' };
  }

  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uName = String(row[1] || '').trim().toLowerCase();
    
    if (uName === username) {
      const isActive = row[6] === true || String(row[6]).toLowerCase() === 'true';
      if (!isActive) {
        logLoginAttempt(username, row[0], false, 'Akun dinonaktifkan oleh administrator');
        return { success: false, error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' };
      }

      const salt = row[3] || SECRET_SALT;
      const storedHash = row[2];
      const inputHash = hashPassword(password, salt);

      if (storedHash === inputHash || storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        // Successful login
        const token = generateSessionToken(row[0], row[5]);
        logLoginAttempt(username, row[0], true, null);

        return {
          success: true,
          token: token,
          user: {
            id: row[0],
            username: row[1],
            name: row[4],
            role: row[5],
            is_active: isActive
          }
        };
      } else {
        logLoginAttempt(username, row[0], false, 'Password salah');
        return { success: false, error: 'Username atau Password salah.' };
      }
    }
  }

  logLoginAttempt(username, null, false, 'Username tidak ditemukan');
  return { success: false, error: 'Username atau Password salah.' };
}

function logLoginAttempt(username, userId, isSuccess, failureReason) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName(SHEET_NAMES.LOGIN_LOGS);
    sheet.appendRow([
      'log-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
      username,
      userId || '',
      '',
      'AppsScript Client',
      isSuccess,
      failureReason || '',
      new Date().toISOString()
    ]);
  } catch (err) {
    Logger.log('Failed to log login attempt: ' + err.toString());
  }
}

function logAudit(session, action, targetTable, targetId, details) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
    sheet.appendRow([
      'audit-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
      session ? session.userId : 'system',
      session ? session.role : 'system',
      action,
      targetTable,
      targetId || '',
      JSON.stringify(details || {}),
      new Date().toISOString()
    ]);
  } catch (err) {
    Logger.log('Failed to log audit: ' + err.toString());
  }
}

function handleGetUsers(session) {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    users.push({
      id: row[0],
      username: row[1],
      name: row[4],
      role: row[5],
      isActive: row[6] === true || String(row[6]).toLowerCase() === 'true',
      createdAt: row[7],
      updatedAt: row[8]
    });
  }

  return { success: true, data: users };
}

function handleSaveUser(payload, session) {
  if (session && session.role !== 'superadmin' && session.role !== 'admin') {
    return { success: false, error: 'Akses ditolak. Hanya Admin/Superadmin yang dapat mengelola akun.' };
  }

  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  const isNew = !!payload.isNew;
  const username = String(payload.username || '').trim();
  const name = String(payload.name || username).trim();
  const role = payload.role || 'admin';
  const isActive = payload.isActive !== false;

  if (username.length < 3) {
    return { success: false, error: 'Username minimal 3 karakter.' };
  }

  // Check duplicate username
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase() === username.toLowerCase()) {
      if (isNew || row[0] !== payload.id) {
        return { success: false, error: 'Username sudah digunakan oleh akun lain.' };
      }
    }
  }

  if (isNew) {
    if (!payload.password || payload.password.length < 8) {
      return { success: false, error: 'Password minimal 8 karakter.' };
    }
    const newId = payload.id || ('usr-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
    const salt = 'salt_' + Math.random().toString(36).substring(2);
    const passHash = hashPassword(payload.password, salt);
    const now = new Date().toISOString();

    sheet.appendRow([newId, username, passHash, salt, name, role, isActive, now, now]);
    logAudit(session, 'CREATE_USER', SHEET_NAMES.USERS, newId, { username: username, role: role });
  } else {
    // Update existing user
    let foundRowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === payload.id) {
        foundRowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (foundRowIndex === -1) {
      return { success: false, error: 'User ID tidak ditemukan.' };
    }

    const now = new Date().toISOString();
    sheet.getRange(foundRowIndex, 2).setValue(username);
    sheet.getRange(foundRowIndex, 5).setValue(name);
    sheet.getRange(foundRowIndex, 6).setValue(role);
    sheet.getRange(foundRowIndex, 7).setValue(isActive);
    sheet.getRange(foundRowIndex, 9).setValue(now);

    if (payload.password && payload.password.trim().length >= 8) {
      const salt = 'salt_' + Math.random().toString(36).substring(2);
      const passHash = hashPassword(payload.password.trim(), salt);
      sheet.getRange(foundRowIndex, 3).setValue(passHash);
      sheet.getRange(foundRowIndex, 4).setValue(salt);
    }
    logAudit(session, 'UPDATE_USER', SHEET_NAMES.USERS, payload.id, { username: username, role: role });
  }

  return handleGetUsers(session);
}

function handleDeleteUser(payload, session) {
  if (!session || session.role !== 'superadmin') {
    return { success: false, error: 'Akses ditolak. Hanya Superadmin yang dapat menghapus akun.' };
  }

  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === payload.id) {
      sheet.deleteRow(i + 1);
      logAudit(session, 'DELETE_USER', SHEET_NAMES.USERS, payload.id, { id: payload.id });
      return handleGetUsers(session);
    }
  }

  return { success: false, error: 'User tidak ditemukan.' };
}

function handleGetStoreProfile() {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.STORE_PROFILE);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { success: true, data: {} };
  }

  const row = data[1];
  return {
    success: true,
    data: {
      id: row[0],
      name: row[1],
      address: row[2],
      phone: row[3],
      headerMsg: row[4],
      footerMsg: row[5],
      logoUrl: row[6],
      qrisUrl: row[7],
      updatedAt: row[8]
    }
  };
}

function handleUpdateStoreProfile(payload, session) {
  if (session && session.role !== 'superadmin' && session.role !== 'admin') {
    return { success: false, error: 'Akses ditolak.' };
  }

  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.STORE_PROFILE);
  const now = new Date().toISOString();

  if (sheet.getLastRow() <= 1) {
    sheet.appendRow([
      'store-main',
      payload.name || 'PUSTAKA BAKID',
      payload.address || '',
      payload.phone || '',
      payload.headerMsg || '',
      payload.footerMsg || '',
      payload.logoUrl || '',
      payload.qrisUrl || '',
      now
    ]);
  } else {
    sheet.getRange(2, 2).setValue(payload.name || 'PUSTAKA BAKID');
    sheet.getRange(2, 3).setValue(payload.address || '');
    sheet.getRange(2, 4).setValue(payload.phone || '');
    sheet.getRange(2, 5).setValue(payload.headerMsg || '');
    sheet.getRange(2, 6).setValue(payload.footerMsg || '');
    if (payload.logoUrl !== undefined) sheet.getRange(2, 7).setValue(payload.logoUrl);
    if (payload.qrisUrl !== undefined) sheet.getRange(2, 8).setValue(payload.qrisUrl);
    sheet.getRange(2, 9).setValue(now);
  }

  logAudit(session, 'UPDATE_STORE_PROFILE', SHEET_NAMES.STORE_PROFILE, 'store-main', payload);
  return handleGetStoreProfile();
}

function handleGetCatalog() {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.CATALOG_PRESETS);
  const data = sheet.getDataRange().getValues();
  const catalog = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    catalog.push({
      id: row[0],
      name: row[1],
      price: Number(row[2] || 0),
      unit: row[3] || 'pcs',
      description: row[4] || '',
      isActive: row[5] === true || String(row[5]).toLowerCase() === 'true',
      createdAt: row[6],
      updatedAt: row[7]
    });
  }

  return { success: true, data: catalog };
}

function handleSaveCatalog(payload, session) {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.CATALOG_PRESETS);
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow !== -1) {
    sheet.getRange(existingRow, 2).setValue(payload.name);
    sheet.getRange(existingRow, 3).setValue(Number(payload.price || 0));
    sheet.getRange(existingRow, 4).setValue(payload.unit || 'pcs');
    sheet.getRange(existingRow, 5).setValue(payload.description || '');
    sheet.getRange(existingRow, 6).setValue(payload.isActive !== false);
    sheet.getRange(existingRow, 8).setValue(now);
  } else {
    const newId = payload.id || ('cat-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
    sheet.appendRow([
      newId,
      payload.name,
      Number(payload.price || 0),
      payload.unit || 'pcs',
      payload.description || '',
      payload.isActive !== false,
      now,
      now
    ]);
  }

  return handleGetCatalog();
}

function handleDeleteCatalog(payload, session) {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.CATALOG_PRESETS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  return handleGetCatalog();
}

function handleGetCustomers(payload) {
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  const data = sheet.getDataRange().getValues();
  const customers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    customers.push({
      id: row[0],
      name: row[1],
      phone: row[2],
      address: row[3],
      createdAt: row[4],
      updatedAt: row[5]
    });
  }

  return { success: true, data: customers };
}

/**
 * CONCURRENCY-SAFE & IDEMPOTENT NOTE CREATION (LockService)
 */
function handleCreateNote(payload, session) {
  const lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent requests to complete sequentially
  const acquired = lock.tryLock(10000);
  if (!acquired) {
    return { success: false, error: 'Server sibuk saat memproses transaksi. Silakan coba kembali.' };
  }

  try {
    const ss = getDB();
    const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
    const itemsSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTE_ITEMS);
    const notesData = notesSheet.getDataRange().getValues();

    const noteId = payload.id || ('nt-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));

    // IDEMPOTENCY CHECK: If transaction ID already exists, return existing record without duplicating
    for (let i = 1; i < notesData.length; i++) {
      if (String(notesData[i][0]) === String(noteId)) {
        lock.releaseLock();
        return handleGetNoteById({ note_id: noteId });
      }
    }

    // Generate safe sequential invoice number NT-YYYYMMDD-XXX
    const now = new Date();
    const dateStr = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    
    let maxCounter = 0;
    const prefix = 'NT-' + dateStr + '-';
    for (let i = 1; i < notesData.length; i++) {
      const existingInvoice = String(notesData[i][2] || '');
      if (existingInvoice.startsWith(prefix)) {
        const counterPart = parseInt(existingInvoice.replace(prefix, ''), 10);
        if (!isNaN(counterPart) && counterPart > maxCounter) {
          maxCounter = counterPart;
        }
      }
    }

    const nextCounterStr = String(maxCounter + 1).padStart(3, '0');
    const invoiceNumber = payload.invoice_number || (prefix + nextCounterStr);
    const publicToken = payload.public_token || ('tok-' + new Date().getTime() + '-' + Math.random().toString(36).substring(2, 10));
    const isoNow = now.toISOString();

    // Append Master Sales Note
    notesSheet.appendRow([
      noteId,
      publicToken,
      invoiceNumber,
      payload.customer_id || '',
      payload.custName || 'Pelanggan Umum',
      payload.custPhone || '',
      payload.custAddress || '',
      payload.date || isoNow,
      Number(payload.subtotal || 0),
      Number(payload.discount || 0),
      Number(payload.tax || 0),
      Number(payload.dp || 0),
      Number(payload.grandTotal || 0),
      payload.payStatus || 'Lunas',
      payload.payMethod || 'Cash',
      payload.catatan || '',
      session ? session.userId : (payload.createdBy || 'kasir'),
      isoNow,
      isoNow,
      'active'
    ]);

    // Append Detail Sales Note Items (Snapshot Data)
    const items = payload.items || [];
    items.forEach(function(item, idx) {
      const itemId = item.id || ('item-' + noteId + '-' + (idx + 1));
      itemsSheet.appendRow([
        itemId,
        noteId,
        item.name || 'Pekerjaan Cetak',
        formatItemSpecsText(item),
        Number(item.qty || 1),
        item.type || 'pcs',
        Number(item.price || 0),
        Number(item.discount || 0),
        Number(item.subtotal || (item.qty * item.price))
      ]);
    });

    logAudit(session, 'CREATE_NOTE', SHEET_NAMES.SALES_NOTES, noteId, { invoiceNumber: invoiceNumber, total: payload.grandTotal });

    lock.releaseLock();
    return handleGetNoteById({ note_id: noteId });

  } catch (err) {
    lock.releaseLock();
    return { success: false, error: 'Gagal membuat nota: ' + err.toString() };
  }
}

function formatItemSpecsText(item) {
  if (!item) return '';
  const specs = [];
  if (item.length && item.width) specs.push(item.length + 'x' + item.width + ' cm');
  if (item.finishing) specs.push('Finishing: ' + item.finishing);
  if (item.bookTitle) specs.push('Judul: "' + item.bookTitle + '"');
  if (item.bookSize) specs.push('Ukuran: ' + item.bookSize);
  if (item.bookPages) specs.push(item.bookPages + ' hlm');
  return specs.join(' | ');
}

function handleGetNotes(payload) {
  const limit = Number(payload.limit || 50);
  const page = Number(payload.page || 1);
  const search = String(payload.search || '').trim().toLowerCase();
  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;

  const ss = getDB();
  const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const data = notesSheet.getDataRange().getValues();

  let filtered = [];

  for (let i = data.length - 1; i >= 1; i--) { // Reverse order (newest first)
    const row = data[i];
    const status = row[19];
    if (status === 'deleted') continue; // Exclude soft-deleted

    const invoiceNo = String(row[2] || '').toLowerCase();
    const custName = String(row[4] || '').toLowerCase();
    const custPhone = String(row[5] || '').toLowerCase();
    const trDate = new Date(row[7]);

    if (search && !invoiceNo.includes(search) && !custName.includes(search) && !custPhone.includes(search)) {
      continue;
    }

    if (startDate && trDate < startDate) continue;
    if (endDate && trDate > endDate) continue;

    filtered.push({
      id: row[0],
      publicToken: row[1],
      noNota: row[2],
      customerId: row[3],
      custName: row[4],
      custPhone: row[5],
      custAddress: row[6],
      date: row[7],
      subtotal: Number(row[8] || 0),
      discount: Number(row[9] || 0),
      tax: Number(row[10] || 0),
      dp: Number(row[11] || 0),
      grandTotal: Number(row[12] || 0),
      payStatus: row[13],
      payMethod: row[14],
      catatan: row[15],
      createdBy: row[16],
      createdAt: row[17],
      updatedAt: row[18],
      status: row[19]
    });
  }

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const startIdx = (page - 1) * limit;
  const paginatedNotes = filtered.slice(startIdx, startIdx + limit);

  return {
    success: true,
    data: {
      notes: paginatedNotes,
      totalCount: totalCount,
      page: page,
      totalPages: totalPages
    }
  };
}

function handleGetNoteById(payload) {
  const noteId = String(payload.note_id || payload.id || '');
  if (!noteId) return { success: false, error: 'ID Nota wajib diisi.' };

  const ss = getDB();
  const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const itemsSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTE_ITEMS);

  const notesData = notesSheet.getDataRange().getValues();
  let noteRow = null;

  for (let i = 1; i < notesData.length; i++) {
    if (String(notesData[i][0]) === noteId) {
      noteRow = notesData[i];
      break;
    }
  }

  if (!noteRow) return { success: false, error: 'Nota tidak ditemukan.' };

  const itemsData = itemsSheet.getDataRange().getValues();
  const items = [];

  for (let j = 1; j < itemsData.length; j++) {
    if (String(itemsData[j][1]) === noteId) {
      const row = itemsData[j];
      items.push({
        id: row[0],
        name: row[2],
        description: row[3],
        qty: Number(row[4] || 1),
        type: row[5] || 'pcs',
        price: Number(row[6] || 0),
        discount: Number(row[7] || 0),
        subtotal: Number(row[8] || 0)
      });
    }
  }

  const grandTotal = Number(noteRow[12] || 0);
  const dp = Number(noteRow[11] || 0);
  const sisa = noteRow[13] === 'Lunas' ? 0 : Math.max(0, grandTotal - dp);

  return {
    success: true,
    data: {
      id: noteRow[0],
      publicToken: noteRow[1],
      noNota: noteRow[2],
      customerId: noteRow[3],
      custName: noteRow[4],
      custPhone: noteRow[5],
      custAddress: noteRow[6],
      date: noteRow[7],
      subtotal: Number(noteRow[8] || 0),
      discount: Number(noteRow[9] || 0),
      tax: Number(noteRow[10] || 0),
      dp: dp,
      grandTotal: grandTotal,
      sisa: sisa,
      payStatus: noteRow[13],
      payMethod: noteRow[14],
      catatan: noteRow[15],
      createdBy: noteRow[16],
      createdAt: noteRow[17],
      items: items
    }
  };
}

function handleGetPublicNote(payload) {
  const token = String(payload.public_token || payload.token || payload.nota || '');
  if (!token) return { success: false, error: 'Public Token Nota tidak tertera.' };

  const ss = getDB();
  const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const notesData = notesSheet.getDataRange().getValues();

  let targetId = null;
  for (let i = 1; i < notesData.length; i++) {
    if (String(notesData[i][1]) === token || String(notesData[i][2]) === token || String(notesData[i][0]) === token) {
      targetId = notesData[i][0];
      break;
    }
  }

  if (!targetId) return { success: false, error: 'Nota publik tidak ditemukan.' };

  const noteResult = handleGetNoteById({ note_id: targetId });
  const storeResult = handleGetStoreProfile();

  if (!noteResult.success) return noteResult;

  return {
    success: true,
    data: {
      note: noteResult.data,
      store: storeResult.data || {}
    }
  };
}

function handleDeleteNote(payload, session) {
  if (!session || (session.role !== 'superadmin' && session.role !== 'admin')) {
    return { success: false, error: 'Akses ditolak. Hanya Admin/Superadmin yang dapat menghapus nota.' };
  }

  const noteId = payload.note_id || payload.id;
  const ss = getDB();
  const sheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(noteId)) {
      sheet.getRange(i + 1, 20).setValue('deleted');
      sheet.getRange(i + 1, 19).setValue(new Date().toISOString());
      logAudit(session, 'DELETE_NOTE', SHEET_NAMES.SALES_NOTES, noteId, { reason: payload.reason || 'Manual Soft Delete' });
      return { success: true, message: 'Nota berhasil dihapus (Soft Delete).' };
    }
  }

  return { success: false, error: 'Nota tidak ditemukan.' };
}

function handleAddPayment(payload, session) {
  const ss = getDB();
  const paymentsSheet = ss.getSheetByName(SHEET_NAMES.PAYMENTS);
  const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const now = new Date().toISOString();

  const noteId = payload.note_id;
  const amount = Number(payload.amount || 0);

  // Append new payment record
  paymentsSheet.appendRow([
    'pay-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
    noteId,
    now,
    amount,
    payload.payment_method || 'Cash',
    payload.notes || 'Pelanggan melunasi tagihan',
    session ? session.userId : 'kasir',
    now
  ]);

  // Update note status
  const notesData = notesSheet.getDataRange().getValues();
  for (let i = 1; i < notesData.length; i++) {
    if (String(notesData[i][0]) === String(noteId)) {
      const grandTotal = Number(notesData[i][12] || 0);
      const currentDP = Number(notesData[i][11] || 0);
      const newTotalPaid = currentDP + amount;

      notesSheet.getRange(i + 1, 12).setValue(newTotalPaid);
      if (newTotalPaid >= grandTotal) {
        notesSheet.getRange(i + 1, 14).setValue('Lunas');
      }
      notesSheet.getRange(i + 1, 19).setValue(now);
      break;
    }
  }

  logAudit(session, 'ADD_PAYMENT', SHEET_NAMES.PAYMENTS, noteId, { amount: amount });
  return handleGetNoteById({ note_id: noteId });
}

function handleGetSalesReport(payload) {
  const startDate = payload.startDate ? new Date(payload.startDate) : null;
  const endDate = payload.endDate ? new Date(payload.endDate) : null;

  const ss = getDB();
  const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
  const data = notesSheet.getDataRange().getValues();

  let totalOmzet = 0;
  let totalDP = 0;
  let totalLunas = 0;
  let totalBelumLunas = 0;
  let matchingNotes = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[19] === 'deleted') continue;

    const trDate = new Date(row[7]);
    if (startDate && trDate < startDate) continue;
    if (endDate && trDate > endDate) continue;

    const grandTotal = Number(row[12] || 0);
    const dp = Number(row[11] || 0);
    const payStatus = row[13];

    totalOmzet += grandTotal;
    if (payStatus === 'Lunas') {
      totalLunas += grandTotal;
    } else if (payStatus === 'DP') {
      totalDP += dp;
      totalBelumLunas += Math.max(0, grandTotal - dp);
    } else {
      totalBelumLunas += grandTotal;
    }

    matchingNotes.push({
      noNota: row[2],
      date: row[7],
      custName: row[4],
      grandTotal: grandTotal,
      dp: dp,
      payStatus: payStatus,
      payMethod: row[14]
    });
  }

  return {
    success: true,
    data: {
      summary: {
        totalOmzet: totalOmzet,
        totalNotes: matchingNotes.length,
        totalDP: totalDP,
        totalLunas: totalLunas,
        totalBelumLunas: totalBelumLunas
      },
      notes: matchingNotes
    }
  };
}

function handleUploadDriveFile(payload, session) {
  if (!payload.base64Data || !payload.filename) {
    return { success: false, error: 'Data base64 dan nama file wajib disertakan.' };
  }

  try {
    // Support custom folder name per upload context (e.g. Nota_Vendor_P1)
    var folderName = payload.folderName || 'Nota_Assets_Storage';
    var folder;
    var folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var contentType = payload.mimeType || 'image/png';
    // Strip data URI prefix for any MIME type (image or PDF)
    var base64Clean = payload.base64Data.replace(/^data:[^;]+;base64,/, '');
    var decoded = Utilities.base64Decode(base64Clean);
    var blob = Utilities.newBlob(decoded, contentType, payload.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Use Drive viewer URL so both PDF and images open correctly in browser
    var fileId = file.getId();
    var fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
    var previewUrl = 'https://drive.google.com/file/d/' + fileId + '/preview';
    var thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';

    return {
      success: true,
      data: {
        fileId: fileId,
        fileUrl: fileUrl,
        previewUrl: previewUrl,
        thumbnailUrl: thumbnailUrl
      }
    };
  } catch (err) {
    return { success: false, error: 'Gagal mengunggah file ke Google Drive: ' + err.toString() };
  }
}

function migrateSupabaseDataToSheets(payload) {
  if (!payload) {
    return { success: false, error: 'Migration payload is required.' };
  }

  const ss = getDB();

  // 1. Migrate Users
  if (Array.isArray(payload.users)) {
    const usersSheet = ss.getSheetByName(SHEET_NAMES.USERS);
    payload.users.forEach(function(u) {
      // Check duplicate user id or username before appending
      let exists = false;
      const data = usersSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === u.id || String(data[i][1]).toLowerCase() === String(u.username).toLowerCase()) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        usersSheet.appendRow([
          u.id,
          u.username,
          u.password_hash || u.password,
          u.salt || 'legacy_salt',
          u.name || u.username,
          u.role || 'admin',
          u.is_active !== false,
          u.created_at || new Date().toISOString(),
          u.updated_at || new Date().toISOString()
        ]);
      }
    });
  }

  // 2. Migrate Store Profile
  if (payload.store_profile) {
    const storeSheet = ss.getSheetByName(SHEET_NAMES.STORE_PROFILE);
    const s = payload.store_profile;
    if (storeSheet.getLastRow() <= 1) {
      storeSheet.appendRow([
        'store-main',
        s.name || s.store_name,
        s.address || s.store_address,
        s.phone || s.store_phone,
        s.footer_msg || s.store_footer_text,
        'Terima kasih. Cetakan tidak dapat dibatalkan.',
        s.logo_url || '',
        s.qris_url || '',
        new Date().toISOString()
      ]);
    }
  }

  // 3. Migrate Catalog Presets
  if (Array.isArray(payload.catalog_presets)) {
    const catalogSheet = ss.getSheetByName(SHEET_NAMES.CATALOG_PRESETS);
    const cData = catalogSheet.getDataRange().getValues();
    payload.catalog_presets.forEach(function(c) {
      let exists = false;
      for (let i = 1; i < cData.length; i++) {
        if (String(cData[i][0]) === String(c.id)) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        catalogSheet.appendRow([
          c.id,
          c.name,
          Number(c.price || c.unit_price || 0),
          c.type || c.unit || 'pcs',
          c.finishing || c.description || '',
          c.is_active !== false,
          c.created_at || new Date().toISOString(),
          new Date().toISOString()
        ]);
      }
    });
  }

  // 4. Migrate Sales Notes & Sales Note Items
  let importedNotesCount = 0;
  let importedItemsCount = 0;
  let totalOmzetImported = 0;

  if (Array.isArray(payload.sales_notes)) {
    const notesSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTES);
    const itemsSheet = ss.getSheetByName(SHEET_NAMES.SALES_NOTE_ITEMS);
    const nData = notesSheet.getDataRange().getValues();

    payload.sales_notes.forEach(function(n) {
      let exists = false;
      for (let i = 1; i < nData.length; i++) {
        if (String(nData[i][0]) === String(n.id)) {
          exists = true;
          break;
        }
      }

      if (!exists) {
        notesSheet.appendRow([
          n.id,
          n.public_token || n.no_nota,
          n.no_nota || n.invoice_number,
          n.customer_id || '',
          n.cust_name || n.customer_name_snapshot || 'Pelanggan Umum',
          n.cust_phone || n.customer_phone_snapshot || '',
          n.cust_address || n.customer_address_snapshot || '',
          n.date || n.transaction_date || new Date().toISOString(),
          Number(n.subtotal || n.grand_total || 0),
          Number(n.discount || 0),
          Number(n.tax || 0),
          Number(n.dp || 0),
          Number(n.grand_total || n.total || 0),
          n.pay_status || n.payment_status || 'Lunas',
          n.pay_method || n.payment_method || 'Cash',
          n.catatan || n.notes || '',
          n.created_by || 'kasir',
          n.created_at || new Date().toISOString(),
          n.updated_at || new Date().toISOString(),
          'active'
        ]);

        importedNotesCount++;
        totalOmzetImported += Number(n.grand_total || n.total || 0);

        if (Array.isArray(n.items)) {
          n.items.forEach(function(item, idx) {
            itemsSheet.appendRow([
              item.id || ('item-' + n.id + '-' + (idx + 1)),
              n.id,
              item.name || 'Pekerjaan Cetak',
              item.finishing || item.description || '',
              Number(item.qty || 1),
              item.type || item.unit || 'pcs',
              Number(item.price || item.unit_price || 0),
              Number(item.discount || 0),
              Number(item.subtotal || (item.qty * item.price) || 0)
            ]);
            importedItemsCount++;
          });
        }
      }
    });
  }

  return {
    success: true,
    integrityCheck: {
      importedNotesCount: importedNotesCount,
      importedItemsCount: importedItemsCount,
      totalOmzetImported: totalOmzetImported
    }
  };
}
