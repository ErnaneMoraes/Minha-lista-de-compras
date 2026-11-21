import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import ModalStyle from '../../StyleSheet/ModalStyle';
import CancelButton from '../../common/Buttons/CancelButton';
import DeleteButton from '../../common/Buttons/DeleteButton';
import { useAppSettings } from '../../../src/context/AppSettingsContext';

export default function ConfirmModal({
  visible,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Excluir',
  secondaryLabel = null,
  onSecondaryPress = null,
  onCancel,
  onConfirm,
}) {
  const { colors, radiusCard, radiusButton, borderWidth } = useAppSettings();

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
              { marginBottom: secondaryLabel ? 14 : 20, color: colors.textoEscuro },
            ]}
          >
            {message}
          </Text>

          {secondaryLabel && onSecondaryPress ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSecondaryPress}
              style={[
                styles.secondaryActionBtn,
                {
                  backgroundColor: colors.verdeSuave,
                  borderColor: colors.principal,
                  borderRadius: radiusButton,
                },
              ]}
            >
              <FontAwesome6
                name="file-export"
                size={14}
                color={colors.badgeText || colors.principal}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.secondaryActionText,
                  { color: colors.badgeText || colors.principal },
                ]}
              >
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
          ) : null}

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

const styles = StyleSheet.create({
  secondaryActionBtn: {
    width: '100%',
    height: 44,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
