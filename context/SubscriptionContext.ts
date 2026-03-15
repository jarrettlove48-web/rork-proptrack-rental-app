import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

type PurchasesPackage = any;
type CustomerInfo = any;

let Purchases: any = null;
let rcAvailable = false;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    Purchases = require('react-native-purchases').default;
    const testApiKey = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? '';
    const prodApiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
      default: '',
    }) ?? '';
    const useTestStore = __DEV__ || !prodApiKey;
    const apiKey = useTestStore ? testApiKey : prodApiKey;
    if (apiKey) {
      console.log('[RevenueCat] Configuring with platform:', Platform.OS);
      Purchases.configure({ apiKey, useAmazon: false });
      rcAvailable = true;
    } else {
      console.log('[RevenueCat] No API key, skipping');
      Purchases = null;
    }
  } catch (e) {
    console.log('[RevenueCat] Not available (likely Expo Go):', e);
    Purchases = null;
  }
}

export const [SubscriptionProvider, useSubscription] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [devOverride, setDevOverride] = useState<'starter' | 'essential' | 'pro' | null>(null);

  const customerInfoQuery = useQuery({
    queryKey: ['rc-customer-info'],
    queryFn: async () => {
      if (!Purchases) return null;
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info loaded');
        return info;
      } catch (err) {
        console.log('[RevenueCat] Failed to get customer info:', err);
        return null;
      }
    },
    enabled: rcAvailable,
    retry: 1,
  });

  const offeringsQuery = useQuery({
    queryKey: ['rc-offerings'],
    queryFn: async () => {
      if (!Purchases) return null;
      try {
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] Offerings loaded');
        return offerings;
      } catch (err) {
        console.log('[RevenueCat] Failed to get offerings:', err);
        return null;
      }
    },
    enabled: rcAvailable,
    retry: 1,
  });

  useEffect(() => {
    if (customerInfoQuery.data) {
      setCustomerInfo(customerInfoQuery.data);
    }
  }, [customerInfoQuery.data]);

  useEffect(() => {
    if (!Purchases) return;
    const listener = (info: CustomerInfo) => {
      console.log('[RevenueCat] Customer info updated via listener');
      setCustomerInfo(info);
      queryClient.setQueryData(['rc-customer-info'], info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      if (!Purchases) throw new Error('In-app purchases are not available in Expo Go. Please use a development build.');
      console.log('[RevenueCat] Purchasing package:', pkg.identifier);
      const result = await Purchases.purchasePackage(pkg);
      return result;
    },
    onSuccess: (data) => {
      console.log('[RevenueCat] Purchase successful');
      setCustomerInfo(data.customerInfo);
      queryClient.setQueryData(['rc-customer-info'], data.customerInfo);
    },
    onError: (err: unknown) => {
      const error = err as { userCancelled?: boolean; message?: string };
      if (error.userCancelled) {
        console.log('[RevenueCat] Purchase cancelled by user');
      } else {
        console.log('[RevenueCat] Purchase error:', error.message);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!Purchases) throw new Error('In-app purchases are not available in Expo Go. Please use a development build.');
      console.log('[RevenueCat] Restoring purchases');
      const info = await Purchases.restorePurchases();
      return info;
    },
    onSuccess: (info) => {
      console.log('[RevenueCat] Purchases restored');
      setCustomerInfo(info);
      queryClient.setQueryData(['rc-customer-info'], info);
    },
  });

  const _isEssential = customerInfo?.entitlements?.active?.['essential']?.isActive === true;
  const _isPro = customerInfo?.entitlements?.active?.['pro']?.isActive === true;

  const _currentPlan: 'starter' | 'essential' | 'pro' = _isPro
    ? 'pro'
    : _isEssential
    ? 'essential'
    : 'starter';

  const currentPlan = devOverride ?? _currentPlan;
  const isPro = currentPlan === 'pro';
  const isEssential = currentPlan === 'essential';

  const offerings = offeringsQuery.data ?? null;
  const essentialPackage = offerings?.current?.availablePackages?.find(
    (p: PurchasesPackage) => p.identifier === 'essential' || p.identifier === '$rc_monthly'
  ) ?? null;
  const proPackage = offerings?.current?.availablePackages?.find(
    (p: PurchasesPackage) => p.identifier === 'pro'
  ) ?? null;

  const purchasePackage = useCallback(
    (pkg: PurchasesPackage) => {
      purchaseMutation.mutate(pkg);
    },
    [purchaseMutation]
  );

  const restorePurchases = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  return {
    customerInfo,
    offerings,
    essentialPackage,
    proPackage,
    currentPlan,
    isEssential,
    isPro,
    isAvailable: rcAvailable,
    purchasePackage,
    restorePurchases,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    isLoadingOfferings: offeringsQuery.isLoading,
    isLoadingCustomerInfo: customerInfoQuery.isLoading,
    devOverride,
    setDevOverride,
  };
});
