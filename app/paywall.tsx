import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, Crown, Building2, Shield, Zap, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';

const PLAN_DATA = [
  {
    id: 'essential' as const,
    name: 'Essential',
    tagline: 'Perfect for getting started',
    price: '$9',
    period: '/mo',
    units: 'Up to 3 units',
    icon: Building2,
    features: [
      'Full iOS & Android app',
      'Push notifications',
      'Photo uploads',
      'Request history',
      'Expense tracker',
      'Rent reminders (SMS/email)',
      'Lease document storage',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    tagline: 'For growing portfolios',
    price: '$19',
    period: '/mo',
    units: 'Up to 10 units',
    icon: Crown,
    popular: true,
    features: [
      'Everything in Essential',
      'Multi-property dashboard',
      'Annual reports & analytics',
      'Priority support',
      'Advanced expense tracking',
      'Bulk tenant management',
    ],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    essentialPackage,
    proPackage,
    purchasePackage,
    restorePurchases,
    isPurchasing,
    isRestoring,
    isLoadingOfferings,
    isAvailable,
    currentPlan,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'essential' | 'pro'>('pro');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePurchase = async () => {
    if (!isAvailable) {
      Alert.alert('Not Available', 'In-app purchases require a development build. They are not supported in Expo Go.');
      return;
    }
    const pkg = selectedPlan === 'essential' ? essentialPackage : proPackage;
    if (!pkg) {
      Alert.alert('Unavailable', 'This plan is not available right now. Please try again later.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    purchasePackage(pkg);
  };

  const handleRestore = () => {
    if (!isAvailable) {
      Alert.alert('Not Available', 'In-app purchases require a development build. They are not supported in Expo Go.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    restorePurchases();
  };

  if (currentPlan !== 'starter') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.back()}
          >
            <X size={18} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.activeContainer}>
          <View style={[styles.activeIcon, { backgroundColor: colors.successLight }]}>
            <Crown size={32} color={colors.success} strokeWidth={1.5} />
          </View>
          <Text style={[styles.activeTitle, { color: colors.text }]}>You're on {currentPlan === 'pro' ? 'Pro' : 'Essential'}</Text>
          <Text style={[styles.activeSubtitle, { color: colors.textSecondary }]}>
            Your subscription is active. Enjoy all the features!
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneBtnText, { color: colors.textInverse }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => router.back()}
        >
          <X size={18} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRestore} disabled={isRestoring}>
          <Text style={[styles.restoreText, { color: colors.primary }]}>
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.heroSection}>
            <View style={[styles.heroIconWrap, { backgroundColor: colors.primaryFaint }]}>
              <Zap size={28} color={colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Upgrade PropTrack
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Manage more properties with powerful tools
            </Text>
          </View>

          <View style={styles.planSelector}>
            {PLAN_DATA.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const Icon = plan.icon;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlan(plan.id);
                  }}
                  activeOpacity={0.8}
                >
                  {plan.popular && (
                    <View style={[styles.popularTag, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.popularTagText, { color: colors.textInverse }]}>BEST VALUE</Text>
                    </View>
                  )}
                  <View style={styles.planOptionHeader}>
                    <View style={[styles.planIconWrap, { backgroundColor: isSelected ? colors.primaryFaint : colors.surfaceSecondary }]}>
                      <Icon size={18} color={isSelected ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
                    </View>
                    <View style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? colors.primary : colors.border },
                    ]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                  </View>
                  <Text style={[styles.planOptionName, { color: colors.text }]}>{plan.name}</Text>
                  <Text style={[styles.planOptionTagline, { color: colors.textSecondary }]}>{plan.tagline}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={[styles.planOptionPrice, { color: colors.text }]}>{plan.price}</Text>
                    <Text style={[styles.planOptionPeriod, { color: colors.textTertiary }]}>{plan.period}</Text>
                  </View>
                  <Text style={[styles.planOptionUnits, { color: colors.textSecondary }]}>{plan.units}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.featuresSection}>
            <Text style={[styles.featuresSectionTitle, { color: colors.text }]}>
              What's included in {selectedPlan === 'pro' ? 'Pro' : 'Essential'}
            </Text>
            {PLAN_DATA.find(p => p.id === selectedPlan)?.features.map((feature, i) => (
              <View key={i} style={styles.featureItem}>
                <View style={[styles.featureCheck, { backgroundColor: colors.primaryFaint }]}>
                  <Check size={12} color={colors.primary} strokeWidth={3} />
                </View>
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={[
                styles.ctaBtn,
                { backgroundColor: colors.primary },
                (isPurchasing || isLoadingOfferings) && { opacity: 0.7 },
              ]}
              onPress={handlePurchase}
              disabled={isPurchasing || isLoadingOfferings}
              activeOpacity={0.85}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <>
                  <Text style={[styles.ctaBtnText, { color: colors.textInverse }]}>
                    Subscribe to {selectedPlan === 'pro' ? 'Pro' : 'Essential'}
                  </Text>
                  <ArrowRight size={18} color={colors.textInverse} strokeWidth={2} />
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.ctaDisclaimer, { color: colors.textTertiary }]}>
              Cancel anytime. Subscription auto-renews monthly.
            </Text>
          </View>

          <View style={styles.trustSection}>
            <View style={styles.trustRow}>
              <Shield size={14} color={colors.textTertiary} strokeWidth={1.8} />
              <Text style={[styles.trustText, { color: colors.textTertiary }]}>
                Secure payment via {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'RevenueCat'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  planSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  planOption: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  popularTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  popularTagText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planOptionName: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  planOptionTagline: {
    fontSize: 12,
    marginBottom: 10,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planOptionPrice: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  planOptionPeriod: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 2,
  },
  planOptionUnits: {
    fontSize: 12,
    marginTop: 4,
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  featuresSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  ctaDisclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  trustSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 20,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 12,
  },
  activeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  activeIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  activeSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
