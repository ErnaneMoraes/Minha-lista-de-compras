import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getThemeColors } from '../../components/StyleSheet/Colors';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../storage/shoppingStorage';

const AppSettingsContext = createContext({
  darkMode: false,
  cameraCaptureMode: 'partial',
  cameraSource: 'native',
  colors: getThemeColors(false),
  isSettingsVisible: false,
  dataVersion: 0,
  toggleDarkMode: async () => {},
  setCameraCaptureMode: async () => {},
  setCameraSource: async () => {},
  notifyDataRestored: () => {},
  openSettings: () => {},
  closeSettings: () => {},
});

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    loadSettings().then((loaded) => {
      if (mounted && loaded) {
        setSettings(loaded);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleDarkMode = useCallback(async (nextVal) => {
    const darkMode = typeof nextVal === 'boolean' ? nextVal : !settings.darkMode;
    setSettings((prev) => ({ ...prev, darkMode }));
    await saveSettings({ darkMode });
  }, [settings.darkMode]);

  const setCameraCaptureMode = useCallback(async (mode) => {
    const cameraCaptureMode = mode === 'full' ? 'full' : 'partial';
    setSettings((prev) => ({ ...prev, cameraCaptureMode }));
    await saveSettings({ cameraCaptureMode });
  }, []);

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

  const colors = getThemeColors(settings.darkMode);

  return (
    <AppSettingsContext.Provider
      value={{
        darkMode: settings.darkMode,
        cameraCaptureMode: settings.cameraCaptureMode,
        cameraSource: settings.cameraSource || 'native',
        colors,
        isSettingsVisible,
        dataVersion,
        toggleDarkMode,
        setCameraCaptureMode,
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
