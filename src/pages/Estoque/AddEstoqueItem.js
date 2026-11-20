import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../../components/StyleSheet/Styles'; 

export default function AddEstoqueItem() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar item ao estoque</Text>
    </View>
  );
}
