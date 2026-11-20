import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../api/Api';
import styles from '../../../components/StyleSheet/Styles';
import { AppColors } from '../../../components/StyleSheet/Colors'; 
import ButtonStyles from '../../../components/StyleSheet/Button';
import AddUserFormStyle from '../../../components/StyleSheet/AddUserFormStyle';

export default function AddUserForm({ navigation }) {
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState("3");
  const [isSaving, setIsSaving] = useState(false);

  const niveisAcesso = [
    { label: 'Vendedor', value: '3' },
    { label: 'Supervisor', value: '2' },
    { label: 'Administrador', value: '1' },
  ];

  const handleCreateUser = useCallback(async () => {
    if (!nome.trim() || !login.trim() || !senha.trim()) {
      window.alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setIsSaving(true);
    let userToken = null;
    try {
      userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        window.alert('Autenticação necessária. Faça login novamente.');
        setIsSaving(false);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }
      const userData = {
        nome: nome.trim(),
        login: login.trim(),
        senha: senha,
        nivelAcesso: nivelAcesso,
      };
      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': userToken,
        },
        body: JSON.stringify(userData),
      });
      const responseData = await response.json();
      if (response.ok || response.status === 201) {
        window.alert('Usuário criado com sucesso!');
        setNome('');
        setLogin('');
        setSenha('');
        setNivelAcesso("3");
      } else {
        window.alert(`Erro ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      window.alert('Não foi possível conectar ao servidor.');
    } finally {
      setIsSaving(false);
    }
  }, [nome, login, senha, nivelAcesso, navigation]);

  return (
     <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1}} >
    <ScrollView
      style={{ flex: 1, backgroundColor: '#ffffff' }} 
      contentContainerStyle={{ 
        flexGrow: 1,
        paddingHorizontal: styles.container.paddingHorizontal,
        paddingVertical: 30, 
        alignItems: 'center', 
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={AddUserFormStyle.formBlockContainer}>
        <View style={styles.inputContainer}>
          <Text style={AddUserFormStyle.label}>Nome Completo:</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            value={nome}
            onChangeText={setNome}
            placeholderTextColor={AppColors.textoEscuro}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={AddUserFormStyle.label}>Login de Acesso:</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={AppColors.textoEscuro}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={AddUserFormStyle.label}>Senha:</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholderTextColor={AppColors.textoEscuro}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={AddUserFormStyle.label}>Nível de Acesso:</Text>
          <View style={AddUserFormStyle.pickerWrapper}>
            <Picker
              selectedValue={nivelAcesso}
              onValueChange={(itemValue) => setNivelAcesso(itemValue)}
              style={AddUserFormStyle.picker}
              dropdownIconColor={AppColors.textoEscuro}
            >
              {niveisAcesso.map((nivel) => (
                <Picker.Item key={nivel.value} label={nivel.label} value={nivel.value} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[ButtonStyles.button, { marginTop: 20 }, isSaving ? ButtonStyles.buttonDisabled : {}]}
          onPress={handleCreateUser}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={AppColors.textoPrincipal} />
          ) : (
            <Text style={ButtonStyles.buttonText}>Criar Usuário</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}