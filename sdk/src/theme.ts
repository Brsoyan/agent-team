import { StyleSheet, useColorScheme } from 'react-native';

// ── Color Palettes — each has dark + light variants ──

export interface PaletteColors {
  primary: string; primaryLight: string; primaryDark: string;
  accent: string; accentLight: string;
  success: string; error: string; warning: string;
  bg: string; bgCard: string; bgElevated: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderVisible: string;
  // Navigation
  navBg: string; navText: string; navBorder: string;
  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
}

export interface PaletteSet {
  dark: PaletteColors;
  light: PaletteColors;
}

export const palettes: Record<string, PaletteSet> = {
  ocean: {
    dark: {
      primary: '#2563eb', primaryLight: '#60a5fa', primaryDark: '#1d4ed8',
      accent: '#06b6d4', accentLight: '#67e8f9',
      success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
      bg: '#0a0e1a', bgCard: '#111827', bgElevated: '#1e293b',
      text: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b',
      border: '#1e293b', borderVisible: '#334155',
      navBg: '#0f172a', navText: '#e2e8f0', navBorder: '#1e293b',
      statusBarStyle: 'light-content',
    },
    light: {
      primary: '#2563eb', primaryLight: '#93c5fd', primaryDark: '#1d4ed8',
      accent: '#0891b2', accentLight: '#a5f3fc',
      success: '#16a34a', error: '#dc2626', warning: '#d97706',
      bg: '#f8fafc', bgCard: '#ffffff', bgElevated: '#f1f5f9',
      text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
      border: '#e2e8f0', borderVisible: '#cbd5e1',
      navBg: '#ffffff', navText: '#0f172a', navBorder: '#e2e8f0',
      statusBarStyle: 'dark-content',
    },
  },
  sunset: {
    dark: {
      primary: '#f97316', primaryLight: '#fdba74', primaryDark: '#ea580c',
      accent: '#ec4899', accentLight: '#f9a8d4',
      success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
      bg: '#0c0a09', bgCard: '#1c1917', bgElevated: '#292524',
      text: '#fafaf9', textSecondary: '#a8a29e', textMuted: '#78716c',
      border: '#292524', borderVisible: '#44403c',
      navBg: '#1c1917', navText: '#fafaf9', navBorder: '#292524',
      statusBarStyle: 'light-content',
    },
    light: {
      primary: '#ea580c', primaryLight: '#fdba74', primaryDark: '#c2410c',
      accent: '#db2777', accentLight: '#fbcfe8',
      success: '#16a34a', error: '#dc2626', warning: '#d97706',
      bg: '#fffbeb', bgCard: '#ffffff', bgElevated: '#fef3c7',
      text: '#1c1917', textSecondary: '#57534e', textMuted: '#a8a29e',
      border: '#fed7aa', borderVisible: '#fdba74',
      navBg: '#ffffff', navText: '#1c1917', navBorder: '#fed7aa',
      statusBarStyle: 'dark-content',
    },
  },
  forest: {
    dark: {
      primary: '#16a34a', primaryLight: '#86efac', primaryDark: '#15803d',
      accent: '#8b5cf6', accentLight: '#c4b5fd',
      success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
      bg: '#022c22', bgCard: '#064e3b', bgElevated: '#065f46',
      text: '#ecfdf5', textSecondary: '#a7f3d0', textMuted: '#6ee7b7',
      border: '#064e3b', borderVisible: '#047857',
      navBg: '#022c22', navText: '#ecfdf5', navBorder: '#064e3b',
      statusBarStyle: 'light-content',
    },
    light: {
      primary: '#15803d', primaryLight: '#bbf7d0', primaryDark: '#166534',
      accent: '#7c3aed', accentLight: '#ddd6fe',
      success: '#16a34a', error: '#dc2626', warning: '#d97706',
      bg: '#f0fdf4', bgCard: '#ffffff', bgElevated: '#dcfce7',
      text: '#052e16', textSecondary: '#166534', textMuted: '#86efac',
      border: '#bbf7d0', borderVisible: '#86efac',
      navBg: '#ffffff', navText: '#052e16', navBorder: '#bbf7d0',
      statusBarStyle: 'dark-content',
    },
  },
  minimal: {
    dark: {
      primary: '#e2e8f0', primaryLight: '#f8fafc', primaryDark: '#cbd5e1',
      accent: '#2563eb', accentLight: '#60a5fa',
      success: '#22c55e', error: '#ef4444', warning: '#f59e0b',
      bg: '#09090b', bgCard: '#18181b', bgElevated: '#27272a',
      text: '#fafafa', textSecondary: '#a1a1aa', textMuted: '#71717a',
      border: '#27272a', borderVisible: '#3f3f46',
      navBg: '#18181b', navText: '#fafafa', navBorder: '#27272a',
      statusBarStyle: 'light-content',
    },
    light: {
      primary: '#18181b', primaryLight: '#71717a', primaryDark: '#09090b',
      accent: '#2563eb', accentLight: '#60a5fa',
      success: '#16a34a', error: '#dc2626', warning: '#d97706',
      bg: '#ffffff', bgCard: '#f4f4f5', bgElevated: '#e4e4e7',
      text: '#18181b', textSecondary: '#52525b', textMuted: '#a1a1aa',
      border: '#e4e4e7', borderVisible: '#d4d4d8',
      navBg: '#ffffff', navText: '#18181b', navBorder: '#e4e4e7',
      statusBarStyle: 'dark-content',
    },
  },
};

export type PaletteName = keyof typeof palettes;
export type ColorMode = 'dark' | 'light' | 'auto';

// ── Typography ──
export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const },
  button: { fontSize: 15, fontWeight: '700' as const },
};

// ── Spacing ──
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

// ── Radius ──
export const radius = { sm: 4, md: 8, lg: 12, xl: 16, full: 999 };

// ── Shadows ──
export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
};

// ── Touch targets ──
export const touchTarget = { minWidth: 48, minHeight: 48 };

// ── Create theme ──
export function createTheme(paletteName: PaletteName = 'ocean', mode: ColorMode = 'dark') {
  const palette = palettes[paletteName] || palettes.ocean;
  const resolvedMode = mode === 'auto' ? 'dark' : mode; // 'auto' resolved by useTheme hook
  const colors = palette[resolvedMode];
  return {
    colors,
    palette: paletteName,
    mode: resolvedMode,
    typography,
    spacing,
    radius,
    shadows,
    touchTarget,
    // React Navigation theme — plug directly into NavigationContainer
    navigation: {
      dark: resolvedMode === 'dark',
      colors: {
        primary: colors.primary,
        background: colors.bg,
        card: colors.navBg,
        text: colors.navText,
        border: colors.navBorder,
        notification: colors.accent,
      },
      fonts: {
        regular: { fontFamily: 'System', fontWeight: '400' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: '700' as const },
        heavy: { fontFamily: 'System', fontWeight: '800' as const },
      },
    },
  };
}

export type Theme = ReturnType<typeof createTheme>;

// ── Hook: auto light/dark mode ──
export function useTheme(paletteName: PaletteName = 'ocean'): Theme {
  const colorScheme = useColorScheme();
  const mode: ColorMode = colorScheme === 'light' ? 'light' : 'dark';
  return createTheme(paletteName, mode);
}

// ── Common styles ──
export function createStyles(theme: Theme) {
  const { colors, spacing: sp, radius: r } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    card: { backgroundColor: colors.bgCard, borderRadius: r.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.border },
    cardElevated: { backgroundColor: colors.bgElevated, borderRadius: r.lg, padding: sp.lg, borderWidth: 1, borderColor: colors.borderVisible },
    button: { backgroundColor: colors.primary, borderRadius: r.md, paddingVertical: sp.md, paddingHorizontal: sp.xl, alignItems: 'center' as const, minHeight: 48 },
    buttonText: { color: theme.mode === 'dark' ? '#fff' : '#fff', fontSize: 15, fontWeight: '700' as const },
    buttonOutline: { backgroundColor: 'transparent', borderRadius: r.md, paddingVertical: sp.md, paddingHorizontal: sp.xl, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.primary, minHeight: 48 },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderVisible, borderRadius: r.md, padding: sp.md, color: colors.text, fontSize: 15, minHeight: 48 },
    divider: { height: 1, backgroundColor: colors.border },
    badge: { backgroundColor: colors.primary, borderRadius: r.full, paddingHorizontal: sp.sm, paddingVertical: 2 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
    navHeader: { backgroundColor: colors.navBg, borderBottomWidth: 1, borderBottomColor: colors.navBorder },
  });
}
