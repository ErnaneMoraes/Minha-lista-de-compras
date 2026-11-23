import { Platform } from 'react-native';
import JSZip from 'jszip';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import {
  BACKUP_APP_ID,
  loadLists,
  loadHistory,
  loadReminderLists,
  validateBackupPayload,
} from '../storage/shoppingStorage';
import {
  exportTagPhotosAsBase64Map,
  TAG_PHOTOS_DIR,
} from './tagPhotoStorage';
import {
  getDiagnosticLogs,
  formatDiagnosticLogsAsText,
  getAnonymousDeviceContext,
} from './diagnosticLogService';

export async function buildDiagnosticZipBundle() {
  const [logs, lists, history, reminders] = await Promise.all([
    getDiagnosticLogs(),
    loadLists(),
    loadHistory(),
    loadReminderLists(),
  ]);

  // Coleta todas as fotos salvas em tag_photos/ (tanto referenciadas nos itens quanto existentes no diretório)
  const filenameSet = new Set();
  for (const list of lists) {
    const items = Array.isArray(list?.items) ? list.items : [];
    for (const item of items) {
      if (item?.photoFilename) {
        filenameSet.add(item.photoFilename);
      }
    }
  }
  if (Platform.OS !== 'web' && TAG_PHOTOS_DIR) {
    try {
      const dirInfo = await LegacyFileSystem.getInfoAsync(TAG_PHOTOS_DIR);
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await LegacyFileSystem.readDirectoryAsync(TAG_PHOTOS_DIR);
        for (const f of files) {
          if (/^tag_.*\.jpe?g$/i.test(f)) {
            filenameSet.add(f);
          }
        }
      }
    } catch {
      // ignora erro de listagem e usa apenas as referências das listas
    }
  }

  const photosMap = await exportTagPhotosAsBase64Map(Array.from(filenameSet));
  const photoEntries = Object.entries(photosMap);

  const diagnosticTxt = formatDiagnosticLogsAsText(logs);
  const listsJson = {
    appId: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    deviceContext: getAnonymousDeviceContext(),
    privacyNote:
      'Exportação técnica anônima (LGPD): sem dados pessoais, contas, IP ou identificadores únicos.',
    data: {
      lists,
      history,
      reminders,
    },
  };

  const zip = new JSZip();
  zip.file('logs_diagnostico.txt', diagnosticTxt);
  zip.file('dados_listas.json', JSON.stringify(listsJson, null, 2));

  const folder = zip.folder('etiquetas');
  for (const [filename, base64] of photoEntries) {
    folder.file(filename, base64, { base64: true });
  }

  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    base64,
    logCount: logs.length,
    photoCount: photoEntries.length,
  };
}

export async function buildFullZipBackup() {
  const [lists, history, reminders] = await Promise.all([
    loadLists(),
    loadHistory(),
    loadReminderLists(),
  ]);

  const photoFilenames = [];
  for (const list of lists) {
    const items = Array.isArray(list?.items) ? list.items : [];
    for (const item of items) {
      if (item?.photoFilename) {
        photoFilenames.push(item.photoFilename);
      }
    }
  }

  const photosMap = await exportTagPhotosAsBase64Map(photoFilenames);
  const photoEntries = Object.entries(photosMap);

  const backupJson = {
    appId: BACKUP_APP_ID,
    version: 2,
    exportType: 'all',
    exportedAt: new Date().toISOString(),
    data: {
      lists,
      history,
      reminders,
    },
  };

  const zip = new JSZip();
  zip.file('backup.json', JSON.stringify(backupJson, null, 2));

  if (photoEntries.length > 0) {
    const folder = zip.folder('etiquetas');
    for (const [filename, base64] of photoEntries) {
      folder.file(filename, base64, { base64: true });
    }
  }

  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    base64,
    photoCount: photoEntries.length,
  };
}

export async function buildPhotosOnlyZipBackup() {
  const lists = await loadLists();
  const manifestEntries = [];
  const photoFilenames = [];

  for (const list of lists) {
    const items = Array.isArray(list?.items) ? list.items : [];
    for (const item of items) {
      if (item?.photoFilename) {
        photoFilenames.push(item.photoFilename);
        manifestEntries.push({
          photoFilename: item.photoFilename,
          photoCapturedAt: item.photoCapturedAt || list.createdAt || null,
          productName: item.name || '',
          listId: list.id,
          listName: list.name || '',
          itemId: item.id,
          price: Number(item.price) || 0,
        });
      }
    }
  }

  const photosMap = await exportTagPhotosAsBase64Map(photoFilenames);
  const photoEntries = Object.entries(photosMap);

  const manifest = {
    appId: BACKUP_APP_ID,
    version: 2,
    exportType: 'photos',
    exportedAt: new Date().toISOString(),
    photos: manifestEntries.filter((m) =>
      Object.prototype.hasOwnProperty.call(photosMap, m.photoFilename)
    ),
  };

  const zip = new JSZip();
  zip.file('photos_manifest.json', JSON.stringify(manifest, null, 2));

  if (photoEntries.length > 0) {
    const folder = zip.folder('etiquetas');
    for (const [filename, base64] of photoEntries) {
      folder.file(filename, base64, { base64: true });
    }
  }

  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    base64,
    photoCount: photoEntries.length,
  };
}

function hasZipMagicBytes(bytes) {
  return (
    bytes &&
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

function decodeBytesToUtf8(bytes) {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }
  let str = '';
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

async function readUriSafely(uri) {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (hasZipMagicBytes(bytes)) {
      return { isZip: true, bytes, base64: null, text: null };
    }
    return { isZip: false, bytes, base64: null, text: decodeBytesToUtf8(bytes) };
  }

  let tempCopyUri = null;
  let targetUri = uri;

  try {
    // Copy incoming URI (content:// or DocumentPicker file://) into a controlled cache path
    if (LegacyFileSystem.cacheDirectory) {
      const candidateCopy = `${LegacyFileSystem.cacheDirectory}import_temp_${Date.now()}.bin`;
      try {
        await LegacyFileSystem.copyAsync({ from: uri, to: candidateCopy });
        tempCopyUri = candidateCopy;
        targetUri = candidateCopy;
      } catch {
        // Fallback: read directly from original URI below
        targetUri = uri;
      }
    }

    // Tier 1: Expo SDK 58 File API (.bytes()) on targetUri
    try {
      const f = new File(targetUri);
      const bytes = await f.bytes();
      if (bytes && bytes.length > 0) {
        if (hasZipMagicBytes(bytes)) {
          return { isZip: true, bytes, base64: null, text: null };
        }
        const text = await f.text().catch(() => decodeBytesToUtf8(bytes));
        return { isZip: false, bytes, base64: null, text };
      }
    } catch {
      // proceed to Tier 2
    }

    // Tier 2: LegacyFileSystem base64 read on targetUri
    try {
      const base64 = await LegacyFileSystem.readAsStringAsync(targetUri, {
        encoding: 'base64',
      });
      if (base64 && base64.startsWith('UEsDB')) {
        return { isZip: true, bytes: null, base64, text: null };
      }
      const text = await LegacyFileSystem.readAsStringAsync(targetUri, {
        encoding: 'utf8',
      });
      return { isZip: false, bytes: null, base64: null, text };
    } catch {
      // proceed to Tier 3
    }

    // Tier 3: Expo SDK 58 File API directly on original URI
    if (targetUri !== uri) {
      try {
        const origFile = new File(uri);
        const bytes = await origFile.bytes();
        if (bytes && bytes.length > 0) {
          if (hasZipMagicBytes(bytes)) {
            return { isZip: true, bytes, base64: null, text: null };
          }
          const text = await origFile.text().catch(() => decodeBytesToUtf8(bytes));
          return { isZip: false, bytes, base64: null, text };
        }
      } catch {
        // proceed to Tier 4
      }
    }

    // Tier 4: fetch(uri).arrayBuffer() resilient fallback
    const resp = await fetch(uri);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (hasZipMagicBytes(bytes)) {
      return { isZip: true, bytes, base64: null, text: null };
    }
    return { isZip: false, bytes, base64: null, text: decodeBytesToUtf8(bytes) };
  } finally {
    if (tempCopyUri) {
      LegacyFileSystem.deleteAsync(tempCopyUri, { idempotent: true }).catch(
        () => {}
      );
    }
  }
}

export async function parseBackupArchiveFromUri(uri, fileNameHint = '') {
  const fileData = await readUriSafely(uri);
  const looksLikeZip =
    fileData.isZip || /\.zip$/i.test(String(fileNameHint || uri || ''));

  if (looksLikeZip && (fileData.bytes || fileData.base64)) {
    const zip = fileData.bytes
      ? await JSZip.loadAsync(fileData.bytes)
      : await JSZip.loadAsync(fileData.base64, { base64: true });

    const photosMap = {};
    const filePaths = Object.keys(zip.files);
    for (const relPath of filePaths) {
      const entry = zip.files[relPath];
      if (entry.dir) continue;
      if (/^etiquetas\/[^/]+\.(jpg|jpeg|png)$/i.test(relPath)) {
        const baseName = relPath.split('/').pop();
        if (baseName) {
          photosMap[baseName] = await entry.async('base64');
        }
      }
    }

    const backupJsonEntry = zip.file('backup.json');
    if (backupJsonEntry) {
      const jsonText = await backupJsonEntry.async('string');
      let parsed;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return {
          valid: false,
          error: 'O arquivo backup.json dentro do .zip está corrompido.',
        };
      }

      if (parsed && typeof parsed === 'object' && parsed.data) {
        if (Object.keys(photosMap).length > 0) {
          parsed.data.photos = {
            ...(parsed.data.photos || {}),
            ...photosMap,
          };
        }
      }

      const validation = validateBackupPayload(parsed);
      if (!validation.valid) {
        return validation;
      }
      return {
        valid: true,
        payload: parsed,
        summary: validation.summary,
      };
    }

    const manifestEntry = zip.file('photos_manifest.json');
    if (manifestEntry) {
      const manifestText = await manifestEntry.async('string');
      let manifest;
      try {
        manifest = JSON.parse(manifestText);
      } catch {
        return {
          valid: false,
          error: 'O arquivo photos_manifest.json dentro do .zip está corrompido.',
        };
      }
      if (manifest?.appId !== BACKUP_APP_ID) {
        return {
          valid: false,
          error: 'Este arquivo .zip não pertence ao aplicativo Minha Lista de Compras.',
        };
      }

      const payload = {
        appId: BACKUP_APP_ID,
        version: 2,
        exportType: 'photos',
        exportedAt: manifest.exportedAt || new Date().toISOString(),
        data: {
          photos: photosMap,
          photosManifest: Array.isArray(manifest.photos) ? manifest.photos : [],
        },
      };
      const validation = validateBackupPayload(payload);
      if (!validation.valid) return validation;
      return {
        valid: true,
        payload,
        summary: validation.summary,
      };
    }

    return {
      valid: false,
      error:
        'O arquivo .zip selecionado não contém um backup válido do Minha Lista de Compras.',
    };
  }

  // Fallback: standard JSON file
  let parsed;
  try {
    parsed = JSON.parse(fileData.text || '');
  } catch {
    return {
      valid: false,
      error: 'O arquivo selecionado não é um backup .json ou .zip válido.',
    };
  }

  const validation = validateBackupPayload(parsed);
  if (!validation.valid) {
    return validation;
  }

  return {
    valid: true,
    payload: parsed,
    summary: validation.summary,
  };
}
