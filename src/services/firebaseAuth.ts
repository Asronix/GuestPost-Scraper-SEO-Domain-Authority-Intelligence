/**
 * Firebase Auth & Google Workspace OAuth Token Manager
 * Manages client-side authentication and in-memory access token storage
 * for Google Sheets and Drive APIs.
 * Includes Google Identity Services fallback when preview domain is not in Firebase Authorized Domains.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory token & user storage (Do NOT store in localStorage/sessionStorage per skill guidelines)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else if (cachedUser && cachedAccessToken) {
      // Retain active GIS-authenticated session
      if (onAuthSuccess) onAuthSuccess(cachedUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      cachedUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Direct Google Identity Services (OAuth Token Client)
 * Used as a seamless fallback when the Cloud Run preview domain is not yet
 * allowlisted in Firebase Console -> Authentication -> Authorized Domains.
 */
async function signInWithGoogleIdentityServices(clientId: string): Promise<{ user: User; accessToken: string }> {
  if (!clientId) {
    throw new Error('OAuth Client ID is not configured.');
  }

  // Ensure Google Identity Services script is available
  if (!window.google?.accounts?.oauth2) {
    await new Promise<void>((resolve, reject) => {
      if (window.google?.accounts?.oauth2) return resolve();
      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
        setTimeout(() => {
          if (window.google?.accounts?.oauth2) resolve();
          else reject(new Error('Google Identity Services load timeout'));
        }, 3500);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_SCOPES.join(' '),
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === 'access_denied') {
              reject(new Error('Sign-in was cancelled by user.'));
              return;
            }
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (!tokenResponse.access_token) {
            reject(new Error('No access token received from Google'));
            return;
          }

          const accessToken = tokenResponse.access_token;
          cachedAccessToken = accessToken;

          // Fetch user profile info using the obtained token
          let userProfile: any = null;
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (userRes.ok) {
              const info = await userRes.json();
              userProfile = {
                uid: info.sub || 'google-user',
                email: info.email || 'user@gmail.com',
                displayName: info.name || info.email?.split('@')[0] || 'Google User',
                photoURL: info.picture || null,
                emailVerified: Boolean(info.email_verified)
              };
            }
          } catch {}

          if (!userProfile) {
            userProfile = {
              uid: 'google-user',
              email: 'Connected Google Account',
              displayName: 'Google Sheets User',
              photoURL: null,
              emailVerified: true
            };
          }

          cachedUser = userProfile as unknown as User;
          resolve({ user: cachedUser, accessToken });
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  // If already in middle of popup flow, prevent triggering conflicting popups
  if (isSigningIn) {
    return null;
  }

  try {
    isSigningIn = true;
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle standard popup closure and cancellation events without throwing
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      return null;
    }

    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
    }

    // Handle auth/unauthorized-domain seamlessly via Google Identity Services
    if (error?.code === 'auth/unauthorized-domain') {
      console.warn('Firebase Auth: domain is not yet in Authorized Domains. Attempting Google Identity Services token client...');
      try {
        if (firebaseConfig.oAuthClientId) {
          const gisResult = await signInWithGoogleIdentityServices(firebaseConfig.oAuthClientId);
          return gisResult;
        }
      } catch (gisError: any) {
        console.warn('Google Identity Services attempt result:', gisError?.message);
        if (gisError?.message && (gisError.message.includes('cancelled') || gisError.message.includes('access_denied'))) {
          return null;
        }
      }

      // If GIS also could not complete, format an actionable, non-cryptic error message
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      throw new Error(
        `Domain Authorization Needed: The domain "${currentHost}" is not yet in the Firebase Authorized Domains list. In Firebase Console (Project: ${firebaseConfig.projectId}), go to Authentication > Settings > Authorized domains and add "${currentHost}".`
      );
    }

    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch {}
  cachedAccessToken = null;
  cachedUser = null;
};
