import { PurchaseResult, Plan } from '../types/index';
import { getConfig } from './config';
import { setSubscriptionState } from './store';

/**
 * Purchase a subscription plan.
 *
 * In a real app this would call react-native-iap or expo-in-app-purchases.
 * This is a stub that simulates the purchase flow.
 */
export async function purchasePlan(planId: string): Promise<PurchaseResult> {
  const config = getConfig();
  const plan = config.plans.find(p => p.id === planId);

  if (!plan) {
    return { success: false, error: `Plan "${planId}" not found` };
  }

  // TODO: Replace with actual IAP call
  // import { requestPurchase } from 'react-native-iap';
  // const result = await requestPurchase({ sku: plan.id });

  // Simulate success
  const expiresAt = new Date();
  if (plan.interval === 'month') expiresAt.setMonth(expiresAt.getMonth() + 1);
  else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  setSubscriptionState({
    currentPlanId: plan.id,
    status: 'active',
    expiresAt: expiresAt.toISOString(),
  });

  return { success: true, transactionId: `txn_${Date.now()}` };
}

/**
 * Restore previous purchases.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  // TODO: Replace with actual restore
  // import { getAvailablePurchases } from 'react-native-iap';
  // const purchases = await getAvailablePurchases();

  return { success: true };
}

/**
 * Cancel current subscription.
 */
export async function cancelSubscription(): Promise<PurchaseResult> {
  setSubscriptionState({ status: 'cancelled' });
  return { success: true };
}
