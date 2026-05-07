import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plan } from '../types/index';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  onSelect: (planId: string) => void;
  loading?: boolean;
}

export function PlanCard({ plan, isCurrent, onSelect, loading }: PlanCardProps) {
  return (
    <View style={[styles.card, plan.highlighted && styles.highlighted]}>
      {plan.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      )}

      <Text style={styles.name}>{plan.name}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.price}>
          {plan.currency}{plan.price}
        </Text>
        <Text style={styles.interval}>/{plan.interval}</Text>
      </View>

      <View style={styles.features}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, isCurrent && styles.buttonDisabled]}
        onPress={() => onSelect(plan.id)}
        disabled={isCurrent || loading}
      >
        <Text style={styles.buttonText}>
          {isCurrent ? 'Current Plan' : 'Subscribe'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  highlighted: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  badge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  name: { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  price: { color: '#38bdf8', fontSize: 28, fontWeight: '800' },
  interval: { color: '#64748b', fontSize: 14, marginLeft: 2 },
  features: { marginTop: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  check: { color: '#22c55e', fontSize: 14, marginRight: 8 },
  featureText: { color: '#94a3b8', fontSize: 13 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { backgroundColor: '#334155' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
