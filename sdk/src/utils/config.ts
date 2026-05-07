import { SDKConfig } from '../types/index';

// Default config so the app doesn't crash if init hasn't been called yet
const DEFAULT_CONFIG: SDKConfig = {
  appId: 'com.app.default',
  plans: [
    { id: 'free', name: 'Free', price: 0, currency: '$', interval: 'month', features: ['Basic features'] },
    { id: 'pro', name: 'Pro', price: 9.99, currency: '$', interval: 'month', features: ['All features'], highlighted: true, badge: 'Popular' },
  ],
};

let _config: SDKConfig = { ...DEFAULT_CONFIG };

export function initSubscriptionSDK(config: SDKConfig): void {
  _config = config;
}

export function getConfig(): SDKConfig {
  return _config;
}
