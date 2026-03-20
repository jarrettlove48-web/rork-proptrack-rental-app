import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, MapPin, ChevronRight, Plus, Wrench, MessageCircle, DollarSign, UserPlus, Activity, Zap, HardHat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canAddProperty, getPropertyLimitMessage, TIER_LIMITS } from '@/constants/plans';
import { Property, ActivityItem } from '@/types';
import { formatDate } from '@/utils/helpers';

export default function PropertiesScreen() {
  const router = useRouter();
  const { properties, units, requests, openRequestCount, occupiedUnitCount, recentActivities, refetchAll } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const propertyAtLimit = !canAddProperty(currentPlan, properties.length);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);


  const handleAddProperty = useCallback(() => {
    if (propertyAtLimit) {
      Alert.alert(
        'Property Limit Reached',
        getPropertyLimitMessage(currentPlan),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
        ]
      );
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-property' as never);
  }, [router, propertyAtLimit, currentPlan]);

  const getPropertyStats = useCallback((propertyId: string) => {
    const propertyUnits = units.filter(u => u.propertyId === propertyId);
    const occupied = propertyUnits.filter(u => u.isOccupied).length;
    const openReqs = requests.filter(r => r.propertyId === propertyId && r.status !== 'resolved').length;
    return { unitCount: propertyUnits.length, occupied, openReqs };
  }, [units, requests]);

  const getActivityIcon = useCallback((type: ActivityItem['type']) => {
    switch (type) {
      case 'request_created':
      case 'request_updated':
        return <Wrench size={13} color={colors.statusOpen} strokeWidth={2} />;
      case 'message_sent':
        return <MessageCircle size={13} color={colors.info} strokeWidth={2} />;
      case 'property_added':
      case 'unit_added':
        return <Building2 size={13} color={colors.primary} strokeWidth={2} />;
      case 'expense_added':
        return <DollarSign size={13} color={colors.warning} strokeWidth={2} />;
      case 'tenant_invited':
        return <UserPlus size={13} color={colors.success} strokeWidth={2} />;
      case 'contractor_added':
      case 'contractor_assigned':
        return <HardHat size={13} color={colors.accent} strokeWidth={2} />;
      default:
        return <Activity size={13} color={colors.textTertiary} strokeWidth={2} />;
    }
  }, [colors]);

  const renderPropertyCard = useCallback(({ item }: { item: Property }) => {
    const stats = getPropertyStats(item.id);
    return (
      <TouchableOpacity
        style={[styles.propertyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/(tabs)/(properties)/[id]' as never, params: { id: item.id } });
        }}
        activeOpacity={0.7}
        testID={`property-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconWrap, { backgroundColor: colors.primaryFaint }]}>
            <Building2 size={18} color={colors.primary} strokeWidth={1.8} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.propertyName, { color: colors.text }]}>{item.name}</Text>
            <View style={styles.addressRow}>
              <MapPin size={11} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.propertyAddress, { color: colors.textTertiary }]} numberOfLines={1}>{item.address}</Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.unitCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>units</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.occupied}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>occupied</Text>
          </View>
          {stats.openReqs > 0 && (
            <View style={[styles.statChip, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.statValue, { color: colors.danger }]}>{stats.openReqs}</Text>
              <Text style={[styles.statLabel, { color: colors.danger }]}>open</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getPropertyStats, router, colors]);

  const renderDashboard = useCallback(() => (
    <View style={styles.dashboard}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Overview</Text>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleAddProperty}
          testID="add-property-btn"
        >
          <Plus size={18} color={colors.textInverse} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {currentPlan === 'starter' && (
        <TouchableOpacity
          style={[styles.upgradeBanner, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
          onPress={() => router.push('/paywall' as never)}
          activeOpacity={0.8}
        >
          <View style={[styles.upgradeBannerIcon, { backgroundColor: colors.accent }]}>
            <Zap size={14} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.upgradeBannerText}>
            <Text style={[styles.upgradeBannerTitle, { color: colors.text }]}>Free Plan</Text>
            <Text style={[styles.upgradeBannerSub, { color: colors.textSecondary }]}>
              {properties.length}/{TIER_LIMITS.starter.maxProperties} properties · {units.length}/{TIER_LIMITS.starter.maxUnits} units
            </Text>
          </View>
          <Text style={[styles.upgradeBannerCta, { color: colors.accent }]}>Upgrade</Text>
        </TouchableOpacity>
      )}

      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{openRequestCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Open</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{occupiedUnitCount}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Tenants</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.metricValue, { color: colors.text }]}>{properties.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary }]}>Properties</Text>
        </View>
      </View>

      {recentActivities.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {recentActivities.map((activity, index) => (
              <View key={activity.id}>
                <TouchableOpacity
                  style={styles.activityRow}
                  onPress={() => {
                    const hasNav = activity.relatedId || activity.relatedPropertyId;
                    if (!hasNav) return;
                    if (activity.type === 'request_created' || activity.type === 'request_updated' || activity.type === 'message_sent') {
                      if (activity.relatedId) router.push({ pathname: '/request-detail', params: { id: activity.relatedId } } as never);
                    } else if (activity.type === 'property_added') {
                      if (activity.relatedId) router.push({ pathname: '/(tabs)/(properties)/[id]', params: { id: activity.relatedId } } as never);
                    } else if (activity.type === 'unit_added' || activity.type === 'tenant_invited') {
                      if (activity.relatedPropertyId) router.push({ pathname: '/(tabs)/(properties)/[id]', params: { id: activity.relatedPropertyId } } as never);
                    } else if (activity.type === 'expense_added') {
                      router.push('/(tabs)/expenses' as never);
                    } else if (activity.type === 'contractor_added') {
                      router.push('/contractors' as never);
                    } else if (activity.type === 'contractor_assigned') {
                      if (activity.relatedId) router.push({ pathname: '/request-detail', params: { id: activity.relatedId } } as never);
                    }
                  }}
                  activeOpacity={activity.relatedId || activity.relatedPropertyId ? 0.7 : 1}
                >
                  <View style={[styles.activityIconWrap, { backgroundColor: colors.surfaceSecondary }]}>
                    {getActivityIcon(activity.type)}
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                    <Text style={[styles.activitySubtitle, { color: colors.textTertiary }]} numberOfLines={1}>{activity.subtitle}</Text>
                  </View>
                  <Text style={[styles.activityTime, { color: colors.textTertiary }]}>{formatDate(activity.timestamp)}</Text>
                </TouchableOpacity>
                {index < recentActivities.length - 1 && <View style={[styles.activityDivider, { backgroundColor: colors.divider }]} />}
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Properties</Text>
    </View>
  ), [openRequestCount, occupiedUnitCount, properties.length, units.length, router, colors, recentActivities, getActivityIcon, handleAddProperty, currentPlan]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <Building2 size={40} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No properties yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add your first property to start tracking maintenance and managing tenants.
      </Text>
      <TouchableOpacity
        style={[styles.emptyCta, { backgroundColor: colors.primary }]}
        onPress={handleAddProperty}
      >
        <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
        <Text style={[styles.emptyCtaText, { color: colors.textInverse }]}>Add Property</Text>
      </TouchableOpacity>
    </View>
  ), [colors, handleAddProperty]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderPropertyCard}
        ListHeaderComponent={renderDashboard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  dashboard: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start' as const,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  activitySection: {
    marginBottom: 28,
  },
  activityCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  activitySubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  activityTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  activityDivider: {
    height: 0.5,
    marginLeft: 56,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  propertyCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  propertyAddress: {
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  upgradeBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  upgradeBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  upgradeBannerCta: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
