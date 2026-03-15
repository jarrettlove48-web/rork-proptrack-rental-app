import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Home, User as UserIcon, Plus, Pencil, Trash2, UserPlus, Check, Phone, Mail, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canAddUnit, getUnitLimitMessage } from '@/constants/plans';
import { Unit } from '@/types';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { properties, units, getUnitsForProperty, getRequestsForProperty, deleteProperty, deleteUnit } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();

  const property = useMemo(() => properties.find(p => p.id === id), [properties, id]);
  const propertyUnits = useMemo(() => getUnitsForProperty(id ?? ''), [getUnitsForProperty, id]);
  const propertyRequests = useMemo(() => getRequestsForProperty(id ?? ''), [getRequestsForProperty, id]);
  const openRequests = useMemo(() => propertyRequests.filter(r => r.status !== 'resolved'), [propertyRequests]);

  const handleDeleteProperty = useCallback(() => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to delete "${property?.name}"? This will also remove all units and requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteProperty(id ?? '');
            router.back();
          },
        },
      ]
    );
  }, [property, id, deleteProperty, router]);

  const handleDeleteUnit = useCallback((unitId: string, unitLabel: string) => {
    Alert.alert(
      'Remove Unit',
      `Remove "${unitLabel}" from this property?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteUnit(unitId);
          },
        },
      ]
    );
  }, [deleteUnit]);

  const handleInviteTenant = useCallback((unit: Unit) => {
    if (!unit.tenantPhone && !unit.tenantEmail) {
      Alert.alert('No Contact Info', 'Add a phone number or email for this tenant first.');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/invite-tenant', params: { unitId: unit.id } } as never);
  }, [router]);

  const renderUnit = useCallback(({ item }: { item: Unit }) => (
    <View style={[styles.unitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.unitHeader}>
        <View style={[styles.unitIconWrap, { backgroundColor: item.isOccupied ? colors.primaryFaint : colors.surfaceSecondary }]}>
          <Home size={14} color={item.isOccupied ? colors.primary : colors.textTertiary} strokeWidth={2} />
        </View>
        <TouchableOpacity
          style={styles.unitInfo}
          onPress={() => {
            if (item.isOccupied && item.tenantName) {
              router.push({ pathname: '/tenant-profile', params: { unitId: item.id } } as never);
            }
          }}
        >
          <Text style={[styles.unitLabel, { color: colors.text }]}>{item.label}</Text>
          {item.isOccupied ? (
            <View style={styles.tenantRow}>
              <UserIcon size={11} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.tenantName, { color: colors.textSecondary }]}>{item.tenantName}</Text>
            </View>
          ) : (
            <Text style={[styles.vacantText, { color: colors.textTertiary }]}>Vacant</Text>
          )}
        </TouchableOpacity>
        <View style={styles.unitActions}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/edit-unit', params: { unitId: item.id } } as never)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.unitActionBtn, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Pencil size={13} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteUnit(item.id, item.label)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={[styles.unitActionBtn, { backgroundColor: colors.surfaceSecondary }]}
          >
            <Trash2 size={13} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      {item.isOccupied && (
        <View style={[styles.contactRow, { borderTopColor: colors.divider }]}>
          {item.tenantPhone ? (
            <View style={styles.contactItem}>
              <Phone size={10} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.contactText, { color: colors.textTertiary }]}>{item.tenantPhone}</Text>
            </View>
          ) : null}
          {item.tenantEmail ? (
            <View style={styles.contactItem}>
              <Mail size={10} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.contactText, { color: colors.textTertiary }]}>{item.tenantEmail}</Text>
            </View>
          ) : null}
        </View>
      )}
      {item.isOccupied && item.tenantName && (
        <TouchableOpacity
          style={[styles.inviteBtn, item.isInvited ? { backgroundColor: colors.successLight } : { backgroundColor: colors.primaryFaint }]}
          onPress={() => !item.isInvited && handleInviteTenant(item)}
          activeOpacity={item.isInvited ? 1 : 0.7}
        >
          {item.isInvited ? (
            <>
              <Check size={13} color={colors.success} strokeWidth={2.5} />
              <Text style={[styles.inviteBtnText, { color: colors.success }]}>Invited</Text>
            </>
          ) : (
            <>
              <UserPlus size={13} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite Tenant</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  ), [handleDeleteUnit, handleInviteTenant, colors, router]);

  if (!property) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Property not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: property.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/edit-property', params: { id: property.id } } as never)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Pencil size={18} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={propertyUnits}
        keyExtractor={(item) => item.id}
        renderItem={renderUnit}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <View style={[styles.propertyInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>{property.address}</Text>
              <View style={styles.quickStats}>
                <View style={[styles.quickStatItem, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.quickStatValue, { color: colors.text }]}>{propertyUnits.length}</Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textTertiary }]}>Units</Text>
                </View>
                <View style={[styles.quickStatItem, openRequests.length > 0 ? { backgroundColor: colors.dangerLight } : { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.quickStatValue, openRequests.length > 0 ? { color: colors.statusOpen } : { color: colors.text }]}>
                    {openRequests.length}
                  </Text>
                  <Text style={[styles.quickStatLabel, openRequests.length > 0 ? { color: colors.statusOpen } : { color: colors.textTertiary }]}>Open</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Units</Text>
              <TouchableOpacity
                style={[styles.addUnitBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (!canAddUnit(currentPlan, units.length)) {
                    Alert.alert(
                      'Unit Limit Reached',
                      getUnitLimitMessage(currentPlan),
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
                      ]
                    );
                    return;
                  }
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push({ pathname: '/add-unit', params: { propertyId: id } } as never);
                }}
              >
                {!canAddUnit(currentPlan, units.length) ? (
                  <Lock size={14} color={colors.textInverse} strokeWidth={2.5} />
                ) : (
                  <Plus size={14} color={colors.textInverse} strokeWidth={2.5} />
                )}
                <Text style={[styles.addUnitBtnText, { color: colors.textInverse }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyUnits}>
            <Home size={32} color={colors.primaryLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No units yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add units to this property to start managing tenants.</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: colors.border }]} onPress={handleDeleteProperty}>
            <Trash2 size={14} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete Property</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  propertyInfo: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  propertyAddress: {
    fontSize: 14,
    marginBottom: 14,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  quickStatLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  addUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addUnitBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  unitCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  unitInfo: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tenantName: {
    fontSize: 13,
  },
  vacantText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    marginTop: 2,
  },
  unitActions: {
    flexDirection: 'row',
    gap: 6,
  },
  unitActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyUnits: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
