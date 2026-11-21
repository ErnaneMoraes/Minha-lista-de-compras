import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  FontAwesome6,
  FontAwesome,
  Ionicons,
  MaterialIcons,
} from '@expo/vector-icons';
import { AppColors } from './components/StyleSheet/Colors';
import {
  AppSettingsProvider,
  useAppSettings,
} from './src/context/AppSettingsContext';
import SettingsModal from './components/modals/ShoppingModals/SettingsModal';

import ListasScreen from './src/pages/Listas/ListasScreen';
import ListaDetalhesScreen from './src/pages/Listas/ListaDetalhesScreen';
import LembretesScreen from './src/pages/Lembretes/LembretesScreen';
import RelatorioScreen from './src/pages/RelatorioScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HeaderSettingsButton() {
  const { openSettings, colors } = useAppSettings();
  return (
    <TouchableOpacity
      onPress={openSettings}
      style={{ paddingHorizontal: 14, paddingVertical: 8 }}
      accessibilityLabel="Abrir Configurações"
    >
      <FontAwesome6 name="gear" size={19} color={colors.textoPrincipal} />
    </TouchableOpacity>
  );
}

function MainTabs() {
  const { colors } = useAppSettings();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(7, insets.bottom);

  return (
    <Tab.Navigator
      initialRouteName="MinhasComprasTab"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textoPrincipal,
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 19,
        },
        headerRight: () => <HeaderSettingsButton />,
        tabBarActiveTintColor: colors.principal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderColor,
          height: 54 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="MinhasComprasTab"
        component={ListasScreen}
        options={{
          title: 'Minhas Compras',
          tabBarLabel: 'Minhas Compras',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="cart-shopping" size={size - 3} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="LembretesTab"
        component={LembretesScreen}
        options={{
          title: 'Lista de Lembrete',
          tabBarLabel: 'Lembretes',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="clipboard-check" size={size - 3} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ResumoGastosTab"
        component={RelatorioScreen}
        options={{
          title: 'Resumo de Gastos',
          tabBarLabel: 'Resumo de Gastos',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="chart-pie" size={size - 3} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { darkMode, colors } = useAppSettings();

  const navTheme = {
    ...(darkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(darkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.principal,
      background: colors.background,
      card: colors.card,
      text: colors.textoEscuro,
      border: colors.borderColor,
    },
  };

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="HomeTabs"
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: colors.textoPrincipal,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 19,
            },
            headerRight: () => <HeaderSettingsButton />,
          }}
        >
          <Stack.Screen
            name="HomeTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ListaDetalhes"
            component={ListaDetalhesScreen}
            options={{ title: 'Lista de Compras' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <SettingsModal />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome6.font,
    ...FontAwesome.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: AppColors.background,
          }}
        >
          <ActivityIndicator size="large" color={AppColors.principal} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <RootNavigator />
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
}
