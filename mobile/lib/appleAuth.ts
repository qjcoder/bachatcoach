import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export type AppleSignInResult = {
  identityToken: string;
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null;
  email?: string | null;
};

/** Available only on iOS devices (not Android / web). */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }

  return {
    identityToken: credential.identityToken,
    fullName: credential.fullName,
    email: credential.email,
  };
}
