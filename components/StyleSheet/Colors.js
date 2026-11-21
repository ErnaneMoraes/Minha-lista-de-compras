import { THEMES, THEME_IDS, getThemeById } from '../../src/theme/themes';

export const LightColors = THEMES[THEME_IDS.LIGHT].colors;
export const DarkColors = THEMES[THEME_IDS.DARK].colors;
export const AppColors = { ...LightColors };

export function getThemeColors(themeOrDarkMode) {
  if (typeof themeOrDarkMode === 'string') {
    return getThemeById(themeOrDarkMode).colors;
  }
  return themeOrDarkMode ? DarkColors : LightColors;
}
