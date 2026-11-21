import {
  inferCategorySmart,
  normalizeCategoryName,
} from '../utils/categoryDictionary';

function stripAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Accent-insensitive blacklists (tested against stripAccents(str))
const TAX_KEYWORDS_RE =
  /\b(IBPT|1BPT|VL\.?\s*APROX|V\.?\s*APROX|APROX\.?|TRIB\.?|IRIB\.?|TRIBUTOS?|IMPOSTOS?|FONTE\s+IBPT)\b/i;
const TAX_HEX_RE =
  /(?:^|[\s-])-[\s]*[0-9A-F]{5,8}\b|\b(?=[0-9A-F]*\d)(?=[0-9A-F]*[A-F])[0-9A-F]{5,8}\b/i;
const REFERENCE_PRICE_RE =
  /\b(PRECO\s*(?:DO\s*|POR\s*)?(?:LITRO|L\b|KG|QUILO|100\s*G|100\s*ML|UNID|UN\b|METRO)|VALOR\s*(?:POR|DO)\s*(?:LITRO|KG|100)|POR\s*(?:KG|LITRO|L\b|QUILO)|P\/\s*(?:KG|L|LITRO))\b|R\$\s*\/\s*(?:KG|L\b|LITRO|ML|UN)/i;
const THREE_DECIMAL_PRICE_RE = /\bR?\$?\s*\d+[.,]\d{3}\b/;
const META_NOISE_RE =
  /\b(CAMPANHA|COD\.?|CODIGO|PLU|EAN|VALIDADE|VAL\.|LOTE|EMISSAO|ATUALIZ\w*|LOJA|SECAO|OFERTA\s+VALIDA)\b/i;
const NON_PRODUCT_KEYWORDS_RE =
  /\b(IBPT|1BPT|VL\.?\s*APROX|APROX|TRIB|TRIBUTOS?|IMPOSTOS?|PRECO\s+LITRO|PRECO\s+KG|PRECO\s+UN|POR\s+KG|POR\s+LITRO|ATACADO|ATAC\.?|VAREJO|VAR\.?|CARTAO|CLUBE|UNIDADE|VALIDADE|LOTE|COD\.?|CODIGO|EAN|A\s*PARTIR\s*DE|LEVANDO\s*\d+|PRECO\s+UNITARIO|UNITARIO)\b/i;

const DATE_NOISE_RE = /\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})\b/g;
const BARCODE_SEQUENCE_RE = /\b(?:\d{8,14}|\d\s+\d{5,6}\s+\d{5,6})\b/g;
const WEIGHT_MEASURE_RE =
  /\b\d{1,4}(?:[,.]\d{1,3})?\s*(?:KG|GR|G|MG|ML|LT|LTS|L)\b/gi;
const PACK_QTY_NOISE_RE =
  /(?!R\$\s*)\b\d{1,4}(?:[,.]\d{1,3})?\s*(?:UN|UNID|UND|PCT|CX|FD|FARDO|DZ|ROLO|FLS)\b/gi;
const PACK_CODE_NOISE_RE = /\b(?:FD|CX|PCT|UN|EMB)\s*\d{1,4}\b/gi;
const PRODUCT_UNIT_HINT_RE =
  /\b\d{1,4}(?:[,.]\d{1,2})?\s*(?:ML|L|LT|LTS|KG|G|GR|MG|UN|PCT)\b/i;

const LOWERCASE_PT_WORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'com',
  'sem',
  'para',
  'por',
  'a',
  'o',
  'as',
  'os',
  'ao',
  'no',
  'na',
]);

function stripNonPricePatterns(str) {
  return String(str || '')
    .replace(DATE_NOISE_RE, ' ')
    .replace(BARCODE_SEQUENCE_RE, ' ')
    .replace(THREE_DECIMAL_PRICE_RE, ' ')
    .replace(WEIGHT_MEASURE_RE, ' ')
    .replace(PACK_QTY_NOISE_RE, ' ')
    .replace(PACK_CODE_NOISE_RE, ' ');
}

function normalizePriceTokenDigits(str) {
  return String(str || '')
    .replace(/\bR[S5$]\s*(?=\d)/gi, 'R$ ')
    .replace(/(?<=\d)[OQD](?=\d|[,.]|$)/g, '0')
    .replace(/(?<=^|[R$\s,.])[OQD](?=\d)/g, '0');
}

export function extractLinesAndWordsFromTesseract(data) {
  if (!data) return { text: '', lines: [], words: [] };

  const lines = [];
  const words = [];

  if (Array.isArray(data.blocks) && data.blocks.length > 0) {
    for (const block of data.blocks) {
      for (const para of block?.paragraphs || []) {
        for (const line of para?.lines || []) {
          lines.push(line);
          for (const w of line?.words || []) {
            words.push(w);
          }
        }
      }
    }
  } else {
    if (Array.isArray(data.lines)) {
      lines.push(...data.lines);
    }
    if (Array.isArray(data.words)) {
      words.push(...data.words);
    } else {
      for (const line of lines) {
        if (Array.isArray(line?.words)) words.push(...line.words);
      }
    }
  }

  return {
    text: data.text || '',
    lines,
    words,
  };
}

export function isTaxNoise(str) {
  const clean = stripAccents(normalizeText(str));
  if (!clean) return false;
  return TAX_KEYWORDS_RE.test(clean) || TAX_HEX_RE.test(clean);
}

export function isReferencePriceNoise(str) {
  const clean = stripAccents(normalizeText(str));
  if (!clean) return false;
  return REFERENCE_PRICE_RE.test(clean) || THREE_DECIMAL_PRICE_RE.test(clean);
}

export function isMetaNoise(str) {
  const clean = stripAccents(normalizeText(str));
  if (!clean) return false;
  return META_NOISE_RE.test(clean);
}

export function isBarcodeNoise(str) {
  const clean = normalizeText(str);
  if (!clean) return false;
  const withoutPrice = clean.replace(/R?\$?\s*\d{1,4}[,.]\d{2}\b/g, '').trim();
  const digitsOnly = withoutPrice.replace(/\D/g, '');
  const lettersOnly = withoutPrice.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (digitsOnly.length >= 8 && lettersOnly.length <= 2) {
    return true;
  }
  return false;
}

function getBboxMetrics(rawBox) {
  if (!rawBox || typeof rawBox !== 'object') {
    return { x0: 0, y0: 0, x1: 0, y1: 0, width: 0, height: 0, hasBbox: false };
  }

  // Support both Tesseract { x0, y0, x1, y1 } and ML Kit frame/boundingBox { top, left, width, height }
  if (
    rawBox.top !== undefined ||
    rawBox.left !== undefined ||
    rawBox.height !== undefined
  ) {
    const left = Number(rawBox.left ?? rawBox.x ?? rawBox.x0 ?? 0) || 0;
    const top = Number(rawBox.top ?? rawBox.y ?? rawBox.y0 ?? 0) || 0;
    const width = Math.max(
      0,
      Number(rawBox.width ?? (rawBox.x1 !== undefined ? rawBox.x1 - left : 0)) || 0
    );
    const height = Math.max(
      0,
      Number(rawBox.height ?? (rawBox.y1 !== undefined ? rawBox.y1 - top : 0)) || 0
    );
    return {
      x0: left,
      y0: top,
      x1: left + width,
      y1: top + height,
      width,
      height,
      hasBbox: width > 0 && height > 0,
    };
  }

  const x0 = Number(rawBox.x0) || 0;
  const y0 = Number(rawBox.y0) || 0;
  const x1 = Number(rawBox.x1) || 0;
  const y1 = Number(rawBox.y1) || 0;
  return {
    x0,
    y0,
    x1,
    y1,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
    hasBbox: x1 > x0 && y1 > y0,
  };
}

function buildLineRecords(ocrPayload) {
  const rawLines = Array.isArray(ocrPayload?.lines) ? ocrPayload.lines : [];
  if (rawLines.length > 0) {
    return rawLines
      .map((line, index) => ({
        index,
        text: normalizeText(line?.text),
        bbox: getBboxMetrics(line?.frame || line?.boundingBox || line?.bbox),
        words: Array.isArray(line?.words || line?.elements)
          ? line.words || line.elements
          : [],
      }))
      .filter((line) => line.text.length > 0);
  }

  const textLines = String(ocrPayload?.text || '')
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  return textLines.map((text, index) => ({
    index,
    text,
    bbox: getBboxMetrics(null),
    words: [],
  }));
}

function buildWordRecords(ocrPayload, lineRecords) {
  const rawWords = Array.isArray(ocrPayload?.elements) && ocrPayload.elements.length > 0
    ? ocrPayload.elements
    : Array.isArray(ocrPayload?.words)
      ? ocrPayload.words
      : [];
  if (rawWords.length > 0) {
    return rawWords
      .map((w, index) => ({
        index,
        text: normalizeText(w?.text),
        bbox: getBboxMetrics(w?.frame || w?.boundingBox || w?.bbox),
      }))
      .filter((w) => w.text.length > 0);
  }

  const collected = [];
  for (const line of lineRecords) {
    if (Array.isArray(line.words) && line.words.length > 0) {
      for (const w of line.words) {
        const text = normalizeText(w?.text);
        if (text) {
          collected.push({
            index: collected.length,
            text,
            bbox: getBboxMetrics(w?.frame || w?.boundingBox || w?.bbox),
          });
        }
      }
    }
  }
  return collected;
}

function isVerticalOrMarginNoise(bbox, text, imageWidth) {
  if (!bbox || !bbox.hasBbox) return false;
  const trimmed = normalizeText(text);
  if (/^\d{1,4}\s*[,.]\s*\d{2}$/.test(trimmed)) return false;

  // Taller than wide for multi-character strings (rotated/vertical barcode or serial text)
  if (trimmed.length >= 3 && bbox.width > 0 && bbox.height > bbox.width * 1.4) {
    return true;
  }

  // Flush against far-left vertical margin with narrow width
  if (
    imageWidth > 0 &&
    bbox.x0 < imageWidth * 0.08 &&
    bbox.width < imageWidth * 0.14 &&
    bbox.height > bbox.width * 1.1 &&
    trimmed.length >= 2
  ) {
    return true;
  }

  return false;
}

function annotateNoiseLines(lineRecords, imageWidth = 0) {
  let prevWasTaxHeader = false;
  return lineRecords.map((line) => {
    const asciiLine = stripAccents(line.text);
    const taxHeader = TAX_KEYWORDS_RE.test(asciiLine);
    const tax =
      isTaxNoise(line.text) ||
      (prevWasTaxHeader &&
        /\d+[.,]\d{2}/.test(line.text) &&
        (!line.bbox.hasBbox || line.bbox.height < 35));
    const refPrice = isReferencePriceNoise(line.text);
    const meta = isMetaNoise(line.text);
    const barcode = isBarcodeNoise(line.text);
    const isNonProductLine = NON_PRODUCT_KEYWORDS_RE.test(asciiLine);
    const isVerticalNoise = isVerticalOrMarginNoise(
      line.bbox,
      line.text,
      imageWidth
    );

    prevWasTaxHeader = taxHeader && !/\d+[.,]\d{2}/.test(line.text);

    return {
      ...line,
      flags: {
        tax,
        refPrice,
        meta,
        barcode,
        isNonProductLine,
        isVerticalNoise,
        isPriceBlacklist: tax || refPrice || meta || barcode || isVerticalNoise,
        isAnyNoise: tax || refPrice || meta || barcode || isVerticalNoise,
      },
    };
  });
}

function overlapsLineVertically(wordBbox, lineBbox) {
  if (!wordBbox.hasBbox || !lineBbox.hasBbox) return false;
  const wordCenterY = (wordBbox.y0 + wordBbox.y1) / 2;
  return wordCenterY >= lineBbox.y0 - 4 && wordCenterY <= lineBbox.y1 + 4;
}

function parsePriceString(text) {
  if (isTaxNoise(text) || isReferencePriceNoise(text) || isMetaNoise(text)) {
    return 0;
  }
  const clean = normalizePriceTokenDigits(
    stripNonPricePatterns(normalizeText(text))
  );
  const rDollarMatch = clean.match(/R\$\s*(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/i);
  if (rDollarMatch) {
    const val = parseFloat(`${rDollarMatch[1]}.${rDollarMatch[3]}`);
    if (Number.isFinite(val) && val > 0 && val <= 9999.99) return val;
  }
  const match = clean.match(/\b(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/);
  if (match) {
    const val = parseFloat(`${match[1]}.${match[3]}`);
    return Number.isFinite(val) && val > 0 && val <= 9999.99 ? val : 0;
  }
  const separatedMatch = clean.match(/^(?:R\$\s*)?(\d{1,3})\s+(\d{2})$/i);
  if (separatedMatch) {
    const val = parseFloat(`${separatedMatch[1]}.${separatedMatch[2]}`);
    return Number.isFinite(val) && val > 0 && val <= 9999.99 ? val : 0;
  }
  return 0;
}

function extractAllPricesFromLineText(text) {
  const cleaned = normalizePriceTokenDigits(stripNonPricePatterns(text));
  const results = [];
  const regex =
    /(?:^|[\s(])(R\$\s*)?(\d{1,4})\s*([,.])\s*(\d{2})(?!\d|\s*(?:KG|G|GR|MG|ML|L|LT|UN|UNID|PCT|CX|FD)\b)/gi;
  let m;
  while ((m = regex.exec(cleaned)) !== null) {
    const hasRDollar = Boolean(m[1]);
    const val = parseFloat(`${m[2]}.${m[4]}`);
    if (Number.isFinite(val) && val > 0 && val <= 9999.99) {
      results.push({
        value: val,
        raw: m[0].trim(),
        hasRDollar,
        index: m.index,
      });
    }
  }
  const sepRegex = /\bR\$\s*(\d{1,3})\s+(\d{2})(?!\d|[,.])/gi;
  let sm;
  while ((sm = sepRegex.exec(cleaned)) !== null) {
    const val = parseFloat(`${sm[1]}.${sm[2]}`);
    if (
      Number.isFinite(val) &&
      val > 0 &&
      val <= 999.99 &&
      !results.some((r) => Math.abs(r.value - val) < 0.005)
    ) {
      results.push({
        value: val,
        raw: sm[0].trim(),
        hasRDollar: true,
        index: sm.index,
      });
    }
  }
  return results;
}

function scorePriceCandidate({
  bbox,
  hasComma,
  hasRDollar,
  imageWidth,
  imageHeight,
}) {
  // Primary signal: visual font height
  let score = bbox?.hasBbox ? bbox.height * 18 : 60;
  if (hasComma) score += 30;
  if (hasRDollar) score += 60;
  if (imageWidth > 0 && bbox?.hasBbox && bbox.x0 >= imageWidth * 0.35) {
    score += 45;
  }
  if (imageHeight > 0 && bbox?.hasBbox && bbox.y0 >= imageHeight * 0.35) {
    score += 35;
  }
  return score;
}

function extractMainPrice(annotatedLines, wordRecords, imageWidth, imageHeight) {
  const candidates = [];
  const maxHeight = Math.max(
    wordRecords.reduce(
      (max, w) => (w.bbox.hasBbox ? Math.max(max, w.bbox.height) : max),
      0
    ),
    annotatedLines.reduce(
      (max, l) => (l.bbox.hasBbox ? Math.max(max, l.bbox.height) : max),
      0
    )
  );

  const isInNoiseContext = (bbox, tokenText) => {
    if (THREE_DECIMAL_PRICE_RE.test(tokenText)) return true;
    if (!bbox.hasBbox) return false;
    const isGiantDigit = maxHeight > 0 && bbox.height >= maxHeight * 0.65;
    if (isGiantDigit) return false;

    for (const line of annotatedLines) {
      if (!line.bbox.hasBbox) continue;
      if (overlapsLineVertically(bbox, line.bbox)) {
        if (line.flags.isPriceBlacklist) {
          return true;
        }
      }
    }
    return false;
  };

  const hasNearbyRDollar = (targetBbox) => {
    if (!targetBbox.hasBbox) return false;
    const checkList = wordRecords.length > 0 ? wordRecords : annotatedLines;
    return checkList.some((w) => {
      if (!/^R[$S5]|\$$/i.test(w.text.trim())) return false;
      if (!w.bbox.hasBbox) return false;
      if (!overlapsLineVertically(w.bbox, targetBbox)) return false;
      const gap = targetBbox.x0 - w.bbox.x1;
      return gap >= -15 && gap <= Math.max(targetBbox.height * 2.6, 110);
    });
  };

  // 1. Word-level standalone and prefixed currency matches
  for (const word of wordRecords) {
    if (
      /^\d{8,14}$/.test(word.text) ||
      THREE_DECIMAL_PRICE_RE.test(word.text) ||
      DATE_NOISE_RE.test(word.text) ||
      WEIGHT_MEASURE_RE.test(word.text) ||
      PACK_QTY_NOISE_RE.test(word.text)
    ) {
      DATE_NOISE_RE.lastIndex = 0;
      WEIGHT_MEASURE_RE.lastIndex = 0;
      PACK_QTY_NOISE_RE.lastIndex = 0;
      continue;
    }
    DATE_NOISE_RE.lastIndex = 0;
    WEIGHT_MEASURE_RE.lastIndex = 0;
    PACK_QTY_NOISE_RE.lastIndex = 0;

    const normalizedWord = normalizePriceTokenDigits(word.text);
    const match = normalizedWord.match(
      /^(R\$\s*)?(\d{1,4})\s*([,.])\s*(\d{2})$/i
    );
    if (!match) continue;
    const value = parseFloat(`${match[2]}.${match[4]}`);
    if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
    if (isInNoiseContext(word.bbox, word.text)) continue;

    const hasRDollar = Boolean(match[1]) || hasNearbyRDollar(word.bbox);
    const score = scorePriceCandidate({
      bbox: word.bbox,
      hasComma: match[3] === ',',
      hasRDollar,
      imageWidth,
      imageHeight,
    });

    candidates.push({
      value,
      raw: word.text,
      hasRDollar,
      height: word.bbox.height,
      score,
      bbox: word.bbox,
    });
  }

  // 2. Adjacent word pairs (e.g. "99" + ",99" or superscript cents)
  const sortedWords = [...wordRecords]
    .filter((w) => w.bbox.hasBbox && !/^\d{5,14}$/.test(w.text))
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  for (let i = 0; i < sortedWords.length; i += 1) {
    const first = sortedWords[i];
    const firstNorm = normalizePriceTokenDigits(first.text);
    const intMatch = firstNorm.match(/^(R\$\s*)?(\d{1,4})[,.]?$/i);
    if (!intMatch) continue;

    for (let j = i + 1; j < sortedWords.length; j += 1) {
      const second = sortedWords[j];
      const secondNorm = normalizePriceTokenDigits(second.text);
      const centerDiff = Math.abs(
        (first.bbox.y0 + first.bbox.y1) / 2 -
          (second.bbox.y0 + second.bbox.y1) / 2
      );
      const topDiff = Math.abs(first.bbox.y0 - second.bbox.y0);
      const maxH = Math.max(first.bbox.height, second.bbox.height, 12);
      const isSuperscriptAligned =
        topDiff <= maxH * 0.45 && second.bbox.y1 <= first.bbox.y1 + 6;
      if (centerDiff > maxH * 0.75 && !isSuperscriptAligned) continue;

      const horizontalGap = second.bbox.x0 - first.bbox.x1;
      if (horizontalGap < -8 || horizontalGap > maxH * 1.4) continue;

      let centsMatch = secondNorm.match(/^([,.])?\s*(\d{2})$/);
      let combinedRaw = `${first.text} ${second.text}`;
      let combinedBbox = {
        x0: Math.min(first.bbox.x0, second.bbox.x0),
        y0: Math.min(first.bbox.y0, second.bbox.y0),
        x1: Math.max(first.bbox.x1, second.bbox.x1),
        y1: Math.max(first.bbox.y1, second.bbox.y1),
        height: Math.max(first.bbox.height, second.bbox.height),
        width:
          Math.max(first.bbox.x1, second.bbox.x1) -
          Math.min(first.bbox.x0, second.bbox.x0),
        hasBbox: true,
      };

      if (
        !centsMatch &&
        /^[,.]$/.test(secondNorm) &&
        j + 1 < sortedWords.length
      ) {
        const third = sortedWords[j + 1];
        const thirdNorm = normalizePriceTokenDigits(third.text);
        const thirdMatch = thirdNorm.match(/^(\d{2})$/);
        if (thirdMatch && third.bbox.x0 - second.bbox.x1 <= maxH * 0.9) {
          centsMatch = [third.text, second.text, thirdMatch[1]];
          combinedRaw = `${first.text}${second.text}${third.text}`;
          combinedBbox.x1 = Math.max(combinedBbox.x1, third.bbox.x1);
          combinedBbox.height = Math.max(
            combinedBbox.height,
            third.bbox.height
          );
        }
      }

      if (!centsMatch) continue;
      const hasSeparator = Boolean(centsMatch[1]) || /[,.]$/.test(firstNorm);
      const hasCurrencyPrefix =
        Boolean(intMatch[1]) ||
        /R\$/i.test(firstNorm) ||
        hasNearbyRDollar(combinedBbox);
      if (
        !hasSeparator &&
        !hasCurrencyPrefix &&
        !isSuperscriptAligned &&
        combinedBbox.height < (maxHeight || 40) * 0.6
      ) {
        continue;
      }

      const value = parseFloat(`${intMatch[2]}.${centsMatch[2]}`);
      if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
      if (isInNoiseContext(combinedBbox, combinedRaw)) continue;

      const score = scorePriceCandidate({
        bbox: combinedBbox,
        hasComma: combinedRaw.includes(','),
        hasRDollar: hasCurrencyPrefix,
        imageWidth,
        imageHeight,
      });

      candidates.push({
        value,
        raw: combinedRaw,
        hasRDollar: hasCurrencyPrefix,
        height: combinedBbox.height,
        score,
        bbox: combinedBbox,
      });
    }
  }

  // 2b. Spatial horizontal stitching of tall fragmented price elements (e.g. ["99", ",", "99"])
  const priceTokenElements = wordRecords.filter((w) => {
    if (!w.bbox.hasBbox) return false;
    if (isVerticalOrMarginNoise(w.bbox, w.text, imageWidth)) return false;
    const norm = normalizePriceTokenDigits(w.text).replace(/\s+/g, '');
    return /^(?:R\$)?\d{1,4}[,.]?$/.test(norm) || /^[,.]$/.test(norm) || /^[,.]?\d{2}$/.test(norm);
  });

  const tallThreshold = maxHeight > 0 ? Math.max(20, maxHeight * 0.42) : 20;
  const stitchRows = [];
  const sortedPriceEls = [...priceTokenElements].sort(
    (a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0
  );

  for (const el of sortedPriceEls) {
    const elCenterY = (el.bbox.y0 + el.bbox.y1) / 2;
    let targetRow = null;
    for (const row of stitchRows) {
      const rowMaxH = Math.max(row.maxHeight, el.bbox.height, 14);
      const isSuperscript =
        el.bbox.y0 >= row.minY - 8 && el.bbox.y1 <= row.maxY + 8;
      if (
        Math.abs(elCenterY - row.centerY) < rowMaxH * 0.45 ||
        isSuperscript
      ) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow) {
      stitchRows.push({
        items: [el],
        centerY: elCenterY,
        minY: el.bbox.y0,
        maxY: el.bbox.y1,
        maxHeight: el.bbox.height,
      });
    } else {
      targetRow.items.push(el);
      targetRow.minY = Math.min(targetRow.minY, el.bbox.y0);
      targetRow.maxY = Math.max(targetRow.maxY, el.bbox.y1);
      targetRow.maxHeight = Math.max(targetRow.maxHeight, el.bbox.height);
      targetRow.centerY = (targetRow.minY + targetRow.maxY) / 2;
    }
  }

  for (const row of stitchRows) {
    if (row.items.length < 2 || row.maxHeight < tallThreshold) continue;
    const leftToRight = [...row.items].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    // Split into horizontally contiguous clusters
    const clusters = [[leftToRight[0]]];
    for (let k = 1; k < leftToRight.length; k += 1) {
      const prev = leftToRight[k - 1];
      const curr = leftToRight[k];
      const gap = curr.bbox.x0 - prev.bbox.x1;
      if (gap <= Math.max(row.maxHeight * 1.6, 80)) {
        clusters[clusters.length - 1].push(curr);
      } else {
        clusters.push([curr]);
      }
    }

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const stitched = cluster
        .map((c) => normalizePriceTokenDigits(c.text))
        .join('')
        .replace(/\s+/g, '');
      const stitchedMatch = stitched.match(/^(R\$)?(\d{1,4})([,.])(\d{2})$/i);
      if (!stitchedMatch) continue;

      const value = parseFloat(`${stitchedMatch[2]}.${stitchedMatch[4]}`);
      if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;

      const clusterBbox = {
        x0: Math.min(...cluster.map((c) => c.bbox.x0)),
        y0: Math.min(...cluster.map((c) => c.bbox.y0)),
        x1: Math.max(...cluster.map((c) => c.bbox.x1)),
        y1: Math.max(...cluster.map((c) => c.bbox.y1)),
        width:
          Math.max(...cluster.map((c) => c.bbox.x1)) -
          Math.min(...cluster.map((c) => c.bbox.x0)),
        height: Math.max(...cluster.map((c) => c.bbox.height)),
        hasBbox: true,
      };
      if (isInNoiseContext(clusterBbox, stitched)) continue;

      const hasRDollar =
        Boolean(stitchedMatch[1]) || hasNearbyRDollar(clusterBbox);
      const score = scorePriceCandidate({
        bbox: clusterBbox,
        hasComma: stitchedMatch[3] === ',',
        hasRDollar,
        imageWidth,
        imageHeight,
      });

      candidates.push({
        value,
        raw: stitched,
        hasRDollar,
        height: clusterBbox.height,
        score,
        bbox: clusterBbox,
      });
    }
  }

  // 3. Line-level matches (handles standalone large lines like "99,99" with frame/bbox)
  for (const line of annotatedLines) {
    if (line.flags.isPriceBlacklist) continue;

    const linePrices = extractAllPricesFromLineText(line.text);
    const lineHasRDollar =
      /R[\$S5]/i.test(line.text) || hasNearbyRDollar(line.bbox);

    for (const lp of linePrices) {
      const score = scorePriceCandidate({
        bbox: line.bbox,
        hasComma: lp.raw.includes(','),
        hasRDollar: lp.hasRDollar || lineHasRDollar,
        imageWidth,
        imageHeight,
      });

      candidates.push({
        value: lp.value,
        raw: lp.raw,
        hasRDollar: lp.hasRDollar || lineHasRDollar,
        height: line.bbox.height,
        score,
        bbox: line.bbox,
      });
    }
  }

  if (candidates.length === 0) {
    return { price: 0, priceLineIndex: -1, priceRaw: '', candidates: [] };
  }

  candidates.sort((a, b) => b.score - a.score);
  const winner = candidates[0];

  const priceLineIndex = annotatedLines.findIndex(
    (line) =>
      line.text.includes(winner.raw.trim()) ||
      (winner.bbox.hasBbox &&
        line.bbox.hasBbox &&
        overlapsLineVertically(winner.bbox, line.bbox))
  );

  return {
    price: winner.value,
    priceLineIndex,
    priceRaw: winner.raw,
    candidates,
  };
}

export function extractDistinctDetectedPrices(
  annotatedLines,
  primaryPrice,
  candidates = []
) {
  const bestByValue = new Map();

  for (const c of candidates) {
    if (!Number.isFinite(c.value) || c.value <= 0) continue;
    const key = c.value.toFixed(2);
    const existing = bestByValue.get(key);
    if (!existing || c.score > existing.score) {
      bestByValue.set(key, c);
    }
  }

  const ranked = Array.from(bestByValue.values()).sort(
    (a, b) => b.score - a.score
  );

  if (ranked.length === 0) {
    return primaryPrice > 0 ? [primaryPrice] : [];
  }

  const topHeight = ranked[0].height || 0;
  const distinct = [];

  if (
    primaryPrice > 0 &&
    !ranked.some((r) => Math.abs(r.value - primaryPrice) < 0.005)
  ) {
    distinct.push(primaryPrice);
  }

  for (const item of ranked) {
    if (distinct.some((p) => Math.abs(p - item.value) < 0.005)) continue;
    // Keep the top price always; keep additional prices only if visually comparable (e.g. Retail vs Wholesale/Clube)
    const isTop = distinct.length === 0;
    const hasComparableFontHeight =
      topHeight <= 0 || item.height <= 0 || item.height >= topHeight * 0.4;
    if (isTop || hasComparableFontHeight) {
      distinct.push(item.value);
    }
  }

  return distinct;
}

function normalizeMeasureSuffix(name) {
  if (!name) return '';

  // Fix spaced condensed suffixes like "500 h", "S00 ml", "500 g", "1 kg"
  let text = name
    .replace(/\b([0-9SOQDIZB]{2,4})\s+([mM][lLhH]|[nNhH][lL]|h)\b/g, '$1$2')
    .replace(/\b(\d{1,4})\s+(kg|g|gr|mg|un|pct)\b/gi, '$1$2');

  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    const m = tok.match(/^([0-9SOQDIZB]{1,4})(ML|NL|HL|H|KG|GR|G|L|LT|UN|PCT)$/i);
    if (!m) continue;

    const numRaw = m[1]
      .toUpperCase()
      .replace(/S/g, '5')
      .replace(/[OQD]/g, '0')
      .replace(/I/g, '1')
      .replace(/Z/g, '2')
      .replace(/B/g, '8');

    if (!/^\d+$/.test(numRaw)) continue;
    const numericVal = parseInt(numRaw, 10);
    let unitRaw = m[2].toLowerCase();

    if (unitRaw === 'nl' || unitRaw === 'hl') {
      unitRaw = 'ml';
    } else if (unitRaw === 'h') {
      // Fixes condensed OCR misread like "S00h" / "500h" -> "500ml"
      if (numericVal >= 50 && numericVal <= 2000) {
        unitRaw = 'ml';
      } else {
        continue;
      }
    } else if (unitRaw === 'lt') {
      unitRaw = 'l';
    }

    tokens[i] = `${numRaw}${unitRaw}`;
  }

  return tokens.join(' ');
}

function recoverCondensedGroceryWords(text) {
  if (!text) return '';
  let out = text;

  // Recover "Leite" from condensed OCR typos like "11e Coco...", "1eite...", "Le1te..."
  out = out.replace(
    /^(?:[1lI|]{2,3}e|[1lI|]e[1i!]t[e3]|l[e3][1i!]t[e3])\b(?=\s+(?:coco|condensado|integral|desnatado|semi|em\s+po|fermentado|uht|de)\b)/i,
    'Leite'
  );
  out = out.replace(/\b[1lI|]e[1i!]t[e3]\b/gi, 'Leite');

  // Strip stray leading digit-letter noise token (e.g. "12x Arroz...") when followed by a recognized grocery word
  const leadNoise = out.match(/^(\d{1,2}[a-z]{1,2})\s+(.+)$/i);
  if (leadNoise) {
    const rest = leadNoise[2];
    const hasKnownGrocery =
      Boolean(inferCategorySmart(rest)) ||
      /\b(coco|arroz|feijao|cafe|acucar|oleo|sabao|macarrao|farinha|biscoito|suco|agua|detergente|shampoo|sabonete|papel)\b/i.test(
        stripAccents(rest)
      );
    if (hasKnownGrocery) {
      out = rest;
    }
  }

  return out;
}

function formatProductNameTitleCase(name) {
  if (!name) return '';
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .map((word, idx) => {
      // Preserve clean measurement tokens like 500ml, 1kg, 200g, 1l
      const unitMatch = word.match(/^(\d+(?:[,.]\d+)?)(ml|kg|g|gr|mg|l|un|pct)$/i);
      if (unitMatch) {
        return `${unitMatch[1]}${unitMatch[2].toLowerCase()}`;
      }
      const lower = word.toLowerCase();
      if (idx > 0 && LOWERCASE_PT_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function cleanProductNameText(text, priceRaw) {
  let cleaned = normalizeText(text);
  if (priceRaw) {
    cleaned = cleaned.replace(priceRaw, ' ');
  }
  cleaned = cleaned
    .replace(DATE_NOISE_RE, ' ')
    .replace(BARCODE_SEQUENCE_RE, ' ')
    .replace(TAX_HEX_RE, ' ')
    .replace(
      /\b(ATACADO|ATAC\.?|VAREJO|VAR\.?|A\s*PARTIR\s*DE\s*\d*\s*(?:UN|UNID|PCT|CX)?)\b/gi,
      ' '
    )
    .replace(/R\$\s*\d{1,4}\s*[,.]\s*\d{2}/gi, ' ')
    .replace(/(?:^|\s)\d{1,4}[,.]\d{2}(?=\s|$)/g, ' ')
    .replace(/(?:^|\s)R\$(?=\s|$)/gi, ' ')
    .replace(/(?:\/|POR)\s*KG\b/gi, ' ')
    .replace(/^[|_*~`\-.,:;'"\\\/\[\]()!@#%&+=]+/, '')
    .replace(/[|_*~`\-.,:;'"\\\/\[\]()!@#%&+=]+$/, '')
    .replace(/^(?:[A-Za-zÀ-ÿ]\s+)+(?=[A-Za-zÀ-ÿ]{2,})/, '')
    .replace(/(?<=[A-Za-zÀ-ÿ0-9]{2,})\s+[A-Za-zÀ-ÿ]$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return recoverCondensedGroceryWords(normalizeMeasureSuffix(cleaned));
}

function isRejectedProductLine(rawText) {
  const clean = normalizeText(rawText);
  if (!clean) return true;
  const ascii = stripAccents(clean);

  // Reject lines containing R$, currency values, %, barcodes (8+ digits), or hash codes
  if (/R\$|%/i.test(clean)) return true;
  if (/\b\d{1,4}[,.]\d{2,3}\b/.test(clean)) return true;
  if (/\b\d{8,}\b/.test(clean)) return true;
  if (TAX_HEX_RE.test(ascii)) return true;
  if (NON_PRODUCT_KEYWORDS_RE.test(ascii)) return true;
  if (isTaxNoise(clean) || isReferencePriceNoise(clean) || isMetaNoise(clean)) {
    return true;
  }

  const letters = clean.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length < 3) return true;

  const nonSpaceLen = clean.replace(/\s+/g, '').length;
  if (nonSpaceLen === 0 || letters.length / nonSpaceLen < 0.45) return true;

  return false;
}

function extractProductName(annotatedLines, imageHeight, priceRaw) {
  const candidates = [];

  for (const line of annotatedLines) {
    if (line.flags.isAnyNoise || line.flags.isNonProductLine) continue;
    if (isRejectedProductLine(line.text)) continue;

    const cleaned = cleanProductNameText(line.text, priceRaw);
    if (cleaned.length < 3) continue;

    const letters = cleaned.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 3) continue;

    const alphaRatio = letters.length / cleaned.replace(/\s+/g, '').length;
    if (alphaRatio < 0.45) continue;

    if (/^(R\$|KG|UN|PCT|ATACADO|VAREJO|CLUBE|CARTAO|UNIDADE)$/i.test(cleaned)) {
      continue;
    }

    const alphaWords = cleaned
      .split(/\s+/)
      .filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
    const wordCount = alphaWords.length;

    let score = 0;

    // 1. Vertical position: strong bonus for upper half of the cropped tag
    if (line.bbox.hasBbox && imageHeight > 0) {
      const relY = line.bbox.y0 / imageHeight;
      score += Math.max(0, (1 - relY) * 140);
      if (relY <= 0.4) score += 40;
      score += Math.min(45, line.bbox.height * 0.8);
    } else {
      score += Math.max(0, 120 - line.index * 25);
    }

    // 2. Word quality, measurement units & category dictionary match
    if (wordCount >= 2) score += 25;
    score += Math.min(50, wordCount * 10);
    if (PRODUCT_UNIT_HINT_RE.test(cleaned)) score += 35;
    if (inferCategorySmart(cleaned)) score += 45;

    // 3. Text length / prominence
    score += Math.min(40, cleaned.length * 1.2);
    if (cleaned === cleaned.toUpperCase() && wordCount >= 2) {
      score += 12;
    }

    candidates.push({
      line,
      cleaned,
      score,
    });
  }

  if (candidates.length === 0) return '';

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];

  // Pick single cleanest top-area product line; only merge next line if strictly clean and free of 4-digit/fiscal noise
  const nextCandidate = candidates.find(
    (c) =>
      c.line.index === top.line.index + 1 &&
      !/\b\d{4,}\b/.test(c.line.text) &&
      !isTaxNoise(c.line.text) &&
      !isMetaNoise(c.line.text) &&
      (!top.line.bbox.hasBbox ||
        !c.line.bbox.hasBbox ||
        (Math.abs(c.line.bbox.y0 - top.line.bbox.y1) <=
          Math.max(18, top.line.bbox.height * 0.9) &&
          c.line.bbox.height >= top.line.bbox.height * 0.8))
  );

  const combined =
    nextCandidate &&
    nextCandidate.score >= top.score * 0.78 &&
    !PRODUCT_UNIT_HINT_RE.test(top.cleaned)
      ? `${top.cleaned} ${nextCandidate.cleaned}`.replace(/\s+/g, ' ').trim()
      : top.cleaned;

  return formatProductNameTitleCase(combined);
}

export function detectUnitFromCleanText(nameText, cleanPriceAreaText) {
  const combined = `${nameText || ''} ${cleanPriceAreaText || ''}`.trim();
  if (!combined) return 'un';

  if (/\b(PCT|PACOTE|PACOTES|FARDO|FARDOS|SACH[EÊ]?)\b/i.test(combined)) {
    return 'pct';
  }

  if (
    /(?:\/|R\$|POR|O)\s*KG\b/i.test(combined) ||
    /(?:^|[\s/])KG(?:\b|$)/i.test(combined) ||
    /\b(A\s+GRANEL|QUILO)\b/i.test(combined)
  ) {
    return 'kg';
  }

  return 'un';
}

export function inferCategoryFromName(name) {
  if (!name) return 'Outros';
  const smartMatch = inferCategorySmart(name);
  if (smartMatch) {
    return normalizeCategoryName(smartMatch);
  }
  return 'Outros';
}

export function parseShelfLabel(ocrPayload) {
  const lineRecords = buildLineRecords(ocrPayload);
  const wordRecords = buildWordRecords(ocrPayload, lineRecords);

  const imageWidth =
    Number(ocrPayload?.imageWidth) ||
    Math.max(
      lineRecords.reduce((max, l) => Math.max(max, l.bbox.x1), 0),
      wordRecords.reduce((max, w) => Math.max(max, w.bbox.x1), 0)
    );
  const imageHeight =
    Number(ocrPayload?.imageHeight) ||
    Math.max(
      lineRecords.reduce((max, l) => Math.max(max, l.bbox.y1), 0),
      wordRecords.reduce((max, w) => Math.max(max, w.bbox.y1), 0)
    );

  const annotatedLines = annotateNoiseLines(lineRecords, imageWidth);

  const {
    price: fullPrice,
    priceLineIndex,
    priceRaw,
    candidates,
  } = extractMainPrice(annotatedLines, wordRecords, imageWidth, imageHeight);

  const giantPriceVal = ocrPayload?.giantPriceText
    ? parsePriceString(ocrPayload.giantPriceText)
    : 0;
  const primaryPrice = giantPriceVal > 0 ? giantPriceVal : fullPrice;

  const detectedPrices = extractDistinctDetectedPrices(
    annotatedLines,
    primaryPrice,
    candidates
  );

  const price = detectedPrices.length > 0 ? detectedPrices[0] : primaryPrice;

  let name = extractProductName(annotatedLines, imageHeight, priceRaw);
  if (!name && ocrPayload?.titleText && !isRejectedProductLine(ocrPayload.titleText)) {
    const cleanedTitle = cleanProductNameText(ocrPayload.titleText, priceRaw);
    if (cleanedTitle.length >= 3) {
      name = formatProductNameTitleCase(cleanedTitle);
    }
  } else if (
    ocrPayload?.titleText &&
    !isRejectedProductLine(ocrPayload.titleText)
  ) {
    const cleanedTitle = cleanProductNameText(ocrPayload.titleText, priceRaw);
    const titleWords = cleanedTitle
      .split(/\s+/)
      .filter((w) => /[A-Za-zÀ-ÿ]{2,}/.test(w));
    if (
      cleanedTitle.length > name.length &&
      titleWords.length >= 2 &&
      !isTaxNoise(cleanedTitle) &&
      !isReferencePriceNoise(cleanedTitle)
    ) {
      name = formatProductNameTitleCase(cleanedTitle);
    }
  }

  const cleanPriceAreaText =
    priceLineIndex >= 0 && !annotatedLines[priceLineIndex].flags.isAnyNoise
      ? annotatedLines[priceLineIndex].text
      : '';

  const unit = detectUnitFromCleanText(
    name,
    `${cleanPriceAreaText} ${ocrPayload?.giantPriceText || ''}`
  );
  const category = inferCategoryFromName(name);

  let confidence = 0;
  if (name) confidence += 0.5;
  if (price > 0) confidence += 0.5;

  return {
    name,
    price,
    detectedPrices,
    unit,
    category,
    confidence,
    rawText: String(ocrPayload?.text || ''),
  };
}
