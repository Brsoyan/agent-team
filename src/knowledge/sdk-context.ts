import { AgentRole } from '../models/types.js';

/**
 * SDK knowledge injected into every agent's prompt.
 * Each role gets the parts relevant to them.
 */

const SDK_OVERVIEW = `
## Company SDK: @agent-team/subscription-sdk
All apps MUST use our shared subscription SDK. It lives in the sdk/ directory of the project root.
The SDK provides ready-made subscription components, hooks, and purchase logic for React Native.

### SDK Exports:
- initSubscriptionSDK(config) — call once in App.tsx to configure plans
- useSubscription() — React hook: { state, plans, currentPlan, isSubscribed, purchase, restore, cancel }
- <PlanPicker /> — drop-in subscription plan selection screen
- <PlanCard /> — single plan card component
- <SubscriptionStatus /> — shows current subscription status
- purchasePlan(planId) / restorePurchases() / cancelSubscription() — imperative API

### SDK Config (passed to initSubscriptionSDK):
\`\`\`ts
{
  appId: string;           // Bundle ID
  plans: Plan[];           // Array of { id, name, price, currency, interval, features, highlighted?, badge? }
  iosSharedSecret?: string;
  androidPackage?: string;
  validationUrl?: string;
  onStateChange?: (state) => void;
}
\`\`\`

### Plan type:
\`\`\`ts
{ id: string; name: string; price: number; currency: string; interval: 'month' | 'year'; features: string[]; highlighted?: boolean; badge?: string }
\`\`\`
`;

const SDK_BY_ROLE: Record<AgentRole, string> = {
  manager: `${SDK_OVERVIEW}
### For Manager:
- Ensure tasks flow through the pipeline and nothing is stuck
- Check that specs reference the SDK subscription components`,

  pm: `${SDK_OVERVIEW}
### For PM:
- Every app spec MUST include a "Subscription Integration" section
- Define the subscription plans (names, prices, features per tier) in the spec
- Reference SDK components by name: PlanPicker, SubscriptionStatus
- Acceptance criteria should test subscription flows (purchase, restore, cancel)
- Include plan config values (plan IDs, prices) in the spec so developer can configure the SDK`,

  critic: `${SDK_OVERVIEW}
### For Critic:
- Check that specs include subscription plan definitions
- Verify acceptance criteria cover: purchase flow, restore purchases, cancel, plan comparison
- Ensure the spec references SDK components and doesn't propose building subscription UI from scratch`,

  designer: `${SDK_OVERVIEW}
### For Designer:
- SDK has a full design system: createTheme('ocean') gives you ALL colors, typography, spacing
- Available palettes: ocean (dark blue), sunset (warm orange), forest (green), minimal (light)
- Just PICK a palette name in your design doc. Do NOT define colors or hex values.
- SDK provides PlanCard, PlanPicker, SubscriptionStatus components — don't redesign them
- Focus ONLY on UX: screen flow, component list, states, interactions
- Keep design docs SHORT (under 100 lines)`,

  developer: `${SDK_OVERVIEW}
### For Developer:
- Import from '@agent-team/subscription-sdk' (it's in the sdk/ directory)
- DESIGN SYSTEM: Use createTheme() + createStyles() for ALL styling. NO hardcoded colors.
  \`\`\`tsx
  import { createTheme, createStyles } from '@agent-team/subscription-sdk';
  const theme = createTheme('ocean'); // use palette from design doc
  const s = createStyles(theme);
  // Then use: s.screen, s.card, s.button, s.input, theme.colors.*, theme.typography.*, theme.spacing.*
  \`\`\`
- SUBSCRIPTION: initSubscriptionSDK({ appId, plans }) in App.tsx
- Use <PlanPicker />, <SubscriptionStatus />, useSubscription() hook
- Write unit tests that mock the SDK hook

Example App.tsx setup:
\`\`\`tsx
import { initSubscriptionSDK } from '@agent-team/subscription-sdk';

initSubscriptionSDK({
  appId: 'com.example.app',
  plans: [
    { id: 'basic_monthly', name: 'Basic', price: 4.99, currency: '$', interval: 'month', features: ['Feature A', 'Feature B'] },
    { id: 'pro_monthly', name: 'Pro', price: 9.99, currency: '$', interval: 'month', features: ['Everything'], highlighted: true, badge: 'Popular' },
  ],
});
\`\`\`

Example screen:
\`\`\`tsx
import { PlanPicker } from '@agent-team/subscription-sdk';
export function SubscriptionScreen({ navigation }) {
  return <PlanPicker onPurchaseComplete={() => navigation.goBack()} />;
}
\`\`\`

CRITICAL — SDK DEPENDENCY:
When creating package.json, ALWAYS include this dependency:
  "@agent-team/subscription-sdk": "file:../../../../sdk"
And add this to metro.config.js:
  const sdkPath = path.resolve(__dirname, '../../../../sdk');
  watchFolders: [sdkPath],
  resolver: { nodeModulesPaths: [path.resolve(__dirname, 'node_modules'), sdkPath] }
Without this, the SDK import will fail at runtime!`,

  reviewer: `${SDK_OVERVIEW}
### For Reviewer:
- Verify code imports from '@agent-team/subscription-sdk', NOT building subscription logic from scratch
- Check that initSubscriptionSDK is called with correct plan config from the spec
- Ensure PlanPicker/SubscriptionStatus components are used (not custom-built alternatives)
- Check unit tests mock useSubscription correctly`,

  // Gates don't run an LLM, so this context is never consumed.
  gatekeeper: '',

  qa: `${SDK_OVERVIEW}
### For QA:
- Test subscription flows: view plans, purchase, restore, cancel
- Test that PlanPicker renders all plans from config
- Test SubscriptionStatus shows correct state (none, active, cancelled)
- Test edge cases: purchase failure, network error during restore
- Write E2E tests for the full subscription user journey`,
};

export function getSDKContext(role: AgentRole): string {
  return SDK_BY_ROLE[role] || SDK_OVERVIEW;
}
