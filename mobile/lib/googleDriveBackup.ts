import { getGoogleAccessToken } from '@/lib/googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FILENAME = 'BachatCoach-backup.json';
const FOLDER_NAME = 'BachatCoach';

async function driveFetch(path: string, init: RequestInit = {}) {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not connected. Sign in with Google again.');

  const res = await fetch(path.startsWith('http') ? path : `${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Drive request failed (${res.status})`);
  }
  return res;
}

async function findFolderId(): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const res = await driveFetch(`/files?q=${q}&spaces=drive&fields=files(id,name)`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function ensureFolderId(): Promise<string> {
  const existing = await findFolderId();
  if (existing) return existing;

  const res = await driveFetch('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const data = await res.json();
  return data.id;
}

async function findBackupFileId(folderId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(`/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

export async function uploadBackupToDrive(payload: unknown): Promise<{ fileId: string }> {
  const folderId = await ensureFolderId();
  const existingId = await findBackupFileId(folderId);
  const body = JSON.stringify(payload, null, 2);
  const metadata = {
    name: BACKUP_FILENAME,
    parents: existingId ? undefined : [folderId],
    mimeType: 'application/json',
  };

  const boundary = `bachatcoach_${Date.now()}`;
  const multipart =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${body}\r\n` +
    `--${boundary}--`;

  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Google Drive is not connected. Sign in with Google again.');

  const url = existingId
    ? `${DRIVE_UPLOAD}/files/${existingId}?uploadType=multipart`
    : `${DRIVE_UPLOAD}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipart,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return { fileId: data.id };
}

export async function downloadBackupFromDrive(): Promise<unknown> {
  const folderId = await findFolderId();
  if (!folderId) throw new Error('No BachatCoach backup found on Google Drive.');

  const fileId = await findBackupFileId(folderId);
  if (!fileId) throw new Error('No BachatCoach backup found on Google Drive.');

  const res = await driveFetch(`/files/${fileId}?alt=media`);
  return res.json();
}

export type BackupFrequency = 'off' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export function isBackupDue(
  frequency: BackupFrequency,
  lastBackupAt: string | Date | null | undefined
): boolean {
  if (frequency === 'off') return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (Number.isNaN(last)) return true;
  const elapsed = Date.now() - last;
  const day = 24 * 60 * 60 * 1000;
  switch (frequency) {
    case 'daily':
      return elapsed >= day;
    case 'weekly':
      return elapsed >= 7 * day;
    case 'monthly':
      return elapsed >= 30 * day;
    case 'yearly':
      return elapsed >= 365 * day;
    default:
      return false;
  }
}
