import { NativeModules, Platform } from 'react-native';

let cachedModule = undefined;
let activeCleanup = null;
let isDictationActive = false;

function hasNativeSpeechBinding() {
  if (Platform.OS === 'web') {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }
  try {
    if (globalThis?.expo?.modules?.ExpoSpeechRecognition) {
      return true;
    }
    if (NativeModules?.ExpoSpeechRecognition) {
      return true;
    }
    // Check Expo's NativeModulesProxy if available without throwing
    // eslint-disable-next-line global-require
    const expoModulesCore = require('expo-modules-core');
    if (expoModulesCore?.NativeModulesProxy?.ExpoSpeechRecognition) {
      return true;
    }
    if (
      typeof expoModulesCore?.requireOptionalNativeModule === 'function' &&
      expoModulesCore.requireOptionalNativeModule('ExpoSpeechRecognition')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function getSpeechModule() {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    if (!hasNativeSpeechBinding()) {
      cachedModule = null;
      return null;
    }
    // Lazy require only after verifying native binding exists (prevents Expo Go crash)
    // eslint-disable-next-line global-require
    const pkg = require('expo-speech-recognition');
    const mod = pkg?.ExpoSpeechRecognitionModule || null;
    if (
      mod &&
      typeof mod.start === 'function' &&
      typeof mod.stop === 'function' &&
      typeof mod.addListener === 'function'
    ) {
      cachedModule = mod;
    } else {
      cachedModule = null;
    }
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function formatTranscribedProductName(rawText) {
  const cleaned = String(rawText || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function isVoiceInputAvailable() {
  const mod = getSpeechModule();
  if (!mod) return false;
  try {
    if (typeof mod.isRecognitionAvailable === 'function') {
      return Boolean(mod.isRecognitionAvailable());
    }
    return true;
  } catch {
    return false;
  }
}

function mapSpeechErrorToPtBr(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
      return 'Permissão de microfone ou reconhecimento de voz negada. Ative nas configurações do aparelho para ditar.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Nenhuma fala foi detectada. Tente novamente falando próximo ao microfone.';
    case 'network':
      return 'Sem conexão para o serviço de reconhecimento de voz. Verifique sua internet ou digite o nome.';
    case 'audio-capture':
      return 'Não foi possível acessar o microfone. Verifique se outro aplicativo está usando o áudio.';
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'O reconhecimento de voz em português não está disponível neste aparelho.';
    case 'busy':
      return 'O microfone já está em uso. Aguarde um instante e tente novamente.';
    default:
      return 'Não foi possível concluir o ditado por voz. Tente novamente ou digite o nome.';
  }
}

function clearActiveListeners() {
  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch {
      // ignore listener removal errors
    }
    activeCleanup = null;
  }
}

export function stopVoiceNameDictation() {
  if (!isDictationActive) return;
  const mod = getSpeechModule();
  if (!mod) {
    isDictationActive = false;
    return;
  }
  try {
    mod.stop();
  } catch {
    // ignore stop errors
  }
}

export function abortVoiceNameDictation() {
  if (!isDictationActive && !activeCleanup) return;
  isDictationActive = false;
  clearActiveListeners();
  const mod = getSpeechModule();
  if (!mod) return;
  try {
    if (typeof mod.abort === 'function') {
      mod.abort();
    } else {
      mod.stop();
    }
  } catch {
    // ignore abort errors
  }
}

export async function startVoiceNameDictation({
  onStart,
  onInterimResult,
  onFinalResult,
  onEnd,
  onError,
} = {}) {
  const mod = getSpeechModule();
  if (!mod) {
    onError?.({
      code: 'unavailable',
      message:
        Platform.OS === 'web'
          ? 'O ditado por voz não é suportado neste navegador. Digite o nome do produto normalmente.'
          : 'Ditado por voz indisponível no Expo Go. Este recurso funciona no APK instalado do aplicativo.',
    });
    return { started: false };
  }

  try {
    if (
      typeof mod.isRecognitionAvailable === 'function' &&
      !mod.isRecognitionAvailable()
    ) {
      onError?.({
        code: 'service-not-allowed',
        message: 'O reconhecimento de voz não está disponível neste aparelho.',
      });
      return { started: false };
    }
  } catch {
    // proceed to permission check
  }

  try {
    if (typeof mod.requestPermissionsAsync === 'function') {
      const perm = await mod.requestPermissionsAsync();
      if (!perm?.granted) {
        onError?.({
          code: 'not-allowed',
          message:
            'Permissão de microfone ou reconhecimento de voz negada. Ative nas configurações do aparelho para ditar o nome do produto.',
        });
        return { started: false };
      }
    }
  } catch {
    onError?.({
      code: 'not-allowed',
      message: 'Não foi possível solicitar permissão de microfone neste aparelho.',
    });
    return { started: false };
  }

  clearActiveListeners();

  let latestTranscript = '';
  let deliveredFinal = false;

  const subs = [];
  const finish = () => {
    isDictationActive = false;
    clearActiveListeners();
    onEnd?.();
  };

  try {
    subs.push(
      mod.addListener('start', () => {
        isDictationActive = true;
        onStart?.();
      })
    );

    subs.push(
      mod.addListener('result', (event) => {
        const raw = event?.results?.[0]?.transcript || '';
        if (!raw) return;
        latestTranscript = raw;
        if (event?.isFinal) {
          deliveredFinal = true;
          onFinalResult?.(formatTranscribedProductName(raw));
        } else {
          onInterimResult?.(raw);
        }
      })
    );

    subs.push(
      mod.addListener('error', (event) => {
        const code = event?.error || 'unknown';
        if (code === 'aborted') {
          finish();
          return;
        }
        isDictationActive = false;
        clearActiveListeners();
        onError?.({
          code,
          message: mapSpeechErrorToPtBr(code),
        });
        onEnd?.();
      })
    );

    subs.push(
      mod.addListener('end', () => {
        if (!deliveredFinal && latestTranscript) {
          deliveredFinal = true;
          onFinalResult?.(formatTranscribedProductName(latestTranscript));
        }
        finish();
      })
    );

    activeCleanup = () => {
      subs.forEach((sub) => {
        try {
          sub?.remove?.();
        } catch {
          // ignore
        }
      });
    };

    isDictationActive = true;
    mod.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
    });

    return { started: true };
  } catch {
    isDictationActive = false;
    clearActiveListeners();
    onError?.({
      code: 'unavailable',
      message:
        'Ditado por voz indisponível no Expo Go. Este recurso funciona no APK instalado do aplicativo.',
    });
    return { started: false };
  }
}
