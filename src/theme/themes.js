export const THEME_IDS = {
  LIGHT: 'light',
  DARK: 'dark',
  AMOLED: 'amoled',
  ROSE_QUARTZ: 'rose_quartz',
  OCEAN_BLUE: 'ocean_blue',
  MATERIAL_YOU: 'material_you',
  GOOGLE_MAPS: 'material_you', // Alias legado para compatibilidade com AsyncStorage
  NEON_MATRIX: 'neon_matrix',
  CYBERPUNK_NEON: 'cyberpunk_neon',
  CUSTOM: 'custom',
};

export const DEFAULT_CUSTOM_THEME_CONFIG = {
  baseMode: 'light', // 'light' | 'dark' | 'amoled'
  primaryColor: '#15803D',
  borderStyle: 'moderate', // 'square' | 'moderate' | 'rounded'
  borderThickness: 'thin', // 'thin' | 'bold'
};

export const CUSTOM_BASE_MODES = [
  {
    id: 'light',
    label: 'Claro',
    bg: '#F6F8F7',
    card: '#FFFFFF',
    surfaceMuted: '#EDF1EF',
    inputBg: '#FFFFFF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#CBD5E1',
    disabledBg: '#CBD5E1',
    isDark: false,
  },
  {
    id: 'dark',
    label: 'Escuro',
    bg: '#121514',
    card: '#1E2220',
    surfaceMuted: '#282D2B',
    inputBg: '#232826',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    border: '#334155',
    disabledBg: '#334155',
    isDark: true,
  },
  {
    id: 'amoled',
    label: 'Preto AMOLED',
    bg: '#000000',
    card: '#121212',
    surfaceMuted: '#1C1C1C',
    inputBg: '#181818',
    text: '#F8FAFC',
    textMuted: '#9CA3AF',
    border: '#262626',
    disabledBg: '#2E2E2E',
    isDark: true,
  },
];

export const CUSTOM_ACCENT_PALETTE = [
  { id: 'green', label: 'Verde', hex: '#15803D', headerHex: '#15803D', softLight: '#DCFCE7', softDark: '#10351E' },
  { id: 'emerald', label: 'Esmeralda', hex: '#059669', headerHex: '#047857', softLight: '#D1FAE5', softDark: '#063B27' },
  { id: 'blue', label: 'Azul', hex: '#1565C0', headerHex: '#1565C0', softLight: '#E3F2FD', softDark: '#0D2B4E' },
  { id: 'cyan', label: 'Ciano', hex: '#0284C7', headerHex: '#0369A1', softLight: '#E0F2FE', softDark: '#0A3147' },
  { id: 'indigo', label: 'Índigo', hex: '#4338CA', headerHex: '#3730A3', softLight: '#E0E7FF', softDark: '#1E1B4B' },
  { id: 'purple', label: 'Roxo', hex: '#7C3AED', headerHex: '#6D28D9', softLight: '#EDE9FE', softDark: '#2E1065' },
  { id: 'pink', label: 'Rosa', hex: '#D81B60', headerHex: '#C2185B', softLight: '#FCE4EC', softDark: '#3F1226' },
  { id: 'red', label: 'Vermelho', hex: '#DC2626', headerHex: '#B91C1C', softLight: '#FEE2E2', softDark: '#3F1515' },
  { id: 'orange', label: 'Laranja', hex: '#EA580C', headerHex: '#C2410C', softLight: '#FFEDD5', softDark: '#431407' },
  { id: 'amber', label: 'Âmbar', hex: '#D97706', headerHex: '#B45309', softLight: '#FEF3C7', softDark: '#3D2607' },
  { id: 'teal', label: 'Turquesa', hex: '#0F766E', headerHex: '#115E59', softLight: '#CCFBF1', softDark: '#0A3330' },
  { id: 'slate', label: 'Grafite', hex: '#334155', headerHex: '#1E293B', softLight: '#E2E8F0', softDark: '#1E293B' },
];

export const CUSTOM_BORDER_STYLES = [
  { id: 'square', label: 'Quadrado', radiusCard: 4, radiusButton: 4, radiusInput: 3 },
  { id: 'moderate', label: 'Moderado', radiusCard: 12, radiusButton: 10, radiusInput: 8 },
  { id: 'rounded', label: 'Bem Arredondado', radiusCard: 20, radiusButton: 18, radiusInput: 14 },
];

export const CUSTOM_BORDER_THICKNESS = [
  { id: 'thin', label: 'Fino', borderWidth: 1 },
  { id: 'bold', label: 'Destacado', borderWidth: 1.5 },
];

function getContrastingTextColor(hex) {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? '#0F172A' : '#FFFFFF';
}

const SOFT_SHAPE = {
  radiusCard: 14,
  radiusButton: 12,
  radiusInput: 10,
  borderWidth: 1,
};

const EXTRA_ROUNDED_SHAPE = {
  radiusCard: 18,
  radiusButton: 16,
  radiusInput: 12,
  borderWidth: 1,
};

const SHARP_TECH_SHAPE = {
  radiusCard: 4,
  radiusButton: 4,
  radiusInput: 3,
  borderWidth: 1.5,
};

const MATERIAL_YOU_SHAPE = {
  radiusCard: 18,
  radiusButton: 24,
  radiusInput: 24,
  borderWidth: 1,
};

const DEFAULT_TYPOGRAPHY = {
  headingWeight: 'bold',
  buttonWeight: 'bold',
  letterSpacing: 0,
  priceFontVariant: ['tabular-nums'],
};

const MATERIAL_YOU_TYPOGRAPHY = {
  headingWeight: '600',
  buttonWeight: '600',
  letterSpacing: 0.2,
  priceFontVariant: ['tabular-nums'],
};

const MATERIAL_YOU_SHADOW = {
  shadowColor: '#202124',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

function buildTheme({
  id,
  name,
  subtitle,
  isDark,
  statusBarStyle = 'light',
  previewBg,
  previewPrimary,
  shape,
  palette,
  cardShadow = null,
  typography = DEFAULT_TYPOGRAPHY,
}) {
  const colors = {
    ...palette,
    // Semantic aliases
    surface: palette.card,
    primaryText: palette.textoPrincipal,
    text: palette.textoEscuro,
    textSecondary: palette.textMuted,
    border: palette.borderColor,
    danger: palette.logoutRed,
    badgeBg: palette.verdeSuave,
    badgeText: palette.badgeText || palette.principal,
    statusBarStyle,
  };

  return {
    id,
    name,
    subtitle,
    isDark,
    statusBarStyle,
    previewBg,
    previewPrimary,
    shape,
    cardShadow,
    typography,
    colors,
  };
}

export const THEMES = {
  [THEME_IDS.LIGHT]: buildTheme({
    id: THEME_IDS.LIGHT,
    name: 'Claro Padrão',
    subtitle: 'Verde e branco clássico',
    isDark: false,
    previewBg: '#F8FAFC',
    previewPrimary: '#15803D',
    shape: SOFT_SHAPE,
    palette: {
      principal: '#15803D',
      primary: '#15803D',
      verdePrincipal: '#16A34A',
      verdeSuave: '#DCFCE7',
      success: '#16A34A',
      accent: '#0284C7',
      accentSoft: '#E0F2FE',
      warning: '#D97706',
      warningSoft: '#FEF3C7',
      warningText: '#92400E',
      background: '#F8FAFC',
      card: '#FFFFFF',
      surfaceMuted: '#F1F5F9',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F1F5F9',
      textoEscuro: '#1E293B',
      darkText: '#1E293B',
      textMuted: '#64748B',
      inputBackground: '#FFFFFF',
      borderColor: '#CBD5E1',
      disabledBackground: '#CBD5E1',
      logoutRed: '#DC2626',
      dangerSoft: '#FEE2E2',
      dangerText: '#991B1B',
      budgetWarningBg: '#FEF3C7',
      budgetWarningBorder: '#F59E0B',
      budgetWarningText: '#92400E',
      budgetDangerBg: '#FEE2E2',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: '#991B1B',
    },
  }),

  [THEME_IDS.DARK]: buildTheme({
    id: THEME_IDS.DARK,
    name: 'Noturno Padrão',
    subtitle: 'Grafite suave e esmeralda',
    isDark: true,
    previewBg: '#121212',
    previewPrimary: '#16A34A',
    shape: SOFT_SHAPE,
    palette: {
      principal: '#16A34A',
      primary: '#15803D',
      verdePrincipal: '#22C55E',
      verdeSuave: '#143321',
      success: '#22C55E',
      accent: '#38BDF8',
      accentSoft: '#0C4A6E',
      warning: '#F59E0B',
      warningSoft: '#3D3214',
      warningText: '#FDE68A',
      background: '#121212',
      card: '#1E1E1E',
      surfaceMuted: '#2A2A2A',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F1F5F9',
      textoEscuro: '#F1F5F9',
      darkText: '#F1F5F9',
      textMuted: '#94A3B8',
      inputBackground: '#262626',
      borderColor: '#334155',
      disabledBackground: '#334155',
      logoutRed: '#EF4444',
      dangerSoft: '#3F1D1D',
      dangerText: '#FCA5A5',
      budgetWarningBg: '#3D3214',
      budgetWarningBorder: '#D97706',
      budgetWarningText: '#FDE68A',
      budgetDangerBg: '#3F1D1D',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: '#FCA5A5',
    },
  }),

  [THEME_IDS.AMOLED]: buildTheme({
    id: THEME_IDS.AMOLED,
    name: 'AMOLED Escuro',
    subtitle: 'Preto puro com esmeralda',
    isDark: true,
    previewBg: '#000000',
    previewPrimary: '#10B981',
    shape: SOFT_SHAPE,
    palette: {
      principal: '#10B981',
      primary: '#059669',
      verdePrincipal: '#34D399',
      verdeSuave: '#063B27',
      success: '#10B981',
      accent: '#38BDF8',
      accentSoft: '#082F49',
      warning: '#F59E0B',
      warningSoft: '#33250A',
      warningText: '#FDE68A',
      background: '#000000',
      card: '#121212',
      surfaceMuted: '#1C1C1C',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F8FAFC',
      textoEscuro: '#F8FAFC',
      darkText: '#F8FAFC',
      textMuted: '#9CA3AF',
      inputBackground: '#181818',
      borderColor: '#262626',
      disabledBackground: '#2E2E2E',
      logoutRed: '#F87171',
      dangerSoft: '#3B1515',
      dangerText: '#FCA5A5',
      budgetWarningBg: '#33250A',
      budgetWarningBorder: '#D97706',
      budgetWarningText: '#FDE68A',
      budgetDangerBg: '#3B1515',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: '#FCA5A5',
    },
  }),

  [THEME_IDS.ROSE_QUARTZ]: buildTheme({
    id: THEME_IDS.ROSE_QUARTZ,
    name: 'Rose Quartz',
    subtitle: 'Rosa suave e cantos macios',
    isDark: false,
    previewBg: '#FFF8FA',
    previewPrimary: '#D81B60',
    shape: EXTRA_ROUNDED_SHAPE,
    palette: {
      principal: '#D81B60',
      primary: '#C2185B',
      verdePrincipal: '#E91E63',
      verdeSuave: '#FCE4EC',
      success: '#16A34A',
      accent: '#AD1457',
      accentSoft: '#F8BBD0',
      warning: '#D97706',
      warningSoft: '#FEF3C7',
      warningText: '#92400E',
      background: '#FFF8FA',
      card: '#FFFFFF',
      surfaceMuted: '#FCEEF3',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#FFF8FA',
      textoEscuro: '#2D1420',
      darkText: '#2D1420',
      textMuted: '#7A5967',
      inputBackground: '#FFFFFF',
      borderColor: '#F3CEDB',
      disabledBackground: '#E7C8D3',
      logoutRed: '#C62828',
      dangerSoft: '#FFEBEE',
      dangerText: '#991B1B',
      budgetWarningBg: '#FEF3C7',
      budgetWarningBorder: '#F59E0B',
      budgetWarningText: '#92400E',
      budgetDangerBg: '#FFEBEE',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: '#991B1B',
    },
  }),

  [THEME_IDS.OCEAN_BLUE]: buildTheme({
    id: THEME_IDS.OCEAN_BLUE,
    name: 'Azul Oceano',
    subtitle: 'Azul gelo e oceano',
    isDark: false,
    previewBg: '#F4F8FB',
    previewPrimary: '#1565C0',
    shape: SOFT_SHAPE,
    palette: {
      principal: '#1565C0',
      primary: '#1565C0',
      verdePrincipal: '#1E88E5',
      verdeSuave: '#E3F2FD',
      success: '#16A34A',
      accent: '#0288D1',
      accentSoft: '#E1F5FE',
      warning: '#D97706',
      warningSoft: '#FEF3C7',
      warningText: '#92400E',
      background: '#F4F8FB',
      card: '#FFFFFF',
      surfaceMuted: '#E7F0F8',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F4F8FB',
      textoEscuro: '#0F2537',
      darkText: '#0F2537',
      textMuted: '#546E82',
      inputBackground: '#FFFFFF',
      borderColor: '#C5D9EB',
      disabledBackground: '#C5D9EB',
      logoutRed: '#DC2626',
      dangerSoft: '#FEE2E2',
      dangerText: '#991B1B',
      budgetWarningBg: '#FEF3C7',
      budgetWarningBorder: '#F59E0B',
      budgetWarningText: '#92400E',
      budgetDangerBg: '#FEE2E2',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: '#991B1B',
    },
  }),

  [THEME_IDS.MATERIAL_YOU]: buildTheme({
    id: THEME_IDS.MATERIAL_YOU,
    name: 'Material You',
    subtitle: 'Minimalista, cartográfico e com superfícies flutuantes',
    isDark: false,
    previewBg: '#F1F3F4',
    previewPrimary: '#1A73E8',
    shape: MATERIAL_YOU_SHAPE,
    cardShadow: MATERIAL_YOU_SHADOW,
    typography: MATERIAL_YOU_TYPOGRAPHY,
    palette: {
      principal: '#1A73E8',
      primary: '#1A73E8',
      verdePrincipal: '#1E8E3E',
      verdeSuave: '#E8F0FE',
      badgeText: '#1A73E8',
      success: '#1E8E3E',
      accent: '#1A73E8',
      accentSoft: '#E8F0FE',
      warning: '#F9AB00',
      warningSoft: '#FEF7E0',
      warningText: '#B06000',
      background: '#F1F3F4',
      card: '#FFFFFF',
      surfaceMuted: '#F8F9FA',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F8F9FA',
      textoEscuro: '#202124',
      darkText: '#202124',
      textMuted: '#5F6368',
      inputBackground: '#FFFFFF',
      borderColor: '#DADCE0',
      dividerColor: '#E8EAED',
      disabledBackground: '#DADCE0',
      logoutRed: '#D93025',
      dangerSoft: '#FCE8E6',
      dangerText: '#A50E0E',
      budgetWarningBg: '#FEF7E0',
      budgetWarningBorder: '#FBBC04',
      budgetWarningText: '#B06000',
      budgetDangerBg: '#FCE8E6',
      budgetDangerBorder: '#EA4335',
      budgetDangerText: '#A50E0E',
    },
  }),

  [THEME_IDS.NEON_MATRIX]: buildTheme({
    id: THEME_IDS.NEON_MATRIX,
    name: 'Neon Matrix',
    subtitle: 'Verde fósforo e linhas retas',
    isDark: true,
    previewBg: '#050A06',
    previewPrimary: '#00FF41',
    shape: SHARP_TECH_SHAPE,
    palette: {
      principal: '#00C853',
      primary: '#0B3D1A',
      verdePrincipal: '#00E676',
      verdeSuave: '#0D2E16',
      badgeText: '#00FF41',
      success: '#00FF41',
      accent: '#00FF41',
      accentSoft: '#0D2E16',
      warning: '#FACC15',
      warningSoft: '#332C08',
      warningText: '#FEF08A',
      background: '#050A06',
      card: '#0B170E',
      surfaceMuted: '#112416',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#E6FFE9',
      textoEscuro: '#E6FFE9',
      darkText: '#E6FFE9',
      textMuted: '#7DB88B',
      inputBackground: '#0E1F13',
      borderColor: '#1E592C',
      disabledBackground: '#1C3622',
      logoutRed: '#FF5252',
      dangerSoft: '#3A1115',
      dangerText: '#FF8A80',
      budgetWarningBg: '#332C08',
      budgetWarningBorder: '#FACC15',
      budgetWarningText: '#FEF08A',
      budgetDangerBg: '#3A1115',
      budgetDangerBorder: '#FF5252',
      budgetDangerText: '#FF8A80',
    },
  }),

  [THEME_IDS.CYBERPUNK_NEON]: buildTheme({
    id: THEME_IDS.CYBERPUNK_NEON,
    name: 'Cyberpunk Neon',
    subtitle: 'Rosa neon, ciano e traço tech',
    isDark: true,
    previewBg: '#0D0B1A',
    previewPrimary: '#FF2A85',
    shape: SHARP_TECH_SHAPE,
    palette: {
      principal: '#FF2A85',
      primary: '#B8145F',
      verdePrincipal: '#00D8FF',
      verdeSuave: '#301435',
      badgeText: '#FF6BB0',
      success: '#00E5FF',
      accent: '#00E5FF',
      accentSoft: '#102D3E',
      warning: '#F59E0B',
      warningSoft: '#3B280D',
      warningText: '#FDE68A',
      background: '#0D0B1A',
      card: '#161329',
      surfaceMuted: '#211C3B',
      textoPrincipal: '#FFFFFF',
      textoClaro: '#F8F5FF',
      textoEscuro: '#F8F5FF',
      darkText: '#F8F5FF',
      textMuted: '#A79EC9',
      inputBackground: '#1B1733',
      borderColor: '#3C2F66',
      disabledBackground: '#30274F',
      logoutRed: '#FF4D6D',
      dangerSoft: '#3F1426',
      dangerText: '#FF8FA3',
      budgetWarningBg: '#3B280D',
      budgetWarningBorder: '#F59E0B',
      budgetWarningText: '#FDE68A',
      budgetDangerBg: '#3F1426',
      budgetDangerBorder: '#FF4D6D',
      budgetDangerText: '#FF8FA3',
    },
  }),
};

export const THEME_LIST = [
  THEMES[THEME_IDS.LIGHT],
  THEMES[THEME_IDS.DARK],
  THEMES[THEME_IDS.AMOLED],
  THEMES[THEME_IDS.ROSE_QUARTZ],
  THEMES[THEME_IDS.OCEAN_BLUE],
  THEMES[THEME_IDS.MATERIAL_YOU],
  THEMES[THEME_IDS.NEON_MATRIX],
  THEMES[THEME_IDS.CYBERPUNK_NEON],
];

export function buildCustomTheme(rawConfig) {
  const cfg = {
    ...DEFAULT_CUSTOM_THEME_CONFIG,
    ...(rawConfig && typeof rawConfig === 'object' ? rawConfig : {}),
  };

  const base =
    CUSTOM_BASE_MODES.find((m) => m.id === cfg.baseMode) ||
    CUSTOM_BASE_MODES[0];
  const accent =
    CUSTOM_ACCENT_PALETTE.find(
      (a) => a.hex.toLowerCase() === String(cfg.primaryColor || '').toLowerCase()
    ) || CUSTOM_ACCENT_PALETTE[0];
  const borderStyle =
    CUSTOM_BORDER_STYLES.find((s) => s.id === cfg.borderStyle) ||
    CUSTOM_BORDER_STYLES[1];
  const thickness =
    CUSTOM_BORDER_THICKNESS.find((t) => t.id === cfg.borderThickness) ||
    CUSTOM_BORDER_THICKNESS[0];

  const primaryText = getContrastingTextColor(accent.hex);
  const badgeBg = base.isDark ? accent.softDark : accent.softLight;

  return buildTheme({
    id: THEME_IDS.CUSTOM,
    name: 'Personalizado',
    subtitle: `${base.label} • ${accent.label} • ${borderStyle.label}`,
    isDark: base.isDark,
    statusBarStyle: 'light',
    previewBg: base.bg,
    previewPrimary: accent.hex,
    shape: {
      radiusCard: borderStyle.radiusCard,
      radiusButton: borderStyle.radiusButton,
      radiusInput: borderStyle.radiusInput,
      borderWidth: thickness.borderWidth,
    },
    palette: {
      principal: accent.hex,
      primary: accent.headerHex,
      verdePrincipal: accent.hex,
      verdeSuave: badgeBg,
      badgeText: base.isDark ? '#F8FAFC' : accent.hex,
      success: base.isDark ? '#22C55E' : '#16A34A',
      accent: accent.hex,
      accentSoft: badgeBg,
      warning: base.isDark ? '#F59E0B' : '#D97706',
      warningSoft: base.isDark ? '#3D3214' : '#FEF3C7',
      warningText: base.isDark ? '#FDE68A' : '#92400E',
      background: base.bg,
      card: base.card,
      surfaceMuted: base.surfaceMuted,
      textoPrincipal: primaryText,
      textoClaro: '#F1F5F9',
      textoEscuro: base.text,
      darkText: base.text,
      textMuted: base.textMuted,
      inputBackground: base.inputBg,
      borderColor: base.border,
      disabledBackground: base.disabledBg,
      logoutRed: base.isDark ? '#EF4444' : '#DC2626',
      dangerSoft: base.isDark ? '#3F1D1D' : '#FEE2E2',
      dangerText: base.isDark ? '#FCA5A5' : '#991B1B',
      budgetWarningBg: base.isDark ? '#3D3214' : '#FEF3C7',
      budgetWarningBorder: base.isDark ? '#D97706' : '#F59E0B',
      budgetWarningText: base.isDark ? '#FDE68A' : '#92400E',
      budgetDangerBg: base.isDark ? '#3F1D1D' : '#FEE2E2',
      budgetDangerBorder: '#EF4444',
      budgetDangerText: base.isDark ? '#FCA5A5' : '#991B1B',
    },
  });
}

const LEGACY_THEME_ID_MAP = {
  google_maps: THEME_IDS.MATERIAL_YOU,
};

export function normalizeThemeId(themeId) {
  if (!themeId) return themeId;
  return LEGACY_THEME_ID_MAP[themeId] || themeId;
}

export function isValidThemeId(themeId) {
  const normalized = normalizeThemeId(themeId);
  return (
    normalized === THEME_IDS.CUSTOM ||
    Boolean(normalized && Object.prototype.hasOwnProperty.call(THEMES, normalized))
  );
}

export function getThemeById(themeId, customConfig = null) {
  const normalized = normalizeThemeId(themeId);
  if (normalized === THEME_IDS.CUSTOM) {
    return buildCustomTheme(customConfig);
  }
  if (isValidThemeId(normalized)) {
    return THEMES[normalized];
  }
  return THEMES[THEME_IDS.LIGHT];
}
