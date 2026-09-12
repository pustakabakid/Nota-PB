/* ==========================================================================
   Unified Database & API Layer (Google Sheets / Apps Script Repository)
   ========================================================================== */

import {
  isAppsScriptConnected,
  getAppsScriptConfig,
  saveAppsScriptConfig
} from './appsScriptClient';

import {
  fetchStoreProfileApi,
  saveStoreProfileApi,
  fetchCatalogApi,
  saveCatalogPresetApi,
  deleteCatalogPresetApi,
  fetchHistoryApi,
  fetchTransactionByNoNotaApi,
  saveTransactionApi,
  deleteTransactionApi,
  loginApi,
  logoutApi,
  fetchAccountsApi,
  saveAccountApi,
  deleteAccountApi,
  uploadDriveAssetApi,
  fetchFinancesApi,
  savePurchaseApi,
  deletePurchaseApi,
  saveExpenseApi,
  deleteExpenseApi,
  saveOtherIncomeApi,
  deleteOtherIncomeApi
} from './googleSheetsApi';

// --------------------------------------------------------------------------
// COMPATIBILITY ALIASED EXPORTS FOR FRONTEND COMPONENTS
// --------------------------------------------------------------------------
export const isSupabaseConnected = () => isAppsScriptConnected();
export const getSupabaseConfig = () => {
  const { url } = getAppsScriptConfig();
  return { url: url, key: 'google_apps_script' };
};
export const saveSupabaseConfig = (url, _key) => {
  saveAppsScriptConfig(url);
};
export const getSupabase = () => {
  return isAppsScriptConnected() ? true : null;
};

// Re-export repository APIs
export {
  fetchStoreProfileApi,
  saveStoreProfileApi,
  fetchCatalogApi,
  saveCatalogPresetApi,
  deleteCatalogPresetApi,
  fetchHistoryApi,
  fetchTransactionByNoNotaApi,
  saveTransactionApi,
  deleteTransactionApi,
  loginApi,
  logoutApi,
  fetchAccountsApi,
  saveAccountApi,
  deleteAccountApi,
  uploadDriveAssetApi,
  fetchFinancesApi,
  savePurchaseApi,
  deletePurchaseApi,
  saveExpenseApi,
  deleteExpenseApi,
  saveOtherIncomeApi,
  deleteOtherIncomeApi
};
