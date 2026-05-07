export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
  badge?: string; // e.g. "Most Popular", "Best Value"
}

export interface SubscriptionState {
  currentPlanId: string | null;
  status: 'none' | 'active' | 'expired' | 'cancelled' | 'trial';
  expiresAt: string | null;
  trialEndsAt: string | null;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface SDKConfig {
  /** Your app's unique identifier */
  appId: string;
  /** Available subscription plans */
  plans: Plan[];
  /** iOS App Store shared secret (for receipt validation) */
  iosSharedSecret?: string;
  /** Android package name */
  androidPackage?: string;
  /** Backend URL for receipt validation (optional) */
  validationUrl?: string;
  /** Called when subscription state changes */
  onStateChange?: (state: SubscriptionState) => void;
}
