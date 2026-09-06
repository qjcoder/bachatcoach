import {
  ensureGoogleAccessToken,
  refreshGoogleAccessToken,
} from '@/lib/googleAuth';

export const DRIVE_API = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const APP_FOLDER_NAME = 'BachatCoach';
export const RECEIPTS_FOLDER_NAME = 'Receipts';
export const RECEIPT_REF_PREFIX = 'drive:';

export function receiptRefFromId(fileId: string) {
  return `${RECEIPT_REF_PREFIX}${fileId}`;
}

export function receiptIdFromRef(ref?: string | null): string | null {
  if (!ref || !ref.startsWith(RECEIPT_REF_PREFIX)) return null;
  const id = ref.slice(RECEIPT_REF_PREFIX.length).trim();
  return id || null;
}

export function hasReceipt(ref?: string | null) {
  return Boolean(ref && ref !== 'legacy');
}

async function authorizedFetch(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  let token = await ensureGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not connected. Sign in with Google again.');

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 && !retried) {
    const next = await refreshGoogleAccessToken();
    if (!next) throw new Error('Google Drive is not connected. Sign in with Google again.');
    return authorizedFetch(url, init, true);
  }

  return res;
}

export async function driveFetch(path: string, init: RequestInit = {}) {
  const res = await authorizedFetch(path.startsWith('http') ? path : `${DRIVE_API}${path}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Drive request failed (${res.status})`);
  }
  return res;
}

export async function findFolderId(name: string, parentId?: string): Promise<string | null> {
  const parentClause = parentId
    ? ` and '${parentId}' in parents`
    : '';
  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`
  );
  const res = await driveFetch(`/files?q=${q}&spaces=drive&fields=files(id,name)`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

export async function ensureFolderId(name: string, parentId?: string): Promise<string> {
  const existing = await findFolderId(name, parentId);
  if (existing) return existing;

  const res = await driveFetch('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  const data = await res.json();
  return data.id;
}

export async function ensureAppFolderId() {
  return ensureFolderId(APP_FOLDER_NAME);
}

export async function ensureReceiptsFolderId() {
  const appFolder = await ensureAppFolderId();
  return ensureFolderId(RECEIPTS_FOLDER_NAME, appFolder);
}

async function readLocalFileBody(uri: string): Promise<ArrayBuffer | Blob> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error('Could not read the receipt photo from the device.');
  }
  // ArrayBuffer is more reliable than Blob as fetch body on React Native.
  if (typeof res.arrayBuffer === 'function') {
    return res.arrayBuffer();
  }
  return res.blob();
}

/**
 * Create file metadata, then PATCH binary with uploadType=media.
 * Avoids RN FormData (multipart/form-data), which Google Drive rejects —
 * Drive multipart uploads need multipart/related (see backup upload).
 */
export async function uploadLocalFileToDrive(opts: {
  uri: string;
  name: string;
  mimeType?: string;
  parentId: string;
}): Promise<{ fileId: string }> {
  const mimeType = opts.mimeType || 'image/jpeg';

  const createRes = await authorizedFetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      parents: [opts.parentId],
      mimeType,
    }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(text || `Drive create failed (${createRes.status})`);
  }
  const created = await createRes.json();
  const fileId = created.id as string | undefined;
  if (!fileId) throw new Error('Drive create failed (no file id)');

  const body = await readLocalFileBody(opts.uri);
  const uploadRes = await authorizedFetch(`${DRIVE_UPLOAD}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': mimeType },
    body,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    // Best-effort cleanup so failed uploads do not leave empty stubs.
    await authorizedFetch(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE' }).catch(() => undefined);
    throw new Error(text || `Drive upload failed (${uploadRes.status})`);
  }

  return { fileId };
}

export async function uploadReceiptToDrive(uri: string, kind: 'expense' | 'income' | 'savings') {
  const folderId = await ensureReceiptsFolderId();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { fileId } = await uploadLocalFileToDrive({
    uri,
    name: `receipt-${kind}-${stamp}.jpg`,
    mimeType: 'image/jpeg',
    parentId: folderId,
  });
  return receiptRefFromId(fileId);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary);
  }
  // Minimal fallback if btoa is missing
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = binary.charCodeAt(i + 1);
    const c = binary.charCodeAt(i + 2);
    const n = (a << 16) | ((Number.isFinite(b) ? b : 0) << 8) | (Number.isFinite(c) ? c : 0);
    out += alphabet[(n >> 18) & 63];
    out += alphabet[(n >> 12) & 63];
    out += Number.isFinite(b) ? alphabet[(n >> 6) & 63] : '=';
    out += Number.isFinite(c) ? alphabet[n & 63] : '=';
  }
  return out;
}

/** Download a Drive file and return a data URI safe for React Native Image. */
export async function downloadDriveFileDataUri(fileId: string): Promise<string> {
  const res = await driveFetch(`/files/${fileId}?alt=media`);
  const buffer = await res.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('Receipt file is empty on Google Drive.');
  }
  const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim() || 'image/jpeg';
  const base64 = bytesToBase64(new Uint8Array(buffer));
  return `data:${mime};base64,${base64}`;
}
