import React from 'react';
import { Modal, View, Text } from 'react-native';
import ModalStyle from '../../StyleSheet/ModalStyle';
import CancelButton from '../../common/Buttons/CancelButton';
import DeleteButton from '../../common/Buttons/DeleteButton';

export default function ConfirmModal({
  visible,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Excluir',
  onCancel,
  onConfirm,
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>{title}</Text>
          <Text style={[ModalStyle.modalText, { marginBottom: 20 }]}>{message}</Text>
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
