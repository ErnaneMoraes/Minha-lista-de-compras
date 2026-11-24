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
  normalizeThemeId,
} from '../theme/themes';
import {
  RETENTION_DAY_OPTIONS,
  DEFAULT_RETENTION_DAYS,
} from '../services/tagPhotoStorage';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  loadCustomThemeConfig,
  saveCustomThemeConfig,
  runTagPhotoRetentionCleanup,
} from '../storage/shoppingStorage';

const defaultTheme = getThemeById(THEME_IDS.LIGHT);

const AppSettingsContext = createContext({
  themeId: THEME_IDS.LIGHT,
  theme: defaultTheme,
  customThemeConfig: DEFAULT_CUSTOM_THEME_CONFIG,
  darkMode: false,
  cameraCaptureMode: 'partial',
  cameraSource: 'native',
  cameraSoundEnabled: true,
  saveTagPhotos: true,
  autoDeleteTagPhotos: false,
  tagPhotoRetentionDays: DEFAULT_RETENTION_DAYS,
  colors: defaultTheme.colors,
  shape: defaultTheme.shape,
  cardShadow: defaultTheme.cardShadow || null,
  typography: defaultTheme.typography || null,
  isMaterialYouTheme: false,
  isGoogleMapsTheme: false,
  radiusCard: defaultTheme.shape.radiusCard,
  radiusButton: defaultTheme.shape.radiusButton,
  radiusInput: defaultTheme.shape.radiusInput,
  borderWidth: defaultTheme.shape.borderWidth,
  isSettingsVisible: false,
  dataVersion: 0,
  setThemeId: async () => {},
  updateCustomThemeConfig: async () => {},
  updatePhotoSettings: async () => {},
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
      async ([loadedSettings, loadedCustom]) => {
        if (!mounted) return;
        if (loadedSettings) {
          setSettings(loadedSettings);
          if (loadedSettings.autoDeleteTagPhotos) {
            try {
              const removed = await runTagPhotoRetentionCleanup(
                loadedSettings.tagPhotoRetentionDays
              );
              if (mounted && removed > 0) {
                setDataVersion((v) => v + 1);
              }
            } catch {
              // ignore cleanup errors on boot
            }
          }
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
      const normalized = normalizeThemeId(nextThemeId);
      const safeId = isValidThemeId(normalized)
        ? normalized
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
    setCustomThemeConfig((prev) => ({ ...prev, ...(partial || {}) }));
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

  const updatePhotoSettings = useCallback(async (partial) => {
    const patch = {};
    if (partial?.cameraSoundEnabled !== undefined) {
      patch.cameraSoundEnabled = Boolean(partial.cameraSoundEnabled);
    }
    if (partial?.saveTagPhotos !== undefined) {
      patch.saveTagPhotos = Boolean(partial.saveTagPhotos);
    }
    if (partial?.autoDeleteTagPhotos !== undefined) {
      patch.autoDeleteTagPhotos = Boolean(partial.autoDeleteTagPhotos);
    }
    if (partial?.tagPhotoRetentionDays !== undefined) {
      const n = Number(partial.tagPhotoRetentionDays);
      patch.tagPhotoRetentionDays = RETENTION_DAY_OPTIONS.includes(n)
        ? n
        : DEFAULT_RETENTION_DAYS;
    }

    let mergedNext = null;
    setSettings((prev) => {
      mergedNext = { ...prev, ...patch };
      return mergedNext;
    });
    const saved = await saveSettings(patch);
    const effective = saved || mergedNext || DEFAULT_SETTINGS;

    if (effective.autoDeleteTagPhotos) {
      try {
        const removed = await runTagPhotoRetentionCleanup(
          effective.tagPhotoRetentionDays
        );
        if (removed > 0) {
          setDataVersion((v) => v + 1);
        }
      } catch {
        // ignore cleanup errors
      }
    }
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
        cameraSoundEnabled:
          settings.cameraSoundEnabled !== undefined
            ? Boolean(settings.cameraSoundEnabled)
            : true,
        saveTagPhotos:
          settings.saveTagPhotos !== undefined
            ? Boolean(settings.saveTagPhotos)
            : true,
        autoDeleteTagPhotos: Boolean(settings.autoDeleteTagPhotos),
        tagPhotoRetentionDays:
          settings.tagPhotoRetentionDays || DEFAULT_RETENTION_DAYS,
        colors: activeTheme.colors,
        shape: activeTheme.shape,
        cardShadow: activeTheme.cardShadow || null,
        typography: activeTheme.typography || null,
        isMaterialYouTheme: activeTheme.id === THEME_IDS.MATERIAL_YOU,
        isGoogleMapsTheme: activeTheme.id === THEME_IDS.MATERIAL_YOU,
        radiusCard: activeTheme.shape.radiusCard,
        radiusButton: activeTheme.shape.radiusButton,
        radiusInput: activeTheme.shape.radiusInput,
        borderWidth: activeTheme.shape.borderWidth,
        isSettingsVisible,
        dataVersion,
        setThemeId,
        updateCustomThemeConfig,
        updatePhotoSettings,
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
