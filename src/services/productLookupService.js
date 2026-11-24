import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  inferCategorySmart,
  normalizeCategoryName,
} from '../utils/categoryDictionary';
import {
  getDiagnosticLogs,
  clearDiagnosticLogs,
  recordScannerLog,
} from './diagnosticLogService';

export const OFF_CACHE_STORAGE_KEY = '@mlc_offline:off_product_cache';
export const MAX_CACHE_ENTRIES = 300;
const FETCH_TIMEOUT_MS = 6500;
const USER_AGENT = 'ListaComprasApp/1.0 (offline-first-scanner)';

// ==========================================
// LOGGER TEMPORÁRIO DE DIAGNÓSTICO (INTEGRADO AO diagnosticLogService)
// ==========================================
export async function getApiDiagnosticLogs() {
  return getDiagnosticLogs();
}

export async function clearApiDiagnosticLogs() {
  return clearDiagnosticLogs();
}

async function appendDiagnosticLog(entry) {
  return recordScannerLog(entry);
}

const ABBREVIATION_MAP = [
  [/\bBISC\.?\b/gi, 'BISCOITO'],
  [/\bCHOC\.?\b/gi, 'CHOCOLATE'],
  [/\bREFRIG\.?\b/gi, 'REFRIGERANTE'],
  [/\bDESINF?\.?\b/gi, 'DESINFETANTE'],
  [/\bTRAD\.?\b/gi, 'TRADICIONAL'],
  [/\bCERV\.?\b/gi, 'CERVEJA'],
  [/\bREQUEIJ\.?\b/gi, 'REQUEIJAO'],
  [/\bMARG\.?\b/gi, 'MARGARINA'],
  [/\bDET\.?\b/gi, 'DETERGENTE'],
  [/\bSAB\.?\b/gi, 'SABAO'],
  [/\bSHAMP\.?\b/gi, 'SHAMPOO'],
  [/\bCOND\.?\b/gi, 'CONDICIONADOR'],
  [/\bINTEG\.?\b/gi, 'INTEGRAL'],
  [/\bDESN\.?\b/gi, 'DESNATADO'],
];

const OFF_TAG_CATEGORY_HINTS = [
  { pattern: /(en:beers|en:sodas|en:juices|en:beverages|en:waters|beverage|drink|soda|juice|water|beer|wine|refrigerante|suco|bebida|cerveja|agua)/i, category: 'Bebidas' },
  { pattern: /(en:chocolates|en:biscuits|en:cookies|en:snacks|en:candies|en:groceries|grocer|pasta|rice|bean|snack|biscuit|cookie|chocolate|candy|candies|flour|sugar|coffee|oil|sauce|farofa|mercearia|arroz|feijao|macarrao|cafe|biscoito)/i, category: 'Mercearia' },
  { pattern: /(en:dairies|en:cheeses|en:yogurts|dair|milk|cheese|yogurt|butter|margarine|laticin|leite|queijo|iogurte|manteiga|requeij)/i, category: 'Frios e Laticínios' },
  { pattern: /(en:meats|meat|beef|pork|poultry|chicken|fish|sausage|ham|carne|frango|peixe|bovin|suin|linguic|presunt|acougue)/i, category: 'Açougue' },
  { pattern: /(en:breads|bread|bakery|cake|toast|pao|padaria|bolo|torrada)/i, category: 'Padaria' },
  { pattern: /(en:hygiene|en:cosmetics|hygiene|cosmetic|personal-care|shampoo|soap|toothpaste|deodorant|higiene|sabonete|creme-dental|desodorante)/i, category: 'Higiene Pessoal' },
  { pattern: /(en:cleaning|cleaning|detergent|laundry|bleach|limpeza|detergente|sabao|amaciante|desinfetante)/i, category: 'Limpeza' },
  { pattern: /(medicine|pharmaceutical|vitamin|supplement|medicamento|farmacia|vitamina)/i, category: 'Farmácia' },
  { pattern: /(fruit|vegetable|produce|fresh-plant|hortifruti|fruta|verdura|legume)/i, category: 'Hortifruti' },
];

function stripAccents(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCacheKey(str) {
  return stripAccents(String(str || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const GENERIC_LEADING_WORDS = new Set([
  'cerveja',
  'biscoito',
  'refrigerante',
  'leite',
  'agua',
  'suco',
  'sabao',
  'detergente',
  'desinfetante',
  'shampoo',
  'condicionador',
  'margarina',
  'requeijao',
  'farofa',
]);

const SEARCH_STOP_WORDS = new Set([
  'com',
  'sem',
  'para',
  'por',
  'tipo',
  'unid',
  'unidade',
  'trad',
  'tradicional',
  'original',
  'pacote',
  'lata',
  'garrafa',
  'pet',
  'long',
  'neck',
]);

function isGarbledOcrWord(word) {
  const ascii = stripAccents(String(word || '')).toLowerCase();
  if (ascii.length < 3) return true;
  // Palavra sem nenhuma vogal (ex: "xkzp", "btrm") costuma ser ruído de OCR
  if (!/[aeiouy]/.test(ascii)) return true;
  // 5+ consoantes seguidas (ex: "strngk", "mnbvc") é forte indício de OCR corrompido
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(ascii)) return true;
  // 4+ letras idênticas consecutivas (ex: "aaaa", "ssss")
  if (/(.)\1{3,}/.test(ascii)) return true;
  return false;
}

const VALID_SHORT_PT_WORDS = new Set([
  'de',
  'da',
  'do',
  'em',
  'no',
  'na',
  'ao',
  'os',
  'as',
  'e',
  'a',
  'o',
  'un',
  'kg',
  'ml',
  'lt',
  'g',
  'l',
]);

export function isReadableProductTitle(text) {
  const clean = String(text || '').trim();
  if (!clean) return false;
  if (/:=|[\u201C\u201D\u00AB\u00BB\u00A1\u00BF\u00A7\u00A6~^]/.test(clean)) {
    return false;
  }
  if (/(?:^|\s)[:=](?:\s|$)|[:=]{2,}/.test(clean)) {
    return false;
  }
  if (/\b[A-Za-zÀ-ÿ]{1,2}\/[A-Za-zÀ-ÿ]{1,2}\b/.test(clean)) {
    return false;
  }
  const ascii = stripAccents(clean);
  const alphaOnly = ascii.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length < 4) return false;

  const vowels = (alphaOnly.match(/[aeiouyAEIOUY]/g) || []).length;
  const vowelRatio = vowels / alphaOnly.length;
  if (vowelRatio < 0.24 || vowelRatio > 0.78) return false;

  const tokens = ascii.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  let badCount = 0;
  let goodWords = 0;
  let nonPtShortTokens = 0;
  for (const tok of tokens) {
    if (/\//.test(tok) && !/^\d{1,3}\/\d{1,3}$/.test(tok)) {
      badCount += 1;
      continue;
    }
    const lower = tok.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!lower) {
      badCount += 1;
      continue;
    }
    if (
      /^\d{1,3}(?:ml|l|lt|kg|g|gr|mg|un|pct|cx|x)?$/i.test(lower) ||
      /^\d{4}(?:ml|g|gr|mg)$/i.test(lower)
    ) {
      continue;
    }
    if (/[a-z]/.test(lower) && /\d/.test(lower)) {
      if (!/^(?:rap10|omega3|c\d{1,2}|t\d)$/i.test(lower)) {
        badCount += 1;
        continue;
      }
    }
    if (lower.length <= 2) {
      if (!VALID_SHORT_PT_WORDS.has(lower)) {
        badCount += 1;
        nonPtShortTokens += 1;
      }
      continue;
    }
    if (
      !/[aeiouy]/.test(lower) ||
      /[bcdfghjklmnpqrstvwxz]{4,}/.test(lower) ||
      /[aeiou]{4,}/.test(lower) ||
      /(.)\1{2,}/.test(lower)
    ) {
      badCount += 1;
    } else {
      goodWords += 1;
    }
  }

  if (goodWords === 0) return false;
  if (nonPtShortTokens >= 2) return false;
  if (badCount >= 2 && badCount / tokens.length >= 0.3) return false;
  return badCount / tokens.length < 0.4;
}

export function isLikelyGarbledOcrText(textoLimpo) {
  return !isReadableProductTitle(textoLimpo);
}

export function buildCoreSearchWords(textoLimpo) {
  const withoutMeasures = String(textoLimpo || '')
    .replace(/\b\d+(?:[,.]\d+)?\s*(?:ml|l|lt|lts|kg|g|gr|mg|un|unid|pct|cx)\b/gi, ' ')
    .replace(/\b\d+(?:[,.]\d+)?\b/g, ' ');
  const rawTokens = withoutMeasures.match(/[A-Za-zÀ-ÿ]{3,}/g) || [];
  const cleanTokens = rawTokens.filter((t) => !isGarbledOcrWord(t));
  const filtered = cleanTokens.filter(
    (t) => !SEARCH_STOP_WORDS.has(stripAccents(t).toLowerCase())
  );
  const pool = filtered.length >= 2 ? filtered : cleanTokens;
  return pool.slice(0, 3);
}

const COMMON_VOLUME_NUMBERS = new Set([
  '200',
  '250',
  '269',
  '275',
  '300',
  '310',
  '330',
  '350',
  '355',
  '473',
  '500',
  '510',
  '550',
  '600',
  '750',
  '900',
]);

export function hasSignificantWordOverlap(
  sanitizedOcrText,
  productName = '',
  brands = ''
) {
  const ocrTokens = (String(sanitizedOcrText || '').match(/[A-Za-zÀ-ÿ]{4,}/g) || [])
    .map((w) => stripAccents(w).toLowerCase())
    .filter((w) => !SEARCH_STOP_WORDS.has(w));
  if (ocrTokens.length === 0) return false;

  const targetNormalized = stripAccents(`${productName} ${brands}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  const targetWords = new Set(targetNormalized.split(/\s+/).filter(Boolean));

  return ocrTokens.some(
    (word) =>
      targetWords.has(word) ||
      (word.length >= 5 && targetNormalized.includes(word))
  );
}

export function cleanOrPreferProductTitle(apiName, localOcrText = '') {
  let cleaned = String(apiName || '').trim();
  if (!cleaned) return '';

  // Corrige erros comuns da base Open Food Facts (ex.: "Stella Arois600" -> "Stella Artois 600ml", "3l" -> "3L")
  const hadStuckVolume = /[A-Za-zÀ-ÿ](\d{3})\b/.test(cleaned);
  cleaned = cleaned
    .replace(
      /([A-Za-zÀ-ÿ])(\d{3})\b/g,
      (match, letter, num) =>
        COMMON_VOLUME_NUMBERS.has(num) ? `${letter} ${num}ml` : `${letter} ${num}`
    )
    .replace(/\bStella\s+Arois\b/gi, 'Stella Artois')
    .replace(/\b(\d+(?:[,.]\d+)?)\s*l\b/g, '$1L')
    .replace(/\s+/g, ' ')
    .trim();

  // Se o título retornado pela API estava malformado e o OCR local está bem formado, prefere o OCR limpo
  const localTrimmed = String(localOcrText || '').trim();
  if (
    hadStuckVolume &&
    localTrimmed &&
    !isLikelyGarbledOcrText(localTrimmed) &&
    buildCoreSearchWords(localTrimmed).length >= 2 &&
    /\b\d+(?:[,.]\d+)?\s*(?:ml|l|lt|kg|g)\b/i.test(localTrimmed)
  ) {
    return localTrimmed.replace(/\b(\d+(?:[,.]\d+)?)\s*l\b/g, '$1L');
  }

  return cleaned;
}

export function hasSufficientSearchWords(textoLimpo) {
  return !isLikelyGarbledOcrText(textoLimpo) && buildCoreSearchWords(textoLimpo).length >= 2;
}

export function limparTextoEtiqueta(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const ascii = stripAccents(line);
      if (
        /\b(IBPT|VL\.?\s*APROX|APROX|TRIB|TRIBUTOS?|IMPOSTO|PRECO\s+EQUIVALE|PRECO\s+(?:DO\s+|POR\s+)?(?:LITRO|KG|UN)|P\/LT|P\/KG|POR\s+LITRO|POR\s+KG|R\$\s*\/|VALIDADE|LOTE|EAN|SEC\s*:)\b/i.test(
          ascii
        )
      ) {
        return false;
      }
      return true;
    });

  let text = lines.join(' ');

  text = text
    .replace(/R\$\s*\d{1,4}\s*[,.]\s*\d{2,3}\s*(?:UNID|UN|UND|KG|LT|L)?/gi, ' ')
    .replace(/\b\d{1,4}\s*[,.]\s*\d{2,3}\b/g, ' ')
    .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-](?:\d{4}|\d{2})\b/g, ' ')
    .replace(/\b\d{8,14}\b/g, ' ')
    .replace(/(?:^|[\s-])-[\s]*[0-9A-F]{5,8}\b/gi, ' ')
    .replace(/\b(?=[0-9A-F]*\d)(?=[0-9A-F]*[A-F])[0-9A-F]{5,8}\b/gi, ' ')
    .replace(
      /\b(R\$|UNID\.?|UN\.?|UND\.?|KG\.?|PRE[CÇ]O\s+EQUIVALE\s+A|P\/LT|P\/KG|SEC\.?\s*:?|IBPT|ATACADO|VAREJO)\b/gi,
      ' '
    )
    .replace(/[|_*~`^\\\/\[\](){}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of ABBREVIATION_MAP) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/^[-.,:;'"!@#%&+=]+/, '')
    .replace(/[-.,:;'"!@#%&+=]+$/, '')
    .replace(/(?<=\s)[A-Za-zÀ-ÿ]$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function mapCategoryFromProduct(nome, categoriesTags = []) {
  // 1. Quando há categories_tags estruturadas da Open Food Facts, avalia primeiro para evitar falsos positivos por sabor (ex.: "limão" em chocolate)
  const tagsJoined = Array.isArray(categoriesTags)
    ? categoriesTags.join(' ')
    : String(categoriesTags || '');
  if (tagsJoined) {
    for (const rule of OFF_TAG_CATEGORY_HINTS) {
      if (rule.pattern.test(tagsJoined)) {
        return normalizeCategoryName(rule.category);
      }
    }
  }

  // 2. Dicionário local inteligente (com marcas brasileiras e aprendizado do usuário)
  const fromDict = inferCategorySmart(nome);
  if (fromDict) {
    return normalizeCategoryName(fromDict);
  }

  if (tagsJoined) {
    const fromTagsDict = inferCategorySmart(tagsJoined.replace(/[:_-]/g, ' '));
    if (fromTagsDict) {
      return normalizeCategoryName(fromTagsDict);
    }
  }

  return 'Outros';
}

function composeDisplayName(nomeBase, marca, quantidade) {
  const parts = [nomeBase];
  const lowerBase = nomeBase.toLowerCase();
  if (marca && !lowerBase.includes(marca.toLowerCase())) {
    parts.push(marca);
  }
  if (quantidade && !lowerBase.includes(quantidade.toLowerCase())) {
    parts.push(quantidade);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function isValidApiProductName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  // Rejeita nomes puramente numéricos / códigos de barras (ex: "7896045101641")
  if (/^\d[\d\s.-]*$/.test(trimmed)) return false;
  const alphaCount = (trimmed.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  return alphaCount >= 3;
}

function normalizeOffProduct(rawProduct, fallbackBarcode = '', origem = 'api') {
  const candidates = [
    rawProduct?.product_name_pt,
    rawProduct?.product_name,
    rawProduct?.generic_name_pt,
  ];
  const validName =
    candidates.find((c) => isValidApiProductName(c)) || '';
  const nomeBase = String(validName).trim();
  const marca = String(rawProduct?.brands || '')
    .split(',')[0]
    .trim();
  const quantidade = String(rawProduct?.quantity || '').trim();
  const codigoBarras = String(rawProduct?.code || fallbackBarcode || '').replace(
    /\D/g,
    ''
  );
  const categoriaSugerida = mapCategoryFromProduct(
    `${nomeBase} ${marca}`.trim(),
    rawProduct?.categories_tags
  );

  return {
    nome: nomeBase,
    marca,
    quantidade,
    categoriaSugerida,
    codigoBarras,
    imagemUrl: '',
    origem,
  };
}

export async function clearProductLookupCache() {
  try {
    await AsyncStorage.removeItem(OFF_CACHE_STORAGE_KEY);
  } catch {
    // ignore cache clear errors
  }
}

async function deleteCompactCacheEntry(cacheKey) {
  if (!cacheKey) return;
  try {
    const cache = await readProductCache();
    if (cache[cacheKey]) {
      delete cache[cacheKey];
      await AsyncStorage.setItem(OFF_CACHE_STORAGE_KEY, JSON.stringify(cache));
    }
  } catch {
    // ignore delete failures
  }
}

async function readProductCache() {
  try {
    const raw = await AsyncStorage.getItem(OFF_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function decodeCompactCacheEntry(rawEntry, fallbackBarcode = '') {
  if (!rawEntry || typeof rawEntry !== 'object') return null;
  const nome = String(rawEntry.n || rawEntry.nome || '').trim();
  if (!nome) return null;
  const categoriaSugerida = normalizeCategoryName(
    rawEntry.c || rawEntry.categoriaSugerida || 'Outros'
  );
  return {
    nome,
    marca: '',
    quantidade: '',
    categoriaSugerida,
    codigoBarras: fallbackBarcode,
    imagemUrl: '',
    origem: 'cache',
  };
}

async function writeCompactCacheEntry(cacheKey, nome, categoriaSugerida) {
  if (!cacheKey || !nome) return;
  try {
    const cache = await readProductCache();
    cache[cacheKey] = {
      n: String(nome).trim(),
      c: normalizeCategoryName(categoriaSugerida),
      ts: Date.now(),
    };

    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys.sort(
        (a, b) =>
          (cache[a]?.ts || cache[a]?.cachedAt || 0) -
          (cache[b]?.ts || cache[b]?.cachedAt || 0)
      );
      const excess = keys.length - MAX_CACHE_ENTRIES;
      for (let i = 0; i < excess; i += 1) {
        delete cache[keys[i]];
      }
    }

    await AsyncStorage.setItem(OFF_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore cache write failures
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const status = response.status;
    if (!response.ok) {
      return {
        ok: false,
        status,
        data: null,
        errorMessage: `HTTP ${status}`,
      };
    }
    const data = await response.json();
    return { ok: true, status, data, errorMessage: '' };
  } catch (err) {
    return {
      ok: false,
      status: timedOut ? 'Timeout (6,5s)' : 'Erro de Rede',
      data: null,
      errorMessage: timedOut
        ? 'Tempo limite de 6,5 segundos excedido'
        : err?.message || 'Falha de conexão',
    };
  } finally {
    clearTimeout(timerId);
  }
}

export function isValidGtinBarcode(barcode) {
  const digits = String(barcode || '').replace(/\D/g, '');
  const n = digits.length;
  // Aceita exclusivamente EAN-13 brasileiro (789/790) ou EAN-8 comercial
  if (n !== 8 && n !== 13) return false;
  if (digits.startsWith('2')) return false;
  if (n === 13 && !digits.startsWith('789') && !digits.startsWith('790')) {
    return false;
  }
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  for (let i = n - 2; i >= 0; i -= 1) {
    const posFromRight = n - 1 - i;
    const weight = posFromRight % 2 === 1 ? 3 : 1;
    sum += (digits.charCodeAt(i) - 48) * weight;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === digits.charCodeAt(n - 1) - 48;
}

export function isValidCommercialBarcode(barcode) {
  return isValidGtinBarcode(barcode);
}

export async function identificarProdutoDaEtiqueta({
  rawText = '',
  barcode = '',
  bypassCache = false,
} = {}) {
  const startedAtMs = Date.now();
  const cleanBarcode = String(barcode || '').replace(/\D/g, '');
  const rawTextSnippet = String(rawText || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const textoLimpo = limparTextoEtiqueta(rawText);
  const commercialBarcode = isValidCommercialBarcode(cleanBarcode);

  const eanCacheKey = commercialBarcode ? `ean:${cleanBarcode}` : null;
  const textNorm = normalizeCacheKey(textoLimpo);
  const textCacheKey = textNorm.length >= 3 ? `txt:${textNorm}` : null;

  const baseLog = {
    rawTextSnippet: rawTextSnippet || '(vazio)',
    detectedBarcode: cleanBarcode || 'Nenhum',
    sanitizedText: textoLimpo || '(vazio)',
  };

  // 1. Check ultra-compact AsyncStorage LRU cache first (unless bypassCache is requested)
  const cache = bypassCache ? {} : await readProductCache();
  if (!bypassCache && eanCacheKey && cache[eanCacheKey]) {
    const decoded = decodeCompactCacheEntry(cache[eanCacheKey], cleanBarcode);
    if (decoded && !isValidApiProductName(decoded.nome)) {
      // Remove entrada corrompida ou numérica do cache
      await deleteCompactCacheEntry(eanCacheKey);
    } else if (decoded) {
      // Revalida automaticamente categorias antigas ('Outros' ou 'Hortifruti') usando o dicionário atualizado
      let effectiveCategory = decoded.categoriaSugerida;
      if (
        effectiveCategory === 'Outros' ||
        effectiveCategory === 'Hortifruti'
      ) {
        const revalidated = inferCategorySmart(decoded.nome);
        if (revalidated) {
          effectiveCategory = normalizeCategoryName(revalidated);
        }
      }
      decoded.categoriaSugerida = effectiveCategory;

      const durationMs = Date.now() - startedAtMs;
      writeCompactCacheEntry(eanCacheKey, decoded.nome, effectiveCategory);
      await appendDiagnosticLog({
        ...baseLog,
        routeTaken: 'Cache Hit (EAN)',
        requestUrl: '',
        httpStatus: 'Local',
        durationMs,
        apiResultSummary: `Cache: ${decoded.nome} (${effectiveCategory})`,
        finalOrigin: 'cache',
      });
      return {
        ...decoded,
        httpStatus: 'Local',
        durationMs,
        routeTaken: 'Cache Hit (EAN)',
      };
    }
  }

  let lastRoute = 'Fallback OCR Local';
  let lastUrl = '';
  let lastStatus = '-';
  let lastSummary = 'Sem correspondência';

  // 2. Flow 1 — Commercial Barcode (GS1 Brasil 789/790 ou EAN-8, timeout 6.5s + 1 retry rápido em 5xx/rede + fallback Open Products Facts em 404)
  if (commercialBarcode) {
    const offFields =
      'product_name,product_name_pt,generic_name_pt,brands,categories_tags,quantity';
    const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json?fields=${offFields}`;
    lastRoute = 'Fluxo 1: Open Food Facts v2';
    lastUrl = url;

    let res = await fetchJsonWithTimeout(url, FETCH_TIMEOUT_MS);
    const isTransientFailure =
      !res.ok &&
      (res.status === 'Erro de Rede' ||
        String(res.status).startsWith('Timeout') ||
        (typeof res.status === 'number' && res.status >= 500));
    if (isTransientFailure) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      res = await fetchJsonWithTimeout(url, FETCH_TIMEOUT_MS);
    }
    lastStatus = res.status;

    let activeRes = res;
    let activeUrl = url;
    let activeRoute = lastRoute;

    // Fallback secundário gratuito (Open Products Facts) quando OFF retorna 404 ou status != 1 (itens não-alimentícios como filtros, limpeza, higiene)
    const offNotFound =
      res.status === 404 || (res.ok && res.data?.status !== 1);
    if (offNotFound) {
      const opfUrl = `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}.json?fields=${offFields}`;
      const opfRes = await fetchJsonWithTimeout(opfUrl, FETCH_TIMEOUT_MS);
      activeRes = opfRes;
      activeUrl = opfUrl;
      activeRoute = 'Fluxo 1b: Open Products Facts (Fallback 404)';
      lastRoute = `OFF ${res.status} -> ${activeRoute}`;
      lastUrl = opfUrl;
      lastStatus = opfRes.status;
    }

    if (activeRes.ok && activeRes.data?.status === 1 && activeRes.data?.product) {
      const normalized = normalizeOffProduct(
        activeRes.data.product,
        cleanBarcode,
        'api'
      );
      const safeLocalName = isReadableProductTitle(textoLimpo) ? textoLimpo : '';

      if (normalized.nome) {
        normalized.nome = cleanOrPreferProductTitle(
          normalized.nome,
          safeLocalName
        );
        const durationMs = Date.now() - startedAtMs;
        const display = composeDisplayName(
          normalized.nome,
          normalized.marca,
          normalized.quantidade
        );
        await writeCompactCacheEntry(
          eanCacheKey,
          display,
          normalized.categoriaSugerida
        );
        await appendDiagnosticLog({
          ...baseLog,
          routeTaken: activeRoute,
          requestUrl: activeUrl,
          httpStatus: activeRes.status,
          durationMs,
          apiResultSummary: `status: 1 - ${display}`,
          finalOrigin: 'api',
        });
        return {
          ...normalized,
          httpStatus: activeRes.status,
          durationMs,
          routeTaken: activeRoute,
          rawPayload: activeRes.data?.product || activeRes.data || null,
        };
      }

      // Nome retornado pela API era inválido/numérico (ex: "7896045101641"): preserva categoria/quantidade da API e usa título OCR limpo
      const fallbackWithApiMeta = {
        ...normalized,
        nome: safeLocalName,
        categoriaSugerida:
          normalized.categoriaSugerida !== 'Outros'
            ? normalized.categoriaSugerida
            : safeLocalName
              ? mapCategoryFromProduct(safeLocalName, [])
              : 'Outros',
        origem: 'ocr_local',
        httpStatus: activeRes.status,
        durationMs: Date.now() - startedAtMs,
        routeTaken: `${activeRoute} (nome numérico rejeitado)`,
        rawPayload: activeRes.data?.product || activeRes.data || null,
      };
      await appendDiagnosticLog({
        ...baseLog,
        routeTaken: fallbackWithApiMeta.routeTaken,
        requestUrl: activeUrl,
        httpStatus: activeRes.status,
        durationMs: fallbackWithApiMeta.durationMs,
        apiResultSummary: `Nome da API rejeitado (numérico/curto) — mantido OCR: "${safeLocalName || '(vazio)'}" (${fallbackWithApiMeta.categoriaSugerida})`,
        finalOrigin: 'ocr_local',
      });
      return fallbackWithApiMeta;
    } else if (activeRes.ok) {
      lastSummary = `status: ${activeRes.data?.status ?? 0} (não encontrado)`;
    } else {
      lastSummary = activeRes.errorMessage || 'Erro na requisição EAN';
    }
  }

  // 3. Fluxo 2 (Busca textual externa) desativado para eliminar atrasos e erros HTTP 503.
  // Sem EAN comercial válido (checksum GS1 inválido, código de balança ou ausente), retorna imediatamente o OCR local.
  if (!commercialBarcode) {
    lastRoute = cleanBarcode
      ? 'Ignorado (EAN inválido / etiqueta de balança)'
      : 'OCR Local (Sem EAN comercial)';
    lastUrl = '';
    lastStatus = '-';
    lastSummary = cleanBarcode
      ? cleanBarcode.startsWith('2')
        ? 'Código de balança (prefixo 2): consulta externa ignorada'
        : 'Dígito verificador GS1 Módulo-10 inválido: consulta bloqueada (evita HTTP 404)'
      : 'Sem código EAN comercial: preenchimento instantâneo via OCR local';
  }

  // 4. Graceful Offline / No-Match Fallback
  const safeLocalName = isReadableProductTitle(textoLimpo) ? textoLimpo : '';
  const durationMs = Date.now() - startedAtMs;
  await appendDiagnosticLog({
    ...baseLog,
    routeTaken: lastRoute,
    requestUrl: lastUrl,
    httpStatus: lastStatus,
    durationMs,
    apiResultSummary: safeLocalName
      ? lastSummary
      : `${lastSummary} (texto OCR ilegível descartado)`,
    finalOrigin: 'ocr_local',
  });

  return {
    nome: safeLocalName,
    marca: '',
    quantidade: '',
    categoriaSugerida: safeLocalName
      ? mapCategoryFromProduct(safeLocalName, [])
      : 'Outros',
    codigoBarras: cleanBarcode,
    imagemUrl: '',
    origem: 'ocr_local',
    httpStatus: lastStatus,
    durationMs,
    routeTaken: lastRoute,
  };
}
