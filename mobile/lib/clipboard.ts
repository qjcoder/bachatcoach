type ClipboardModule = typeof import('expo-clipboard');

let clipboardMod: ClipboardModule | null | undefined;

function nativeClipboardAvailable(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    return Boolean(requireOptionalNativeModule('ExpoClipboard'));
  } catch {
    return false;
  }
}

function getClipboard(): ClipboardModule | null {
  if (clipboardMod !== undefined) return clipboardMod;
  if (!nativeClipboardAvailable()) {
    clipboardMod = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clipboardMod = require('expo-clipboard') as ClipboardModule;
    return clipboardMod;
  } catch {
    clipboardMod = null;
    return null;
  }
}

/** Safe paste — empty when native clipboard is missing (mismatched APK / Expo Go). */
export async function getClipboardString(): Promise<string> {
  const mod = getClipboard();
  if (!mod?.getStringAsync) return '';
  try {
    return (await mod.getStringAsync()) || '';
  } catch {
    return '';
  }
}
