import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from '../../../components/StyleSheet/Colors';

import EstoqueList from './EstoqueList';
import AddEstoqueItem from './AddEstoqueItem';

const Tab = createBottomTabNavigator();

function Routes() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AppColors.principal,
        tabBarInactiveTintColor: AppColors.textMuted,
      }}
    >
      <Tab.Screen
        name="EstoqueList"
        component={EstoqueList}
        options={{
          title: 'Minha Despensa',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="box-archive" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddEstoqueItem"
        component={AddEstoqueItem}
        options={{
          title: 'Adicionar à Despensa',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="plus" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default Routes;
