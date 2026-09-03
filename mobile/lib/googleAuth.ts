import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_ACCESS_TOKEN_KEY = 'google_access_token';
const GOOGLE_REFRESH_TOKEN_KEY = 'google_refresh_token';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function getGoogleClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    webClientSecret: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET || '',
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

function googleAuthConfig() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  const redirectUri = getGoogleRedirectUri();
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  return {
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || webClientId || undefined,
    androidClientId: androidClientId || webClientId || undefined,
    // Native Google clients are public (PKCE). Never send the web client secret
    // with the iOS/Android client id — Google returns "client secret is invalid".
    clientSecret: isNative ? undefined : getGoogleClientIds().webClientSecret || undefined,
    scopes: ['openid', 'email', 'profile', GOOGLE_DRIVE_SCOPE] as string[],
    redirectUri,
    selectAccount: true,
    // Exchange ourselves so errors surface cleanly and we use the right client.
    shouldAutoExchangeCode: false,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  };
}

/** Hook config for Google AuthSession (call at top level of a component). */
export function useGoogleAuthRequest() {
  return Google.useAuthRequest(googleAuthConfig());
}

/**
 * Prefer authorization code + exchange so we get id_token (API) and access_token (Drive).
 */
export function useGoogleAuthRequestWithDrive() {
  return Google.useAuthRequest(googleAuthConfig());
}

/**
 * Exchange an authorization code for tokens using Google's token endpoint.
 * Native: platform client id + PKCE (no secret). Web: web client + secret.
 */
export async function exchangeCodeForTokens(authCode: string, codeVerifier?: string) {
  const { webClientId, webClientSecret } = getGoogleClientIds();
  const redirectUri = getGoogleRedirectUri();
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const clientId = isNative ? getPlatformGoogleClientId() : webClientId;

  const params: Record<string, string> = {
    code: authCode,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  };

  if (isNative) {
    if (codeVerifier) params.code_verifier = codeVerifier;
  } else {
    if (webClientSecret) params.client_secret = webClientSecret;
    if (codeVerifier) params.code_verifier = codeVerifier;
  }

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

export async function persistGoogleTokens(accessToken?: string | null, refreshToken?: string | null) {
  if (accessToken) await SecureStore.setItemAsync(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(GOOGLE_REFRESH_TOKEN_KEY, refreshToken);
}

export async function getGoogleAccessToken() {
  return SecureStore.getItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
}

export async function clearGoogleTokens() {
  await SecureStore.deleteItemAsync(GOOGLE_ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(GOOGLE_REFRESH_TOKEN_KEY);
}
