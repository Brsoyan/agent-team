import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';

interface SubscriptionStatusProps {
  onManage?: () => void;
}

export function SubscriptionStatus({ onManage }: SubscriptionStatusProps) {
  const { state, currentPlan, isSubscribed } = useSubscription();

  if (!isSubscribed) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>No active subscription</Text>
        {onManage && (
          <TouchableOpacity style={styles.button} onPress={onManage}>
            <Text style={styles.buttonText}>View Plans</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.planName}>{currentPlan?.name}</Text>
      <Text style={styles.status}>
        {state.status === 'trial' ? 'Free Trial' : 'Active'}
      </Text>
      {state.expiresAt && (
        <Text style={styles.expires}>
          Renews {new Date(state.expiresAt).toLocaleDateString()}
        </Text>
      )}
      {onManage && (
        <TouchableOpacity style={styles.manageBtn} onPress={onManage}>
          <Text style={styles.manageBtnText}>Manage</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  planName: { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  status: { color: '#22c55e', fontSize: 12, fontWeight: '600', marginTop: 2 },
  expires: { color: '#64748b', fontSize: 11, marginTop: 4 },
  label: { color: '#94a3b8', fontSize: 13 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  manageBtn: { marginTop: 10, alignItems: 'center' },
  manageBtnText: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
});
