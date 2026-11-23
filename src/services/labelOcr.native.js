import { Image, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { parseShelfLabel } from './labelParser';
import { recordAppErrorLog } from './diagnosticLogService';

let pendingHandler = null;
let pendingBoundsDetector = null;

const MIN_OCR_WIDTH = 1100;

export function registerNativeOcrRunner(handler) {
  pendingHandler = handler;
  return () => {
    if (pendingHandler === handler) {
      pendingHandler = null;
    }
  };
}

export function registerNativeTagDetector(handler) {
  pendingBoundsDetector = handler;
  return () => {
    if (pendingBoundsDetector === handler) {
      pendingBoundsDetector = null;
    }
  };
}

export async function detectShelfTagCropBounds(photoUri) {
  if (!pendingBoundsDetector || !photoUri || Platform.OS === 'web') {
    return null;
  }
  let tempPreviewUri = null;
  try {
    const preview = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 380 } }],
      {
        compress: 0.65,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    tempPreviewUri = preview?.uri || null;
    if (!preview?.base64) return null;
    const dataUri = `data:image/jpeg;base64,${preview.base64}`;
    const bounds = await pendingBoundsDetector(dataUri);
    if (
      bounds &&
      typeof bounds.x === 'number' &&
      typeof bounds.y === 'number' &&
      typeof bounds.width === 'number' &&
      typeof bounds.height === 'number' &&
      bounds.width >= 0.15 &&
      bounds.height >= 0.08
    ) {
      return bounds;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (tempPreviewUri && tempPreviewUri !== photoUri) {
      LegacyFileSystem.deleteAsync(tempPreviewUri, { idempotent: true }).catch(
        () => {}
      );
    }
  }
}

function getImageWidth(uri) {
  return new Promise((resolve) => {
    if (!uri) {
      resolve(0);
      return;
    }
    Image.getSize(
      uri,
      (width) => resolve(Number(width) || 0),
      () => resolve(0)
    );
  });
}

export async function recognizeShelfLabel({ uri, base64 }, onProgress) {
  if (!pendingHandler) {
    return {
      name: '',
      price: 0,
      detectedPrices: [],
      unit: 'un',
      category: 'Outros',
      rawText: '',
      confidence: 0,
    };
  }

  let tempResizedUri = null;
  try {
    let finalBase64 = base64 || null;
    let finalUri = uri || null;

    // Ensure cropped image has adequate resolution (>= 1000px width) for crisp condensed-font OCR
    if (Platform.OS !== 'web' && uri) {
      const width = await getImageWidth(uri);
      if (width > 0 && width < MIN_OCR_WIDTH) {
        try {
          const upscaled = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: MIN_OCR_WIDTH } }],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
              base64: true,
            }
          );
          if (upscaled?.uri) {
            tempResizedUri = upscaled.uri;
            finalUri = upscaled.uri;
            finalBase64 = upscaled.base64 || finalBase64;
          }
        } catch (resizeErr) {
          console.warn('Fallback: usando imagem original no OCR:', resizeErr);
        }
      }
    }

    const dataUri = finalBase64
      ? `data:image/jpeg;base64,${finalBase64}`
      : finalUri;
    const rawOcr = await pendingHandler(dataUri, onProgress);
    if (!rawOcr) {
      return {
        name: '',
        price: 0,
        detectedPrices: [],
        unit: 'un',
        category: 'Outros',
        rawText: '',
        confidence: 0,
      };
    }

    // Ensure both lines and elements are forwarded consistently
    const normalizedPayload = {
      ...rawOcr,
      lines: Array.isArray(rawOcr.lines) ? rawOcr.lines : [],
      elements: Array.isArray(rawOcr.elements)
        ? rawOcr.elements
        : Array.isArray(rawOcr.words)
          ? rawOcr.words
          : [],
      words: Array.isArray(rawOcr.words)
        ? rawOcr.words
        : Array.isArray(rawOcr.elements)
          ? rawOcr.elements
          : [],
    };

    return parseShelfLabel(normalizedPayload);
  } catch (error) {
    console.error('Erro ao analisar etiqueta no dispositivo:', error);
    recordAppErrorLog({
      scope: 'OCR de Etiqueta',
      message: error?.message || String(error || 'Falha no OCR'),
      stack: error?.stack || '',
    }).catch(() => {});
    return {
      name: '',
      price: 0,
      detectedPrices: [],
      unit: 'un',
      category: 'Outros',
      rawText: '',
      confidence: 0,
    };
  } finally {
    if (tempResizedUri && tempResizedUri !== uri) {
      LegacyFileSystem.deleteAsync(tempResizedUri, { idempotent: true }).catch(
        () => {}
      );
    }
  }
}
