# Subscription SDK

All apps MUST use our shared SDK: `@agent-team/subscription-sdk`

## Exports
- `initSubscriptionSDK(config)` — call once in App.tsx
- `useSubscription()` — hook: { state, plans, currentPlan, isSubscribed, purchase, restore, cancel }
- `<PlanPicker />` — subscription plan selection screen
- `<PlanCard />` — single plan card
- `<SubscriptionStatus />` — current plan badge
- `purchasePlan(id)` / `restorePurchases()` / `cancelSubscription()`

## Config
```ts
initSubscriptionSDK({
  appId: 'com.example.app',
  plans: [
    { id: 'basic', name: 'Basic', price: 4.99, currency: '$', interval: 'month', features: ['Feature A'] },
    { id: 'pro', name: 'Pro', price: 9.99, currency: '$', interval: 'month', features: ['Everything'], highlighted: true, badge: 'Popular' },
  ],
});
```

## Usage
```tsx
import { PlanPicker, SubscriptionStatus, useSubscription } from '@agent-team/subscription-sdk';

// Screen
<PlanPicker onPurchaseComplete={() => navigation.goBack()} />

// Status badge
<SubscriptionStatus onManage={() => navigation.navigate('Plans')} />

// Custom logic
const { isSubscribed, currentPlan } = useSubscription();
```
