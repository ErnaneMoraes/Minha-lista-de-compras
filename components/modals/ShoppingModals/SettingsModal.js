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

const EXPORT_OPTIONS = [
  {
    type: 'all',
    title: 'Exportar Tudo',
    desc: 'Inclui todas as listas de compras, histórico de gastos e todas as listas de lembretes.',
    icon: 'layer-group',
  },
  {
    type: 'lists',
    title: 'Apenas Listas de Compras',
    desc: 'Exporta somente suas listas de compras e histórico para relatórios.',
    icon: 'cart-shopping',
  },
  {
    type: 'reminders',
    title: 'Apenas Lembretes',
    desc: 'Exporta somente suas listas de lembretes reutilizáveis.',
    icon: 'clipboard-check',
  },
];

export default function SettingsModal() {
  const {
    darkMode,
    cameraCaptureMode,
    colors,
    isSettingsVisible,
    toggleDarkMode,
    setCameraCaptureMode,
    notifyDataRestored,
    closeSettings,
  } = useAppSettings();

  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState(null);
  const [showExportSelector, setShowExportSelector] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  useEffect(() => {
    if (isSettingsVisible) {
      setBackupMessage(null);
      setPendingRestore(null);
      setShowExportSelector(false);
      setIsBackupBusy(false);
    }
  }, [isSettingsVisible]);

  const handleRunExport = async (exportType = 'all') => {
    setShowExportSelector(false);
    if (isBackupBusy) return;
    setIsBackupBusy(true);
    setBackupMessage(null);
    try {
      const payload = await exportBackupPayload(exportType);
      const jsonString = JSON.stringify(payload, null, 2);
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const suffix =
        exportType === 'lists'
          ? '_compras'
          : exportType === 'reminders'
            ? '_lembretes'
            : '_completo';
      const fileName = `backup_minha_lista${suffix}_${dd}-${mm}-${yyyy}.json`;

      const typeLabel =
        exportType === 'lists'
          ? 'Apenas Listas de Compras'
          : exportType === 'reminders'
            ? 'Apenas Lembretes'
            : 'Completo';

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
          text: `Backup (${typeLabel}) "${fileName}" baixado com sucesso!`,
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
          dialogTitle: `Exportar Backup (${typeLabel})`,
          UTI: 'public.json',
        });

        setBackupMessage({
          type: 'success',
          text: `Backup (${typeLabel}) gerado com sucesso!`,
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
        } catch {
          try {
            const file = new File(asset.uri);
            content = await file.text();
          } catch {
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

  const buildRestoreConfirmationMessage = () => {
    if (!pendingRestore?.summary) return '';
    const s = pendingRestore.summary;
    const datePart = s.exportedAt ? ` de ${formatDateBR(s.exportedAt)}` : '';

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
    return `Detectado Backup Completo${datePart} contendo ${s.listCount} ${
      s.listCount === 1 ? 'lista de compras' : 'listas de compras'
    } e ${s.reminderListCount} ${
      s.reminderListCount === 1 ? 'lista de lembretes' : 'listas de lembretes'
    }. Deseja restaurar esses dados?`;
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore?.payload) return;
    setIsBackupBusy(true);
    try {
      const restoredSummary = await importBackupPayload(pendingRestore.payload);
      notifyDataRestored();
      setPendingRestore(null);

      let successText =
        'Backup completo restaurado com sucesso! Listas de compras e lembretes atualizados.';
      if (restoredSummary.detectedType === 'lists') {
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
                  Abre o recortador pré-posicionado na faixa central onde está a etiqueta de preço.
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
                  Exibe o quadro inteiro da foto com opção de recortar se desejar.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Backup de Dados (Exportar Seletivo / Importar com Detecção Automática) */}
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
                Exporte tudo, apenas suas listas de compras ou apenas seus lembretes, e restaure arquivos JSON com detecção automática.
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
                onPress={() => setShowExportSelector(true)}
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

      {/* Modal de Exportação Seletiva */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showExportSelector}
        onRequestClose={() => setShowExportSelector(false)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.exportSelectorCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
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
                <Text style={[styles.exportSelectorTitle, { color: colors.textoEscuro }]}>
                  O que deseja exportar?
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExportSelector(false)}
                style={[styles.closeIconBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <FontAwesome6 name="xmark" size={15} color={colors.textoEscuro} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.sectionDesc,
                { color: colors.textMuted, marginBottom: 14 },
              ]}
            >
              Selecione o escopo do arquivo JSON de backup:
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
                  },
                ]}
              >
                <View
                  style={[
                    styles.exportOptionIconWrap,
                    { backgroundColor: colors.verdeSuave },
                  ]}
                >
                  <FontAwesome6
                    name={opt.icon}
                    size={16}
                    color={colors.principal}
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
                    style={[styles.exportOptionDesc, { color: colors.textMuted }]}
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
              onPress={() => setShowExportSelector(false)}
              style={[
                styles.exportCancelBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.borderColor,
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
