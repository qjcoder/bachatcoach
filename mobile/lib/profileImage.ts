import * as ImagePicker from 'expo-image-picker';

export type PickedImage = {
  uri: string;
  base64: string;
};

export type PickProfileResult =
  | { ok: true; image: PickedImage }
  | { ok: false; reason: 'permission' | 'canceled' | 'settings' };

async function ensureMediaPermission(source: 'library' | 'camera'): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  const current =
    source === 'camera'
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync();

  if (current.granted) return { granted: true, canAskAgain: true };

  const requested =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  return {
    granted: requested.granted,
    canAskAgain: requested.canAskAgain !== false,
  };
}

async function pick(source: 'library' | 'camera'): Promise<PickProfileResult> {
  const permission = await ensureMediaPermission(source);
  if (!permission.granted) {
    return { ok: false, reason: permission.canAskAgain ? 'permission' : 'settings' };
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });

  if (result.canceled || !result.assets[0]?.uri) {
    return { ok: false, reason: 'canceled' };
  }

  const asset = result.assets[0];
  return {
    ok: true,
    image: {
      uri: asset.uri,
      base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '',
    },
  };
}

export function pickProfileFromLibrary() {
  return pick('library');
}

export function pickProfileFromCamera() {
  return pick('camera');
}
