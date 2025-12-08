import { GoogleUser } from '../types';

// Client ID from Google Cloud Console
const CLIENT_ID = '155749101771-lvmc383eus9pg407dedlp3r2q330gukj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

const STORAGE_KEY_TOKEN = 'yds_leads_token';
const STORAGE_KEY_USER = 'yds_leads_user';
const STORAGE_KEY_EXPIRY = 'yds_leads_expiry';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// --- 1. Robust Storage (Iframe Safe with Memory Fallback) ---
const memoryStorage: Record<string, string> = {};

export const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // Fallback to memory if localStorage is blocked (common in iframes)
        memoryStorage[key] = value;
    }
};

export const safeGetItem = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return memoryStorage[key] || null;
    }
};

export const safeRemoveItem = (key: string) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        delete memoryStorage[key];
    }
};

// --- 2. Dynamic Script Loading ---
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

export const initGoogleAuth = async (onInitComplete: (success: boolean) => void) => {
  if (gapiInited && gisInited) {
      onInitComplete(true);
      return;
  }

  try {
    await Promise.all([
      loadScript('https://accounts.google.com/gsi/client'),
      loadScript('https://apis.google.com/js/api.js')
    ]);

    await new Promise<void>((resolve, reject) => {
        if (window.gapi) {
            window.gapi.load('client', resolve);
        } else {
            reject(new Error("GAPI not loaded"));
        }
    });

    await window.gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;

    if (window.google?.accounts?.oauth2) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Defined dynamically
            // error_callback will be overridden in requests
        });
        gisInited = true;
    }

    onInitComplete(true);

  } catch (err) {
    console.warn("Google Auth Init Error (Running offline/guest mode):", err);
    onInitComplete(false);
  }
};

// --- 3. Session Management ---

const saveSession = (accessToken: string, user: GoogleUser, expiresIn: string) => {
  // Set explicit expiry or default to 55 minutes (token usually lasts 60m)
  const expiresInSeconds = parseInt(expiresIn) || 3599;
  const expiryTime = Date.now() + (expiresInSeconds * 1000);
  
  safeSetItem(STORAGE_KEY_TOKEN, accessToken);
  safeSetItem(STORAGE_KEY_USER, JSON.stringify(user));
  safeSetItem(STORAGE_KEY_EXPIRY, expiryTime.toString());
};

export const restoreSession = (): { accessToken: string, user: GoogleUser } | null => {
  const token = safeGetItem(STORAGE_KEY_TOKEN);
  const userStr = safeGetItem(STORAGE_KEY_USER);
  const expiryStr = safeGetItem(STORAGE_KEY_EXPIRY);

  if (!token || !userStr || !expiryStr) return null;

  const expiry = parseInt(expiryStr);
  
  // If expired, return null so App knows to try silent refresh
  if (Date.now() >= expiry) {
    // Don't remove immediately, we might need user email for hint in refresh
    return null; 
  }

  try {
    return { accessToken: token, user: JSON.parse(userStr) };
  } catch (e) {
    return null;
  }
};

// --- 4. Auth Actions ---

export const loginToGoogle = (): Promise<{ accessToken: string, user: GoogleUser }> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject("Google Auth not initialized");

    // Fix: Handle Popup Closed / Blocked events
    tokenClient.error_callback = (err: any) => {
        console.error("Login Popup Error:", err);
        reject(err);
    };

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      
      const accessToken = resp.access_token;
      const expiresIn = resp.expires_in;

      try {
        const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userInfo = await userInfoResp.json();
        
        const user: GoogleUser = {
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture
        };

        saveSession(accessToken, user, expiresIn);
        resolve({ accessToken, user });
      } catch (error) {
        reject(error);
      }
    };

    try {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch(e) {
        reject(e);
    }
  });
};

// Try to get a new token silently without user interaction
export const trySilentRefresh = (): Promise<{ accessToken: string, user: GoogleUser } | null> => {
    return new Promise((resolve) => {
        if (!tokenClient) {
            resolve(null);
            return;
        }

        // Try to recover user hint from storage even if expired
        let userHint = '';
        try {
            const u = JSON.parse(safeGetItem(STORAGE_KEY_USER) || '{}');
            userHint = u.email || '';
        } catch(e) {}

        // Fix: Handle silent errors (e.g. 3rd party cookies blocked)
        tokenClient.error_callback = (err: any) => {
            console.warn("Silent Refresh Error:", err);
            resolve(null);
        };

        tokenClient.callback = async (resp: any) => {
            if (resp.error) {
                // Silent refresh failed (user needs to log in again)
                safeRemoveItem(STORAGE_KEY_TOKEN);
                safeRemoveItem(STORAGE_KEY_USER);
                safeRemoveItem(STORAGE_KEY_EXPIRY);
                resolve(null);
            } else {
                // Success! We have a new token.
                const accessToken = resp.access_token;
                const expiresIn = resp.expires_in;
                
                // We reuse the existing user info if available to save a fetch, or re-fetch
                let user: GoogleUser;
                try {
                     const storedUser = safeGetItem(STORAGE_KEY_USER);
                     if (storedUser) {
                         user = JSON.parse(storedUser);
                     } else {
                         // Fallback fetch if somehow missing
                         const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${accessToken}` }
                         });
                         const u = await r.json();
                         user = { name: u.name, email: u.email, picture: u.picture };
                     }
                     
                     saveSession(accessToken, user, expiresIn);
                     resolve({ accessToken, user });
                } catch (e) {
                    resolve(null);
                }
            }
        };

        // 'none' prompt throws error if not logged in, but tokenClient catches it in callback usually?
        // Actually GIS guidelines say prompt='none' is how you do background refresh
        try {
            tokenClient.requestAccessToken({ prompt: 'none', login_hint: userHint });
        } catch (e) {
            console.warn("Silent refresh exception", e);
            resolve(null);
        }
    });
};

export const logoutGoogle = () => {
  safeRemoveItem(STORAGE_KEY_TOKEN);
  safeRemoveItem(STORAGE_KEY_USER);
  safeRemoveItem(STORAGE_KEY_EXPIRY);

  if (window.gapi?.client?.getToken()) {
      window.gapi.client.setToken(null);
  }
  
  if (window.google?.accounts?.oauth2) {
      try {
          window.google.accounts.oauth2.revoke(safeGetItem(STORAGE_KEY_TOKEN), () => {});
      } catch (e) {}
  }
};