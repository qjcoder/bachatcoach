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
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  };
}

export function isGoogleAuthConfigured() {
  const { webClientId, iosClientId } = getGoogleClientIds();
  if (Platform.OS === 'ios') return Boolean(iosClientId || webClientId);
  if (Platform.OS === 'android') {
    const { androidClientId } = getGoogleClientIds();
    return Boolean(androidClientId || webClientId);
  }
  return Boolean(webClientId);
}

/** Google requires the reversed iOS/Android client ID scheme — not a custom app scheme. */
export function getGoogleRedirectUri() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  const clientId =
    Platform.OS === 'ios'
      ? iosClientId || webClientId
      : Platform.OS === 'android'
        ? androidClientId || webClientId
        : webClientId;

  if (clientId.includes('.apps.googleusercontent.com')) {
    const guid = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
    return makeRedirectUri({
      native: `com.googleusercontent.apps.${guid}:/oauthredirect`,
    });
  }

  return makeRedirectUri({ scheme: 'bachatcoach' });
}

function googleAuthConfig() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  return {
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || webClientId || undefined,
    androidClientId: androidClientId || webClientId || undefined,
    scopes: ['openid', 'email', 'profile', GOOGLE_DRIVE_SCOPE] as string[],
    redirectUri: getGoogleRedirectUri(),
    selectAccount: true,
    shouldAutoExchangeCode: true,
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
 * Prefer authorization code + auto exchange so we get id_token (API) and access_token (Drive).
 */
export function useGoogleAuthRequestWithDrive() {
  return Google.useAuthRequest(googleAuthConfig());
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
