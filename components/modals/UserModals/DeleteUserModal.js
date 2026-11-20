import React, { useState } from 'react';
import { Modal, View, Text, ActivityIndicator, Alert } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../src/api/Api'; 
import ModalStyle from '../../StyleSheet/ModalStyle';

import DeleteButton from '../../../components/common/Buttons/DeleteButton'; 
import CancelButton from '../../../components/common/Buttons/CancelButton'; 

export default function DeleteUserModal({
  visible,
  onClose,
  userIdToDelete,
  userNameToDelete,
  onDeletionSuccess,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const processarExclusaoUsuario = async () => {
    if (!userIdToDelete) {
      window.alert("ID do usuário não fornecido.");
      return;
    }

    setIsDeleting(true);
    let userToken = null;

    try {
      userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        window.alert("Token de autenticação não encontrado. Faça login novamente.");
        setIsDeleting(false);
        onClose();
        return;
      }

      const response = await fetch(`${API_URL}/usuarios/${userIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': userToken,
        },
      });

      if (response.ok || response.status === 200 || response.status === 204) {
        window.alert("Usuário excluído com sucesso.");
        onDeletionSuccess(); 
      } else {
        const errorData = await response.json().catch(() => ({ message: "Erro ao processar a resposta do servidor." }));
        window.alert(`Não foi possível excluir o usuário: ${errorData.message}`);
        onClose(); 
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      window.alert("Não foi possível conectar ao servidor.");
      onClose(); 
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => !isDeleting && onClose()} 
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>Confirmar Exclusão</Text>
          <Text style={[ModalStyle.modalText, { justifyContent: 'center', fontSize: 19, marginBottom: 15 }]}>
            Você tem certeza que deseja excluir o usuário <Text style={{ fontWeight: 'bold' }}>{userNameToDelete || 'selecionado'}</Text>?
          </Text>
          <Text style={[ModalStyle.modalText, { fontWeight: 'bold', fontSize: 19, marginBottom: 20 }]}>
            Esta ação não poderá ser desfeita.
          </Text>

          {isDeleting ? (
            <ActivityIndicator size="large" color={ModalStyle.activityIndicatorColor || '#007bff'} style={{ marginBottom: 20 }} />
          ) : (
            <View style={ModalStyle.modalButtonContainer}>
              <CancelButton
                onPress={onClose}
                style={ModalStyle.modalButton}
                disabled={isDeleting}
              />
              <DeleteButton
                onPress={processarExclusaoUsuario}
                style={ModalStyle.modalButton}
                disabled={isDeleting}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}