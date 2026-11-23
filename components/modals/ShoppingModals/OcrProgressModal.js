import React from 'react';
import { Modal, View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import ModalStyle from '../../StyleSheet/ModalStyle';
import CancelButton from '../../common/Buttons/CancelButton';
import { useAppSettings } from '../../../src/context/AppSettingsContext';

export default function OcrProgressModal({
  visible,
  imageUri,
  progress = 0,
  statusMessage = '',
  onCancel,
}) {
  const { colors, radiusCard, borderWidth } = useAppSettings();
  const pct = Math.max(0, Math.min(100, Math.round((Number(progress) || 0) * 100)));

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View
          style={[
            ModalStyle.modalView,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderColor,
              borderWidth,
              borderRadius: radiusCard,
            },
          ]}
        >
          <Text style={[ModalStyle.modalTitle, { color: colors.textoEscuro }]}>
            {statusMessage ? 'Identificando produto...' : 'Analisando etiqueta...'}
          </Text>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[localStyles.preview, { backgroundColor: colors.surfaceMuted }]}
              resizeMode="contain"
            />
          ) : null}

          <ActivityIndicator
            size="large"
            color={colors.principal}
            style={{ marginVertical: 14 }}
          />

          <Text style={[localStyles.statusText, { color: colors.textMuted }]}>
            {statusMessage
              ? statusMessage
              : pct > 0
                ? `Lendo nome, preço e unidade (${pct}%)...`
                : 'Preparando imagem da etiqueta...'}
          </Text>

          <View style={localStyles.buttonRow}>
            <CancelButton onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    width: '100%',
  },
});
