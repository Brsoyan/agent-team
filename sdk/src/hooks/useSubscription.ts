import { useSyncExternalStore, useCallback } from 'react';
import { getConfig } from '../utils/config';
import { getSubscriptionState, subscribe } from '../utils/store';
import { purchasePlan, restorePurchases, cancelSubscription } from '../utils/purchase';
import { Plan, SubscriptionState, PurchaseResult } from '../types/index';

export interface UseSubscriptionReturn {
  /** Current subscription state */
  state: SubscriptionState;
  /** All available plans */
  plans: Plan[];
  /** Current plan object (or null) */
  currentPlan: Plan | null;
  /** Is the user subscribed to any plan? */
  isSubscribed: boolean;
  /** Purchase a plan by ID */
  purchase: (planId: string) => Promise<PurchaseResult>;
  /** Restore previous purchases */
  restore: () => Promise<PurchaseResult>;
  /** Cancel subscription */
  cancel: () => Promise<PurchaseResult>;
}

export function useSubscription(): UseSubscriptionReturn {
  const state = useSyncExternalStore(subscribe, getSubscriptionState);
  const config = getConfig();

  const currentPlan = config.plans.find(p => p.id === state.currentPlanId) ?? null;

  return {
    state,
    plans: config.plans,
    currentPlan,
    isSubscribed: state.status === 'active' || state.status === 'trial',
    purchase: useCallback((planId: string) => purchasePlan(planId), []),
    restore: useCallback(() => restorePurchases(), []),
    cancel: useCallback(() => cancelSubscription(), []),
  };
}
