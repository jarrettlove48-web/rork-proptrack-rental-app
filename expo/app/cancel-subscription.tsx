import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Shield, Gift, AlertTriangle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';

const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_enough_features', label: 'Not enough features' },
  { id: 'found_alternative', label: 'Found a better alternative' },
  { id: 'no_longer_need', label: 'No longer managing properties' },
  { id: 'technical_issues', label: 'Technical issues' },
  { id: 'other', label: 'Other' },
];

const FEATURES_LOST: Record<string, string[]> = {
  essential: [
    'Up to 5 properties',
    'Up to 15 units',
    'Expense tracking & reports',
    'Up to 5 preferred contractors',
    'Priority support',
  ],
  pro: [
    'Unlimited properties & units',
    'Advanced analytics & reports',
    'Unlimited contractors',
    'Bulk tenant management',
    'Priority support',
  ],
};

type Step = 'value' | 'reason' | 'offer' | 'confirm' | 'done';

export default function CancelSubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { currentPlan } = useSubscription();
  const [step, setStep] = useState<Step>('value');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reasonText, setReasonText] = useState('');

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-info', user?.id],
    queryFn: async () => {
      console.log('[Cancel] Fetching subscription info...');
      const res = await fetch('https://app.proptrack.app/api/subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': user?.id ?? '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch subscription');
      return await res.json() as {
        plan: string;
        status: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodEnd: string | null;
        hasDiscount: boolean;
        discountName: string | null;
        priceAmount: number | null;
      };
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      console.log('[Cancel] Cancelling subscription...');
      const res = await fetch('https://app.proptrack.app/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': user?.id ?? '',
        },
        body: JSON.stringify({
          reason: selectedReason,
          reasonText: reasonText.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? 'Failed to cancel');
      }
      return await res.json();
    },
    onSuccess: () => {
      console.log('[Cancel] Subscription cancelled');
      setStep('done');
    },
    onError: (err: Error) => {
      console.log('[Cancel] Cancel error:', err.message);
    },
  });

  const discountMutation = useMutation({
    mutationFn: async () => {
      console.log('[Cancel] Applying retention discount...');
      const res = await fetch('https://app.proptrack.app/api/subscription/discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': user?.id ?? '',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? 'Failed to apply discount');
      }
      return await res.json();
    },
    onSuccess: () => {
      console.log('[Cancel] Discount applied, going back');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (err: Error) => {
      console.log('[Cancel] Discount error:', err.message);
    },
  });

  const features = FEATURES_LOST[currentPlan] ?? FEATURES_LOST.essential;
  const hasDiscount = subscriptionQuery.data?.hasDiscount ?? false;
  const periodEnd = subscriptionQuery.data?.currentPeriodEnd;

  const goNext = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'value') setStep('reason');
    else if (step === 'reason') {
      if (hasDiscount) {
        setStep('confirm');
      } else {
        setStep('offer');
      }
    }
    else if (step === 'offer') setStep('confirm');
    else if (step === 'confirm') cancelMutation.mutate();
  }, [step, hasDiscount, cancelMutation]);

  const renderValueStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
        <Shield size={32} color={colors.warning} strokeWidth={1.8} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        You'll lose access to these features
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Your {currentPlan === 'pro' ? 'Pro' : 'Essential'} plan includes:
      </Text>
      <View style={[styles.featuresList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {features.map((f, i) => (
          <View key={i} style={[styles.featureRow, i < features.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 0.5 }]}>
            <CheckCircle size={16} color={colors.success} strokeWidth={2} />
            <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.back();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Keep My Plan</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={goNext}
        activeOpacity={0.7}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Continue with cancellation</Text>
      </TouchableOpacity>
    </View>
  );

  const renderReasonStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Before you go...
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        We'd love to know why you're cancelling (optional).
      </Text>
      <View style={[styles.reasonsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {CANCEL_REASONS.map((r, i) => (
          <TouchableOpacity
            key={r.id}
            style={[
              styles.reasonRow,
              i < CANCEL_REASONS.length - 1 && { borderBottomColor: colors.divider, borderBottomWidth: 0.5 },
              selectedReason === r.id && { backgroundColor: colors.primaryFaint },
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setSelectedReason(selectedReason === r.id ? null : r.id);
            }}
          >
            <View style={[
              styles.radioOuter,
              { borderColor: selectedReason === r.id ? colors.primary : colors.textTertiary },
            ]}>
              {selectedReason === r.id && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <Text style={[styles.reasonText, { color: colors.text }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedReason === 'other' && (
        <TextInput
          style={[styles.reasonInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
          value={reasonText}
          onChangeText={setReasonText}
          placeholder="Tell us more..."
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
        />
      )}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={goNext}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => { setStep('value'); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Go back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOfferStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
        <Gift size={32} color={colors.success} strokeWidth={1.8} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        How about $2 off for 3 months?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        We'd hate to see you go. Keep all your features at a reduced price.
      </Text>
      <View style={[styles.offerCard, { backgroundColor: colors.successLight, borderColor: colors.success + '40' }]}>
        <Text style={[styles.offerAmount, { color: colors.success }]}>$2/mo off</Text>
        <Text style={[styles.offerDuration, { color: colors.textSecondary }]}>for the next 3 months</Text>
      </View>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.success }]}
        onPress={() => discountMutation.mutate()}
        activeOpacity={0.85}
        disabled={discountMutation.isPending}
      >
        {discountMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Accept Discount</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={goNext}
        activeOpacity={0.7}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>No thanks, continue cancelling</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerLight }]}>
        <AlertTriangle size={32} color={colors.danger} strokeWidth={1.8} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Are you sure?
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {periodEnd
          ? `Your plan will remain active until ${new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. After that, you'll be downgraded to the Starter plan.`
          : 'Your plan will be cancelled at the end of the current billing period. You can reactivate anytime before then.'}
      </Text>
      <View style={[styles.confirmInfoCard, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.confirmInfoTitle, { color: colors.text }]}>What happens next:</Text>
        <Text style={[styles.confirmInfoItem, { color: colors.textSecondary }]}>• You keep access until your billing period ends</Text>
        <Text style={[styles.confirmInfoItem, { color: colors.textSecondary }]}>• Your data is preserved (not deleted)</Text>
        <Text style={[styles.confirmInfoItem, { color: colors.textSecondary }]}>• You can reactivate anytime from Account</Text>
        <Text style={[styles.confirmInfoItem, { color: colors.textSecondary }]}>• Starter plan limits will apply after expiry</Text>
      </View>
      <TouchableOpacity
        style={[styles.dangerBtn, { backgroundColor: colors.danger }]}
        onPress={goNext}
        activeOpacity={0.85}
        disabled={cancelMutation.isPending}
      >
        {cancelMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>Confirm Cancellation</Text>
        )}
      </TouchableOpacity>
      {cancelMutation.isError && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {cancelMutation.error?.message ?? 'Something went wrong. Please try again.'}
        </Text>
      )}
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.back();
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Keep My Plan</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDoneStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSecondary }]}>
        <CheckCircle size={32} color={colors.textSecondary} strokeWidth={1.8} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        Cancellation confirmed
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {periodEnd
          ? `You'll have access to your current plan features until ${new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`
          : 'You can reactivate your subscription anytime from the Account screen.'}
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Back to Account</Text>
      </TouchableOpacity>
    </View>
  );

  const stepIndicators = ['value', 'reason', hasDiscount ? null : 'offer', 'confirm'].filter(Boolean) as Step[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step !== 'done' && (
          <View style={styles.progressRow}>
            {stepIndicators.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: stepIndicators.indexOf(step) >= i ? colors.primary : colors.surfaceTertiary,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {step === 'value' && renderValueStep()}
        {step === 'reason' && renderReasonStep()}
        {step === 'offer' && renderOfferStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'done' && renderDoneStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  progressDot: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  stepContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresList: {
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    marginBottom: 28,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  reasonsList: {
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    marginBottom: 16,
    overflow: 'hidden',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  reasonInput: {
    width: '100%',
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  offerCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 28,
  },
  offerAmount: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  offerDuration: {
    fontSize: 15,
  },
  confirmInfoCard: {
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 28,
  },
  confirmInfoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  confirmInfoItem: {
    fontSize: 14,
    lineHeight: 22,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  dangerBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
});
