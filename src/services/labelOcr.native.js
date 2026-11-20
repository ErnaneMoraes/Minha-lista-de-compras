import { parseShelfLabel } from './labelParser';

let pendingHandler = null;

export function registerNativeOcrRunner(handler) {
  pendingHandler = handler;
  return () => {
    if (pendingHandler === handler) {
      pendingHandler = null;
    }
  };
}

export async function recognizeShelfLabel({ uri, base64 }, onProgress) {
  if (!pendingHandler) {
    return { name: '', price: 0, unit: 'un', category: 'Outros', rawText: '', confidence: 0 };
  }

  try {
    const dataUri = base64 ? `data:image/jpeg;base64,${base64}` : uri;
    const rawOcr = await pendingHandler(dataUri, onProgress);
    if (!rawOcr) {
      return { name: '', price: 0, unit: 'un', category: 'Outros', rawText: '', confidence: 0 };
    }
    return parseShelfLabel(rawOcr);
  } catch (error) {
    console.error('Erro ao analisar etiqueta no dispositivo:', error);
    return { name: '', price: 0, unit: 'un', category: 'Outros', rawText: '', confidence: 0 };
  }
}
