# Design System (from SDK)

ALL apps use our SDK's built-in design system. DO NOT invent colors, spacing, or typography.

## Light/Dark Mode Support
Every palette has both dark and light variants. Apps MUST support both.

```tsx
import { useTheme, createStyles } from '@agent-team/subscription-sdk';

function MyScreen() {
  // Auto-detects system light/dark mode
  const theme = useTheme('ocean');
  const styles = createStyles(theme);
  
  return (
    <View style={styles.screen}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      ...
    </View>
  );
}
```

## Navigation Theming
Every theme includes React Navigation colors. Use them:

```tsx
import { useTheme } from '@agent-team/subscription-sdk';
import { NavigationContainer } from '@react-navigation/native';

function App() {
  const theme = useTheme('ocean');
  return (
    <NavigationContainer theme={theme.navigation}>
      <Stack.Navigator screenOptions={{
        headerStyle: { backgroundColor: theme.colors.navBg },
        headerTintColor: theme.colors.navText,
      }}>
        ...
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Settings Screen (drop-in)
SDK provides a ready-made settings screen with theme/palette/dark mode controls:

```tsx
import { SettingsScreen } from '@agent-team/subscription-sdk';

<SettingsScreen
  currentPalette={palette}
  currentMode={mode}
  onChangePalette={setPalette}
  onChangeMode={setMode}
/>
```

## Available Palettes (each has dark + light)
- **ocean** — Blue theme. Primary: #2563eb
- **sunset** — Warm orange. Primary: #f97316
- **forest** — Green. Primary: #16a34a
- **minimal** — Clean neutral. Primary: #18181b

## Pre-built Styles (from createStyles)
- `styles.screen` — Full screen with bg color
- `styles.card` — Card with border
- `styles.button` / `styles.buttonText` — Primary button (48dp min)
- `styles.buttonOutline` — Outline button
- `styles.input` — Text input
- `styles.divider` — Horizontal line
- `styles.navHeader` — Navigation header bg + border

## Rules
- Use `useTheme('ocean')` hook — auto light/dark mode
- Pass `theme.navigation` to `<NavigationContainer>`
- Use `theme.colors.navBg`, `theme.colors.navText` for headers
- Use `theme.colors.statusBarStyle` for StatusBar
- NEVER hardcode colors — always use theme.colors.*
