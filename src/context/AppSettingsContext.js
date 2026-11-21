import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  THEME_IDS,
  DEFAULT_CUSTOM_THEME_CONFIG,
  getThemeById,
  isValidThemeId,
} from '../theme/themes';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadCustomThemeConfig,
  saveCustomThemeConfig,
} from '../storage/shoppingStorage';

const defaultTheme = getThemeById(THEME_IDS.LIGHT);

const AppSettingsContext = createContext({
  themeId: THEME_IDS.LIGHT,
  theme: defaultTheme,
  customThemeConfig: DEFAULT_CUSTOM_THEME_CONFIG,
  darkMode: false,
  cameraCaptureMode: 'partial',
  cameraSource: 'native',
  colors: defaultTheme.colors,
  shape: defaultTheme.shape,
  radiusCard: defaultTheme.shape.radiusCard,
  radiusButton: defaultTheme.shape.radiusButton,
  radiusInput: defaultTheme.shape.radiusInput,
  borderWidth: defaultTheme.shape.borderWidth,
  isSettingsVisible: false,
  dataVersion: 0,
  setThemeId: async () => {},
  updateCustomThemeConfig: async () => {},
  toggleDarkMode: async () => {},
  setCameraSource: async () => {},
  notifyDataRestored: () => {},
  openSettings: () => {},
  closeSettings: () => {},
});

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [customThemeConfig, setCustomThemeConfig] = useState(
    DEFAULT_CUSTOM_THEME_CONFIG
  );
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadSettings(), loadCustomThemeConfig()]).then(
      ([loadedSettings, loadedCustom]) => {
        if (!mounted) return;
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
        if (loadedCustom) {
          setCustomThemeConfig(loadedCustom);
        }
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeId = useCallback(
    async (nextThemeId) => {
      const safeId = isValidThemeId(nextThemeId)
        ? nextThemeId
        : THEME_IDS.LIGHT;
      const nextTheme = getThemeById(safeId, customThemeConfig);
      setSettings((prev) => ({
        ...prev,
        themeId: safeId,
        darkMode: nextTheme.isDark,
      }));
      await saveSettings({ themeId: safeId, darkMode: nextTheme.isDark });
    },
    [customThemeConfig]
  );

  const updateCustomThemeConfig = useCallback(async (partial) => {
    let merged = null;
    setCustomThemeConfig((prev) => {
      merged = { ...prev, ...(partial || {}) };
      return merged;
    });
    const saved = await saveCustomThemeConfig(partial);
    const nextTheme = getThemeById(THEME_IDS.CUSTOM, saved);
    setSettings((prev) => ({
      ...prev,
      themeId: THEME_IDS.CUSTOM,
      darkMode: nextTheme.isDark,
    }));
    await saveSettings({
      themeId: THEME_IDS.CUSTOM,
      darkMode: nextTheme.isDark,
    });
  }, []);

  const toggleDarkMode = useCallback(
    async (nextVal) => {
      const goDark =
        typeof nextVal === 'boolean' ? nextVal : !settings.darkMode;
      const nextThemeId = goDark ? THEME_IDS.DARK : THEME_IDS.LIGHT;
      await setThemeId(nextThemeId);
    },
    [settings.darkMode, setThemeId]
  );

  const setCameraSource = useCallback(async (source) => {
    const cameraSource = source === 'inapp' ? 'inapp' : 'native';
    setSettings((prev) => ({ ...prev, cameraSource }));
    await saveSettings({ cameraSource });
  }, []);

  const notifyDataRestored = useCallback((restoredSettings) => {
    if (restoredSettings && typeof restoredSettings === 'object') {
      setSettings((prev) => ({ ...prev, ...restoredSettings }));
    }
    setDataVersion((v) => v + 1);
  }, []);

  const openSettings = useCallback(() => setIsSettingsVisible(true), []);
  const closeSettings = useCallback(() => setIsSettingsVisible(false), []);

  const activeTheme = useMemo(
    () => getThemeById(settings.themeId, customThemeConfig),
    [settings.themeId, customThemeConfig]
  );

  return (
    <AppSettingsContext.Provider
      value={{
        themeId: activeTheme.id,
        theme: activeTheme,
        customThemeConfig,
        darkMode: activeTheme.isDark,
        cameraCaptureMode: 'partial',
        cameraSource: settings.cameraSource || 'native',
        colors: activeTheme.colors,
        shape: activeTheme.shape,
        radiusCard: activeTheme.shape.radiusCard,
        radiusButton: activeTheme.shape.radiusButton,
        radiusInput: activeTheme.shape.radiusInput,
        borderWidth: activeTheme.shape.borderWidth,
        isSettingsVisible,
        dataVersion,
        setThemeId,
        updateCustomThemeConfig,
        toggleDarkMode,
        setCameraSource,
        notifyDataRestored,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
