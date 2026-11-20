import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../../src/api/Api';  
import { AppColors } from '../../StyleSheet/Colors';
import ModalStyle from '../../StyleSheet/ModalStyle'; 
import globalStyles from '../../StyleSheet/Styles';
import CancelButton from '../../../components/common/Buttons/CancelButton'; 
import SaveButton from '../../../components/common/Buttons/SaveButton'; 

export default function EditUserModal({
  visible,
  userToEdit, 
  niveisAcessoOptions,
  onClose,
  onSaveSuccess,
}) {
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('3'); 
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setNome(userToEdit.NOME || '');
      setLogin(userToEdit.LOGIN || '');
      setNivelAcesso(userToEdit.NIVEL_ACESSO?.toString() || '3');
      setSenha(''); 
    }
  }, [userToEdit]); 

  const handleSave = useCallback(async () => {
    if (!userToEdit || !nome.trim() || !login.trim()) {
      window.alert('Nome e Login são obrigatórios.');
      return;
    }
    setIsSaving(true);
    let userToken = null;
    try {
      userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        window.alert('Autenticação necessária.');
        setIsSaving(false);
        return;
      }
      const userDataToUpdate = {
        nome: nome.trim(),
        login: login.trim(),
        nivelAcesso: parseInt(nivelAcesso, 10),
      };
      if (senha.trim() !== '') {
        userDataToUpdate.senha = senha.trim();
      }

      const response = await fetch(`${API_URL}/usuarios/${userToEdit.ID_USUARIO_PK}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': userToken,
        },
        body: JSON.stringify(userDataToUpdate),
      });

      if (response.ok || response.status === 200) {
        window.alert('Usuário atualizado com sucesso!');
        onSaveSuccess();
      } else {
        const responseData = await response.json().catch(() => ({ message: `Erro ${response.status}` }));
        window.alert(`Erro ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      window.alert('Não foi possível conectar ao servidor.');
    } finally {
      setIsSaving(false);
    }
  }, [userToEdit, nome, login, senha, nivelAcesso, onSaveSuccess]);

  if (!userToEdit) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={ModalStyle.modalCenteredView}>
        <View style={ModalStyle.modalView}>
          <Text style={ModalStyle.modalTitle}>Editar Usuário</Text>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Nome:</Text>
              <TextInput
                style={globalStyles.input}
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={AppColors.textoEscuro}
              />
            </View>
            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Login:</Text>
              <TextInput
                style={globalStyles.input}
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                placeholderTextColor={AppColors.textoEscuro}
              />
            </View>
            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Nova Senha (opcional):</Text>
              <TextInput
                style={globalStyles.input}
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                placeholder="Deixe em branco para não alterar"
                placeholderTextColor={AppColors.textoEscuro}
              />
            </View>
            <View style={ModalStyle.modalInputContainer}>
              <Text style={ModalStyle.modalLabel}>Nível de Acesso:</Text>
              <View style={ModalStyle.modalPickerWrapper}>
                <Picker
                  selectedValue={nivelAcesso}
                  onValueChange={(itemValue) => setNivelAcesso(itemValue)}
                  style={ModalStyle.modalPicker}
                  dropdownIconColor={AppColors.textoEscuro}
                >
                  {niveisAcessoOptions.map((nivelOpt) => (
                    <Picker.Item key={nivelOpt.value} label={nivelOpt.label} value={nivelOpt.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </ScrollView>
          {isSaving ? (
            <ActivityIndicator size="large" color={AppColors.principal} style={{ marginTop: 50 }} />
          ) : (
          <View style={ModalStyle.modalButtonContainer}>
            <CancelButton
              onPress={onClose}
              style={ModalStyle.modalButton}
              disabled={isSaving}
            />
            <SaveButton
              onPress={handleSave}
              style={ModalStyle.modalButton}
              disabled={isSaving}
            />
          </View>
          )}
        </View>
      </View>
    </Modal>
  );
}