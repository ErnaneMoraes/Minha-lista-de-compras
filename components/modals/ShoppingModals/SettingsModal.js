import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import ConfirmModal from './ConfirmModal';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import {
  THEME_IDS,
  THEME_LIST,
  CUSTOM_BASE_MODES,
  CUSTOM_ACCENT_PALETTE,
  CUSTOM_BORDER_STYLES,
  CUSTOM_BORDER_THICKNESS,
  buildCustomTheme,
} from '../../../src/theme/themes';
import {
  exportBackupPayload,
  importBackupPayload,
  formatDateBR,
  loadLists,
  removeAllTagPhotos,
  deleteAllShoppingLists,
  deleteAllReminderLists,
  deleteAllAppData,
} from '../../../src/storage/shoppingStorage';
import {
  RETENTION_DAY_OPTIONS,
  getTagPhotosStorageStats,
} from '../../../src/services/tagPhotoStorage';
import {
  buildFullZipBackup,
  buildPhotosOnlyZipBackup,
  buildDiagnosticZipBundle,
  parseBackupArchiveFromUri,
} from '../../../src/services/backupArchiveService';
import {
  getApiDiagnosticLogs,
  clearApiDiagnosticLogs,
  clearProductLookupCache,
  identificarProdutoDaEtiqueta,
} from '../../../src/services/productLookupService';
import {
  formatDeviceContextLine,
  formatDiagnosticLogsAsText,
  recordAppErrorLog,
} from '../../../src/services/diagnosticLogService';

const EXPORT_OPTIONS = [
  {
    type: 'all_zip',
    title: 'Backup Completo (.zip)',
    desc: 'Inclui listas, histórico, lembretes (backup.json) e todas as fotos das etiquetas compactadas.',
    icon: 'file-zipper',
  },
  {
    type: 'photos_zip',
    title: 'Apenas Fotos das Etiquetas (.zip)',
    desc: 'Exporta todas as fotos salvas das etiquetas com o manifesto dos produtos.',
    icon: 'images',
  },
  {
    type: 'lists',
    title: 'Apenas Listas de Compras (.json)',
    desc: 'Arquivo .json leve apenas com suas listas de compras e histórico para relatórios.',
    icon: 'cart-shopping',
  },
  {
    type: 'reminders',
    title: 'Apenas Lembretes (.json)',
    desc: 'Arquivo .json leve apenas com suas listas de lembretes reutilizáveis.',
    icon: 'clipboard-check',
  },
];

export default function SettingsModal({
  onOpenHelp,
  onOpenAbout,
  onOpenGallery,
  onResetToHome,
}) {
  const {
    themeId,
    theme,
    customThemeConfig,
    cameraSoundEnabled,
    saveTagPhotos,
    autoDeleteTagPhotos,
    tagPhotoRetentionDays,
    simplifiedItemForm,
    colors,
    cardShadow,
    typography,
    isGoogleMapsTheme,
    radiusCard,
    radiusButton,
    borderWidth,
    isSettingsVisible,
    setThemeId,
    updateCustomThemeConfig,
    updatePhotoSettings,
    setSimplifiedItemForm,
    notifyDataRestored,
    closeSettings,
  } = useAppSettings();

  const [expandedSection, setExpandedSection] = useState(null); // null | 'themes' | 'photos' | 'backup' | 'support'
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [photoStats, setPhotoStats] = useState({
    count: 0,
    totalBytes: 0,
    formattedSize: '0 KB',
  });

  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const [showExportSelector, setShowExportSelector] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState(null); // null | 'photos' | 'lists' | 'reminders' | 'all'
  const [chainedDeleteAction, setChainedDeleteAction] = useState(null);
  const [showPostBackupDeleteConfirm, setShowPostBackupDeleteConfirm] =
    useState(false);
  const [deleteSuccessModal, setDeleteSuccessModal] = useState(null); // null | { title, message, navigateHome }
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const [apiLogs, setApiLogs] = useState([]);
  const [logCategoryFilter, setLogCategoryFilter] = useState('all'); // 'all' | 'error' | 'scanner'
  const [showFullScreenLogs, setShowFullScreenLogs] = useState(false);
  const [isDiagZipBusy, setIsDiagZipBusy] = useState(false);
  const [diagZipFeedback, setDiagZipFeedback] = useState(null);
  const [apiTestQuery, setApiTestQuery] = useState('');
  const [isApiTestRunning, setIsApiTestRunning] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [showEanScannerModal, setShowEanScannerModal] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const eanScannerLockRef = useRef(false);

  const refreshPhotoStats = () => {
    loadLists()
      .then((lists) => getTagPhotosStorageStats(lists))
      .then((stats) => setPhotoStats(stats))
      .catch(() => {});
  };

  const refreshApiLogs = () => {
    getApiDiagnosticLogs()
      .then((logs) => setApiLogs(Array.isArray(logs) ? logs : []))
      .catch(() => setApiLogs([]));
  };

  const handleOpenDiagnosticScanner = async () => {
    if (Platform.OS === 'web') return;
    eanScannerLockRef.current = false;
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission().catch(() => ({
        granted: false,
      }));
      if (!granted?.granted) {
        setApiTestResult({
          origem: 'ocr_local',
          httpStatus: 'Permissão negada',
          routeTaken: 'Leitor de Câmera EAN',
          nome: 'Autorize o acesso à câmera nas configurações do aparelho.',
          marca: '',
          quantidade: '',
          categoriaSugerida: 'Outros',
          durationMs: 0,
          rawPayload: null,
        });
        return;
      }
    }
    setShowEanScannerModal(true);
  };

  const handleDiagnosticBarcodeScanned = ({ data }) => {
    if (eanScannerLockRef.current) return;
    const digits = String(data || '').replace(/\D/g, '');
    if (digits.length !== 8 && digits.length !== 13) return;
    eanScannerLockRef.current = true;
    setShowEanScannerModal(false);
    setApiTestQuery(digits);
    handleRunApiTest(digits);
  };

  const handleRunApiTest = async (overrideInput = null) => {
    if (isApiTestRunning) return;
    const rawInput = String(
      overrideInput !== null ? overrideInput : apiTestQuery
    ).trim();
    if (!rawInput) return;

    const cleanDigits = rawInput.replace(/\D/g, '');
    const effectiveCode = cleanDigits || rawInput;
    if (overrideInput !== null) {
      setApiTestQuery(effectiveCode);
    }

    setIsApiTestRunning(true);
    setApiTestResult(null);
    const t0 = Date.now();
    try {
      const result = await identificarProdutoDaEtiqueta({
        rawText: '',
        barcode: cleanDigits,
        bypassCache: true,
      });
      const elapsedMs =
        typeof result?.durationMs === 'number'
          ? result.durationMs
          : Date.now() - t0;
      setApiTestResult({
        origem: result?.origem || 'ocr_local',
        httpStatus: result?.httpStatus ?? '-',
        routeTaken: result?.routeTaken || 'Consulta EAN',
        nome: result?.nome || '(não encontrado)',
        marca: result?.marca || '',
        quantidade: result?.quantidade || '',
        categoriaSugerida: result?.categoriaSugerida || 'Outros',
        durationMs: elapsedMs,
        rawPayload: result?.rawPayload || {
          barcode: cleanDigits,
          origem: result?.origem || 'ocr_local',
          httpStatus: result?.httpStatus ?? '-',
          routeTaken: result?.routeTaken || '',
          nome: result?.nome || '',
          categoriaSugerida: result?.categoriaSugerida || 'Outros',
        },
      });
      refreshApiLogs();
    } catch (err) {
      setApiTestResult({
        origem: 'ocr_local',
        httpStatus: 'Erro de Rede',
        routeTaken: 'Fluxo 1: EAN API v2',
        nome: err?.message || 'Falha ao consultar API',
        marca: '',
        quantidade: '',
        categoriaSugerida: 'Outros',
        durationMs: Date.now() - t0,
        rawPayload: { error: err?.message || String(err) },
      });
    } finally {
      setIsApiTestRunning(false);
    }
  };

  const handleExportDiagnosticZip = async () => {
    if (isDiagZipBusy) return;
    setIsDiagZipBusy(true);
    setDiagZipFeedback(null);
    try {
      const bundle = await buildDiagnosticZipBundle();
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const fileName = `diagnostico_completo_minha_lista_${dd}-${mm}-${yyyy}.zip`;

      if (Platform.OS === 'web') {
        const byteChars = atob(bundle.base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i += 1) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], {
          type: 'application/zip',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        setDiagZipFeedback({
          type: 'success',
          text: `Pacote "${fileName}" baixado (${bundle.logCount} logs, ${bundle.photoCount} fotos).`,
        });
      } else {
        const zipUri = `${LegacyFileSystem.cacheDirectory}${fileName}`;
        await LegacyFileSystem.writeAsStringAsync(zipUri, bundle.base64, {
          encoding: 'base64',
        });
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          setDiagZipFeedback({
            type: 'error',
            text: 'Compartilhamento nativo indisponível neste dispositivo.',
          });
          return;
        }
        await Sharing.shareAsync(zipUri, {
          mimeType: 'application/zip',
          dialogTitle: 'Exportar Pacote Completo de Diagnóstico (.zip)',
          UTI: 'public.zip-archive',
        });
        setDiagZipFeedback({
          type: 'success',
          text: `Pacote .zip gerado com ${bundle.logCount} logs e ${bundle.photoCount} foto(s).`,
        });
      }
    } catch (err) {
      console.error('Erro ao exportar pacote de diagnóstico (.zip):', err);
      recordAppErrorLog({
        scope: 'Exportar Pacote de Diagnóstico (.zip)',
        message:
          err?.message ||
          String(err || 'Falha ao gerar pacote de diagnóstico'),
        stack: err?.stack || '',
      }).catch(() => {});
      setDiagZipFeedback({
        type: 'error',
        text: 'Não foi possível gerar o pacote de diagnóstico (.zip).',
      });
    } finally {
      setIsDiagZipBusy(false);
    }
  };

  const handleExportApiLogs = async () => {
    try {
      const currentLogs = await getApiDiagnosticLogs();
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const fileName = `logs_diagnostico_minha_lista_${dd}-${mm}-${yyyy}.txt`;
      const content = formatDiagnosticLogsAsText(currentLogs);

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const logUri = `${LegacyFileSystem.cacheDirectory}${fileName}`;
        await LegacyFileSystem.writeAsStringAsync(logUri, content, {
          encoding: 'utf8',
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(logUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Exportar Logs de Diagnóstico',
            UTI: 'public.plain-text',
          });
        }
      }
    } catch (err) {
      console.error('Erro ao exportar logs de diagnóstico:', err);
      recordAppErrorLog({
        scope: 'Exportar Logs',
        message: err?.message || String(err || 'Falha ao exportar logs'),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (isSettingsVisible) {
      setExpandedSection(null);
      setShowCustomEditor(false);
      setBackupMessage(null);
      setPendingRestore(null);
      setPendingDeleteAction(null);
      setChainedDeleteAction(null);
      setShowPostBackupDeleteConfirm(false);
      setDeleteSuccessModal(null);
      setDeleteFeedback(null);
      setShowExportSelector(false);
      setIsBackupBusy(false);
      refreshPhotoStats();
      refreshApiLogs();
    }
  }, [isSettingsVisible]);

  const toggleSection = (sectionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const handleSelectPresetTheme = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCustomEditor(false);
    setThemeId(id);
  };

  const handleSelectCustomTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (themeId !== THEME_IDS.CUSTOM) {
      setThemeId(THEME_IDS.CUSTOM);
      setShowCustomEditor(true);
    } else {
      setShowCustomEditor((prev) => !prev);
    }
  };

  const handleToggleCustomEditor = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (themeId !== THEME_IDS.CUSTOM) {
      setThemeId(THEME_IDS.CUSTOM);
      setShowCustomEditor(true);
    } else {
      setShowCustomEditor((prev) => !prev);
    }
  };

  const handleRunExport = async (exportType = 'all_zip') => {
    setShowExportSelector(false);
    if (isBackupBusy) return;
    setIsBackupBusy(true);
    setBackupMessage(null);
    let exportSucceeded = false;
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();

      const isZipExport =
        exportType === 'all_zip' || exportType === 'photos_zip';

      if (isZipExport) {
        const result =
          exportType === 'photos_zip'
            ? await buildPhotosOnlyZipBackup()
            : await buildFullZipBackup();

        if (exportType === 'photos_zip' && result.photoCount === 0) {
          setBackupMessage({
            type: 'error',
            text: 'Não há fotos de etiquetas salvas para exportar.',
          });
          setChainedDeleteAction(null);
          return;
        }

        const suffix =
          exportType === 'photos_zip' ? '_fotos' : '_completo';
        const fileName = `backup_minha_lista${suffix}_${dd}-${mm}-${yyyy}.zip`;
        const typeLabel =
          exportType === 'photos_zip'
            ? 'Apenas Fotos (.zip)'
            : 'Completo (.zip)';

        if (Platform.OS === 'web') {
          const byteChars = atob(result.base64);
          const byteNumbers = new Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i += 1) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([new Uint8Array(byteNumbers)], {
            type: 'application/zip',
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          setBackupMessage({
            type: 'success',
            text: `Backup ${typeLabel} "${fileName}" baixado com sucesso!`,
          });
          exportSucceeded = true;
        } else {
          const zipUri = `${LegacyFileSystem.cacheDirectory}${fileName}`;
          await LegacyFileSystem.writeAsStringAsync(zipUri, result.base64, {
            encoding: 'base64',
          });

          const canShare = await Sharing.isAvailableAsync();
          if (!canShare) {
            setBackupMessage({
              type: 'error',
              text: 'O compartilhamento nativo não está disponível neste dispositivo.',
            });
            setChainedDeleteAction(null);
            return;
          }

          await Sharing.shareAsync(zipUri, {
            mimeType: 'application/zip',
            dialogTitle: `Exportar Backup ${typeLabel}`,
            UTI: 'public.zip-archive',
          });

          setBackupMessage({
            type: 'success',
            text: `Backup ${typeLabel} gerado com sucesso!`,
          });
          exportSucceeded = true;
        }
        return;
      }

      // Lightweight JSON export for 'lists' or 'reminders'
      const payload = await exportBackupPayload(exportType);
      const jsonString = JSON.stringify(payload, null, 2);
      const suffix = exportType === 'lists' ? '_compras' : '_lembretes';
      const fileName = `backup_minha_lista${suffix}_${dd}-${mm}-${yyyy}.json`;
      const typeLabel =
        exportType === 'lists'
          ? 'Apenas Listas de Compras (.json)'
          : 'Apenas Lembretes (.json)';

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        setBackupMessage({
          type: 'success',
          text: `Backup ${typeLabel} "${fileName}" baixado com sucesso!`,
        });
        exportSucceeded = true;
      } else {
        const file = new File(Paths.cache, fileName);
        file.create({ overwrite: true });
        file.write(jsonString);

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          setBackupMessage({
            type: 'error',
            text: 'O compartilhamento nativo não está disponível neste dispositivo.',
          });
          setChainedDeleteAction(null);
          return;
        }

        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: `Exportar Backup ${typeLabel}`,
          UTI: 'public.json',
        });

        setBackupMessage({
          type: 'success',
          text: `Backup ${typeLabel} gerado com sucesso!`,
        });
        exportSucceeded = true;
      }
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      recordAppErrorLog({
        scope: 'Exportação de Backup',
        message: error?.message || String(error || 'Erro ao exportar backup'),
        stack: error?.stack || '',
      }).catch(() => {});
      setBackupMessage({
        type: 'error',
        text: 'Não foi possível exportar o backup. Tente novamente.',
      });
      setChainedDeleteAction(null);
    } finally {
      setIsBackupBusy(false);
      if (exportSucceeded && chainedDeleteAction) {
        setShowPostBackupDeleteConfirm(true);
      }
    }
  };

  const handlePickBackupFile = async () => {
    if (isBackupBusy) return;
    setIsBackupBusy(true);
    setBackupMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/json',
          'application/zip',
          'application/x-zip-compressed',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const parsedResult = await parseBackupArchiveFromUri(
        asset.uri,
        asset.name || ''
      );

      if (!parsedResult.valid) {
        setBackupMessage({
          type: 'error',
          text: parsedResult.error || 'Arquivo de backup inválido.',
        });
        return;
      }

      setPendingRestore({
        payload: parsedResult.payload,
        summary: parsedResult.summary,
      });
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      recordAppErrorLog({
        scope: 'Importação de Backup',
        message: error?.message || String(error || 'Erro ao ler arquivo de backup'),
        stack: error?.stack || '',
      }).catch(() => {});
      setBackupMessage({
        type: 'error',
        text: 'Não foi possível ler o arquivo de backup (.json ou .zip) selecionado.',
      });
    } finally {
      setIsBackupBusy(false);
    }
  };

  const buildRestoreConfirmationMessage = () => {
    if (!pendingRestore?.summary) return '';
    const s = pendingRestore.summary;
    const datePart = s.exportedAt ? ` de ${formatDateBR(s.exportedAt)}` : '';

    if (s.detectedType === 'photos') {
      return `Detectado backup de Apenas Fotos das Etiquetas${datePart} (${
        s.photoCount
      } ${
        s.photoCount === 1 ? 'foto' : 'fotos'
      }). Suas listas atuais serão mantidas intactas. Deseja restaurar?`;
    }
    if (s.detectedType === 'lists') {
      return `Detectado backup de Apenas Listas de Compras${datePart} (${
        s.listCount
      } ${
        s.listCount === 1 ? 'lista' : 'listas'
      }). Suas listas de lembretes atuais serão mantidas intactas. Deseja restaurar?`;
    }
    if (s.detectedType === 'reminders') {
      return `Detectado backup de Apenas Lembretes${datePart} (${
        s.reminderListCount
      } ${
        s.reminderListCount === 1
          ? 'lista de lembretes'
          : 'listas de lembretes'
      } com ${s.reminderItemCount} ${
        s.reminderItemCount === 1 ? 'item' : 'itens'
      }). Suas listas de compras atuais serão mantidas intactas. Deseja restaurar?`;
    }
    const photosPart =
      s.photoCount > 0
        ? ` e ${s.photoCount} ${
            s.photoCount === 1 ? 'foto de etiqueta' : 'fotos de etiquetas'
          }`
        : '';
    return `Detectado Backup Completo${datePart} contendo ${s.listCount} ${
      s.listCount === 1 ? 'lista de compras' : 'listas de compras'
    }, ${s.reminderListCount} ${
      s.reminderListCount === 1 ? 'lista de lembretes' : 'listas de lembretes'
    }${photosPart}. Deseja restaurar esses dados?`;
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore?.payload) return;
    setIsBackupBusy(true);
    try {
      const restoredSummary = await importBackupPayload(pendingRestore.payload);
      notifyDataRestored();
      setPendingRestore(null);

      let successText =
        'Backup completo restaurado com sucesso! Listas de compras, lembretes e fotos atualizados.';
      if (restoredSummary.detectedType === 'photos') {
        successText = `Foram restauradas ${restoredSummary.photoCount} ${
          restoredSummary.photoCount === 1
            ? 'foto de etiqueta'
            : 'fotos de etiquetas'
        }.`;
      } else if (restoredSummary.detectedType === 'lists') {
        successText = `Foram importadas ${restoredSummary.listCount} ${
          restoredSummary.listCount === 1
            ? 'lista de compras'
            : 'listas de compras'
        } (lembretes atuais preservados).`;
      } else if (restoredSummary.detectedType === 'reminders') {
        successText = `Foram importadas ${restoredSummary.reminderListCount} ${
          restoredSummary.reminderListCount === 1
            ? 'lista de lembretes'
            : 'listas de lembretes'
        } (listas de compras atuais preservadas).`;
      }

      setBackupMessage({
        type: 'success',
        text: successText,
      });
      refreshPhotoStats();
      setDeleteSuccessModal({
        title: 'Dados importados com sucesso!',
        message: successText,
        navigateHome: true,
      });
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      setPendingRestore(null);
      setBackupMessage({
        type: 'error',
        text: error?.message || 'Erro ao gravar os dados restaurados.',
      });
    } finally {
      setIsBackupBusy(false);
    }
  };

  const customThemePreview = buildCustomTheme(customThemeConfig);
  const isCustomActive = themeId === THEME_IDS.CUSTOM;

  const isThemesExpanded = expandedSection === 'themes';
  const isItemFormExpanded = expandedSection === 'item_form';
  const isPhotosExpanded = expandedSection === 'photos';
  const isBackupExpanded = expandedSection === 'backup';
  const isDeleteExpanded = expandedSection === 'delete';
  const isSupportExpanded = expandedSection === 'support';
  const isApiLogsExpanded = expandedSection === 'api_logs';

  const photoCountLabel = `${photoStats.count} ${
    photoStats.count === 1 ? 'foto' : 'fotos'
  } • ${photoStats.formattedSize}`;

  const getDeleteModalConfig = () => {
    if (pendingDeleteAction === 'photos') {
      return {
        title: 'Excluir Todas as Fotos das Etiquetas',
        message: `Deseja apagar permanentemente todas as fotos das etiquetas (${photoCountLabel})? Esta ação não pode ser desfeita. Recomendamos fazer um backup antes de continuar para não perder seus registros.`,
        confirmLabel: 'Excluir Fotos',
        showBackupBefore: true,
      };
    }
    if (pendingDeleteAction === 'lists') {
      return {
        title: 'Excluir Todas as Listas de Compras',
        message:
          'Deseja apagar permanentemente todas as listas de compras (em aberto e finalizadas), o histórico de gastos e as fotos vinculadas? Esta ação não pode ser desfeita. Recomendamos fazer um backup antes de continuar para não perder seus registros.',
        confirmLabel: 'Excluir Listas',
        showBackupBefore: true,
      };
    }
    if (pendingDeleteAction === 'reminders') {
      return {
        title: 'Excluir Todas as Listas de Lembretes',
        message:
          'Deseja apagar permanentemente todas as suas listas de lembretes reutilizáveis? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir Lembretes',
        showBackupBefore: false,
      };
    }
    if (pendingDeleteAction === 'all') {
      return {
        title: 'Excluir Todos os Dados do Aplicativo',
        message:
          'Deseja zerar o aplicativo apagando todas as listas de compras, histórico de gastos, lembretes, categorias aprendidas, fotos das etiquetas, cache de produtos e logs de diagnóstico? Esta ação não pode ser desfeita. Recomendamos fazer um backup antes de continuar para não perder seus registros.',
        confirmLabel: 'Excluir Tudo',
        showBackupBefore: true,
      };
    }
    return null;
  };

  const executeGranularDelete = async (action) => {
    if (!action) return;
    setPendingDeleteAction(null);
    setChainedDeleteAction(null);
    setShowPostBackupDeleteConfirm(false);
    try {
      let msg = 'Dados excluídos com sucesso!';
      let navigateHome = false;

      if (action === 'photos') {
        await removeAllTagPhotos();
        setPhotoStats({ count: 0, totalBytes: 0, formattedSize: '0 KB' });
        msg = 'Todas as fotos das etiquetas foram excluídas com sucesso!';
      } else if (action === 'lists') {
        await deleteAllShoppingLists();
        setPhotoStats({ count: 0, totalBytes: 0, formattedSize: '0 KB' });
        msg =
          'Todas as listas de compras, histórico e fotos vinculadas foram excluídos com sucesso!';
      } else if (action === 'reminders') {
        await deleteAllReminderLists();
        msg = 'Todas as listas de lembretes foram excluídas com sucesso!';
      } else if (action === 'all') {
        await Promise.all([
          deleteAllAppData(),
          clearApiDiagnosticLogs(),
          clearProductLookupCache(),
        ]);
        setApiLogs([]);
        setPhotoStats({ count: 0, totalBytes: 0, formattedSize: '0 KB' });
        msg =
          'Todos os dados, fotos, cache de produtos e logs de diagnóstico foram apagados com sucesso! Você voltará para a tela inicial.';
        navigateHome = true;
      }

      setDeleteFeedback(msg);
      notifyDataRestored();
      refreshPhotoStats();
      setDeleteSuccessModal({
        title: 'Dados excluídos com sucesso!',
        message: msg,
        navigateHome,
      });
    } catch (err) {
      console.error('Erro ao excluir dados:', err);
      recordAppErrorLog({
        scope: 'Exclusão de Dados',
        message: err?.message || String(err || 'Erro ao excluir dados'),
        stack: err?.stack || '',
      }).catch(() => {});
      setDeleteFeedback('Não foi possível concluir a exclusão dos dados.');
    }
  };

  const handleConfirmGranularDelete = () =>
    executeGranularDelete(pendingDeleteAction);

  const handleConfirmPostBackupDelete = () =>
    executeGranularDelete(chainedDeleteAction);

  const handleDismissDeleteSuccess = () => {
    const shouldGoHome = Boolean(deleteSuccessModal?.navigateHome);
    setDeleteSuccessModal(null);
    if (shouldGoHome) {
      closeSettings();
      onResetToHome?.();
    }
  };

  const deleteModalCfg = getDeleteModalConfig();
  const deviceContextSummary = formatDeviceContextLine();
  const filteredDiagnosticLogs = apiLogs.filter((log) => {
    if (logCategoryFilter === 'error') return log.category === 'error';
    if (logCategoryFilter === 'scanner') return log.category !== 'error';
    return true;
  });
  const appErrorCount = apiLogs.filter((l) => l.category === 'error').length;

  const renderDeviceSummaryAndFilters = (showFilters = true) => (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.borderColor,
        borderWidth,
        borderRadius: Math.min(12, radiusCard),
        padding: 12,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: 'bold',
          color: colors.principal,
          marginBottom: 4,
        }}
      >
        1. Ambiente &amp; Versão (LGPD)
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: colors.textoEscuro,
          lineHeight: 17,
        }}
      >
        {deviceContextSummary}
      </Text>
      <Text
        style={{
          fontSize: 10.5,
          color: colors.textMuted,
          marginTop: 4,
        }}
        numberOfLines={1}
      >
        Privacidade LGPD: sem dados pessoais ou identificadores únicos
      </Text>

      {showFilters ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[
            { key: 'all', label: `Todos (${apiLogs.length})` },
            { key: 'error', label: `Erros (${appErrorCount})` },
            {
              key: 'scanner',
              label: `Leituras (${apiLogs.length - appErrorCount})`,
            },
          ].map((tab) => {
            const active = logCategoryFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setLogCategoryFilter(tab.key)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 6,
                  borderRadius: Math.min(8, radiusButton),
                  borderWidth: 1,
                  backgroundColor: active ? colors.principal : colors.surfaceMuted,
                  borderColor: active ? colors.principal : colors.borderColor,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: active ? colors.textoPrincipal : colors.textoEscuro,
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  const renderDiagnosticLogCard = (log, idx, isFullScreen = false) => {
    const isError = log.category === 'error';
    const fontSize = isFullScreen ? 12.5 : 11.5;
    return (
      <View
        key={log.id}
        style={{
          backgroundColor: colors.card,
          borderColor: isError ? colors.logoutRed : colors.borderColor,
          borderWidth,
          borderRadius: isFullScreen ? radiusCard : Math.min(10, radiusCard),
          padding: isFullScreen ? 12 : 10,
          marginBottom: isFullScreen ? 10 : 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isFullScreen ? 6 : 4,
          }}
        >
          <Text
            style={{
              fontSize: isFullScreen ? 12 : 11,
              fontWeight: '700',
              color: colors.textMuted,
            }}
          >
            {isFullScreen ? `#${idx + 1} • ` : ''}
            {log.timestamp}
          </Text>
          <Text
            style={{
              fontSize: isFullScreen ? 12 : 11,
              fontWeight: 'bold',
              color: isError
                ? colors.logoutRed
                : log.finalOrigin === 'api'
                  ? colors.principal
                  : log.finalOrigin === 'cache'
                    ? colors.accent || colors.principal
                    : colors.textMuted,
            }}
          >
            {isError
              ? `ERRO • ${log.scope || 'App'}`
              : `${log.finalOrigin} • HTTP: ${String(log.httpStatus)}`}
          </Text>
        </View>

        {isError ? (
          <>
            <Text
              style={{
                fontSize,
                color: colors.textoEscuro,
                marginBottom: log.stackTrace ? 3 : 0,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Falha: </Text>
              {log.errorMessage}
            </Text>
            {log.stackTrace ? (
              <Text
                style={{
                  fontSize: isFullScreen ? 11 : 10.5,
                  color: colors.textMuted,
                }}
                numberOfLines={isFullScreen ? 6 : 2}
                selectable={isFullScreen}
              >
                {log.stackTrace}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text
              style={{
                fontSize,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Rota: </Text>
              {log.routeTaken}
            </Text>
            <Text
              style={{
                fontSize,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>EAN: </Text>
              {log.detectedBarcode}
            </Text>
            {isFullScreen ? (
              <Text
                style={{
                  fontSize,
                  color: colors.textoEscuro,
                  marginBottom: 2,
                }}
              >
                <Text style={{ fontWeight: 'bold' }}>OCR bruto: </Text>
                {log.rawTextSnippet}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Texto limpo: </Text>
              {log.sanitizedText}
            </Text>
            <Text
              style={{
                fontSize,
                color: colors.textoEscuro,
                marginBottom: log.requestUrl ? 2 : 0,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Resultado: </Text>
              {log.apiResultSummary}
            </Text>
            {log.requestUrl ? (
              <Text
                style={{
                  fontSize: isFullScreen ? 11 : 10.5,
                  color: colors.textMuted,
                }}
                numberOfLines={isFullScreen ? undefined : 2}
                selectable={isFullScreen}
              >
                URL: {log.requestUrl}
              </Text>
            ) : null}
          </>
        )}
      </View>
    );
  };

  const renderApiTesterBox = () => {
    const statusStr = apiTestResult ? String(apiTestResult.httpStatus) : '';
    const isHttp200 = statusStr === '200';
    const isCacheHit =
      apiTestResult?.origem === 'cache' || statusStr === 'Local';
    const statusBadgeLabel = isCacheHit
      ? 'Cache Local'
      : /^\d{3}$/.test(statusStr)
        ? `HTTP ${statusStr}`
        : statusStr || 'Sem resposta';
    const statusBadgeBg = isHttp200
      ? colors.verdeSuave
      : isCacheHit
        ? colors.surfaceMuted
        : colors.dangerSoft;
    const statusBadgeTextColor = isHttp200
      ? colors.principal
      : isCacheHit
        ? colors.textoEscuro
        : colors.logoutRed;

    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.borderColor,
          borderWidth,
          borderRadius: Math.min(12, radiusCard),
          padding: 12,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: colors.principal,
            marginBottom: 8,
          }}
        >
          2. Testador de Consulta API (Câmera / EAN)
        </Text>

        <TextInput
          value={apiTestQuery}
          onChangeText={(txt) => setApiTestQuery(txt.replace(/[^\d]/g, ''))}
          placeholder="Digite ou escaneie o EAN (ex: 789...)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => handleRunApiTest()}
          style={{
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.borderColor,
            borderWidth: 1,
            borderRadius: Math.min(10, radiusButton),
            color: colors.textoEscuro,
            fontSize: 13,
            paddingHorizontal: 11,
            paddingVertical: 9,
            marginBottom: 10,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isApiTestRunning}
              onPress={handleOpenDiagnosticScanner}
              style={[
                styles.diagGridBtn,
                {
                  backgroundColor: colors.verdeSuave,
                  borderColor: colors.principal,
                  borderRadius: Math.min(10, radiusButton),
                  opacity: isApiTestRunning ? 0.6 : 1,
                },
              ]}
              accessibilityLabel="Escanear código de barras pela câmera"
            >
              <FontAwesome6
                name="barcode"
                size={13}
                color={colors.badgeText || colors.principal}
              />
              <Text
                style={[
                  styles.diagGridBtnText,
                  { color: colors.badgeText || colors.principal },
                ]}
                numberOfLines={1}
              >
                Escanear
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isApiTestRunning || !apiTestQuery.trim()}
            onPress={() => handleRunApiTest()}
            style={[
              styles.diagGridBtn,
              {
                backgroundColor: colors.principal,
                borderColor: colors.principal,
                borderRadius: Math.min(10, radiusButton),
                opacity: isApiTestRunning || !apiTestQuery.trim() ? 0.6 : 1,
              },
            ]}
            accessibilityLabel="Consultar EAN na API Open Food Facts"
          >
            {isApiTestRunning ? (
              <ActivityIndicator size="small" color={colors.textoPrincipal} />
            ) : (
              <FontAwesome6
                name="magnifying-glass"
                size={12}
                color={colors.textoPrincipal}
              />
            )}
            <Text
              style={[
                styles.diagGridBtnText,
                { color: colors.textoPrincipal },
              ]}
              numberOfLines={1}
            >
              {isApiTestRunning ? 'Consultando...' : 'Consultar'}
            </Text>
          </TouchableOpacity>
        </View>

        {apiTestResult ? (
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: Math.min(10, radiusButton),
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.borderColor,
              borderWidth: 1,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: statusBadgeBg,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: statusBadgeTextColor,
                  }}
                >
                  {statusBadgeLabel}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: colors.textMuted,
                }}
              >
                {apiTestResult.durationMs} ms • {apiTestResult.routeTaken}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 11.5,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Produto: </Text>
              {apiTestResult.nome}
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Marca: </Text>
              {apiTestResult.marca || '—'}
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                color: colors.textoEscuro,
                marginBottom: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Quantidade: </Text>
              {apiTestResult.quantidade || '—'}
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                color: colors.textoEscuro,
                marginBottom: apiTestResult.rawPayload ? 8 : 0,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>Categoria Sugerida: </Text>
              {apiTestResult.categoriaSugerida}
            </Text>

            {apiTestResult.rawPayload ? (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.borderColor,
                  borderWidth: 1,
                  borderRadius: Math.min(8, radiusButton),
                  padding: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    fontWeight: 'bold',
                    color: colors.textMuted,
                    marginBottom: 4,
                  }}
                >
                  Prévia JSON retornada:
                </Text>
                <ScrollView
                  style={{ maxHeight: 120 }}
                  nestedScrollEnabled={true}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textoEscuro,
                      fontFamily:
                        Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                    }}
                    selectable={true}
                  >
                    {JSON.stringify(apiTestResult.rawPayload, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isSettingsVisible}
      onRequestClose={closeSettings}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.dividerColor || colors.borderColor,
              borderRadius: Math.min(22, radiusCard + 4),
              borderWidth,
            },
            cardShadow,
          ]}
        >
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <FontAwesome6 name="gear" size={18} color={colors.principal} />
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.textoEscuro,
                    fontWeight: typography?.headingWeight || 'bold',
                    letterSpacing: typography?.letterSpacing || 0,
                  },
                ]}
              >
                Configurações
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeSettings}
              style={[
                styles.closeIconBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radiusButton,
                },
              ]}
              accessibilityLabel="Fechar configurações"
            >
              <FontAwesome6 name="xmark" size={16} color={colors.textoEscuro} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollAreaContent}
          >
            {/* 1. ACCORDION: TEMAS */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isThemesExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('themes')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Temas"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="palette"
                    size={16}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Temas
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    Ativo: {theme?.name || 'Claro Padrão'}
                  </Text>
                </View>
                <FontAwesome6
                  name={isThemesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isThemesExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  {/* Vertical list of preset themes */}
                  {THEME_LIST.map((t) => {
                    const isActive = t.id === themeId;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectPresetTheme(t.id)}
                        style={[
                          styles.themeRowCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: isActive
                              ? colors.principal
                              : colors.borderColor,
                            borderWidth: isActive ? 2 : borderWidth,
                            borderRadius: t.shape.radiusButton,
                          },
                        ]}
                        accessibilityLabel={`Selecionar tema ${t.name}`}
                      >
                        <View
                          style={[
                            styles.themePreviewCircle,
                            {
                              borderColor: isActive
                                ? colors.principal
                                : colors.borderColor,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.themePreviewHalf,
                              { backgroundColor: t.previewBg },
                            ]}
                          />
                          <View
                            style={[
                              styles.themePreviewHalf,
                              { backgroundColor: t.previewPrimary },
                            ]}
                          />
                        </View>

                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={[
                              styles.themeRowName,
                              { color: colors.textoEscuro },
                            ]}
                            numberOfLines={2}
                          >
                            {t.name}
                          </Text>
                          <Text
                            style={[
                              styles.themeRowSub,
                              { color: colors.textMuted },
                            ]}
                            numberOfLines={1}
                          >
                            {t.subtitle}
                          </Text>
                        </View>

                        {isActive ? (
                          <FontAwesome6
                            name="circle-check"
                            size={17}
                            color={colors.principal}
                          />
                        ) : (
                          <FontAwesome6
                            name="circle"
                            size={16}
                            color={colors.borderColor}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Last Theme Option: Personalizado */}
                  <View
                    style={[
                      styles.customThemeWrapper,
                      {
                        backgroundColor: colors.card,
                        borderColor: isCustomActive
                          ? colors.principal
                          : colors.borderColor,
                        borderWidth: isCustomActive ? 2 : borderWidth,
                        borderRadius: customThemePreview.shape.radiusButton,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSelectCustomTheme}
                      style={styles.customThemeHeaderRow}
                      accessibilityLabel="Selecionar tema Personalizado"
                    >
                      <View
                        style={[
                          styles.themePreviewCircle,
                          {
                            borderColor: isCustomActive
                              ? colors.principal
                              : colors.borderColor,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.themePreviewHalf,
                            { backgroundColor: customThemePreview.previewBg },
                          ]}
                        />
                        <View
                          style={[
                            styles.themePreviewHalf,
                            {
                              backgroundColor:
                                customThemePreview.previewPrimary,
                            },
                          ]}
                        />
                      </View>

                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text
                          style={[
                            styles.themeRowName,
                            { color: colors.textoEscuro },
                          ]}
                          numberOfLines={2}
                        >
                          Personalizado
                        </Text>
                        <Text
                          style={[
                            styles.themeRowSub,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {customThemePreview.subtitle}
                        </Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleToggleCustomEditor}
                        style={[
                          styles.editCustomBtn,
                          {
                            backgroundColor: colors.verdeSuave,
                            borderRadius: Math.min(8, radiusButton),
                          },
                        ]}
                        accessibilityLabel="Editar tema personalizado"
                      >
                        <Text
                          style={[
                            styles.editCustomBtnText,
                            { color: colors.badgeText || colors.principal },
                          ]}
                        >
                          {showCustomEditor ? 'Ocultar' : 'Editar tema'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {/* Inline Custom Theme Builder Panel */}
                    {showCustomEditor ? (
                      <View
                        style={[
                          styles.customBuilderPanel,
                          { borderTopColor: colors.borderColor },
                        ]}
                      >
                        {/* 1. Modo Base (Fundo) */}
                        <Text
                          style={[
                            styles.builderLabel,
                            { color: colors.textoEscuro },
                          ]}
                        >
                          Modo Base (Fundo)
                        </Text>
                        <View style={styles.pillRow}>
                          {CUSTOM_BASE_MODES.map((mode) => {
                            const selected =
                              customThemeConfig.baseMode === mode.id;
                            return (
                              <TouchableOpacity
                                key={mode.id}
                                activeOpacity={0.8}
                                onPress={() =>
                                  updateCustomThemeConfig({ baseMode: mode.id })
                                }
                                style={[
                                  styles.builderPill,
                                  {
                                    backgroundColor: selected
                                      ? colors.principal
                                      : colors.surfaceMuted,
                                    borderColor: selected
                                      ? colors.principal
                                      : colors.borderColor,
                                    borderRadius: Math.min(10, radiusButton),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.builderPillText,
                                    {
                                      color: selected
                                        ? colors.textoPrincipal
                                        : colors.textoEscuro,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {mode.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* 2. Cor Principal (Destaque) */}
                        <Text
                          style={[
                            styles.builderLabel,
                            { color: colors.textoEscuro, marginTop: 12 },
                          ]}
                        >
                          Cor Principal (Destaque)
                        </Text>
                        <View style={styles.swatchGrid}>
                          {CUSTOM_ACCENT_PALETTE.map((swatch) => {
                            const selected =
                              String(
                                customThemeConfig.primaryColor || ''
                              ).toLowerCase() === swatch.hex.toLowerCase();
                            return (
                              <TouchableOpacity
                                key={swatch.id}
                                activeOpacity={0.85}
                                onPress={() =>
                                  updateCustomThemeConfig({
                                    primaryColor: swatch.hex,
                                  })
                                }
                                style={[
                                  styles.swatchOuter,
                                  {
                                    borderColor: selected
                                      ? colors.textoEscuro
                                      : 'transparent',
                                  },
                                ]}
                                accessibilityLabel={`Cor principal ${swatch.label}`}
                              >
                                <View
                                  style={[
                                    styles.swatchCircle,
                                    { backgroundColor: swatch.hex },
                                  ]}
                                >
                                  {selected ? (
                                    <FontAwesome6
                                      name="check"
                                      size={12}
                                      color="#FFFFFF"
                                    />
                                  ) : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* 3. Estilo das Bordas (Arredondamento) */}
                        <Text
                          style={[
                            styles.builderLabel,
                            { color: colors.textoEscuro, marginTop: 12 },
                          ]}
                        >
                          Estilo das Bordas (Arredondamento)
                        </Text>
                        <View style={styles.pillRow}>
                          {CUSTOM_BORDER_STYLES.map((st) => {
                            const selected =
                              customThemeConfig.borderStyle === st.id;
                            return (
                              <TouchableOpacity
                                key={st.id}
                                activeOpacity={0.8}
                                onPress={() =>
                                  updateCustomThemeConfig({
                                    borderStyle: st.id,
                                  })
                                }
                                style={[
                                  styles.builderPill,
                                  {
                                    backgroundColor: selected
                                      ? colors.principal
                                      : colors.surfaceMuted,
                                    borderColor: selected
                                      ? colors.principal
                                      : colors.borderColor,
                                    borderRadius: Math.min(10, st.radiusButton),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.builderPillText,
                                    {
                                      color: selected
                                        ? colors.textoPrincipal
                                        : colors.textoEscuro,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {st.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* 4. Espessura do Contorno */}
                        <Text
                          style={[
                            styles.builderLabel,
                            { color: colors.textoEscuro, marginTop: 12 },
                          ]}
                        >
                          Espessura do Contorno
                        </Text>
                        <View style={styles.pillRow}>
                          {CUSTOM_BORDER_THICKNESS.map((th) => {
                            const selected =
                              customThemeConfig.borderThickness === th.id;
                            return (
                              <TouchableOpacity
                                key={th.id}
                                activeOpacity={0.8}
                                onPress={() =>
                                  updateCustomThemeConfig({
                                    borderThickness: th.id,
                                  })
                                }
                                style={[
                                  styles.builderPill,
                                  {
                                    backgroundColor: selected
                                      ? colors.principal
                                      : colors.surfaceMuted,
                                    borderColor: selected
                                      ? colors.principal
                                      : colors.borderColor,
                                    borderWidth: th.borderWidth,
                                    borderRadius: Math.min(10, radiusButton),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.builderPillText,
                                    {
                                      color: selected
                                        ? colors.textoPrincipal
                                        : colors.textoEscuro,
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {th.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>

            {/* 1b. ACCORDION: CADASTRO DE ITENS */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isItemFormExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('item_form')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Cadastro de Itens"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="list-check"
                    size={15}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Cadastro de Itens
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {simplifiedItemForm
                      ? 'Modo Simplificado por padrão'
                      : 'Modo Completo por padrão'}
                  </Text>
                </View>
                <FontAwesome6
                  name={isItemFormExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isItemFormExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  <View
                    style={[
                      styles.switchSettingCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderRadius: Math.min(12, radiusCard),
                        borderWidth,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={[
                          styles.switchSettingTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Modo simplificado no cadastro de itens
                      </Text>
                      <Text
                        style={[
                          styles.switchSettingDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Exibe apenas Nome, Quantidade e Preço por padrão
                        (desative para abrir sempre no Modo Completo)
                      </Text>
                    </View>
                    <Switch
                      value={Boolean(simplifiedItemForm)}
                      onValueChange={(val) => setSimplifiedItemForm(val)}
                      trackColor={{
                        false: colors.disabledBackground || colors.borderColor,
                        true: colors.verdeSuave,
                      }}
                      thumbColor={
                        simplifiedItemForm
                          ? colors.principal
                          : colors.textMuted
                      }
                      accessibilityLabel="Modo simplificado no cadastro de itens"
                    />
                  </View>
                </View>
              ) : null}
            </View>

            {/* 2. ACCORDION: CÂMERA E FOTOS DAS ETIQUETAS */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isPhotosExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('photos')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Câmera e Fotos das Etiquetas"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="images"
                    size={15}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Câmera e Fotos das Etiquetas
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {saveTagPhotos ? 'Salvamento ativo' : 'Desativado'} •{' '}
                    {cameraSoundEnabled ? 'Com som' : 'Silenciosa'} •{' '}
                    {photoCountLabel}
                  </Text>
                </View>
                <FontAwesome6
                  name={isPhotosExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isPhotosExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  {/* Toggle: Salvar fotos das etiquetas */}
                  <Text
                    style={[styles.builderLabel, { color: colors.textoEscuro }]}
                  >
                    Salvar fotos das etiquetas
                  </Text>
                  <View style={[styles.pillRow, { marginBottom: 12 }]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        updatePhotoSettings({ saveTagPhotos: true })
                      }
                      style={[
                        styles.builderPill,
                        {
                          backgroundColor: saveTagPhotos
                            ? colors.principal
                            : colors.card,
                          borderColor: saveTagPhotos
                            ? colors.principal
                            : colors.borderColor,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.builderPillText,
                          {
                            color: saveTagPhotos
                              ? colors.textoPrincipal
                              : colors.textoEscuro,
                          },
                        ]}
                      >
                        Sim
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        updatePhotoSettings({
                          saveTagPhotos: false,
                          autoDeleteTagPhotos: false,
                        })
                      }
                      style={[
                        styles.builderPill,
                        {
                          backgroundColor: !saveTagPhotos
                            ? colors.principal
                            : colors.card,
                          borderColor: !saveTagPhotos
                            ? colors.principal
                            : colors.borderColor,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.builderPillText,
                          {
                            color: !saveTagPhotos
                              ? colors.textoPrincipal
                              : colors.textoEscuro,
                          },
                        ]}
                      >
                        Não
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Toggle: Som da câmera ao fotografar */}
                  <Text
                    style={[styles.builderLabel, { color: colors.textoEscuro }]}
                  >
                    Som da câmera ao fotografar
                  </Text>
                  <View style={styles.pillRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        updatePhotoSettings({ cameraSoundEnabled: true })
                      }
                      style={[
                        styles.builderPill,
                        {
                          backgroundColor: cameraSoundEnabled
                            ? colors.principal
                            : colors.card,
                          borderColor: cameraSoundEnabled
                            ? colors.principal
                            : colors.borderColor,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.builderPillText,
                          {
                            color: cameraSoundEnabled
                              ? colors.textoPrincipal
                              : colors.textoEscuro,
                          },
                        ]}
                      >
                        Sim
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        updatePhotoSettings({ cameraSoundEnabled: false })
                      }
                      style={[
                        styles.builderPill,
                        {
                          backgroundColor: !cameraSoundEnabled
                            ? colors.principal
                            : colors.card,
                          borderColor: !cameraSoundEnabled
                            ? colors.principal
                            : colors.borderColor,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.builderPillText,
                          {
                            color: !cameraSoundEnabled
                              ? colors.textoPrincipal
                              : colors.textoEscuro,
                          },
                        ]}
                      >
                        Não
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {saveTagPhotos ? (
                    <>
                      <Text
                        style={[
                          styles.builderLabel,
                          { color: colors.textoEscuro, marginTop: 12 },
                        ]}
                      >
                        Excluir fotos automaticamente após
                      </Text>
                      <View style={styles.pillRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            updatePhotoSettings({ autoDeleteTagPhotos: true })
                          }
                          style={[
                            styles.builderPill,
                            {
                              backgroundColor: autoDeleteTagPhotos
                                ? colors.principal
                                : colors.card,
                              borderColor: autoDeleteTagPhotos
                                ? colors.principal
                                : colors.borderColor,
                              borderRadius: Math.min(10, radiusButton),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.builderPillText,
                              {
                                color: autoDeleteTagPhotos
                                  ? colors.textoPrincipal
                                  : colors.textoEscuro,
                              },
                            ]}
                          >
                            Sim
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            updatePhotoSettings({ autoDeleteTagPhotos: false })
                          }
                          style={[
                            styles.builderPill,
                            {
                              backgroundColor: !autoDeleteTagPhotos
                                ? colors.principal
                                : colors.card,
                              borderColor: !autoDeleteTagPhotos
                                ? colors.principal
                                : colors.borderColor,
                              borderRadius: Math.min(10, radiusButton),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.builderPillText,
                              {
                                color: !autoDeleteTagPhotos
                                  ? colors.textoPrincipal
                                  : colors.textoEscuro,
                              },
                            ]}
                          >
                            Não
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {autoDeleteTagPhotos ? (
                        <View style={[styles.pillRow, { marginTop: 8 }]}>
                          {RETENTION_DAY_OPTIONS.map((days) => {
                            const selected = tagPhotoRetentionDays === days;
                            return (
                              <TouchableOpacity
                                key={days}
                                activeOpacity={0.8}
                                onPress={() =>
                                  updatePhotoSettings({
                                    tagPhotoRetentionDays: days,
                                  })
                                }
                                style={[
                                  styles.builderPill,
                                  {
                                    minWidth: '21%',
                                    backgroundColor: selected
                                      ? colors.principal
                                      : colors.card,
                                    borderColor: selected
                                      ? colors.principal
                                      : colors.borderColor,
                                    borderRadius: Math.min(10, radiusButton),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.builderPillText,
                                    {
                                      color: selected
                                        ? colors.textoPrincipal
                                        : colors.textoEscuro,
                                    },
                                  ]}
                                >
                                  {days} dias
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : null}
                    </>
                  ) : null}

                  {/* Galeria de Etiquetas Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      closeSettings();
                      onOpenGallery?.();
                    }}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.principal,
                        borderWidth: 1.5,
                        borderRadius: radiusButton,
                        marginTop: 14,
                      },
                    ]}
                    accessibilityLabel="Abrir Galeria de Etiquetas"
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.verdeSuave,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="photo-film"
                        size={16}
                        color={colors.badgeText || colors.principal}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Galeria de Etiquetas
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        {photoCountLabel}
                      </Text>
                    </View>
                    <FontAwesome6
                      name="chevron-right"
                      size={13}
                      color={colors.principal}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 3. ACCORDION: BACKUP DE DADOS */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isBackupExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('backup')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Backup de Dados"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="database"
                    size={15}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Backup de Dados
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    Exportar e restaurar arquivos .zip e .json
                  </Text>
                </View>
                <FontAwesome6
                  name={isBackupExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isBackupExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionDesc,
                      { color: colors.textMuted, marginBottom: 12 },
                    ]}
                  >
                    Exporte tudo, apenas suas listas de compras ou apenas seus
                    lembretes, e restaure arquivos JSON com detecção automática.
                  </Text>

                  {backupMessage ? (
                    <View
                      style={[
                        styles.backupBanner,
                        {
                          backgroundColor:
                            backupMessage.type === 'error'
                              ? colors.dangerSoft
                              : colors.verdeSuave,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.backupBannerText,
                          {
                            color:
                              backupMessage.type === 'error'
                                ? colors.logoutRed
                                : colors.badgeText || colors.principal,
                          },
                        ]}
                      >
                        {backupMessage.text}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isBackupBusy}
                    onPress={() => setShowExportSelector(true)}
                    style={[
                      styles.backupBtn,
                      {
                        backgroundColor: colors.principal,
                        borderRadius: radiusButton,
                        marginBottom: 8,
                        opacity: isBackupBusy ? 0.65 : 1,
                      },
                    ]}
                  >
                    {isBackupBusy ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.textoPrincipal}
                      />
                    ) : (
                      <>
                        <FontAwesome6
                          name="file-export"
                          size={14}
                          color={colors.textoPrincipal}
                        />
                        <Text
                          style={[
                            styles.backupBtnPrimaryText,
                            { color: colors.textoPrincipal },
                          ]}
                        >
                          Exportar Dados (Backup)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isBackupBusy}
                    onPress={handlePickBackupFile}
                    style={[
                      styles.backupBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.principal,
                        borderWidth: 1.5,
                        borderRadius: radiusButton,
                        opacity: isBackupBusy ? 0.65 : 1,
                      },
                    ]}
                  >
                    <FontAwesome6
                      name="file-import"
                      size={14}
                      color={colors.principal}
                    />
                    <Text
                      style={[
                        styles.backupBtnSecondaryText,
                        { color: colors.principal },
                      ]}
                    >
                      Importar Backup (Restaurar)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 4. ACCORDION: EXCLUIR DADOS */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isDeleteExpanded
                    ? colors.logoutRed
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('delete')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Excluir Dados"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="trash-can"
                    size={15}
                    color={colors.logoutRed}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Excluir Dados
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    Limpeza seletiva ou redefinição completa
                  </Text>
                </View>
                <FontAwesome6
                  name={isDeleteExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isDeleteExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  {deleteFeedback ? (
                    <View
                      style={[
                        styles.backupBanner,
                        {
                          backgroundColor: colors.verdeSuave,
                          borderRadius: Math.min(10, radiusButton),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.backupBannerText,
                          { color: colors.badgeText || colors.principal },
                        ]}
                      >
                        {deleteFeedback}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPendingDeleteAction('photos')}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderWidth,
                        borderRadius: radiusButton,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.dangerSoft,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="images"
                        size={15}
                        color={colors.logoutRed}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Excluir Todas as Fotos das Etiquetas
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        {photoCountLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPendingDeleteAction('lists')}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderWidth,
                        borderRadius: radiusButton,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.dangerSoft,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="cart-shopping"
                        size={15}
                        color={colors.logoutRed}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Excluir Todas as Listas de Compras
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Apaga compras em aberto, finalizadas, histórico e fotos.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPendingDeleteAction('reminders')}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderWidth,
                        borderRadius: radiusButton,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.dangerSoft,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="clipboard-check"
                        size={15}
                        color={colors.logoutRed}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Excluir Todas as Listas de Lembretes
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Remove todas as listas de lembretes reutilizáveis.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setPendingDeleteAction('all')}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.dangerSoft,
                        borderColor: colors.logoutRed,
                        borderWidth: 1.5,
                        borderRadius: radiusButton,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.logoutRed,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="triangle-exclamation"
                        size={15}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.logoutRed },
                        ]}
                      >
                        Excluir Todos os Dados do Aplicativo
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.dangerText || colors.logoutRed },
                        ]}
                      >
                        Limpa listas, histórico, lembretes, categorias aprendidas e fotos.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 5. ACCORDION: SUPORTE E INFORMAÇÕES */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isSupportExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                  marginBottom: 4,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('support')}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Suporte e Informações"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="circle-info"
                    size={16}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Suporte e Informações
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    Ajuda e informações sobre o app
                  </Text>
                </View>
                <FontAwesome6
                  name={isSupportExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isSupportExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      closeSettings();
                      onOpenHelp?.();
                    }}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderWidth,
                        borderRadius: radiusButton,
                        marginBottom: 8,
                      },
                    ]}
                    accessibilityLabel="Abrir guia de Ajuda"
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.verdeSuave,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="circle-question"
                        size={16}
                        color={colors.badgeText || colors.principal}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Ajuda
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Guia completo passo a passo de como usar o app.
                      </Text>
                    </View>
                    <FontAwesome6
                      name="chevron-right"
                      size={13}
                      color={colors.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      closeSettings();
                      onOpenAbout?.();
                    }}
                    style={[
                      styles.navItemBtn,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderColor,
                        borderWidth,
                        borderRadius: radiusButton,
                      },
                    ]}
                    accessibilityLabel="Abrir tela Sobre o aplicativo"
                  >
                    <View
                      style={[
                        styles.navItemIconWrap,
                        {
                          backgroundColor: colors.verdeSuave,
                          borderRadius: Math.min(11, radiusButton),
                        },
                      ]}
                    >
                      <FontAwesome6
                        name="shield-halved"
                        size={16}
                        color={colors.badgeText || colors.principal}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.navItemTitle,
                          { color: colors.textoEscuro },
                        ]}
                      >
                        Sobre
                      </Text>
                      <Text
                        style={[
                          styles.navItemDesc,
                          { color: colors.textMuted },
                        ]}
                      >
                        Versão, privacidade 100% offline e GitHub oficial.
                      </Text>
                    </View>
                    <FontAwesome6
                      name="chevron-right"
                      size={13}
                      color={colors.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* 6. ACCORDION TEMPORÁRIO: LOGS DA API (DIAGNÓSTICO) */}
            <View
              style={[
                styles.accordionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isApiLogsExpanded
                    ? colors.principal
                    : colors.borderColor,
                  borderRadius: radiusCard,
                  borderWidth,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  refreshApiLogs();
                  toggleSection('api_logs');
                }}
                style={styles.accordionHeader}
                accessibilityLabel="Expandir ou recolher Logs da API"
              >
                <View
                  style={[
                    styles.accordionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="terminal"
                    size={14}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.accordionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    Logs de Diagnóstico (Temporário)
                  </Text>
                  <Text
                    style={[
                      styles.accordionSubtitle,
                      { color: colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {apiLogs.length}{' '}
                    {apiLogs.length === 1
                      ? 'evento técnico'
                      : 'eventos técnicos'}
                    {appErrorCount > 0 ? ` • ${appErrorCount} erro(s)` : ''}
                  </Text>
                </View>
                <FontAwesome6
                  name={isApiLogsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {isApiLogsExpanded ? (
                <View
                  style={[
                    styles.accordionBody,
                    { borderTopColor: colors.borderColor, gap: 12 },
                  ]}
                >
                  {/* Subparte 1 — Ambiente & Versão (LGPD) */}
                  {renderDeviceSummaryAndFilters(false)}

                  {/* Subparte 2 — Testador de Consulta API (Câmera / EAN) */}
                  {renderApiTesterBox()}

                  {/* Subparte 3 — Exportação & Manutenção (Grade 2x2) */}
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.borderColor,
                      borderWidth,
                      borderRadius: Math.min(12, radiusCard),
                      padding: 12,
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: colors.principal,
                      }}
                    >
                      3. Exportação &amp; Manutenção
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          refreshApiLogs();
                          setShowFullScreenLogs(true);
                        }}
                        style={[
                          styles.diagGridBtn,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.principal,
                            borderRadius: Math.min(10, radiusButton),
                          },
                        ]}
                      >
                        <FontAwesome6
                          name="expand"
                          size={12}
                          color={colors.principal}
                        />
                        <Text
                          style={[
                            styles.diagGridBtnText,
                            { color: colors.principal },
                          ]}
                          numberOfLines={1}
                        >
                          Tela Cheia
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isDiagZipBusy}
                        onPress={handleExportDiagnosticZip}
                        style={[
                          styles.diagGridBtn,
                          {
                            backgroundColor: colors.principal,
                            borderColor: colors.principal,
                            borderRadius: Math.min(10, radiusButton),
                            opacity: isDiagZipBusy ? 0.65 : 1,
                          },
                        ]}
                      >
                        {isDiagZipBusy ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.textoPrincipal}
                          />
                        ) : (
                          <FontAwesome6
                            name="file-zipper"
                            size={12}
                            color={colors.textoPrincipal}
                          />
                        )}
                        <Text
                          style={[
                            styles.diagGridBtnText,
                            { color: colors.textoPrincipal },
                          ]}
                          numberOfLines={1}
                        >
                          {isDiagZipBusy ? 'Gerando...' : 'Exportar Tudo (.zip)'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleExportApiLogs}
                        style={[
                          styles.diagGridBtn,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.borderColor,
                            borderRadius: Math.min(10, radiusButton),
                          },
                        ]}
                      >
                        <FontAwesome6
                          name="file-lines"
                          size={12}
                          color={colors.textoEscuro}
                        />
                        <Text
                          style={[
                            styles.diagGridBtnText,
                            { color: colors.textoEscuro },
                          ]}
                          numberOfLines={1}
                        >
                          Exportar Logs (.txt)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={async () => {
                          await clearApiDiagnosticLogs();
                          setApiLogs([]);
                        }}
                        style={[
                          styles.diagGridBtn,
                          {
                            backgroundColor: colors.dangerSoft,
                            borderColor: colors.logoutRed,
                            borderRadius: Math.min(10, radiusButton),
                          },
                        ]}
                      >
                        <FontAwesome6
                          name="trash-can"
                          size={12}
                          color={colors.logoutRed}
                        />
                        <Text
                          style={[
                            styles.diagGridBtnText,
                            { color: colors.logoutRed },
                          ]}
                          numberOfLines={1}
                        >
                          Limpar Logs
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {diagZipFeedback ? (
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '600',
                          color:
                            diagZipFeedback.type === 'error'
                              ? colors.logoutRed
                              : colors.principal,
                          textAlign: 'center',
                        }}
                      >
                        {diagZipFeedback.text}
                      </Text>
                    ) : null}
                  </View>

                  {/* Subparte 4 — Histórico de Eventos & Leituras */}
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.borderColor,
                      borderWidth,
                      borderRadius: Math.min(12, radiusCard),
                      padding: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: colors.principal,
                        marginBottom: 8,
                      }}
                    >
                      4. Histórico de Eventos &amp; Leituras
                    </Text>

                    {apiLogs.length === 0 ? (
                      <Text
                        style={[
                          styles.sectionDesc,
                          {
                            color: colors.textMuted,
                            textAlign: 'center',
                            paddingVertical: 10,
                          },
                        ]}
                      >
                        Nenhum evento registrado ainda.
                      </Text>
                    ) : (
                      <View style={{ gap: 2 }}>
                        {apiLogs
                          .slice(0, 3)
                          .map((log, idx) =>
                            renderDiagnosticLogCard(log, idx, false)
                          )}

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            refreshApiLogs();
                            setShowFullScreenLogs(true);
                          }}
                          style={{
                            paddingVertical: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12.5,
                              fontWeight: 'bold',
                              color: colors.principal,
                            }}
                          >
                            Ver todos os {apiLogs.length}{' '}
                            {apiLogs.length === 1 ? 'registro' : 'registros'} em
                            Tela Cheia
                          </Text>
                          <FontAwesome6
                            name="chevron-right"
                            size={11}
                            color={colors.principal}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.doneButton,
              {
                backgroundColor: colors.principal,
                borderRadius: radiusButton,
              },
            ]}
            onPress={closeSettings}
          >
            <Text
              style={[
                styles.doneButtonText,
                { color: colors.textoPrincipal },
              ]}
            >
              Concluir
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Exportação Seletiva */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showExportSelector}
        onRequestClose={() => {
          setShowExportSelector(false);
          setChainedDeleteAction(null);
        }}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.exportSelectorCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: Math.min(22, radiusCard + 4),
                borderWidth,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.titleWrap}>
                <FontAwesome6
                  name="file-export"
                  size={17}
                  color={colors.principal}
                />
                <Text
                  style={[
                    styles.exportSelectorTitle,
                    { color: colors.textoEscuro },
                  ]}
                >
                  O que deseja exportar?
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowExportSelector(false);
                  setChainedDeleteAction(null);
                }}
                style={[
                  styles.closeIconBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderRadius: radiusButton,
                  },
                ]}
              >
                <FontAwesome6
                  name="xmark"
                  size={15}
                  color={colors.textoEscuro}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.sectionDesc,
                { color: colors.textMuted, marginBottom: 14 },
              ]}
            >
              Selecione o escopo do arquivo de backup (.zip ou .json):
            </Text>

            {EXPORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                activeOpacity={0.8}
                onPress={() => handleRunExport(opt.type)}
                style={[
                  styles.exportOptionBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.borderColor,
                    borderRadius: radiusCard,
                    borderWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.exportOptionIconWrap,
                    {
                      backgroundColor: colors.verdeSuave,
                      borderRadius: Math.min(12, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name={opt.icon}
                    size={16}
                    color={colors.badgeText || colors.principal}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.exportOptionTitle,
                      { color: colors.textoEscuro },
                    ]}
                  >
                    {opt.title}
                  </Text>
                  <Text
                    style={[
                      styles.exportOptionDesc,
                      { color: colors.textMuted },
                    ]}
                  >
                    {opt.desc}
                  </Text>
                </View>
                <FontAwesome6
                  name="chevron-right"
                  size={13}
                  color={colors.textMuted}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => {
                setShowExportSelector(false);
                setChainedDeleteAction(null);
              }}
              style={[
                styles.exportCancelBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                  borderRadius: radiusButton,
                  borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.exportCancelText,
                  { color: colors.textoEscuro },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={Boolean(pendingRestore)}
        title="Restaurar Backup"
        message={buildRestoreConfirmationMessage()}
        confirmLabel="Restaurar"
        onCancel={() => setPendingRestore(null)}
        onConfirm={handleConfirmRestore}
      />

      <ConfirmModal
        visible={Boolean(deleteModalCfg)}
        title={deleteModalCfg?.title || 'Confirmar Exclusão'}
        message={deleteModalCfg?.message || ''}
        confirmLabel={deleteModalCfg?.confirmLabel || 'Excluir'}
        secondaryLabel={
          deleteModalCfg?.showBackupBefore ? 'Fazer Backup Antes' : null
        }
        onSecondaryPress={
          deleteModalCfg?.showBackupBefore
            ? () => {
                const actionToChain = pendingDeleteAction;
                setPendingDeleteAction(null);
                setChainedDeleteAction(actionToChain);
                setShowExportSelector(true);
              }
            : null
        }
        onCancel={() => setPendingDeleteAction(null)}
        onConfirm={handleConfirmGranularDelete}
      />

      <ConfirmModal
        visible={showPostBackupDeleteConfirm}
        title="Backup feito com sucesso!"
        message="Deseja seguir agora com a exclusão dos dados selecionados?"
        confirmLabel="Continuar com a Exclusão"
        onCancel={() => {
          setShowPostBackupDeleteConfirm(false);
          setChainedDeleteAction(null);
        }}
        onConfirm={handleConfirmPostBackupDelete}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={Boolean(deleteSuccessModal)}
        onRequestClose={handleDismissDeleteSuccess}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.exportSelectorCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderRadius: Math.min(22, radiusCard + 4),
                borderWidth,
                alignItems: 'center',
              },
            ]}
          >
            <View
              style={[
                styles.accordionIconWrap,
                {
                  width: 54,
                  height: 54,
                  borderRadius: Math.min(18, radiusCard),
                  backgroundColor: colors.verdeSuave,
                  marginRight: 0,
                  marginBottom: 12,
                },
              ]}
            >
              <FontAwesome6
                name="circle-check"
                size={24}
                color={colors.badgeText || colors.principal}
              />
            </View>
            <Text
              style={[
                styles.exportSelectorTitle,
                {
                  color: colors.textoEscuro,
                  marginLeft: 0,
                  textAlign: 'center',
                  marginBottom: 8,
                },
              ]}
            >
              {deleteSuccessModal?.title || 'Dados excluídos com sucesso!'}
            </Text>
            <Text
              style={[
                styles.sectionDesc,
                {
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginBottom: 18,
                },
              ]}
            >
              {deleteSuccessModal?.message}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDismissDeleteSuccess}
              style={[
                styles.doneButton,
                {
                  backgroundColor: colors.principal,
                  borderRadius: radiusButton,
                  marginTop: 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  { color: colors.textoPrincipal },
                ]}
              >
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Tela Cheia — Logs da API (Temporário) */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showFullScreenLogs}
        onRequestClose={() => setShowFullScreenLogs(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              backgroundColor: colors.primary,
              paddingTop: Platform.OS === 'android' ? 42 : 52,
              paddingBottom: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <FontAwesome6
                name="terminal"
                size={16}
                color={colors.textoPrincipal}
                style={{ marginRight: 10 }}
              />
              <Text
                style={{
                  color: colors.textoPrincipal,
                  fontSize: 18,
                  fontWeight: 'bold',
                }}
                numberOfLines={1}
              >
                Logs de Diagnóstico ({apiLogs.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFullScreenLogs(false)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: Math.min(10, radiusButton),
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Text
                style={{
                  color: colors.textoPrincipal,
                  fontWeight: 'bold',
                  fontSize: 13,
                }}
              >
                Fechar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: 36, gap: 12 }}
            showsVerticalScrollIndicator={true}
          >
            {/* Subparte 1 — Ambiente & Versão (LGPD) */}
            {renderDeviceSummaryAndFilters(true)}

            {/* Subparte 2 — Testador de Consulta API (Câmera / EAN) */}
            {renderApiTesterBox()}

            {/* Subparte 3 — Exportação & Manutenção */}
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderWidth,
                borderRadius: Math.min(12, radiusCard),
                padding: 12,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: colors.principal,
                }}
              >
                3. Exportação &amp; Manutenção
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={refreshApiLogs}
                  style={[
                    styles.diagGridBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderColor,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="rotate"
                    size={12}
                    color={colors.textoEscuro}
                  />
                  <Text
                    style={[styles.diagGridBtnText, { color: colors.textoEscuro }]}
                    numberOfLines={1}
                  >
                    Atualizar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isDiagZipBusy}
                  onPress={handleExportDiagnosticZip}
                  style={[
                    styles.diagGridBtn,
                    {
                      backgroundColor: colors.principal,
                      borderColor: colors.principal,
                      borderRadius: Math.min(10, radiusButton),
                      opacity: isDiagZipBusy ? 0.65 : 1,
                    },
                  ]}
                >
                  {isDiagZipBusy ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.textoPrincipal}
                    />
                  ) : (
                    <FontAwesome6
                      name="file-zipper"
                      size={12}
                      color={colors.textoPrincipal}
                    />
                  )}
                  <Text
                    style={[
                      styles.diagGridBtnText,
                      { color: colors.textoPrincipal },
                    ]}
                    numberOfLines={1}
                  >
                    {isDiagZipBusy ? 'Gerando...' : 'Exportar Tudo (.zip)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleExportApiLogs}
                  style={[
                    styles.diagGridBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.borderColor,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="file-lines"
                    size={12}
                    color={colors.textoEscuro}
                  />
                  <Text
                    style={[styles.diagGridBtnText, { color: colors.textoEscuro }]}
                    numberOfLines={1}
                  >
                    Exportar Logs (.txt)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    await clearApiDiagnosticLogs();
                    setApiLogs([]);
                  }}
                  style={[
                    styles.diagGridBtn,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.logoutRed,
                      borderRadius: Math.min(10, radiusButton),
                    },
                  ]}
                >
                  <FontAwesome6
                    name="trash-can"
                    size={12}
                    color={colors.logoutRed}
                  />
                  <Text
                    style={[styles.diagGridBtnText, { color: colors.logoutRed }]}
                    numberOfLines={1}
                  >
                    Limpar Logs
                  </Text>
                </TouchableOpacity>
              </View>

              {diagZipFeedback ? (
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: '600',
                    color:
                      diagZipFeedback.type === 'error'
                        ? colors.logoutRed
                        : colors.principal,
                    textAlign: 'center',
                  }}
                >
                  {diagZipFeedback.text}
                </Text>
              ) : null}
            </View>

            {/* Subparte 4 — Histórico de Eventos & Leituras */}
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
                borderWidth,
                borderRadius: Math.min(12, radiusCard),
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: colors.principal,
                  marginBottom: 8,
                }}
              >
                4. Histórico de Eventos &amp; Leituras ({filteredDiagnosticLogs.length})
              </Text>

              {filteredDiagnosticLogs.length === 0 ? (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 13.5,
                    textAlign: 'center',
                    paddingVertical: 18,
                  }}
                >
                  Nenhum evento registrado para este filtro.
                </Text>
              ) : (
                filteredDiagnosticLogs.map((log, idx) =>
                  renderDiagnosticLogCard(log, idx, true)
                )
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Câmera Leitora de EAN (Testador de API — CameraView estritamente self-closing) */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showEanScannerModal}
        onRequestClose={() => setShowEanScannerModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{ flex: 1, position: 'relative' }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8'],
              }}
              onBarcodeScanned={handleDiagnosticBarcodeScanned}
            />

            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  justifyContent: 'space-between',
                  paddingTop: Platform.OS === 'android' ? 44 : 54,
                  paddingBottom: 34,
                  paddingHorizontal: 18,
                },
              ]}
              pointerEvents="box-none"
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 'bold',
                    }}
                  >
                    Leitor EAN — Testador da API
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowEanScannerModal(false)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.72)',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  accessibilityLabel="Fechar leitor de código de barras"
                >
                  <FontAwesome6 name="xmark" size={14} color="#FFFFFF" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 'bold',
                    }}
                  >
                    Fechar
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  alignSelf: 'center',
                  width: '86%',
                  height: 150,
                  borderWidth: 2,
                  borderColor: '#22C55E',
                  borderRadius: 14,
                  backgroundColor: 'rgba(34,197,94,0.06)',
                }}
                pointerEvents="none"
              />

              <View
                style={{
                  alignSelf: 'center',
                  backgroundColor: 'rgba(0,0,0,0.72)',
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                }}
                pointerEvents="none"
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12.5,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Aponte a câmera para o código de barras (EAN-13 ou EAN-8)
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  exportSelectorCard: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  exportSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  exportOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  exportOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exportOptionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  exportOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  exportCancelBtn: {
    width: '100%',
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  exportCancelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollAreaContent: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionCard: {
    marginBottom: 0,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  accordionIconWrap: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accordionTitle: {
    fontSize: 15.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  accordionSubtitle: {
    fontSize: 12.5,
  },
  accordionBody: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  switchSettingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  switchSettingTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  switchSettingDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  themeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  themePreviewCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
    marginRight: 11,
    flexShrink: 0,
  },
  themePreviewHalf: {
    flex: 1,
    height: '100%',
  },
  themeRowName: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 1,
  },
  themeRowSub: {
    fontSize: 11.5,
  },
  customThemeWrapper: {
    overflow: 'hidden',
  },
  customThemeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  editCustomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editCustomBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customBuilderPanel: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  builderLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  builderPill: {
    flexGrow: 1,
    minWidth: '28%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderPillText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  diagGridBtn: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  diagGridBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  backupBanner: {
    padding: 10,
    marginBottom: 10,
  },
  backupBannerText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  backupBtn: {
    width: '100%',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupBtnPrimaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backupBtnSecondaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  navItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  navItemIconWrap: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  navItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  navItemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  doneButton: {
    width: '100%',
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
