const TAX_KEYWORDS_RE = /\b(IBPT|TRIB|TRIBUT|TRIBUTOS|APROX|VL\.?\s*APROX|IMPOSTO)\b/i;
const TAX_HEX_RE = /(?:^|[\s-])-[\s]*[0-9A-F]{5,8}\b/i;
const REFERENCE_PRICE_RE =
  /\b(PRE[CÇ]O\s*(?:DO\s*|POR\s*)?(?:LITRO|L\b|KG|QUILO|100\s*G|100\s*ML|UNID|UN\b|METRO)|VALOR\s*(?:POR|DO)\s*(?:LITRO|KG|100)|P\/\s*(?:KG|L|LITRO))\b/i;
const THREE_DECIMAL_PRICE_RE = /\bR?\$?\s*\d+[.,]\d{3}\b/;
const META_NOISE_RE =
  /\b(CAMPANHA|C[OÓ]D\.?|CODIGO|PLU|EAN|VALIDADE|VAL\.|EMISS[AÃ]O|ATUALIZ|LOJA|SE[CÇ][AÃ]O|ATACADO|VAREJO|OFERTA\s+V[AÁ]LIDA)\b/i;

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
  const clean = normalizeText(text);
  const match = clean.match(/(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/);
  if (!match) return 0;
  const val = parseFloat(`${match[1]}.${match[3]}`);
  return Number.isFinite(val) && val > 0 && val <= 9999.99 ? val : 0;
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

  for (const word of wordRecords) {
    const match = word.text.match(/^R?\$?\s*(\d{1,4})\s*([,.])\s*(\d{2})$/);
    if (!match) continue;
    const value = parseFloat(`${match[1]}.${match[3]}`);
    if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
    if (isInNoiseContext(word.bbox, word.text)) continue;

    let score = word.bbox.hasBbox ? word.bbox.height * 10 : 50;
    if (match[2] === ',') score += 30;
    if (imageWidth > 0 && word.bbox.hasBbox && word.bbox.x0 >= imageWidth * 0.35) score += 20;
    if (imageHeight > 0 && word.bbox.hasBbox && word.bbox.y0 >= imageHeight * 0.25) score += 10;

    candidates.push({
      value,
      raw: word.text,
      score,
      bbox: word.bbox,
    });
  }

  const sortedWords = [...wordRecords]
    .filter((w) => w.bbox.hasBbox)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  for (let i = 0; i < sortedWords.length; i += 1) {
    const first = sortedWords[i];
    const intMatch = first.text.match(/^R?\$?\s*(\d{1,4})[,.]?$/);
    if (!intMatch) continue;

    for (let j = i + 1; j < sortedWords.length; j += 1) {
      const second = sortedWords[j];
      const verticalDiff = Math.abs(
        (first.bbox.y0 + first.bbox.y1) / 2 - (second.bbox.y0 + second.bbox.y1) / 2
      );
      const maxH = Math.max(first.bbox.height, second.bbox.height, 12);
      if (verticalDiff > maxH * 0.75) continue;

      const horizontalGap = second.bbox.x0 - first.bbox.x1;
      if (horizontalGap < -8 || horizontalGap > maxH * 1.4) continue;

      let centsMatch = second.text.match(/^([,.])?\s*(\d{2})$/);
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

      if (!centsMatch && /^[,.]$/.test(second.text) && j + 1 < sortedWords.length) {
        const third = sortedWords[j + 1];
        const thirdMatch = third.text.match(/^(\d{2})$/);
        if (thirdMatch && third.bbox.x0 - second.bbox.x1 <= maxH * 0.9) {
          centsMatch = [third.text, second.text, thirdMatch[1]];
          combinedRaw = `${first.text}${second.text}${third.text}`;
          combinedBbox.x1 = Math.max(combinedBbox.x1, third.bbox.x1);
          combinedBbox.height = Math.max(combinedBbox.height, third.bbox.height);
        }
      }

      if (!centsMatch) continue;
      const hasSeparator = Boolean(centsMatch[1]) || /[,.]$/.test(first.text);
      if (!hasSeparator && combinedBbox.height < (maxWordHeight || 40) * 0.6) continue;

      const value = parseFloat(`${intMatch[1]}.${centsMatch[2]}`);
      if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;
      if (isInNoiseContext(combinedBbox, combinedRaw)) continue;

      let score = combinedBbox.height * 10;
      if (combinedRaw.includes(',')) score += 30;
      if (imageWidth > 0 && combinedBbox.x0 >= imageWidth * 0.35) score += 20;

      candidates.push({
        value,
        raw: combinedRaw,
        score,
        bbox: combinedBbox,
      });
    }
  }

  for (const line of annotatedLines) {
    if (line.flags.tax || line.flags.refPrice || line.flags.meta) continue;
    const cleanedLine = line.text.replace(/\b\d{7,}\b/g, ' ');
    const regex = /(?:\b|^)R?\$?\s*(\d{1,4})\s*([,.])\s*(\d{2})(?!\d)/g;
    let match;
    while ((match = regex.exec(cleanedLine)) !== null) {
      const value = parseFloat(`${match[1]}.${match[3]}`);
      if (!Number.isFinite(value) || value <= 0 || value > 9999.99) continue;

      const isBarcodeLineWithoutGiantHeight =
        line.flags.barcode &&
        (!line.bbox.hasBbox || (maxWordHeight > 0 && line.bbox.height < maxWordHeight * 0.55));
      if (isBarcodeLineWithoutGiantHeight) continue;

      let score = line.bbox.hasBbox ? line.bbox.height * 8 : 40;
      if (match[2] === ',') score += 25;
      if (imageWidth > 0 && line.bbox.hasBbox && line.bbox.x0 >= imageWidth * 0.3) score += 10;
      if (!line.bbox.hasBbox) {
        score += Math.min(20, line.index * 2);
      }

      candidates.push({
        value,
        raw: match[0],
        score,
        bbox: line.bbox,
      });
    }
  }

  if (candidates.length === 0) {
    return { price: 0, priceLineIndex: -1, priceRaw: '' };
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
  };
}

function normalizeMeasureSuffix(name) {
  if (!name) return '';
  const tokens = name.split(/\s+/);
  const lastIdx = tokens.length - 1;
  const last = tokens[lastIdx];

  // Fix OCR slashed-zero/condensed unit suffix at end of product name (e.g. "SOONL" -> "500ML", "2OOG" -> "200G")
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

    const cleaned = cleanProductNameText(line.text, priceRaw);
    if (cleaned.length < 3) continue;

    const letters = cleaned.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 3) continue;

    const alphaRatio = letters.length / cleaned.replace(/\s+/g, '').length;
    if (alphaRatio < 0.45) continue;

    if (/^(R\$|KG|UN|PCT)$/i.test(cleaned)) continue;

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

  const { price: fullPrice, priceLineIndex, priceRaw } = extractMainPrice(
    annotatedLines,
    wordRecords,
    imageWidth,
    imageHeight
  );

  // Dedicated giant-price crop wins if valid
  const giantPriceVal = ocrPayload?.giantPriceText
    ? parsePriceString(ocrPayload.giantPriceText)
    : 0;
  const price = giantPriceVal > 0 ? giantPriceVal : fullPrice;

  // Dedicated title crop wins if valid & cleaner
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
    unit,
    category,
    rawText: String(ocrPayload?.text || ''),
    confidence,
  };
}
