import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch } from 'react-native';
import { PaletteName, palettes, ColorMode } from '../theme';

interface SettingsScreenProps {
  currentPalette: PaletteName;
  currentMode: ColorMode;
  onChangePalette: (palette: PaletteName) => void;
  onChangeMode: (mode: ColorMode) => void;
}

const PALETTE_NAMES: { key: PaletteName; label: string; preview: string }[] = [
  { key: 'ocean', label: 'Ocean', preview: '#2563eb' },
  { key: 'sunset', label: 'Sunset', preview: '#f97316' },
  { key: 'forest', label: 'Forest', preview: '#16a34a' },
  { key: 'minimal', label: 'Minimal', preview: '#18181b' },
];

export function SettingsScreen({ currentPalette, currentMode, onChangePalette, onChangeMode }: SettingsScreenProps) {
  const isDark = currentMode === 'dark' || currentMode === 'auto';
  const bg = isDark ? '#0a0e1a' : '#f8fafc';
  const cardBg = isDark ? '#111827' : '#ffffff';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#475569';
  const border = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.title, { color: text }]}>Settings</Text>

      {/* Dark Mode */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Appearance</Text>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: text }]}>Dark Mode</Text>
            <Text style={[styles.hint, { color: textSec }]}>Switch between light and dark theme</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => onChangeMode(v ? 'dark' : 'light')}
            trackColor={{ false: '#d4d4d8', true: '#2563eb' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Color Palette */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Color Palette</Text>
        <Text style={[styles.hint, { color: textSec, marginBottom: 12 }]}>Choose your app's color scheme</Text>
        {PALETTE_NAMES.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.paletteRow, { borderColor: currentPalette === p.key ? p.preview : border }]}
            onPress={() => onChangePalette(p.key)}
          >
            <View style={[styles.colorDot, { backgroundColor: p.preview }]} />
            <Text style={[styles.label, { color: text, flex: 1 }]}>{p.label}</Text>
            {currentPalette === p.key && (
              <Text style={{ color: p.preview, fontWeight: '700', fontSize: 14 }}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontSize: 15, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: 2 },
  paletteRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 2, marginBottom: 8, gap: 12 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
});
