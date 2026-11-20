import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../../components/StyleSheet/Styles'; 

export default function EstoqueList() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de produtos em estoque</Text>
    </View>
  );
}
