import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
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
  return Boolean(webClientId);
}

/** Hook config for Google AuthSession (call at top level of a component). */
export function useGoogleAuthRequest() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  const redirectUri = makeRedirectUri({ scheme: 'bachatcoach' });

  return Google.useAuthRequest({
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || webClientId || undefined,
    androidClientId: androidClientId || webClientId || undefined,
    scopes: ['openid', 'email', 'profile', GOOGLE_DRIVE_SCOPE],
    redirectUri,
    selectAccount: true,
    // Need both id_token (API login) and access_token (Drive).
    responseType: ResponseType.IdToken,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });
}

/**
 * Prefer id_token response; also request access token via token endpoint when possible.
 * If only id_token is returned, Drive backup will ask user to re-auth with drive scope later.
 */
export function useGoogleAuthRequestWithDrive() {
  const { webClientId, iosClientId, androidClientId } = getGoogleClientIds();
  const redirectUri = makeRedirectUri({ scheme: 'bachatcoach' });

  return Google.useAuthRequest({
    webClientId: webClientId || undefined,
    iosClientId: iosClientId || webClientId || undefined,
    androidClientId: androidClientId || webClientId || undefined,
    scopes: ['openid', 'email', 'profile', GOOGLE_DRIVE_SCOPE],
    redirectUri,
    selectAccount: true,
    shouldAutoExchangeCode: true,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });
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
