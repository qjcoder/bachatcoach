import * as ImagePicker from 'expo-image-picker';

export type PickedImage = {
  uri: string;
  base64: string;
};

async function pick(source: 'library' | 'camera') {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return null;

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

  if (result.canceled || !result.assets[0]?.uri) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '',
  } satisfies PickedImage;
}

export function pickProfileFromLibrary() {
  return pick('library');
}

export function pickProfileFromCamera() {
  return pick('camera');
}
