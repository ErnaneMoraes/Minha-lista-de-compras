import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput } from 'react-native';
import { AppColors } from '../../StyleSheet/Colors';
import ModalStyle from '../../StyleSheet/ModalStyle';
import globalStyles from '../../StyleSheet/Styles';
import CancelButton from '../../common/Buttons/CancelButton';
import SaveButton from '../../common/Buttons/SaveButton';

export default function ListFormModal({
  visible,
  initialName = '',
  title = 'Criar Nova Lista',
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setError('');
    }
  }, [visible, initialName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Informe o nome da lista.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>{title}</Text>
          <View style={ModalStyle.modalInputContainer}>
            <Text style={ModalStyle.modalLabel}>Nome da lista:</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Ex: Compras do Mês, Feira, Churrasco..."
              placeholderTextColor={AppColors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              onSubmitEditing={handleSave}
            />
            {error ? (
              <Text style={{ color: AppColors.logoutRed, fontSize: 13, marginTop: 6 }}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton onPress={onClose} style={ModalStyle.modalButton} />
            <SaveButton onPress={handleSave} style={ModalStyle.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
