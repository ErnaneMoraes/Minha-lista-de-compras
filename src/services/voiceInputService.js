import { Platform } from 'react-native';

let cachedModule = undefined;
let activeCleanup = null;

function getSpeechModule() {
  if (cachedModule !== undefined) {
    return cachedModule;
  }
  try {
    // Lazy require avoids crashing in Expo Go where the native module is absent
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
  const mod = getSpeechModule();
  if (mod) {
    try {
      mod.stop();
    } catch {
      // ignore stop errors
    }
  }
}

export function abortVoiceNameDictation() {
  clearActiveListeners();
  const mod = getSpeechModule();
  if (mod) {
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
          : 'O ditado por voz requer uma build instalada do aplicativo (APK/Development Build). No Expo Go, digite o nome normalmente.',
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
    clearActiveListeners();
    onEnd?.();
  };

  try {
    subs.push(
      mod.addListener('start', () => {
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

    mod.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: false,
    });

    return { started: true };
  } catch {
    clearActiveListeners();
    onError?.({
      code: 'unavailable',
      message:
        'Não foi possível iniciar o reconhecimento de voz. Verifique se o recurso está disponível neste aparelho.',
    });
    return { started: false };
  }
}
