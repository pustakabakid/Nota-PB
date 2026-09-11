/**
 * ============================================================================
 * SUPABASE TO GOOGLE SHEETS AUTOMATED MIGRATION & INTEGRITY CHECKER SCRIPT
 * ============================================================================
 * 
 * Instructions:
 * 1. Export your Supabase data as JSON for each table:
 *    - user_accounts -> users.json
 *    - store_profile -> store_profile.json
 *    - catalog_presets -> catalog_presets.json
 *    - transactions & transaction_items -> sales_notes.json & sales_note_items.json
 * 2. Paste the JSON payloads into the function parameters below and run 'migrateSupabaseDataToSheets'.
 */

function migrateSupabaseDataToSheets(payload) {
  if (!payload) {
    return { success: false, error: 'Migration payload is required.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Migrate Users
  if (Array.isArray(payload.users)) {
    const usersSheet = ss.getSheetByName('users');
    payload.users.forEach(function(u) {
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
    });
  }

  // 2. Migrate Store Profile
  if (payload.store_profile) {
    const storeSheet = ss.getSheetByName('store_profile');
    const s = payload.store_profile;
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

  // 3. Migrate Catalog Presets
  if (Array.isArray(payload.catalog_presets)) {
    const catalogSheet = ss.getSheetByName('catalog_presets');
    payload.catalog_presets.forEach(function(c) {
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
    });
  }

  // 4. Migrate Sales Notes & Sales Note Items
  let importedNotesCount = 0;
  let importedItemsCount = 0;
  let totalOmzetImported = 0;

  if (Array.isArray(payload.sales_notes)) {
    const notesSheet = ss.getSheetByName('sales_notes');
    const itemsSheet = ss.getSheetByName('sales_note_items');

    payload.sales_notes.forEach(function(n) {
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
