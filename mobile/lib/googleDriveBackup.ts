import { APP_FOLDER_NAME, DRIVE_UPLOAD, driveFetch, ensureAppFolderId, findFolderId } from '@/lib/googleDrive';
import { ensureGoogleAccessToken } from '@/lib/googleAuth';

const BACKUP_FILENAME = 'BachatCoach-backup.json';

async function findBackupFileId(folderId: string): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(`/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`);
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

export async function uploadBackupToDrive(payload: unknown): Promise<{ fileId: string }> {
  const folderId = await ensureAppFolderId();
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

  const token = await ensureGoogleAccessToken();
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
  const folderId = await findFolderId(APP_FOLDER_NAME);
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
