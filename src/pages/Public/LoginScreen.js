import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../api/Api';
import styles from '../../../components/StyleSheet/Styles';
import { AppColors } from '../../../components/StyleSheet/Colors'; 
import loginScreenStyles from '../../../components/StyleSheet/LoginStyle';
import ButtonStyles from '../../../components/StyleSheet/Button';
import ServerStatusIndicator from './ServerStatusIndicator';


export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('savedUsername');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        const rememberMePreference = await AsyncStorage.getItem('rememberMePreference');

        if (rememberMePreference === 'true') {
          setRememberMe(true);
          if (savedUsername) {
            setUsername(savedUsername);
          }
          if (savedPassword) {
            setPassword(savedPassword);
          }
        } else {
          setRememberMe(false);
        }
      } catch (e) {
        console.error('Falha ao carregar credenciais salvas.', e);
      }
    };
    loadCredentials();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Por favor, preencha o usuário e a senha.');
      return;
    }
    setIsLoading(true);
    const loginData = {
      login: username,
      senha: password,
    };
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const responseData = await response.json();

      if (response.ok) {
        const token = responseData.token;
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          console.log('Token recebido!');

          if (rememberMe) {
            await AsyncStorage.setItem('savedUsername', username);
            await AsyncStorage.setItem('savedPassword', password);
            await AsyncStorage.setItem('rememberMePreference', 'true');
          } else {
            await AsyncStorage.removeItem('savedUsername');
            await AsyncStorage.removeItem('savedPassword');
            await AsyncStorage.setItem('rememberMePreference', 'false');
          }
          navigation.replace('Home');
        } else {
          Alert.alert('Falha no Login', 'Token não recebido do servidor.');
        }
      } else {
        Alert.alert('Falha no Login', responseData.message || `Erro ${response.status}`);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../components/common/assets/Logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Login</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Usuário" 
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor={AppColors.textoEscuro}
          editable={!isLoading}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={AppColors.textoEscuro}
          editable={!isLoading}
        />
      </View>

      <View style={loginScreenStyles.rememberMeContainer}>
        <Switch
          trackColor={{ false: AppColors.verdePrincipal, true: AppColors.verdePrincipal }}
          thumbColor={AppColors.textoClaro}
          ios_backgroundColor="#3e3e3e"
          onValueChange={setRememberMe}
          value={rememberMe}
        />
        <Text style={loginScreenStyles.rememberMeText}>Lembrar credenciais</Text>
      </View>

      <TouchableOpacity
        style={[ButtonStyles.button, isLoading ? ButtonStyles.buttonDisabled : {}]} 
        onPress={handleLogin}
        disabled={isLoading} 
      >
        {isLoading ? (
          <ActivityIndicator size="large"color={AppColors.textoPrincipal} />
        ) : (
          <Text style={ButtonStyles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

    <ServerStatusIndicator />

    </View>
  );
}
