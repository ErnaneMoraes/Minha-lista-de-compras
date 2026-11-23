import { Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIAGNOSTIC_LOGS_KEY = '@mlc_temp:app_diagnostic_logs';
const LEGACY_API_LOGS_KEY = '@mlc_temp:api_debug_logs';
const MAX_DIAGNOSTIC_LOGS = 40;
const APP_VERSION = '1.0.0';

let memoryLogs = null;

function formatLogTimestamp(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}:${ss}`;
}

/**
 * Metadados técnicos estritamente anônimos (em conformidade com a LGPD).
 * NÃO coleta nome, e-mail, IP, GPS, contatos, IMEI, Android ID ou qualquer dado pessoal/sensível.
 */
export function getAnonymousDeviceContext() {
  const win = Dimensions.get('window') || {};
  const width = Math.round(Number(win.width) || 0);
  const height = Math.round(Number(win.height) || 0);
  const constants = Platform.constants || {};

  const osName =
    Platform.OS === 'android'
      ? 'Android'
      : Platform.OS === 'ios'
        ? 'iOS'
        : 'Web';
  const osVersion = String(
    constants.Release || Platform.Version || 'N/A'
  ).trim();
  const brand = String(constants.Brand || constants.Manufacturer || '').trim();
  const model = String(constants.Model || '').trim();
  const deviceLabel = [brand, model].filter(Boolean).join(' ') || osName;

  return {
    os: osName,
    osVersion,
    deviceModel: deviceLabel,
    screen: width > 0 && height > 0 ? `${width}x${height}` : 'N/A',
    appVersion: APP_VERSION,
  };
}

export function formatDeviceContextLine() {
  const ctx = getAnonymousDeviceContext();
  return `${ctx.os} ${ctx.osVersion} • ${ctx.deviceModel} • Tela ${ctx.screen} • App v${ctx.appVersion}`;
}

export async function getDiagnosticLogs() {
  if (Array.isArray(memoryLogs)) {
    return memoryLogs;
  }
  try {
    const [rawNew, rawLegacy] = await Promise.all([
      AsyncStorage.getItem(DIAGNOSTIC_LOGS_KEY),
      AsyncStorage.getItem(LEGACY_API_LOGS_KEY),
    ]);
    const parsedNew = rawNew ? JSON.parse(rawNew) : [];
    const parsedLegacy = rawLegacy ? JSON.parse(rawLegacy) : [];

    const normalizedNew = Array.isArray(parsedNew) ? parsedNew : [];
    const normalizedLegacy = Array.isArray(parsedLegacy)
      ? parsedLegacy.map((item) => ({
          ...item,
          category: item?.category || 'scanner',
        }))
      : [];

    const merged = [...normalizedNew, ...normalizedLegacy].slice(
      0,
      MAX_DIAGNOSTIC_LOGS
    );
    memoryLogs = merged;
    if (normalizedLegacy.length > 0) {
      await AsyncStorage.setItem(DIAGNOSTIC_LOGS_KEY, JSON.stringify(merged));
      await AsyncStorage.removeItem(LEGACY_API_LOGS_KEY);
    }
    return memoryLogs;
  } catch {
    memoryLogs = [];
    return [];
  }
}

export async function clearDiagnosticLogs() {
  memoryLogs = [];
  try {
    await Promise.all([
      AsyncStorage.removeItem(DIAGNOSTIC_LOGS_KEY),
      AsyncStorage.removeItem(LEGACY_API_LOGS_KEY),
    ]);
  } catch {
    // ignore storage errors
  }
}

async function appendEntry(entry) {
  try {
    const existing = await getDiagnosticLogs();
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatLogTimestamp(),
      ...entry,
    };
    const next = [record, ...existing].slice(0, MAX_DIAGNOSTIC_LOGS);
    memoryLogs = next;
    await AsyncStorage.setItem(DIAGNOSTIC_LOGS_KEY, JSON.stringify(next));
  } catch {
    // ignore diagnostic write errors
  }
}

export async function recordScannerLog(entry) {
  await appendEntry({
    category: 'scanner',
    ...entry,
  });
}

export async function recordAppErrorLog({
  scope = 'Aplicativo',
  message = 'Erro inesperado',
  stack = '',
} = {}) {
  const safeMessage = String(message || 'Erro inesperado')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  const safeStack = String(stack || '')
    .trim()
    .slice(0, 420);

  await appendEntry({
    category: 'error',
    scope: String(scope || 'Aplicativo').trim(),
    errorMessage: safeMessage,
    stackTrace: safeStack,
  });
}

export function formatDiagnosticLogsAsText(logs = []) {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const ctx = getAnonymousDeviceContext();

  const lines = [
    '=== LOGS DE DIAGNÓSTICO TÉCNICO — MINHA LISTA DE COMPRAS ===',
    `Gerado em: ${dd}/${mm}/${yyyy} ${now.toTimeString().slice(0, 8)}`,
    `Dispositivo (anônimo / LGPD): ${ctx.os} ${ctx.osVersion} | ${ctx.deviceModel} | Tela ${ctx.screen} | App v${ctx.appVersion}`,
    'Privacidade: Nenhum dado pessoal, conta, IP, localização ou identificador único é coletado.',
    `Total de registros: ${logs.length}`,
    '',
  ];

  if (logs.length === 0) {
    lines.push('Nenhum evento registrado.');
    return lines.join('\n');
  }

  logs.forEach((log, idx) => {
    if (log.category === 'error') {
      lines.push(`#${idx + 1} [${log.timestamp}] [ERRO DO APP] Área: ${log.scope}`);
      lines.push(`  Mensagem: ${log.errorMessage}`);
      if (log.stackTrace) {
        lines.push(`  Detalhes: ${log.stackTrace.replace(/\r?\n/g, ' | ')}`);
      }
      lines.push('');
    } else {
      const msPart =
        typeof log.durationMs === 'number' ? ` | Tempo: ${log.durationMs}ms` : '';
      lines.push(
        `#${idx + 1} [${log.timestamp}] [LEITURA/API] Origem: ${log.finalOrigin} | HTTP: ${String(
          log.httpStatus
        )}${msPart}`
      );
      lines.push(`  Rota: ${log.routeTaken}`);
      lines.push(`  EAN: ${log.detectedBarcode}`);
      lines.push(`  OCR bruto: ${log.rawTextSnippet}`);
      lines.push(`  Texto limpo: ${log.sanitizedText}`);
      lines.push(`  Resultado: ${log.apiResultSummary}`);
      if (log.requestUrl) {
        lines.push(`  URL: ${log.requestUrl}`);
      }
      lines.push('');
    }
  });

  return lines.join('\n');
}
