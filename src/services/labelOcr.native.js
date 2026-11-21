import { Image, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { parseShelfLabel } from './labelParser';

let pendingHandler = null;

const MIN_OCR_WIDTH = 1000;

export function registerNativeOcrRunner(handler) {
  pendingHandler = handler;
  return () => {
    if (pendingHandler === handler) {
      pendingHandler = null;
    }
  };
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
