import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome6 } from '@expo/vector-icons';

import { View, Text } from 'react-native';
import styles from '../../../components/StyleSheet/Styles';

import UserList from './UserList';
import AddUserForm from './AddUserForm';

const Tab = createBottomTabNavigator();

function Routes() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="UserList"
        component={UserList}
        options={{ headerShown: false, title:'Lista de usuários',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="user-gear" size={size} color={color} />
          )
         }}
      />
      <Tab.Screen
        name="AddUserForm"
        component={AddUserForm}
        options={{ headerShown: false, title: 'Adicionar usuários',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="user-plus" size={size} color={color} />
          )
         }}
      />
    </Tab.Navigator>
  );
} 

export default Routes;
