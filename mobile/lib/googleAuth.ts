import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import type { AuthSessionResult } from 'expo-auth-session';
import { useCallback } from 'react';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ACCESS_TOKEN_KEY = 'google_access_token';
const GOOGLE_REFRESH_TOKEN_KEY = 'google_refresh_token';
const GOOGLE_DRIVE_GRANTED_KEY = 'google_drive_granted';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Sign-In only — free to publish without Drive verification. */
export const GOOGLE_SIGN_IN_SCOPES = ['openid', 'email', 'profile'] as const;

/** Requested only when user enables Drive backup or receipt upload. */
export const GOOGLE_DRIVE_SCOPES = [...GOOGLE_SIGN_IN_SCOPES, GOOGLE_DRIVE_SCOPE] as const;

export function getGoogleClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  };
}

export function getPlatformGoogleClientId() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  if (Platform.OS === 'ios') return iosClientId || webClientId;
  if (Platform.OS === 'android') return androidClientId || webClientId;
  return webClientId;
}

export function isGoogleAuthConfigured() {
  return Boolean(getPlatformGoogleClientId());
}

/**
 * Google iOS/Android OAuth clients require the reversed-client-id scheme.
 * Do not use makeRedirectUri()'s scheme inference in dev builds — it picks the
 * first app.json scheme (bachatcoach) and breaks token exchange.
 */
export function getGoogleRedirectUri() {
  const clientId = getPlatformGoogleClientId();

  if (Platform.OS !== 'web' && clientId.includes('.apps.googleusercontent.com')) {
    const guid = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
    return `com.googleusercontent.apps.${guid}:/oauthredirect`;
  }

  return makeRedirectUri({ scheme: 'bachatcoach' });
}

/** Avoid AuthSession hard-crash when EAS env was not linked into the binary. */
const MISSING_CLIENT_PLACEHOLDER = '0-missing.apps.googleusercontent.com';

function googleAuthConfig(scopes: readonly string[], opts?: { offline?: boolean }) {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  const redirectUri = getGoogleRedirectUri();
  const web = webClientId || MISSING_CLIENT_PLACEHOLDER;
  const ios = iosClientId || webClientId || MISSING_CLIENT_PLACEHOLDER;
  const android = androidClientId || webClientId || MISSING_CLIENT_PLACEHOLDER;

  return {
    webClientId: web,
    iosClientId: ios,
    androidClientId: android,
    // Native Google clients are public (PKCE). Never ship a client secret in the app.
    scopes: [...scopes],
    redirectUri,
    selectAccount: true,
    shouldAutoExchangeCode: false,
    // access_type=offline + prompt=consent often causes Error 400: invalid_request
    // on Android/iOS Sign-In. Only use them when connecting Drive (refresh token).
    ...(opts?.offline
      ? {
          extraParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      : {}),
  };
}

/** Google Sign-In / Sign-Up — no Drive scope (store-friendly, free path). */
export function useGoogleAuthRequest() {
  return Google.useAuthRequest(googleAuthConfig(GOOGLE_SIGN_IN_SCOPES));
}

/** Connect Google Drive — call only when user enables backup or attaches a receipt. */
export function useGoogleAuthRequestWithDrive() {
  return Google.useAuthRequest(googleAuthConfig(GOOGLE_DRIVE_SCOPES, { offline: true }));
}

/**
 * Exchange an authorization code for tokens using Google's token endpoint.
 * Uses PKCE on all platforms — never a client secret (secrets belong on the server only).
 */
export async function exchangeCodeForTokens(authCode: string, codeVerifier?: string) {
  const { webClientId } = getGoogleClientIds();
  const redirectUri = getGoogleRedirectUri();
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const clientId = isNative ? getPlatformGoogleClientId() : webClientId;

  const params: Record<string, string> = {
    code: authCode,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  if (codeVerifier) params.code_verifier = codeVerifier;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return {
    idToken: data.id_token as string | undefined,
    accessToken: data.access_token as string | undefined,
    refreshToken: data.refresh_token as string | undefined,
  };
}

export async function setGoogleDriveGranted(granted: boolean) {
  if (granted) await SecureStore.setItemAsync(GOOGLE_DRIVE_GRANTED_KEY, '1');
  else await SecureStore.deleteItemAsync(GOOGLE_DRIVE_GRANTED_KEY);
}

export async function hasGoogleDriveAccess() {
  return (await SecureStore.getItemAsync(GOOGLE_DRIVE_GRANTED_KEY)) === '1';
}

export async function persistGoogleTokens(
  accessToken?: string | null,
  refreshToken?: string | null,
  opts?: { drive?: boolean }
) {
  if (accessToken) await SecureStore.setItemAsync(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(GOOGLE_REFRESH_TOKEN_KEY, refreshToken);
  if (opts?.drive === true) await setGoogleDriveGranted(true);
  if (opts?.drive === false) await setGoogleDriveGranted(false);
}

export async function getGoogleAccessToken() {
  return SecureStore.getItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
}

/** Prefer stored access token; fall back to refresh token exchange. */
export async function ensureGoogleAccessToken(): Promise<string | null> {
  const existing = await getGoogleAccessToken();
  if (existing) return existing;
  return refreshGoogleAccessToken();
}

async function probeDriveAccess(token: string): Promise<boolean> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Token that can call Google Drive. Returns null if the user has not connected Drive yet
 * (Sign-In alone does not grant drive.file).
 */
export async function ensureGoogleDriveToken(): Promise<string | null> {
  const token = await ensureGoogleAccessToken();
  if (!token) return null;

  if (await hasGoogleDriveAccess()) return token;

  // Legacy sessions from older builds that signed in with Drive in one step.
  if (await probeDriveAccess(token)) {
    await setGoogleDriveGranted(true);
    return token;
  }

  return null;
}

export async function refreshGoogleAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(GOOGLE_REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const { webClientId } = getGoogleClientIds();
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const clientId = isNative ? getPlatformGoogleClientId() : webClientId;

  const params: Record<string, string> = {
    refresh_token: refreshToken,
    client_id: clientId,
    grant_type: 'refresh_token',
  };

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  const data = await resp.json();
  if (!resp.ok || !data.access_token) return null;

  await persistGoogleTokens(data.access_token as string);
  return data.access_token as string;
}

export async function clearGoogleTokens() {
  await SecureStore.deleteItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(GOOGLE_REFRESH_TOKEN_KEY);
  await setGoogleDriveGranted(false);
}

/**
 * Native Google Sign-In for Android (Play Services). Avoids AuthSession
 * Error 400 invalid_request that Chrome Custom Tabs often hits on Android.
 * Requires webClientId so Google returns an idToken for our API.
 */
export async function signInWithGoogleNative(): Promise<{
  idToken: string;
  accessToken?: string;
}> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  const { webClientId, iosClientId } = getGoogleClientIds();
  if (!webClientId) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is required for Android Google Sign-In');
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    scopes: [...GOOGLE_SIGN_IN_SCOPES],
    offlineAccess: false,
  });

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success') {
    throw Object.assign(new Error('Google Sign-In cancelled'), { code: 'SIGN_IN_CANCELLED' });
  }

  let idToken = result.data.idToken || '';
  let accessToken: string | undefined;
  try {
    const tokens = await GoogleSignin.getTokens();
    idToken = tokens.idToken || idToken;
    accessToken = tokens.accessToken || undefined;
  } catch {
    /* idToken from signIn may already be enough */
  }

  if (!idToken) {
    throw new Error('Google Sign-In did not return an id token');
  }

  return { idToken, accessToken };
}

type AuthRequestLike = {
  codeVerifier?: string;
} | null;

/**
 * Complete a Drive OAuth prompt result and store tokens with drive granted.
 */
export async function completeGoogleDriveAuth(
  result: AuthSessionResult,
  request: AuthRequestLike
): Promise<string | null> {
  if (result.type !== 'success') return null;

  let accessToken: string | undefined =
    result.authentication?.accessToken ||
    (result.params?.access_token as string | undefined);
  let refreshToken: string | undefined = result.authentication?.refreshToken || undefined;

  const authCode = result.params?.code as string | undefined;
  if (authCode) {
    const tokens = await exchangeCodeForTokens(authCode, request?.codeVerifier);
    accessToken = tokens.accessToken ?? accessToken;
    refreshToken = tokens.refreshToken ?? refreshToken;
  }

  if (!accessToken) return null;
  await persistGoogleTokens(accessToken, refreshToken, { drive: true });
  return accessToken;
}

/**
 * Hook: ensure Drive is connected (prompt once if needed). Use in Settings / receipt flows.
 */
export function useGoogleDriveConnect() {
  const [request, , promptAsync] = useGoogleAuthRequestWithDrive();

  const connectDrive = useCallback(async (): Promise<string | null> => {
    const existing = await ensureGoogleDriveToken();
    if (existing) return existing;

    const result = await promptAsync();
    if (result.type === 'error') {
      throw new Error(result.error?.message || 'Google Drive authorization failed');
    }
    if (result.type !== 'success') return null;
    return completeGoogleDriveAuth(result, request);
  }, [promptAsync, request]);

  return {
    connectDrive,
    ready: Boolean(request),
  };
}
