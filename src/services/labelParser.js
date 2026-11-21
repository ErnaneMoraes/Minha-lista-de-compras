const TAX_KEYWORDS_RE = /\b(IBPT|TRIB|TRIBUT|TRIBUTOS|APROX|VL\.?\s*APROX|IMPOSTO)\b/i;
const TAX_HEX_RE = /(?:^|[\s-])-[\s]*[0-9A-F]{5,8}\b/i;
const REFERENCE_PRICE_RE =
  /\b(PRE[CÇ]O\s*(?:DO\s*|POR\s*)?(?:LITRO|L\b|KG|QUILO|100\s*G|100\s*ML|UNID|UN\b|METRO)|VALOR\s*(?:POR|DO)\s*(?:LITRO|KG|100)|P\/\s*(?:KG|L|LITRO))\b/i;
const THREE_DECIMAL_PRICE_RE = /\bR?\$?\s*\d+[.,]\d{3}\b/;
const META_NOISE_RE =
  /\b(CAMPANHA|C[OÓ]D\.?|CODIGO|PLU|EAN|VALIDADE|VAL\.|EMISS[AÃ]O|ATUALIZ|LOJA|SE[CÇ][AÃ]O|OFERTA\s+V[AÁ]LIDA)\b/i;
const PRICE_LABEL_NOISE_RE =
  /\b(ATACADO|ATAC\.?|VAREJO|VAR\.?|A\s*PARTIR\s*DE|LEVANDO\s*\d+|CX\s*C\/|FARDO\s*C\/|PACK\s*C\/|PRE[CÇ]O\s*UNIT[AÁ]RIO|UNIT[AÁ]RIO)\b/i;
const DATE_NOISE_RE = /\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})\b/g;
const BARCODE_SEQUENCE_RE = /\b(?:\d{8,14}|\d\s+\d{5,6}\s+\d{5,6})\b/g;
const WEIGHT_MEASURE_RE = /\b\d{1,4}(?:[,.]\d{1,3})?\s*(?:KG|GR|G|MG|ML|LT|LTS|L)\b/gi;
const PACK_QTY_NOISE_RE =
  /(?!R\$\s*)\b\d{1,4}(?:[,.]\d{1,3})?\s*(?:UN|UNID|UND|PCT|CX|FD|FARDO|DZ|ROLO|FLS)\b/gi;
const PACK_CODE_NOISE_RE = /\b(?:FD|CX|PCT|UN|EMB)\s*\d{1,4}\b/gi;

function stripNonPricePatterns(str) {
  return String(str || '')
    .replace(DATE_NOISE_RE, ' ')
    .replace(BARCODE_SEQUENCE_RE, ' ')
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

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
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
  const clean = normalizeText(str);
  if (!clean) return false;
  return TAX_KEYWORDS_RE.test(clean) || TAX_HEX_RE.test(clean) || /\b[0-9A-F]{6}\b/.test(clean);
}

export function isReferencePriceNoise(str) {
  const clean = normalizeText(str);
  if (!clean) return false;
  return REFERENCE_PRICE_RE.test(clean) || THREE_DECIMAL_PRICE_RE.test(clean);
}

export function isMetaNoise(str) {
  const clean = normalizeText(str);
  if (!clean) return false;
  return META_NOISE_RE.test(clean);
}

export function isBarcodeNoise(str) {
  const clean = normalizeText(str);
  if (!clean) return false;
  const withoutPrice = clean.replace(/R?\$?\s*\d{1,4}[,.]\d{2}\b/g, '').trim();
  const digitsOnly = withoutPrice.replace(/\D/g, '');
  const lettersOnly = withoutPrice.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (digitsOnly.length >= 7 && lettersOnly.length <= 2) {
    return true;
  }
  return false;
}

function getBboxMetrics(bbox) {
  if (!bbox) {
    return { x0: 0, y0: 0, x1: 0, y1: 0, width: 0, height: 0, hasBbox: false };
  }
  const x0 = Number(bbox.x0) || 0;
  const y0 = Number(bbox.y0) || 0;
  const x1 = Number(bbox.x1) || 0;
  const y1 = Number(bbox.y1) || 0;
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
        bbox: getBboxMetrics(line?.bbox),
        words: Array.isArray(line?.words) ? line.words : [],
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
  const rawWords = Array.isArray(ocrPayload?.words) ? ocrPayload.words : [];
  if (rawWords.length > 0) {
    return rawWords
      .map((w, index) => ({
        index,
        text: normalizeText(w?.text),
        bbox: getBboxMetrics(w?.bbox),
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
            bbox: getBboxMetrics(w?.bbox),
          });
        }
      }
    }
  }
  return collected;
}

function annotateNoiseLines(lineRecords) {
  let prevWasTaxHeader = false;
  return lineRecords.map((line) => {
    const taxHeader = TAX_KEYWORDS_RE.test(line.text);
    const tax = isTaxNoise(line.text) || (prevWasTaxHeader && /\d+[.,]\d{2}/.test(line.text));
    const refPrice = isReferencePriceNoise(line.text);
    const meta = isMetaNoise(line.text);
    const barcode = isBarcodeNoise(line.text);
    const isPriceLabelLine = PRICE_LABEL_NOISE_RE.test(line.text);

    const isVerticalNoise =
      line.bbox.hasBbox &&
      line.text.length >= 4 &&
      line.bbox.width > 0 &&
      line.bbox.width < line.bbox.height * 0.65 &&
      !/^\d{1,4}[,.]\d{2}$/.test(line.text);

    prevWasTaxHeader = taxHeader;

    return {
      ...line,
      flags: {
        tax,
        refPrice,
        meta,
        barcode,
        isPriceLabelLine,
        isVerticalNoise,
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
  const clean = normalizePriceTokenDigits(stripNonPricePatterns(normalizeText(text)));
  // Prioritize matches preceded by R$
  const rDollarMatch = clean.match(/R\$\s*(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/i);
  if (rDollarMatch) {
    const val = parseFloat(`${rDollarMatch[1]}.${rDollarMatch[3]}`);
    if (Number.isFinite(val) && val > 0 && val <= 9999.99) return val;
  }
  const match = clean.match(/(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/);
  if (match) {
    const val = parseFloat(`${match[1]}.${match[3]}`);
    return Number.isFinite(val) && val > 0 && val <= 9999.99 ? val : 0;
  }
  const separatedMatch = clean.match(/^(?:R\$\s*)?(\d{1,3})\s+(\d{2})$/i);
  if (separatedMatch) {
    const val = parseFloat(`${separatedMatch[1]}.${separatedMatch[2]}`);
    return Number.isFinite(val) && val > 0 && val <= 999.99 ? val : 0;
  }
  return 0;
}

function extractAllPricesFromLineText(text) {
  const cleaned = normalizePriceTokenDigits(stripNonPricePatterns(text));
  const results = [];
  // Match monetary numbers optionally preceded by R$
  const regex = /(?:^|[\s(])(R\$\s*)?(\d{1,4})\s*([,.])\s*(\d{2})(?!\d|\s*(?:KG|G|GR|MG|ML|L|LT|UN|UNID|PCT|CX|FD)\b)/gi;
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

function extractMainPrice(annotatedLines, wordRecords, imageWidth, imageHeight) {
  const candidates = [];
  const maxWordHeight = wordRecords.reduce(
    (max, w) => (w.bbox.hasBbox ? Math.max(max, w.bbox.height) : max),
    0
  );

  const isInNoiseContext = (bbox, tokenText) => {
    if (!bbox.hasBbox) return false;
    const isGiantDigit = maxWordHeight > 0 && bbox.height >= maxWordHeight * 0.6;
    if (isGiantDigit) return false;

    for (const line of annotatedLines) {
      if (!line.bbox.hasBbox) continue;
      if (overlapsLineVertically(bbox, line.bbox)) {
        if (line.flags.tax || line.flags.refPrice || line.flags.meta) {
          return true;
        }
        if (line.flags.barcode && bbox.x0 < line.bbox.x0 + line.bbox.width * 0.75) {
          return true;
        }
      }
    }
    if (THREE_DECIMAL_PRICE_RE.test(tokenText)) return true;
    return false;
  };

  const hasNearbyRDollarWord = (targetBbox) => {
    if (!targetBbox.hasBbox) return false;
    return wordRecords.some((w) => {
      if (!/^R[$S5]|\$$/i.test(w.text.trim())) return false;
      if (!w.bbox.hasBbox) return false;
      if (!overlapsLineVertically(w.bbox, targetBbox)) return false;
      const gap = targetBbox.x0 - w.bbox.x1;
      return gap >= -15 && gap <= Math.max(targetBbox.height * 2.2, 80);
    });
  };

  for (const word of wordRecords) {
    if (
      /^\d{8,14}$/.test(word.text) ||
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
    const match = normalizedWord.match(/^(R\$\s*)?(\d{1,4})\s*([,.])\s*(\d{2})$/i);
    if (!match) continue;
    const value = parseFloat(`${match[2]}.${match[4]}`);
    if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
    if (isInNoiseContext(word.bbox, word.text)) continue;

    const hasRDollar = Boolean(match[1]) || hasNearbyRDollarWord(word.bbox);
    let score = word.bbox.hasBbox ? word.bbox.height * 10 : 50;
    if (match[3] === ',') score += 30;
    // Strong priority boost for values preceded by R$
    if (hasRDollar) score += 220;
    if (imageWidth > 0 && word.bbox.hasBbox && word.bbox.x0 >= imageWidth * 0.35) score += 20;
    if (imageHeight > 0 && word.bbox.hasBbox && word.bbox.y0 >= imageHeight * 0.25) score += 10;

    candidates.push({
      value,
      raw: word.text,
      hasRDollar,
      score,
      bbox: word.bbox,
    });
  }

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
        (first.bbox.y0 + first.bbox.y1) / 2 - (second.bbox.y0 + second.bbox.y1) / 2
      );
      const topDiff = Math.abs(first.bbox.y0 - second.bbox.y0);
      const maxH = Math.max(first.bbox.height, second.bbox.height, 12);
      const isSuperscriptAligned = topDiff <= maxH * 0.45 && second.bbox.y1 <= first.bbox.y1 + 6;
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
        width: Math.max(first.bbox.x1, second.bbox.x1) - Math.min(first.bbox.x0, second.bbox.x0),
        hasBbox: true,
      };

      if (!centsMatch && /^[,.]$/.test(secondNorm) && j + 1 < sortedWords.length) {
        const third = sortedWords[j + 1];
        const thirdNorm = normalizePriceTokenDigits(third.text);
        const thirdMatch = thirdNorm.match(/^(\d{2})$/);
        if (thirdMatch && third.bbox.x0 - second.bbox.x1 <= maxH * 0.9) {
          centsMatch = [third.text, second.text, thirdMatch[1]];
          combinedRaw = `${first.text}${second.text}${third.text}`;
          combinedBbox.x1 = Math.max(combinedBbox.x1, third.bbox.x1);
          combinedBbox.height = Math.max(combinedBbox.height, third.bbox.height);
        }
      }

      if (!centsMatch) continue;
      const hasSeparator = Boolean(centsMatch[1]) || /[,.]$/.test(firstNorm);
      const hasCurrencyPrefix =
        Boolean(intMatch[1]) || /R\$/i.test(firstNorm) || hasNearbyRDollarWord(combinedBbox);
      if (
        !hasSeparator &&
        !hasCurrencyPrefix &&
        !isSuperscriptAligned &&
        combinedBbox.height < (maxWordHeight || 40) * 0.6
      ) {
        continue;
      }

      const value = parseFloat(`${intMatch[2]}.${centsMatch[2]}`);
      if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
      if (isInNoiseContext(combinedBbox, combinedRaw)) continue;

      let score = combinedBbox.height * 10;
      if (combinedRaw.includes(',')) score += 30;
      if (hasCurrencyPrefix) score += 220;
      if (imageWidth > 0 && combinedBbox.x0 >= imageWidth * 0.35) score += 20;

      candidates.push({
        value,
        raw: combinedRaw,
        hasRDollar: hasCurrencyPrefix,
        score,
        bbox: combinedBbox,
      });
    }
  }

  for (const line of annotatedLines) {
    if (line.flags.tax || line.flags.refPrice || line.flags.meta) continue;
    const isBarcodeLineWithoutGiantHeight =
      line.flags.barcode &&
      (!line.bbox.hasBbox || (maxWordHeight > 0 && line.bbox.height < maxWordHeight * 0.55));
    if (isBarcodeLineWithoutGiantHeight) continue;

    const linePrices = extractAllPricesFromLineText(line.text);
    const lineHasRDollar = /R[\$S5]/i.test(line.text);

    for (const lp of linePrices) {
      let score = line.bbox.hasBbox ? line.bbox.height * 8 : 45;
      if (lp.raw.includes(',')) score += 25;
      if (lp.hasRDollar) {
        score += 220;
      } else if (lineHasRDollar) {
        score += 110;
      }
      if (imageWidth > 0 && line.bbox.hasBbox && line.bbox.x0 >= imageWidth * 0.3) score += 10;

      candidates.push({
        value: lp.value,
        raw: lp.raw,
        hasRDollar: lp.hasRDollar || lineHasRDollar,
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

export function extractDistinctDetectedPrices(annotatedLines, primaryPrice, candidates = []) {
  // 1. Collect all explicit "R$" prices first (highest reliability on supermarket shelf tags)
  const rDollarPrices = [];
  for (const line of annotatedLines) {
    if (line.flags.tax || line.flags.refPrice || line.flags.meta) continue;
    const extracted = extractAllPricesFromLineText(line.text);
    for (const item of extracted) {
      if (
        item.hasRDollar &&
        item.value > 0 &&
        !rDollarPrices.some((p) => Math.abs(p - item.value) < 0.005)
      ) {
        rDollarPrices.push(item.value);
      }
    }
  }

  for (const c of candidates) {
    if (
      c.hasRDollar &&
      c.value > 0 &&
      !rDollarPrices.some((p) => Math.abs(p - c.value) < 0.005)
    ) {
      rDollarPrices.push(c.value);
    }
  }

  // If explicit R$ prices were found, use them (plus primaryPrice if it comes from the giant isolated price box and has R$ or no R$ prices conflicted)
  if (rDollarPrices.length > 0) {
    if (
      primaryPrice > 0 &&
      !rDollarPrices.some((p) => Math.abs(p - primaryPrice) < 0.005) &&
      candidates.some((c) => Math.abs(c.value - primaryPrice) < 0.005 && c.hasRDollar)
    ) {
      return [primaryPrice, ...rDollarPrices];
    }
    return rDollarPrices;
  }

  // 2. Fallback when Tesseract missed the "R$" glyph: collect high-confidence price candidates
  const fallbackPrices = [];
  if (primaryPrice > 0) {
    fallbackPrices.push(primaryPrice);
  }
  for (const c of candidates) {
    if (
      c.value > 0 &&
      c.raw &&
      c.raw.includes(',') &&
      !fallbackPrices.some((p) => Math.abs(p - c.value) < 0.005)
    ) {
      fallbackPrices.push(c.value);
    }
  }
  return fallbackPrices;
}

function normalizeMeasureSuffix(name) {
  if (!name) return '';
  const tokens = name.split(/\s+/);
  const lastIdx = tokens.length - 1;
  const last = tokens[lastIdx];

  const m = last.match(/^([0-9SOQDIZB]{2,4})(ML|NL|HL|KG|GR|G)$/i);
  if (m) {
    const numRaw = m[1]
      .toUpperCase()
      .replace(/S/g, '5')
      .replace(/[OQD]/g, '0')
      .replace(/I/g, '1')
      .replace(/Z/g, '2')
      .replace(/B/g, '8');
    let unitRaw = m[2].toUpperCase();
    if (unitRaw === 'NL' || unitRaw === 'HL') unitRaw = 'ML';
    if (/^\d+$/.test(numRaw)) {
      tokens[lastIdx] = `${numRaw}${unitRaw}`;
      return tokens.join(' ');
    }
  }
  return name;
}

function cleanProductNameText(text, priceRaw) {
  let cleaned = normalizeText(text);
  if (priceRaw) {
    cleaned = cleaned.replace(priceRaw, ' ');
  }
  cleaned = cleaned
    .replace(DATE_NOISE_RE, ' ')
    .replace(BARCODE_SEQUENCE_RE, ' ')
    .replace(/\b(ATACADO|ATAC\.?|VAREJO|VAR\.?|A\s*PARTIR\s*DE\s*\d*\s*(?:UN|UNID|PCT|CX)?)\b/gi, ' ')
    .replace(/R\$\s*\d{1,4}\s*[,.]\s*\d{2}/gi, ' ')
    .replace(/(?:^|\s)\d{1,4}[,.]\d{2}(?=\s|$)/g, ' ')
    .replace(/(?:^|\s)R\$(?=\s|$)/gi, ' ')
    .replace(/(?:\/|POR)\s*KG\b/gi, ' ')
    .replace(/^[|_*~`\-.,:;'"\\\/\[\]()]+/, '')
    .replace(/[|_*~`\-.,:;'"\\\/\[\]]+$/, '')
    .replace(/^[a-z]{1,2}\s+(?=[A-ZÀ-Ý]{3,})/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeMeasureSuffix(cleaned);
}

function extractProductName(annotatedLines, imageHeight, priceRaw) {
  const candidates = [];

  for (const line of annotatedLines) {
    if (line.flags.isAnyNoise) continue;
    if (
      line.flags.isPriceLabelLine &&
      extractAllPricesFromLineText(line.text).length > 0
    ) {
      continue;
    }

    const cleaned = cleanProductNameText(line.text, priceRaw);
    if (cleaned.length < 3) continue;

    const letters = cleaned.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 3) continue;

    const alphaRatio = letters.length / cleaned.replace(/\s+/g, '').length;
    if (alphaRatio < 0.45) continue;

    if (/^(R\$|KG|UN|PCT|ATACADO|VAREJO)$/i.test(cleaned)) continue;

    const wordCount = cleaned.split(/\s+/).filter((w) => w.length >= 2).length;
    let score = 0;

    if (line.bbox.hasBbox && imageHeight > 0) {
      const relY = line.bbox.y0 / imageHeight;
      score += Math.max(0, (1 - relY) * 120);
      score += Math.min(45, line.bbox.height * 0.8);
    } else {
      score += Math.max(0, 100 - line.index * 20);
    }

    score += Math.min(40, wordCount * 10);
    if (cleaned === cleaned.toUpperCase() && wordCount >= 2) {
      score += 15;
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

  const nextCandidate = candidates.find(
    (c) =>
      c.line.index === top.line.index + 1 &&
      (!top.line.bbox.hasBbox ||
        !c.line.bbox.hasBbox ||
        (Math.abs(c.line.bbox.y0 - top.line.bbox.y1) <= Math.max(20, top.line.bbox.height * 1.1) &&
          c.line.bbox.height >= top.line.bbox.height * 0.7))
  );

  if (nextCandidate && nextCandidate.score >= top.score * 0.6) {
    return `${top.cleaned} ${nextCandidate.cleaned}`.replace(/\s+/g, ' ').trim();
  }

  return top.cleaned;
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
  const lower = String(name || '').toLowerCase();
  if (!lower) return 'Outros';

  if (/leite\s*(de\s*)?coco/.test(lower)) return 'Mercearia';

  if (
    /\b(banana|ma[cç][aã]|tomate|batata|cebola|alho|alface|laranja|lim[aã]o|uva|mam[aã]o|abacate|cenoura|fruta|verdura|legume|melancia|abacaxi|manga)\b/.test(
      lower
    )
  ) {
    return 'Hortifruti';
  }
  if (
    /\b(leite|queijo|mussarela|mu[cç]arela|iogurte|manteiga|requeij[aã]o|creme\s+de\s+leite|leite\s+condensado|nata)\b/.test(
      lower
    )
  ) {
    return 'Laticínios';
  }
  if (
    /\b(carne|frango|peito|coxa|alcatra|patinho|ac[eé]m|bisteca|lingui[cç]a|peixe|til[aá]pia|salm[aã]o|bacon|presunto|bovina|su[ií]na)\b/.test(
      lower
    )
  ) {
    return 'Carnes';
  }
  if (/\b(p[aã]o|bolo|biscoito|bolacha|torrada|croissant|rosca|panetone)\b/.test(lower)) {
    return 'Padaria';
  }
  if (
    /\b(refrigerante|suco|cerveja|[aá]gua|vinho|energ[eé]tico|ch[aá]|caf[eé]|guaran[aá]|coca)\b/.test(
      lower
    )
  ) {
    return 'Bebidas';
  }
  if (
    /\b(detergente|sab[aã]o|amaciante|[aá]gua\s+sanit[aá]ria|desinfetante|esponja|alvejante|multiuso|limpador)\b/.test(
      lower
    )
  ) {
    return 'Limpeza';
  }
  if (
    /\b(shampoo|xampu|condicionador|sabonete|creme\s+dental|pasta\s+de\s+dente|papel\s+higi[eê]nico|desodorante|escova)\b/.test(
      lower
    )
  ) {
    return 'Higiene';
  }
  if (
    /\b(arroz|feij[aã]o|macarr[aã]o|a[cç][uú]car|[oó]leo|azeite|farinha|sal|molho|milho|ervilha|atum|sardinha|extrato|coco)\b/.test(
      lower
    )
  ) {
    return 'Mercearia';
  }

  return 'Outros';
}

export function parseShelfLabel(ocrPayload) {
  const lineRecords = buildLineRecords(ocrPayload);
  const wordRecords = buildWordRecords(ocrPayload, lineRecords);
  const annotatedLines = annotateNoiseLines(lineRecords);

  const imageWidth = Number(ocrPayload?.imageWidth) || 0;
  const imageHeight =
    Number(ocrPayload?.imageHeight) ||
    annotatedLines.reduce((max, l) => Math.max(max, l.bbox.y1), 0);

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
  if (ocrPayload?.titleText) {
    const cleanedTitle = cleanProductNameText(ocrPayload.titleText, priceRaw);
    const titleLetters = cleanedTitle.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (
      cleanedTitle.length >= 3 &&
      titleLetters.length >= 3 &&
      !isTaxNoise(cleanedTitle) &&
      !isReferencePriceNoise(cleanedTitle) &&
      !isMetaNoise(cleanedTitle) &&
      !isBarcodeNoise(cleanedTitle)
    ) {
      name = cleanedTitle;
    }
  }

  const cleanPriceAreaText =
    priceLineIndex >= 0 && !annotatedLines[priceLineIndex].flags.isAnyNoise
      ? annotatedLines[priceLineIndex].text
      : '';

  const unit = detectUnitFromCleanText(name, `${cleanPriceAreaText} ${ocrPayload?.giantPriceText || ''}`);
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
