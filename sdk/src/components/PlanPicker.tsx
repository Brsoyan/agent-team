import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { PlanCard } from './PlanCard';

interface PlanPickerProps {
  title?: string;
  onPurchaseComplete?: (planId: string) => void;
  onError?: (error: string) => void;
}

export function PlanPicker({ title = 'Choose a Plan', onPurchaseComplete, onError }: PlanPickerProps) {
  const { plans, state, purchase } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    setLoading(planId);
    try {
      const result = await purchase(planId);
      if (result.success) {
        onPurchaseComplete?.(planId);
      } else {
        onError?.(result.error || 'Purchase failed');
      }
    } catch (e) {
      onError?.((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {plans.map(plan => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={state.currentPlanId === plan.id}
          onSelect={handleSelect}
          loading={loading === plan.id}
        />
      ))}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: '#e2e8f0', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  loadingText: { color: '#94a3b8', marginLeft: 8, fontSize: 13 },
});
