import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as HeaderConfig from './components/StyleSheet/headerStyle';

import LoginScreen from './src/pages/Public/LoginScreen';
import HomeScreen from './src/pages/HomeScreen';
import PedidoScreen from './src/pages/PedidoScreen';
import RelatorioScreen from './src/pages/RelatorioScreen';
import EstoqueScreen from './src/pages/Estoque/EstoqueScreen';
import UserScreen from './src/pages/User/UserScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={HeaderConfig.defaultHeaderConfig}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Pedido"
          component={PedidoScreen}
          options={{
            title: 'Pedidos',
          }}
        />
        <Stack.Screen
          name="Relatorio"
          component={RelatorioScreen}
          options={{
            title: 'Relatórios',
          }}
        />
        <Stack.Screen
          name="Estoque"
          component={EstoqueScreen}
          options={{
            title: 'Estoque',
          }}
        />
        <Stack.Screen
          name="UserScreen"
          component={UserScreen}
          options={{
            title: 'Usuários',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}