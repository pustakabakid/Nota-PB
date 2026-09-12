/* ==========================================================================
   Supabase Compatibility Bridge Module
   (Delegates all cloud configuration to Google Apps Script Engine)
   ========================================================================== */

import { isAppsScriptConnected, getAppsScriptConfig, saveAppsScriptConfig } from './appsScriptClient';

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

export const isSupabaseConnected = () => {
  return isAppsScriptConnected();
};

export const SQL_SCHEMA_QUERY = `-- GOOGLE APPS SCRIPT BACKEND ACTIVE --`;
