import React from 'react';
import { Modal, View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { AppColors } from '../../StyleSheet/Colors';
import ModalStyle from '../../StyleSheet/ModalStyle';
import CancelButton from '../../common/Buttons/CancelButton';

export default function OcrProgressModal({
  visible,
  imageUri,
  progress = 0,
  onCancel,
}) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(progress) || 0) * 100)));

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>Analisando etiqueta...</Text>

          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={localStyles.preview}
              resizeMode="contain"
            />
          ) : null}

          <ActivityIndicator
            size="large"
            color={AppColors.principal}
            style={{ marginVertical: 14 }}
          />

          <Text style={localStyles.statusText}>
            {pct > 0
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
    backgroundColor: AppColors.surfaceMuted,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonRow: {
    width: '100%',
  },
});
