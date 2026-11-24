const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const APP_JSON_PATH = path.join(ROOT_DIR, 'app.json');
const APP_VERSION_JS_PATH = path.join(ROOT_DIR, 'src', 'constants', 'appVersion.js');
const BUILDS_DIR = path.join(ROOT_DIR, 'builds');

function resolveAppVersion() {
  try {
    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    if (appJson && appJson.expo && appJson.expo.version) {
      return String(appJson.expo.version).trim();
    }
  } catch {
    // Fallback to src/constants/appVersion.js
  }

  try {
    const src = fs.readFileSync(APP_VERSION_JS_PATH, 'utf8');
    const match = src.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // Ignored
  }

  throw new Error(
    'Não foi possível identificar a versão do aplicativo em app.json ou src/constants/appVersion.js.'
  );
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  const version = resolveAppVersion();
  const relativeOutput = `builds/minha-lista-compras-v${version}.apk`;
  const cliOutputArg = `./${relativeOutput}`;

  fs.mkdirSync(BUILDS_DIR, { recursive: true });

  console.log(`\n[build:apk] Iniciando build EAS Android (preview) para v${version}...\n`);
  runCommand('npx', ['eas-cli', 'build', '-p', 'android', '--profile', 'preview', '--wait']);

  console.log(`\n[build:apk] Baixando APK gerado para ${relativeOutput}...\n`);
  runCommand('npx', [
    'eas-cli',
    'build:download',
    '-p',
    'android',
    '--latest',
    '--output',
    cliOutputArg,
  ]);

  console.log(`\nAPK gerado e salvo em: ${relativeOutput}\n`);
}

try {
  main();
} catch (err) {
  console.error('[build:apk] Erro:', err && err.message ? err.message : err);
  process.exit(1);
}
