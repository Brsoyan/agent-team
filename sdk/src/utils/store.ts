import { SubscriptionState } from '../types/index';
import { getConfig } from './config';

/** Simple in-memory store. In a real app, persist to AsyncStorage. */
let _state: SubscriptionState = {
  currentPlanId: null,
  status: 'none',
  expiresAt: null,
  trialEndsAt: null,
};

const _listeners = new Set<() => void>();

export function getSubscriptionState(): SubscriptionState {
  return _state;
}

export function setSubscriptionState(updates: Partial<SubscriptionState>): void {
  _state = { ..._state, ...updates };
  _listeners.forEach(fn => fn());
  getConfig().onStateChange?.(_state);
}

export function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}
