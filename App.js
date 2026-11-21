import 'react-native-gesture-handler';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { File } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
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
import { FontAwesome6 } from '@expo/vector-icons';
import { AppColors } from './components/StyleSheet/Colors';
import {
  AppSettingsProvider,
  useAppSettings,
} from './src/context/AppSettingsContext';
import SettingsModal from './components/modals/ShoppingModals/SettingsModal';
import ConfirmModal from './components/modals/ShoppingModals/ConfirmModal';
import {
  validateBackupPayload,
  importBackupPayload,
  formatDateBR,
} from './src/storage/shoppingStorage';

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

function HeaderTitleWithIcon({ icon, title }) {
  const { colors } = useAppSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <FontAwesome6
        name={icon}
        size={18}
        color={colors.textoPrincipal}
        style={{ marginRight: 9 }}
      />
      <Text
        style={{
          color: colors.textoPrincipal,
          fontWeight: 'bold',
          fontSize: 19,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
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
          headerTitle: () => (
            <HeaderTitleWithIcon icon="cart-shopping" title="Minhas Compras" />
          ),
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
          headerTitle: () => (
            <HeaderTitleWithIcon
              icon="clipboard-check"
              title="Lista de Lembrete"
            />
          ),
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
          headerTitle: () => (
            <HeaderTitleWithIcon icon="chart-pie" title="Resumo de Gastos" />
          ),
          tabBarLabel: 'Resumo de Gastos',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="chart-pie" size={size - 3} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

async function readExternalJsonUri(uri) {
  let tempCopyUri = null;
  try {
    if (
      Platform.OS !== 'web' &&
      LegacyFileSystem.cacheDirectory &&
      /^content:\/\//i.test(uri)
    ) {
      tempCopyUri = `${LegacyFileSystem.cacheDirectory}ext_backup_${Date.now()}.json`;
      await LegacyFileSystem.copyAsync({ from: uri, to: tempCopyUri });
      const text = await LegacyFileSystem.readAsStringAsync(tempCopyUri, {
        encoding: 'utf8',
      });
      return text;
    }
  } catch {
    // Fallback to direct read below
  } finally {
    if (tempCopyUri) {
      LegacyFileSystem.deleteAsync(tempCopyUri, { idempotent: true }).catch(
        () => {}
      );
    }
  }

  try {
    return await LegacyFileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
  } catch {
    try {
      const file = new File(uri);
      return await file.text();
    } catch {
      const resp = await fetch(uri);
      return await resp.text();
    }
  }
}

function RootNavigator() {
  const { darkMode, colors, notifyDataRestored } = useAppSettings();
  const [externalBackupPending, setExternalBackupPending] = useState(null);
  const [externalFeedbackModal, setExternalFeedbackModal] = useState(null);
  const lastHandledUrlRef = useRef('');

  const handleIncomingExternalUrl = useCallback(async (url) => {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    if (
      !trimmed ||
      /^exp(s)?:\/\//i.test(trimmed) ||
      /^https?:\/\/localhost/i.test(trimmed) ||
      /^https?:\/\/127\.0\.0\.1/i.test(trimmed) ||
      /^https?:\/\/192\.168\./i.test(trimmed) ||
      /^https?:\/\/10\./i.test(trimmed)
    ) {
      return;
    }

    if (!/^(content|file):\/\//i.test(trimmed)) {
      return;
    }

    if (lastHandledUrlRef.current === trimmed) {
      return;
    }
    lastHandledUrlRef.current = trimmed;

    try {
      const content = await readExternalJsonUri(trimmed);
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        setExternalFeedbackModal({
          type: 'error',
          title: 'Arquivo Inválido',
          message:
            'O arquivo selecionado não possui um formato JSON válido do aplicativo Minha Lista de Compras.',
        });
        return;
      }

      const validation = validateBackupPayload(parsed);
      if (!validation.valid) {
        setExternalFeedbackModal({
          type: 'error',
          title: 'Backup Incompatível',
          message:
            validation.error ||
            'Este arquivo JSON não é um backup válido do aplicativo Minha Lista de Compras.',
        });
        return;
      }

      setExternalBackupPending({
        payload: parsed,
        summary: validation.summary,
      });
    } catch {
      setExternalFeedbackModal({
        type: 'error',
        title: 'Erro ao Ler Arquivo',
        message:
          'Não foi possível ler o arquivo JSON externo. Tente importá-lo pelo menu de Configurações do aplicativo.',
      });
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          handleIncomingExternalUrl(initialUrl);
        }
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', (event) => {
      if (event?.url) {
        lastHandledUrlRef.current = '';
        handleIncomingExternalUrl(event.url);
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, [handleIncomingExternalUrl]);

  const buildExternalRestoreMessage = () => {
    if (!externalBackupPending?.summary) return '';
    const s = externalBackupPending.summary;
    const datePart = s.exportedAt ? ` de ${formatDateBR(s.exportedAt)}` : '';

    if (s.detectedType === 'lists') {
      return `Arquivo externo identificado: Backup de Apenas Listas de Compras${datePart} (${
        s.listCount
      } ${
        s.listCount === 1 ? 'lista' : 'listas'
      }). Suas listas de lembretes atuais serão mantidas. Deseja importar agora?`;
    }
    if (s.detectedType === 'reminders') {
      return `Arquivo externo identificado: Backup de Apenas Lembretes${datePart} (${
        s.reminderListCount
      } ${
        s.reminderListCount === 1
          ? 'lista de lembretes'
          : 'listas de lembretes'
      } com ${s.reminderItemCount} ${
        s.reminderItemCount === 1 ? 'item' : 'itens'
      }). Suas listas de compras atuais serão mantidas. Deseja importar agora?`;
    }
    return `Arquivo externo identificado: Backup Completo${datePart} contendo ${
      s.listCount
    } ${
      s.listCount === 1 ? 'lista de compras' : 'listas de compras'
    } e ${s.reminderListCount} ${
      s.reminderListCount === 1 ? 'lista de lembretes' : 'listas de lembretes'
    }. Deseja importar agora?`;
  };

  const handleConfirmExternalRestore = async () => {
    if (!externalBackupPending?.payload) return;
    try {
      const restored = await importBackupPayload(externalBackupPending.payload);
      notifyDataRestored();
      setExternalBackupPending(null);

      let msg =
        'Backup completo importado com sucesso! Suas listas de compras e lembretes foram atualizados.';
      if (restored.detectedType === 'lists') {
        msg = `Importação concluída: ${restored.listCount} ${
          restored.listCount === 1 ? 'lista de compras' : 'listas de compras'
        } restauradas (lembretes atuais preservados).`;
      } else if (restored.detectedType === 'reminders') {
        msg = `Importação concluída: ${restored.reminderListCount} ${
          restored.reminderListCount === 1
            ? 'lista de lembretes'
            : 'listas de lembretes'
        } restauradas (listas de compras atuais preservadas).`;
      }

      setExternalFeedbackModal({
        type: 'success',
        title: 'Backup Importado',
        message: msg,
      });
    } catch (err) {
      setExternalBackupPending(null);
      setExternalFeedbackModal({
        type: 'error',
        title: 'Falha na Importação',
        message: err?.message || 'Não foi possível restaurar os dados do arquivo.',
      });
    }
  };

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

      <ConfirmModal
        visible={Boolean(externalBackupPending)}
        title="Importar Backup JSON"
        message={buildExternalRestoreMessage()}
        confirmLabel="Importar"
        onCancel={() => setExternalBackupPending(null)}
        onConfirm={handleConfirmExternalRestore}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={Boolean(externalFeedbackModal)}
        onRequestClose={() => setExternalFeedbackModal(null)}
      >
        <View style={appStyles.feedbackOverlay}>
          <View
            style={[
              appStyles.feedbackCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View
              style={[
                appStyles.feedbackIconCircle,
                {
                  backgroundColor:
                    externalFeedbackModal?.type === 'error'
                      ? colors.dangerSoft
                      : colors.verdeSuave,
                },
              ]}
            >
              <FontAwesome6
                name={
                  externalFeedbackModal?.type === 'error'
                    ? 'circle-exclamation'
                    : 'circle-check'
                }
                size={24}
                color={
                  externalFeedbackModal?.type === 'error'
                    ? colors.logoutRed
                    : colors.principal
                }
              />
            </View>
            <Text
              style={[appStyles.feedbackTitle, { color: colors.textoEscuro }]}
            >
              {externalFeedbackModal?.title}
            </Text>
            <Text style={[appStyles.feedbackMsg, { color: colors.textMuted }]}>
              {externalFeedbackModal?.message}
            </Text>
            <TouchableOpacity
              onPress={() => setExternalFeedbackModal(null)}
              style={[
                appStyles.feedbackBtn,
                { backgroundColor: colors.principal },
              ]}
            >
              <Text
                style={[
                  appStyles.feedbackBtnText,
                  { color: colors.textoPrincipal },
                ]}
              >
                Entendi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const appStyles = StyleSheet.create({
  feedbackOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  feedbackIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  feedbackMsg: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  feedbackBtn: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...FontAwesome6.font,
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
