import React, { createContext, useContext } from 'react';
import {
  View as RNView, Text as RNText, TouchableOpacity, TextInput as RNTextInput,
  ScrollView as RNScrollView, FlatList as RNFlatList, ActivityIndicator,
  StatusBar, SafeAreaView as RNSafeAreaView, Switch as RNSwitch, Image as RNImage,
  ViewProps, TextProps, TextInputProps, ScrollViewProps, FlatListProps,
  SwitchProps, ImageProps, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Theme, useTheme, PaletteName } from '../theme';

// ── Theme Context ──
const ThemeContext = createContext<Theme | null>(null);

export function useAppTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return useTheme('ocean');
}

interface ThemeProviderProps {
  palette?: PaletteName;
  children: React.ReactNode;
}

export function ThemeProvider({ palette = 'ocean', children }: ThemeProviderProps) {
  const theme = useTheme(palette);
  return (
    <ThemeContext.Provider value={theme}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      {children}
    </ThemeContext.Provider>
  );
}

// ── Screen (full screen wrapper) ──
export function Screen({ style, children, ...props }: ViewProps & { children: React.ReactNode }) {
  const t = useAppTheme();
  return <RNSafeAreaView style={[{ flex: 1, backgroundColor: t.colors.bg }, style]} {...props}>{children}</RNSafeAreaView>;
}

// ── Box (themed View) ──
export function Box({ style, ...props }: ViewProps) {
  return <RNView style={style} {...props} />;
}

// ── Card ──
export function Card({ style, children, elevated, ...props }: ViewProps & { elevated?: boolean; children: React.ReactNode }) {
  const t = useAppTheme();
  return (
    <RNView style={[{
      backgroundColor: elevated ? t.colors.bgElevated : t.colors.bgCard,
      borderRadius: t.radius.lg, padding: t.spacing.lg,
      borderWidth: 1, borderColor: elevated ? t.colors.borderVisible : t.colors.border,
    }, style]} {...props}>{children}</RNView>
  );
}

// ── Text variants ──
interface AppTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button';
  color?: 'primary' | 'secondary' | 'muted' | 'error' | 'success';
}

export function Text({ variant = 'body', color, style, ...props }: AppTextProps) {
  const t = useAppTheme();
  const colorMap = {
    primary: t.colors.text, secondary: t.colors.textSecondary,
    muted: t.colors.textMuted, error: t.colors.error, success: t.colors.success,
  };
  return (
    <RNText style={[t.typography[variant], { color: colorMap[color || 'primary'] }, style]} {...props} />
  );
}

// ── Button ──
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', size = 'md', disabled, loading, style }: ButtonProps) {
  const t = useAppTheme();
  const sizes = { sm: { py: 6, px: 12, fs: 12 }, md: { py: 12, px: 20, fs: 15 }, lg: { py: 16, px: 28, fs: 17 } };
  const s = sizes[size];

  const variants: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: t.colors.primary, border: t.colors.primary, text: '#fff' },
    outline: { bg: 'transparent', border: t.colors.primary, text: t.colors.primary },
    ghost: { bg: 'transparent', border: 'transparent', text: t.colors.primary },
    danger: { bg: t.colors.error, border: t.colors.error, text: '#fff' },
  };
  const v = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      style={[{
        backgroundColor: v.bg, borderColor: v.border, borderWidth: variant === 'outline' ? 1 : 0,
        borderRadius: t.radius.md, paddingVertical: s.py, paddingHorizontal: s.px,
        alignItems: 'center', justifyContent: 'center', minHeight: 48,
        opacity: disabled ? 0.4 : 1, flexDirection: 'row', gap: 8,
      }, style]}>
      {loading && <ActivityIndicator size="small" color={v.text} />}
      <RNText style={{ color: v.text, fontSize: s.fs, fontWeight: '700' }}>{title}</RNText>
    </TouchableOpacity>
  );
}

// ── TextInput ──
interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: AppInputProps) {
  const t = useAppTheme();
  return (
    <RNView>
      {label && <RNText style={{ color: t.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>{label}</RNText>}
      <RNTextInput
        placeholderTextColor={t.colors.textMuted}
        style={[{
          backgroundColor: t.colors.bgCard, borderWidth: 1,
          borderColor: error ? t.colors.error : t.colors.borderVisible,
          borderRadius: t.radius.md, padding: t.spacing.md,
          color: t.colors.text, fontSize: 15, minHeight: 48,
        }, style]}
        {...props}
      />
      {error && <RNText style={{ color: t.colors.error, fontSize: 11, marginTop: 2 }}>{error}</RNText>}
    </RNView>
  );
}

// ── Divider ──
export function Divider({ style }: { style?: ViewStyle }) {
  const t = useAppTheme();
  return <RNView style={[{ height: 1, backgroundColor: t.colors.border }, style]} />;
}

// ── Badge ──
export function Badge({ text, color }: { text: string; color?: 'primary' | 'success' | 'error' | 'warning' }) {
  const t = useAppTheme();
  const colors = { primary: t.colors.primary, success: t.colors.success, error: t.colors.error, warning: t.colors.warning };
  const bg = colors[color || 'primary'];
  return (
    <RNView style={{ backgroundColor: bg, borderRadius: t.radius.full, paddingHorizontal: t.spacing.sm, paddingVertical: 2 }}>
      <RNText style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{text}</RNText>
    </RNView>
  );
}

// ── Avatar ──
export function Avatar({ uri, size = 40, fallback }: { uri?: string; size?: number; fallback?: string }) {
  const t = useAppTheme();
  if (uri) {
    return <RNImage source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <RNView style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>{fallback?.[0] || '?'}</RNText>
    </RNView>
  );
}

// ── Icon Button ──
export function IconButton({ icon, onPress, size = 48 }: { icon: string; onPress: () => void; size?: number }) {
  const t = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontSize: size * 0.5, color: t.colors.text }}>{icon}</RNText>
    </TouchableOpacity>
  );
}

// ── Row / Column layout ──
export function Row({ style, gap = 8, center, ...props }: ViewProps & { gap?: number; center?: boolean }) {
  return <RNView style={[{ flexDirection: 'row', gap, alignItems: center ? 'center' : undefined }, style]} {...props} />;
}

export function Column({ style, gap = 8, ...props }: ViewProps & { gap?: number }) {
  return <RNView style={[{ gap }, style]} {...props} />;
}

// ── Spacer ──
export function Spacer({ size }: { size?: number }) {
  const t = useAppTheme();
  return <RNView style={{ height: size || t.spacing.lg }} />;
}

// ── Loading ──
export function Loading({ text }: { text?: string }) {
  const t = useAppTheme();
  return (
    <RNView style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={t.colors.primary} />
      {text && <RNText style={{ color: t.colors.textSecondary, marginTop: 12, fontSize: 14 }}>{text}</RNText>}
    </RNView>
  );
}

// ── Empty State ──
export function EmptyState({ icon, title, subtitle, action, onAction }: {
  icon?: string; title: string; subtitle?: string; action?: string; onAction?: () => void;
}) {
  const t = useAppTheme();
  return (
    <RNView style={{ flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {icon && <RNText style={{ fontSize: 48, marginBottom: 16 }}>{icon}</RNText>}
      <RNText style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{title}</RNText>
      {subtitle && <RNText style={{ color: t.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8 }}>{subtitle}</RNText>}
      {action && onAction && (
        <TouchableOpacity onPress={onAction} style={{ backgroundColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20 }}>
          <RNText style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{action}</RNText>
        </TouchableOpacity>
      )}
    </RNView>
  );
}

// ── Toast / Snackbar ──
export function Toast({ message, action, onAction, variant = 'info' }: {
  message: string; action?: string; onAction?: () => void; variant?: 'info' | 'success' | 'error';
}) {
  const t = useAppTheme();
  const bgMap = { info: t.colors.bgElevated, success: t.colors.success, error: t.colors.error };
  return (
    <RNView style={{ backgroundColor: bgMap[variant], borderRadius: t.radius.md, padding: t.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <RNText style={{ color: '#fff', fontSize: 14, flex: 1 }}>{message}</RNText>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} style={{ marginLeft: 12 }}>
          <RNText style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{action}</RNText>
        </TouchableOpacity>
      )}
    </RNView>
  );
}

// ── List Item ──
export function ListItem({ title, subtitle, left, right, onPress }: {
  title: string; subtitle?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void;
}) {
  const t = useAppTheme();
  const Wrapper = onPress ? TouchableOpacity : RNView;
  return (
    <Wrapper onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: t.spacing.md, paddingHorizontal: t.spacing.lg, borderBottomWidth: 1, borderBottomColor: t.colors.border, gap: 12, minHeight: 48 }}>
      {left}
      <RNView style={{ flex: 1 }}>
        <RNText style={{ color: t.colors.text, fontSize: 15, fontWeight: '500' }}>{title}</RNText>
        {subtitle && <RNText style={{ color: t.colors.textSecondary, fontSize: 12, marginTop: 2 }}>{subtitle}</RNText>}
      </RNView>
      {right}
    </Wrapper>
  );
}
