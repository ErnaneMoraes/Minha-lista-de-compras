import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome6 } from '@expo/vector-icons';

import { View, Text } from 'react-native';
import styles from '../../../components/StyleSheet/Styles'; 

import EstoqueList from './EstoqueList';
import AddEstoqueItem from './AddEstoqueItem';

const Tab = createBottomTabNavigator();

function Routes() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="EstoqueList"
        component={EstoqueList}
        options={{ headerShown: false, title:'Lista de usuários',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="box-archive" size={size} color={color} />
          )
         }}
      />
      <Tab.Screen
        name="AddEstoqueItem"
        component={AddEstoqueItem}
        options={{ headerShown: false, title: 'Adicionar itens ao estoque',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="boxes-packing" size={size} color={color} />
          )
         }}
      />
    </Tab.Navigator>
  );
} 

export default Routes;
