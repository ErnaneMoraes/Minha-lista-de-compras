import React from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../../components/StyleSheet/Styles';

import ButtonStyles from '../../components/StyleSheet/Button';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      console.log('Token removido com sucesso!');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    } catch (e) {
      console.error("Erro no logout:", e);
      window.alert('Não foi possível fazer logout.');
    }
  };

  const navToUsers = () => {
    navigation.navigate('UserScreen');
  };

  const navToPedidos = () => {
    window.alert(`Em breve!`); 
  };

  const navToRelatorios = () => {
    window.alert(`Em breve!`); 
  };

  const navToEstoque = () => {
    navigation.navigate('Estoque');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../components/common/assets/Logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Sistema Araleve</Text>
      <Text style={styles.message}>Login realizado com sucesso</Text>

      <View style={ButtonStyles.buttonContainer}>
        <TouchableOpacity
          style={ButtonStyles.button}
          onPress={navToPedidos}
        >
          <Text style={ButtonStyles.buttonText}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ButtonStyles.button}
          onPress={navToRelatorios}
        >
          <Text style={ButtonStyles.buttonText}>Relatórios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ButtonStyles.button}
          onPress={navToEstoque}
        >
          <Text style={ButtonStyles.buttonText}>Estoque</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ButtonStyles.button}
          onPress={navToUsers}
        >
          <Text style={ButtonStyles.buttonText}>Usuários</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={[ButtonStyles.button, ButtonStyles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={ButtonStyles.buttonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}