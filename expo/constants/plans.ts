export type PlanTier = 'starter' | 'essential' | 'pro';

export interface TierLimits {
  maxProperties: number;
  maxUnits: number;
  maxContractors: number;
  expenseTracking: boolean;
  advancedAnalytics: boolean;
  bulkTenantManagement: boolean;
}

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  starter: {
    maxProperties: 1,
    maxUnits: 3,
    maxContractors: 0,
    expenseTracking: false,
    advancedAnalytics: false,
    bulkTenantManagement: false,
  },
  essential: {
    maxProperties: 5,
    maxUnits: 15,
    maxContractors: 5,
    expenseTracking: true,
    advancedAnalytics: false,
    bulkTenantManagement: false,
  },
  pro: {
    maxProperties: Infinity,
    maxUnits: Infinity,
    maxContractors: Infinity,
    expenseTracking: true,
    advancedAnalytics: true,
    bulkTenantManagement: true,
  },
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  starter: 'Starter',
  essential: 'Essential',
  pro: 'Pro',
};

export function getTierLimits(plan: PlanTier): TierLimits {
  return TIER_LIMITS[plan];
}

export function canAddProperty(plan: PlanTier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[plan].maxProperties;
}

export function canAddUnit(plan: PlanTier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[plan].maxUnits;
}

export function canTrackExpenses(plan: PlanTier): boolean {
  return TIER_LIMITS[plan].expenseTracking;
}

export function canAddContractor(plan: PlanTier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[plan].maxContractors;
}

export function getContractorLimitMessage(plan: PlanTier): string {
  if (plan === 'starter') {
    return 'Contractors are available on the Essential plan and above. Upgrade to start managing your preferred contractors.';
  }
  const limit = TIER_LIMITS[plan].maxContractors;
  return `You've reached your ${limit} contractor limit on the ${PLAN_NAMES[plan]} plan. Upgrade to Pro for unlimited contractors.`;
}

export function getUpgradeMessage(feature: string, plan: PlanTier): string {
  const nextPlan = plan === 'starter' ? 'Essential' : 'Pro';
  return `Upgrade to ${nextPlan} to ${feature}.`;
}

export function getPropertyLimitMessage(plan: PlanTier): string {
  const limit = TIER_LIMITS[plan].maxProperties;
  const nextPlan = plan === 'starter' ? 'Essential' : 'Pro';
  return `You've reached your ${limit} property limit on the ${PLAN_NAMES[plan]} plan. Upgrade to ${nextPlan} to add more properties.`;
}

export function getUnitLimitMessage(plan: PlanTier): string {
  const limit = TIER_LIMITS[plan].maxUnits;
  const nextPlan = plan === 'starter' ? 'Essential' : 'Pro';
  return `You've reached your ${limit} unit limit on the ${PLAN_NAMES[plan]} plan. Upgrade to ${nextPlan} to add more units.`;
}
