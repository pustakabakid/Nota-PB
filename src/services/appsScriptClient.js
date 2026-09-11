/* ==========================================================================
   Google Apps Script Client Engine & Configuration Manager
   ========================================================================== */

const STORAGE_KEYS = {
  URL: 'nota_gas_web_app_url',
  TOKEN: 'nota_gas_session_token'
};

/**
 * Gets configured Google Apps Script Web App URL from env or LocalStorage
 */
export const getAppsScriptConfig = () => {
  const defaultUrl = 'https://script.google.com/macros/s/AKfycbyd3IRIUuron6NKVC_BjM34-68Ueh42kMDaM2hsDDdruhlERvyb6sr3FEYY7o9UcvlF/exec';
  const envUrl = import.meta.env.VITE_GAS_WEB_APP_URL || '';
  const localUrl = localStorage.getItem(STORAGE_KEYS.URL) || '';
  return {
    url: localUrl || envUrl || defaultUrl
  };
};

/**
 * Saves Google Apps Script Web App URL to LocalStorage
 */
export const saveAppsScriptConfig = (url) => {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.URL);
  }
};

/**
 * Session Token Getter/Setter
 */
export const getSessionToken = () => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN) || '';
};

export const saveSessionToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
};

export const clearSessionToken = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const isAppsScriptConnected = () => {
  const { url } = getAppsScriptConfig();
  return !!url && url.startsWith('https://script.google.com/');
};

/**
 * Core API Dispatcher: Sends POST requests to Google Apps Script Gateway
 * @param {string} action - Action name (e.g. 'login', 'createNote')
 * @param {Object} payload - Data payload
 * @returns {Promise<Object>}
 */
export const callAppsScriptApi = async (action, payload = {}) => {
  const { url } = getAppsScriptConfig();
  if (!url) {
    return {
      success: false,
      error: 'URL Google Apps Script belum terkonfigurasi. Buka Tab Cloud Config untuk memasukkan URL Web App.'
    };
  }

  const token = getSessionToken();
  const requestBody = {
    action: action,
    token: token,
    payload: payload
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Avoid CORS preflight OPTIONS request in Apps Script
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP Error ${response.status}: ${response.statusText}`
      };
    }

    const json = await response.json();
    return json;
  } catch (err) {
    console.warn(`AppsScript API Call (${action}) network error:`, err);
    return {
      success: false,
      error: 'Gagal terhubung ke Google Apps Script: ' + (err.message || 'Periksa koneksi internet Anda.')
    };
  }
};
