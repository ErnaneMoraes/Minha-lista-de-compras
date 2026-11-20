import 'react-native-gesture-handler';
import { TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome6 } from '@expo/vector-icons';
import * as HeaderConfig from './components/StyleSheet/headerStyle';
import { AppColors } from './components/StyleSheet/Colors';

import ListasScreen from './src/pages/Listas/ListasScreen';
import ListaDetalhesScreen from './src/pages/Listas/ListaDetalhesScreen';
import EstoqueScreen from './src/pages/Estoque/EstoqueScreen';
import RelatorioScreen from './src/pages/RelatorioScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MinhasListas"
          screenOptions={HeaderConfig.defaultHeaderConfig}
        >
          <Stack.Screen
            name="MinhasListas"
            component={ListasScreen}
            options={({ navigation }) => ({
              title: 'Minhas Listas de Compras',
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Estoque')}
                    style={{ padding: 8, marginRight: 4 }}
                    accessibilityLabel="Abrir Despensa"
                  >
                    <FontAwesome6
                      name="boxes-stacked"
                      size={18}
                      color={AppColors.textoPrincipal}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Relatorio')}
                    style={{ padding: 8 }}
                    accessibilityLabel="Abrir Resumo de Gastos"
                  >
                    <FontAwesome6
                      name="chart-pie"
                      size={18}
                      color={AppColors.textoPrincipal}
                    />
                  </TouchableOpacity>
                </View>
              ),
            })}
          />
          <Stack.Screen
            name="ListaDetalhes"
            component={ListaDetalhesScreen}
            options={{ title: 'Lista de Compras' }}
          />
          <Stack.Screen
            name="Estoque"
            component={EstoqueScreen}
            options={{ title: 'Despensa' }}
          />
          <Stack.Screen
            name="Relatorio"
            component={RelatorioScreen}
            options={{ title: 'Resumo de Gastos' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
