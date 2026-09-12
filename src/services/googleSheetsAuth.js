/* ==========================================================================
   Google Sheets OAuth2 Service Account Authentication Gateway
   Uses Native Web Crypto API (crypto.subtle) for ultra-fast RS256 JWT signing
   ========================================================================== */

import serviceAccountKey from '../../nota-bakid-app-15fe71ccb737.json';

const SPREADSHEET_ID = '1Qzh4XR8Eu3Pfp-LjurqZkI0pb1gI2kzHQmWjvGOqImk';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

function base64UrlEncode(strOrUint8) {
  let base64 = '';
  if (typeof strOrUint8 === 'string') {
    base64 = btoa(unescape(encodeURIComponent(strOrUint8)));
  } else {
    let binary = '';
    const bytes = new Uint8Array(strOrUint8);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToBinary(pem) {
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(cleanPem);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array.buffer;
}

async function importPrivateKey(pemKey) {
  const binaryDer = pemToBinary(pemKey);
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
}

export const getAccessToken = async () => {
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least another 60 seconds
  if (cachedAccessToken && tokenExpiresAt > nowInSeconds + 60) {
    return cachedAccessToken;
  }

  try {
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccountKey.client_email,
      scope: SCOPES,
      aud: TOKEN_URI,
      exp: nowInSeconds + 3600,
      iat: nowInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const cryptoKey = await importPrivateKey(serviceAccountKey.private_key);
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    const encodedSignature = base64UrlEncode(signatureBuffer);
    const jwt = `${unsignedToken}.${encodedSignature}`;

    const response = await fetch(TOKEN_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OAuth token fetch failed: ${response.status} ${errText}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = nowInSeconds + (data.expires_in || 3600);

    return cachedAccessToken;
  } catch (err) {
    console.error('Failed to obtain Google Sheets OAuth access token:', err);
    throw err;
  }
};

export const getSpreadsheetId = () => SPREADSHEET_ID;
