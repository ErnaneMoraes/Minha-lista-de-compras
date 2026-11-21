import { Platform, Image } from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

export const RETENTION_DAY_OPTIONS = [30, 60, 90, 120];
export const DEFAULT_RETENTION_DAYS = 60;

const MAX_TAG_WIDTH = 600;
const JPEG_COMPRESS = 0.65;

export const TAG_PHOTOS_DIR = LegacyFileSystem.documentDirectory
  ? `${LegacyFileSystem.documentDirectory}tag_photos/`
  : null;

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const base = filename.replace(/\\/g, '/').split('/').pop();
  if (!base || !/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

export function getTagPhotoUri(photoFilename) {
  const safe = sanitizeFilename(photoFilename);
  if (!safe || !TAG_PHOTOS_DIR || Platform.OS === 'web') return null;
  return `${TAG_PHOTOS_DIR}${safe}`;
}

export async function ensureTagPhotosDir() {
  if (!TAG_PHOTOS_DIR || Platform.OS === 'web') return false;
  try {
    const info = await LegacyFileSystem.getInfoAsync(TAG_PHOTOS_DIR);
    if (!info.exists) {
      await LegacyFileSystem.makeDirectoryAsync(TAG_PHOTOS_DIR, {
        intermediates: true,
      });
    }
    return true;
  } catch (err) {
    console.warn('Erro ao criar pasta tag_photos:', err);
    return false;
  }
}

function getImageDimensions(uri) {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 0, height: 0 })
    );
  });
}

export async function saveCompressedTagPhoto(sourceUri) {
  if (!sourceUri || Platform.OS === 'web' || !TAG_PHOTOS_DIR) {
    return null;
  }
  try {
    const ok = await ensureTagPhotosDir();
    if (!ok) return null;

    const { width } = await getImageDimensions(sourceUri);
    const actions =
      width > MAX_TAG_WIDTH ? [{ resize: { width: MAX_TAG_WIDTH } }] : [];

    const manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      actions,
      {
        compress: JPEG_COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    const filename = `tag_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}.jpg`;
    const destUri = `${TAG_PHOTOS_DIR}${filename}`;

    await LegacyFileSystem.copyAsync({
      from: manipulated.uri,
      to: destUri,
    });

    if (manipulated.uri && manipulated.uri !== sourceUri) {
      LegacyFileSystem.deleteAsync(manipulated.uri, { idempotent: true }).catch(
        () => {}
      );
    }

    return {
      photoFilename: filename,
      photoCapturedAt: new Date().toISOString(),
      uri: destUri,
    };
  } catch (err) {
    console.warn('Erro ao salvar foto compactada da etiqueta:', err);
    return null;
  }
}

export async function deleteTagPhotoFile(photoFilename) {
  const uri = getTagPhotoUri(photoFilename);
  if (!uri) return;
  try {
    await LegacyFileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore deletion failure
  }
}

export async function deleteMultipleTagPhotoFiles(filenames) {
  if (!Array.isArray(filenames) || filenames.length === 0) return;
  const unique = Array.from(new Set(filenames.filter(Boolean)));
  await Promise.all(unique.map((fn) => deleteTagPhotoFile(fn)));
}

export async function deleteAllTagPhotos() {
  if (Platform.OS === 'web' || !TAG_PHOTOS_DIR) return;
  try {
    await LegacyFileSystem.deleteAsync(TAG_PHOTOS_DIR, { idempotent: true });
    await ensureTagPhotosDir();
  } catch (err) {
    console.warn('Erro ao limpar diretório tag_photos:', err);
  }
}

export function formatBytesBR(bytes) {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe < 1024) {
    return `${Math.round(safe)} B`;
  }
  const kb = safe / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1).replace('.', ',')} MB`;
}

export async function getTagPhotosStorageStats(lists = []) {
  if (Platform.OS === 'web' || !TAG_PHOTOS_DIR) {
    return { count: 0, totalBytes: 0, formattedSize: '0 KB' };
  }
  try {
    const ok = await ensureTagPhotosDir();
    if (!ok) return { count: 0, totalBytes: 0, formattedSize: '0 KB' };

    const referencedFilenames = new Set();
    if (Array.isArray(lists)) {
      for (const list of lists) {
        const items = Array.isArray(list?.items) ? list.items : [];
        for (const item of items) {
          if (item?.photoFilename) {
            const safe = sanitizeFilename(item.photoFilename);
            if (safe) referencedFilenames.add(safe);
          }
        }
      }
    }

    const dirFiles = await LegacyFileSystem.readDirectoryAsync(TAG_PHOTOS_DIR);
    let count = 0;
    let totalBytes = 0;
    const orphanFiles = [];

    for (const file of dirFiles) {
      if (!referencedFilenames.has(file)) {
        orphanFiles.push(file);
        continue;
      }
      const info = await LegacyFileSystem.getInfoAsync(`${TAG_PHOTOS_DIR}${file}`);
      if (info.exists && !info.isDirectory) {
        count += 1;
        totalBytes += Number(info.size) || 0;
      }
    }

    // Automatically remove orphaned files not linked to any item so Settings & Gallery stay 100% in sync
    if (orphanFiles.length > 0) {
      deleteMultipleTagPhotoFiles(orphanFiles).catch(() => {});
    }

    return {
      count,
      totalBytes,
      formattedSize: formatBytesBR(totalBytes),
    };
  } catch (err) {
    console.warn('Erro ao calcular uso de disco das fotos:', err);
    return { count: 0, totalBytes: 0, formattedSize: '0 KB' };
  }
}

export async function exportTagPhotosAsBase64Map(filenames) {
  const photosMap = {};
  if (Platform.OS === 'web' || !TAG_PHOTOS_DIR || !Array.isArray(filenames)) {
    return photosMap;
  }

  const unique = Array.from(new Set(filenames.filter(Boolean)));
  for (const rawName of unique) {
    const safe = sanitizeFilename(rawName);
    if (!safe) continue;
    const uri = `${TAG_PHOTOS_DIR}${safe}`;
    try {
      const info = await LegacyFileSystem.getInfoAsync(uri);
      if (!info.exists || info.isDirectory) continue;
      const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      if (base64) {
        photosMap[safe] = base64;
      }
    } catch {
      // skip unreadable file
    }
  }
  return photosMap;
}

export async function restoreTagPhotosFromBase64Map(photosMap) {
  if (
    Platform.OS === 'web' ||
    !TAG_PHOTOS_DIR ||
    !photosMap ||
    typeof photosMap !== 'object'
  ) {
    return 0;
  }

  const ok = await ensureTagPhotosDir();
  if (!ok) return 0;

  let restoredCount = 0;
  for (const [rawName, base64] of Object.entries(photosMap)) {
    const safe = sanitizeFilename(rawName);
    if (!safe || typeof base64 !== 'string' || !base64.trim()) continue;
    try {
      await LegacyFileSystem.writeAsStringAsync(`${TAG_PHOTOS_DIR}${safe}`, base64, {
        encoding: 'base64',
      });
      restoredCount += 1;
    } catch {
      // skip failed photo restore
    }
  }
  return restoredCount;
}

export async function findAndDeleteExpiredTagPhotos(lists, retentionDays) {
  const days = RETENTION_DAY_OPTIONS.includes(Number(retentionDays))
    ? Number(retentionDays)
    : DEFAULT_RETENTION_DAYS;
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const expiredFilenames = [];
  let changed = false;

  const updatedLists = (Array.isArray(lists) ? lists : []).map((list) => {
    const items = Array.isArray(list?.items) ? list.items : [];
    let listChanged = false;
    const nextItems = items.map((item) => {
      if (!item?.photoFilename) return item;
      const tsStr = item.photoCapturedAt || list.createdAt;
      const tsMs = tsStr ? new Date(tsStr).getTime() : NaN;
      if (!Number.isNaN(tsMs) && tsMs < cutoffMs) {
        expiredFilenames.push(item.photoFilename);
        listChanged = true;
        changed = true;
        const { photoFilename, photoCapturedAt, ...rest } = item;
        return rest;
      }
      return item;
    });
    return listChanged ? { ...list, items: nextItems } : list;
  });

  if (expiredFilenames.length > 0) {
    await deleteMultipleTagPhotoFiles(expiredFilenames);
  }

  return {
    changed,
    removedCount: expiredFilenames.length,
    updatedLists,
  };
}
