import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import ConfirmModal from './ConfirmModal';
import { useAppSettings } from '../../../src/context/AppSettingsContext';
import {
  exportBackupPayload,
  validateBackupPayload,
  importBackupPayload,
  formatDateBR,
} from '../../../src/storage/shoppingStorage';

export default function SettingsModal() {
  const {
    darkMode,
    cameraCaptureMode,
    cameraSource,
    colors,
    isSettingsVisible,
    toggleDarkMode,
    setCameraCaptureMode,
    setCameraSource,
    notifyDataRestored,
    closeSettings,
  } = useAppSettings();

  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null); // { type: 'success' | 'error', text: string }
  const [pendingRestore, setPendingRestore] = useState(null); // { payload, summary }

  useEffect(() => {
    if (isSettingsVisible) {
      setBackupMessage(null);
      setPendingRestore(null);
      setIsBackupBusy(false);
    }
  }, [isSettingsVisible]);

  const handleExportBackup = async () => {
    if (isBackupBusy) return;
    setIsBackupBusy(true);
    setBackupMessage(null);
    try {
      const payload = await exportBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const fileName = `backup_minha_lista_${dd}-${mm}-${yyyy}.json`;

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
          text: `Backup "${fileName}" baixado com sucesso!`,
        });
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
          return;
        }

        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Backup - Minha Lista de Compras',
          UTI: 'public.json',
        });

        setBackupMessage({
          type: 'success',
          text: 'Arquivo de backup gerado com sucesso!',
        });
      }
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      setBackupMessage({
        type: 'error',
        text: 'Não foi possível exportar o backup. Tente novamente.',
      });
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handlePickBackupFile = async () => {
    if (isBackupBusy) return;
    setIsBackupBusy(true);
    setBackupMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      let content = '';
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        content = await resp.text();
      } else {
        try {
          content = await LegacyFileSystem.readAsStringAsync(asset.uri, {
            encoding: 'utf8',
          });
        } catch (legacyErr) {
          try {
            const file = new File(asset.uri);
            content = await file.text();
          } catch (newFsErr) {
            const resp = await fetch(asset.uri);
            content = await resp.text();
          }
        }
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        setBackupMessage({
          type: 'error',
          text: 'O arquivo selecionado não contém um JSON válido.',
        });
        return;
      }

      const validation = validateBackupPayload(parsed);
      if (!validation.valid) {
        setBackupMessage({
          type: 'error',
          text: validation.error,
        });
        return;
      }

      setPendingRestore({
        payload: parsed,
        summary: validation.summary,
      });
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      setBackupMessage({
        type: 'error',
        text: 'Não foi possível ler o arquivo de backup selecionado.',
      });
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore?.payload) return;
    setIsBackupBusy(true);
    try {
      await importBackupPayload(pendingRestore.payload);
      notifyDataRestored();
      setPendingRestore(null);
      setBackupMessage({
        type: 'success',
        text: 'Backup restaurado com sucesso! Todas as telas foram atualizadas.',
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
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <FontAwesome6 name="gear" size={18} color={colors.principal} />
              <Text style={[styles.title, { color: colors.textoEscuro }]}>
                Configurações
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeSettings}
              style={[styles.closeIconBtn, { backgroundColor: colors.surfaceMuted }]}
              accessibilityLabel="Fechar configurações"
            >
              <FontAwesome6 name="xmark" size={16} color={colors.textoEscuro} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
          >
            {/* Tema */}
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={styles.labelWithIcon}>
                    <FontAwesome6
                      name={darkMode ? 'moon' : 'sun'}
                      size={15}
                      color={colors.principal}
                    />
                    <Text style={[styles.sectionTitle, { color: colors.textoEscuro }]}>
                      Modo Noturno
                    </Text>
                  </View>
                  <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                    {darkMode
                      ? 'Tema escuro ativado em todas as telas.'
                      : 'Tema claro padrão em verde e branco/cinza.'}
                  </Text>
                </View>
                <Switch
                  value={darkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: colors.borderColor, true: colors.verdePrincipal }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Origem da Câmera (Nativa vs Integrada) */}
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.labelWithIcon}>
                <FontAwesome6 name="camera" size={15} color={colors.principal} />
                <Text style={[styles.sectionTitle, { color: colors.textoEscuro }]}>
                  Origem da Câmera
                </Text>
              </View>
              <Text style={[styles.sectionDesc, { color: colors.textMuted, marginBottom: 12 }]}>
                Selecione o motor de captura de imagem:
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCameraSource('native')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      cameraSource === 'native'
                        ? colors.principal
                        : colors.borderColor,
                    borderWidth: cameraSource === 'native' ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <FontAwesome6
                    name={cameraSource === 'native' ? 'circle-dot' : 'circle'}
                    size={16}
                    color={
                      cameraSource === 'native'
                        ? colors.principal
                        : colors.textMuted
                    }
                  />
                  <Text style={[styles.optionTitle, { color: colors.textoEscuro }]}>
                    Câmera do Celular (Recomendado)
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Abre a câmera oficial do smartphone com foco macro e flash. 100% livre de tela preta no Expo Go e APKs.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCameraSource('inapp')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      cameraSource === 'inapp'
                        ? colors.principal
                        : colors.borderColor,
                    borderWidth: cameraSource === 'inapp' ? 2 : 1,
                    marginBottom: 0,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <FontAwesome6
                    name={cameraSource === 'inapp' ? 'circle-dot' : 'circle'}
                    size={16}
                    color={
                      cameraSource === 'inapp'
                        ? colors.principal
                        : colors.textMuted
                    }
                  />
                  <Text style={[styles.optionTitle, { color: colors.textoEscuro }]}>
                    Câmera Integrada na Tela
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Preview de vídeo direto na tela do app. (Em alguns aparelhos com Expo Go, o preview pode não renderizar).
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modo de Captura da Câmera (Parcial vs Completa) */}
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.labelWithIcon}>
                <FontAwesome6 name="crop" size={15} color={colors.principal} />
                <Text style={[styles.sectionTitle, { color: colors.textoEscuro }]}>
                  Enquadramento da Etiqueta
                </Text>
              </View>
              <Text style={[styles.sectionDesc, { color: colors.textMuted, marginBottom: 12 }]}>
                Escolha como recortar a imagem capturada para leitura do preço:
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCameraCaptureMode('partial')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      cameraCaptureMode === 'partial'
                        ? colors.principal
                        : colors.borderColor,
                    borderWidth: cameraCaptureMode === 'partial' ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <FontAwesome6
                    name={cameraCaptureMode === 'partial' ? 'circle-dot' : 'circle'}
                    size={16}
                    color={
                      cameraCaptureMode === 'partial'
                        ? colors.principal
                        : colors.textMuted
                    }
                  />
                  <Text style={[styles.optionTitle, { color: colors.textoEscuro }]}>
                    Captura Parcial (Foco na Etiqueta)
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Recorta automaticamente a faixa central da foto onde está a etiqueta de preço.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCameraCaptureMode('full')}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      cameraCaptureMode === 'full'
                        ? colors.principal
                        : colors.borderColor,
                    borderWidth: cameraCaptureMode === 'full' ? 2 : 1,
                    marginBottom: 0,
                  },
                ]}
              >
                <View style={styles.optionHeader}>
                  <FontAwesome6
                    name={cameraCaptureMode === 'full' ? 'circle-dot' : 'circle'}
                    size={16}
                    color={
                      cameraCaptureMode === 'full'
                        ? colors.principal
                        : colors.textMuted
                    }
                  />
                  <Text style={[styles.optionTitle, { color: colors.textoEscuro }]}>
                    Captura Completa
                  </Text>
                </View>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                  Mantém a foto inteira sem recorte automático.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Backup de Dados (Exportar / Importar JSON) */}
            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.labelWithIcon}>
                <FontAwesome6 name="database" size={15} color={colors.principal} />
                <Text style={[styles.sectionTitle, { color: colors.textoEscuro }]}>
                  Backup de Dados
                </Text>
              </View>
              <Text
                style={[
                  styles.sectionDesc,
                  { color: colors.textMuted, marginBottom: 12 },
                ]}
              >
                Exporte suas listas, produtos e lembretes em um arquivo JSON ou restaure um backup anterior.
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
                            : colors.principal,
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
                onPress={handleExportBackup}
                style={[
                  styles.backupBtn,
                  {
                    backgroundColor: colors.principal,
                    marginBottom: 8,
                    opacity: isBackupBusy ? 0.65 : 1,
                  },
                ]}
              >
                {isBackupBusy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome6 name="file-export" size={14} color="#FFFFFF" />
                    <Text style={styles.backupBtnPrimaryText}>
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
                  Importar Dados (Restaurar)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.principal }]}
            onPress={closeSettings}
          >
            <Text style={[styles.doneButtonText, { color: colors.textoPrincipal }]}>
              Concluir
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={Boolean(pendingRestore)}
        title="Restaurar Backup"
        message={
          pendingRestore
            ? `Deseja restaurar o backup${
                pendingRestore.summary.exportedAt
                  ? ` de ${formatDateBR(pendingRestore.summary.exportedAt)}`
                  : ''
              } contendo ${pendingRestore.summary.listCount} ${
                pendingRestore.summary.listCount === 1 ? 'lista' : 'listas'
              } e ${pendingRestore.summary.reminderCount} ${
                pendingRestore.summary.reminderCount === 1
                  ? 'lembrete'
                  : 'lembretes'
              }? Os dados atuais do aparelho serão substituídos.`
            : ''
        }
        confirmLabel="Restaurar"
        onCancel={() => setPendingRestore(null)}
        onConfirm={handleConfirmRestore}
      />
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
    padding: 20,
    borderWidth: 1,
  },
  scrollArea: {
    maxHeight: 460,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
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
  sectionBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  optionCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 24,
  },
  backupBanner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  backupBannerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  backupBtn: {
    width: '100%',
    height: 44,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backupBtnSecondaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  doneButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
