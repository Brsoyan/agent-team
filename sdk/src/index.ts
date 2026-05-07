// ── Configuration ──
export { initSubscriptionSDK } from './utils/config';

// ── Types ──
export type { Plan, SubscriptionState, PurchaseResult, SDKConfig } from './types/index';

// ── Hook ──
export { useSubscription } from './hooks/useSubscription';

// ── Subscription Components ──
export { PlanCard } from './components/PlanCard';
export { PlanPicker } from './components/PlanPicker';
export { SubscriptionStatus } from './components/SubscriptionStatus';
export { SettingsScreen } from './components/SettingsScreen';

// ── Actions ──
export { purchasePlan, restorePurchases, cancelSubscription } from './utils/purchase';

// ── Design System ──
export { palettes, createTheme, createStyles, useTheme, typography, spacing, radius, shadows, touchTarget } from './theme';
export type { PaletteName, PaletteColors, ColorMode, Theme } from './theme';

// ── UI Components (use ONLY these — never raw React Native views) ──
export {
  ThemeProvider, useAppTheme,
  Screen, Box, Card, Text, Button, Input, Divider,
  Badge, Avatar, IconButton, Row, Column, Spacer,
  Loading, EmptyState, Toast, ListItem,
} from './components/ui';
