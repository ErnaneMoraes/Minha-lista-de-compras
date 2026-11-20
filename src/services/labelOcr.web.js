import Tesseract from 'tesseract.js';
import { analyzeAndBuildTagImages } from './tagPreprocess';
import { extractLinesAndWordsFromTesseract, parseShelfLabel } from './labelParser';

function loadImageElement(uri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err || new Error('Falha ao carregar imagem'));
    img.src = uri;
  });
}

function rgbaToCanvas(imgObj) {
  const canvas = document.createElement('canvas');
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(imgObj.data), imgObj.width, imgObj.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function recognizeShelfLabel({ uri }, onProgress) {
  if (!uri || typeof document === 'undefined') {
    return { name: '', price: 0, unit: 'un', category: 'Outros', rawText: '', confidence: 0 };
  }

  let worker = null;
  try {
    const img = await loadImageElement(uri);
    const srcW = img.naturalWidth || img.width || 1000;
    const srcH = img.naturalHeight || img.height || 500;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcW;
    srcCanvas.height = srcH;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(img, 0, 0, srcW, srcH);
    const rawImageData = srcCtx.getImageData(0, 0, srcW, srcH);

    const { fullGray, titleGray, priceGray } = analyzeAndBuildTagImages(
      rawImageData.data,
      srcW,
      srcH
    );

    worker = await Tesseract.createWorker(
      'por',
      1,
      {
        logger: (info) => {
          if (
            onProgress &&
            info?.status === 'recognizing text' &&
            typeof info.progress === 'number'
          ) {
            onProgress(info.progress);
          }
        },
      },
      { load_system_dawg: '0', load_freq_dawg: '0' }
    );

    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const fullCanvas = rgbaToCanvas(fullGray);
    const fullRes = await worker.recognize(fullCanvas, {}, { blocks: true, text: true });
    const structured = extractLinesAndWordsFromTesseract(fullRes?.data);

    let titleText = '';
    if (titleGray) {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE });
      const titleRes = await worker.recognize(rgbaToCanvas(titleGray));
      titleText = titleRes?.data?.text || '';
    }

    let giantPriceText = '';
    if (priceGray) {
      await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE });
      const priceRes = await worker.recognize(rgbaToCanvas(priceGray));
      giantPriceText = priceRes?.data?.text || '';
    }

    return parseShelfLabel({
      text: structured.text,
      lines: structured.lines,
      words: structured.words,
      imageWidth: fullGray.width,
      imageHeight: fullGray.height,
      titleText,
      giantPriceText,
    });
  } catch (error) {
    console.error('Erro ao analisar etiqueta na web:', error);
    return { name: '', price: 0, unit: 'un', category: 'Outros', rawText: '', confidence: 0 };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}
