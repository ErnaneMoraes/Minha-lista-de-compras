import React from 'react';
import { Modal, View, Text } from 'react-native';
import ModalStyle from '../../StyleSheet/ModalStyle';
import CancelButton from '../../common/Buttons/CancelButton';
import DeleteButton from '../../common/Buttons/DeleteButton';
import { useAppSettings } from '../../../src/context/AppSettingsContext';

export default function ConfirmModal({
  visible,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Excluir',
  onCancel,
  onConfirm,
}) {
  const { colors, radiusCard, borderWidth } = useAppSettings();

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
            {title}
          </Text>
          <Text
            style={[
              ModalStyle.modalText,
              { marginBottom: 20, color: colors.textoEscuro },
            ]}
          >
            {message}
          </Text>
          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton onPress={onCancel} style={ModalStyle.modalButton} />
            <DeleteButton
              title={confirmLabel}
              onPress={onConfirm}
              style={ModalStyle.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
