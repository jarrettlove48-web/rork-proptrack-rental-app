import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Home, User as UserIcon, Plus, Pencil, Trash2, UserPlus, Check, Phone, Mail, Lock, Calendar, LogOut, X, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canAddUnit, getUnitLimitMessage } from '@/constants/plans';
import { Unit, Tenant } from '@/types';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    properties, units, getUnitsForProperty, getRequestsForProperty,
    deleteProperty, deleteUnit, getTenantsForUnit, moveTenantOut, addTenant,
  } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();

  const property = useMemo(() => properties.find(p => p.id === id), [properties, id]);
  const propertyUnits = useMemo(() => getUnitsForProperty(id ?? ''), [getUnitsForProperty, id]);
  const propertyRequests = useMemo(() => getRequestsForProperty(id ?? ''), [getRequestsForProperty, id]);
  const openRequests = useMemo(() => propertyRequests.filter(r => r.status !== 'resolved'), [propertyRequests]);

  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [addTenantUnitId, setAddTenantUnitId] = useState<string>('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantEmail, setNewTenantEmail] = useState('');
  const [newTenantPhone, setNewTenantPhone] = useState('');
  const [newTenantLeaseEnd, setNewTenantLeaseEnd] = useState('');
  const [showLeaseEndPicker, setShowLeaseEndPicker] = useState(false);
  const [isSubmittingTenant, setIsSubmittingTenant] = useState(false);

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

  const handleMoveTenantOut = useCallback((tenant: Tenant) => {
    Alert.alert(
      'Move Tenant Out',
      `Move out "${tenant.name}"? Their record will be preserved for history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move Out',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void moveTenantOut(tenant.id, tenant.unitId);
          },
        },
      ]
    );
  }, [moveTenantOut]);

  const openAddTenantModal = useCallback((unitId: string) => {
    setAddTenantUnitId(unitId);
    setNewTenantName('');
    setNewTenantEmail('');
    setNewTenantPhone('');
    setNewTenantLeaseEnd('');
    setShowAddTenantModal(true);
  }, []);

  const handleAddTenant = useCallback(async () => {
    if (!newTenantName.trim() || !addTenantUnitId || !id) return;
    setIsSubmittingTenant(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTenant({
      unitId: addTenantUnitId,
      propertyId: id,
      name: newTenantName.trim(),
      email: newTenantEmail.trim() || undefined,
      phone: newTenantPhone.trim() || undefined,
      moveInDate: new Date().toISOString().split('T')[0],
      leaseEnd: newTenantLeaseEnd || undefined,
    });
    setIsSubmittingTenant(false);
    setShowAddTenantModal(false);
  }, [newTenantName, newTenantEmail, newTenantPhone, newTenantLeaseEnd, addTenantUnitId, id, addTenant]);

  const renderTenantRow = useCallback((tenant: Tenant) => (
    <View key={tenant.id} style={[styles.tenantRecord, { backgroundColor: colors.surfaceSecondary }]}>
      <View style={styles.tenantRecordHeader}>
        <View style={styles.tenantRecordInfo}>
          <View style={styles.tenantNameRow}>
            <UserIcon size={12} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.tenantRecordName, { color: colors.text }]}>{tenant.name}</Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: colors.successLight }]}>
            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.activeBadgeText, { color: colors.success }]}>Active</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.moveOutBtn, { backgroundColor: colors.dangerLight }]}
          onPress={() => handleMoveTenantOut(tenant)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LogOut size={12} color={colors.danger} strokeWidth={2} />
          <Text style={[styles.moveOutText, { color: colors.danger }]}>Move Out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tenantContactRow}>
        {tenant.phone ? (
          <View style={styles.tenantContactItem}>
            <Phone size={10} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.tenantContactText, { color: colors.textTertiary }]}>{tenant.phone}</Text>
          </View>
        ) : null}
        {tenant.email ? (
          <View style={styles.tenantContactItem}>
            <Mail size={10} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.tenantContactText, { color: colors.textTertiary }]}>{tenant.email}</Text>
          </View>
        ) : null}
        {tenant.leaseEnd ? (
          <View style={styles.tenantContactItem}>
            <Calendar size={10} color={colors.warning} strokeWidth={2} />
            <Text style={[styles.tenantContactText, { color: colors.warning }]}>
              Lease ends {new Date(tenant.leaseEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        ) : null}
        {tenant.moveInDate ? (
          <View style={styles.tenantContactItem}>
            <Calendar size={10} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.tenantContactText, { color: colors.textTertiary }]}>
              Moved in {new Date(tenant.moveInDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  ), [colors, handleMoveTenantOut]);

  const renderUnit = useCallback(({ item }: { item: Unit }) => {
    const unitTenants = getTenantsForUnit(item.id);
    const hasTenantRecords = unitTenants.length > 0;
    const showLegacyTenant = !hasTenantRecords && item.isOccupied && item.tenantName;

    return (
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
            {hasTenantRecords ? (
              <Text style={[styles.tenantCountText, { color: colors.textSecondary }]}>
                {unitTenants.length} tenant{unitTenants.length > 1 ? 's' : ''}
              </Text>
            ) : item.isOccupied ? (
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

        {hasTenantRecords && (
          <View style={[styles.tenantsSection, { borderTopColor: colors.divider }]}>
            {unitTenants.map(renderTenantRow)}
            <TouchableOpacity
              style={[styles.addTenantSmallBtn, { backgroundColor: colors.primaryFaint }]}
              onPress={() => openAddTenantModal(item.id)}
            >
              <Plus size={12} color={colors.primary} strokeWidth={2.5} />
              <Text style={[styles.addTenantSmallText, { color: colors.primary }]}>Add Tenant</Text>
            </TouchableOpacity>
          </View>
        )}

        {showLegacyTenant && (
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
            {item.leaseEndDate ? (
              <View style={styles.contactItem}>
                <Calendar size={10} color={colors.warning} strokeWidth={2} />
                <Text style={[styles.contactText, { color: colors.warning }]}>Lease ends {new Date(item.leaseEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
              </View>
            ) : null}
          </View>
        )}

        {!hasTenantRecords && !item.isOccupied && (
          <TouchableOpacity
            style={[styles.addTenantVacantBtn, { backgroundColor: colors.primaryFaint, borderTopColor: colors.divider }]}
            onPress={() => openAddTenantModal(item.id)}
          >
            <Plus size={13} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.addTenantVacantText, { color: colors.primary }]}>Add Tenant</Text>
          </TouchableOpacity>
        )}

        {(hasTenantRecords || showLegacyTenant) && item.isOccupied && item.tenantName && (
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
    );
  }, [handleDeleteUnit, handleInviteTenant, colors, router, getTenantsForUnit, renderTenantRow, openAddTenantModal]);

  const renderAddTenantModal = () => (
    <Modal visible={showAddTenantModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Tenant</Text>
            <TouchableOpacity onPress={() => setShowAddTenantModal(false)}>
              <X size={20} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newTenantName}
                onChangeText={setNewTenantName}
                placeholder="Tenant name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newTenantEmail}
                onChangeText={setNewTenantEmail}
                placeholder="tenant@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Phone (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newTenantPhone}
                onChangeText={setNewTenantPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Lease End (optional)</Text>
              <TouchableOpacity
                style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowLeaseEndPicker(!showLeaseEndPicker)}
              >
                <Text style={[styles.modalPickerText, { color: newTenantLeaseEnd ? colors.text : colors.textTertiary }]}>
                  {newTenantLeaseEnd
                    ? new Date(newTenantLeaseEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Select a date'}
                </Text>
                <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              {showLeaseEndPicker && (
                <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ScrollView style={{ maxHeight: 180 }}>
                    {Array.from({ length: 24 }).map((_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + i + 1);
                      d.setDate(1);
                      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                      const lbl = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      return (
                        <TouchableOpacity
                          key={dateStr}
                          style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, newTenantLeaseEnd === dateStr && { backgroundColor: colors.primaryFaint }]}
                          onPress={() => { setNewTenantLeaseEnd(dateStr); setShowLeaseEndPicker(false); }}
                        >
                          <Text style={[styles.modalDropdownText, { color: colors.text }, newTenantLeaseEnd === dateStr && { color: colors.primary, fontWeight: '600' as const }]}>{lbl}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {newTenantLeaseEnd ? (
                      <TouchableOpacity
                        style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }]}
                        onPress={() => { setNewTenantLeaseEnd(''); setShowLeaseEndPicker(false); }}
                      >
                        <Text style={[styles.modalDropdownText, { color: colors.danger }]}>Clear</Text>
                      </TouchableOpacity>
                    ) : null}
                  </ScrollView>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, (!newTenantName.trim() || isSubmittingTenant) && { opacity: 0.4 }]}
              onPress={handleAddTenant}
              disabled={!newTenantName.trim() || isSubmittingTenant}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitText}>Add Tenant</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
      {renderAddTenantModal()}
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
  tenantCountText: {
    fontSize: 13,
    marginTop: 2,
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
  tenantsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  tenantRecord: {
    borderRadius: 10,
    padding: 10,
  },
  tenantRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tenantRecordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tenantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tenantRecordName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  moveOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  moveOutText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tenantContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tenantContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tenantContactText: {
    fontSize: 11,
  },
  addTenantSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addTenantSmallText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addTenantVacantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 2,
    borderTopWidth: 0.5,
  },
  addTenantVacantText: {
    fontSize: 13,
    fontWeight: '600' as const,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  modalPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 8,
  },
  modalPickerText: {
    flex: 1,
    fontSize: 15,
  },
  modalDropdown: {
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  modalDropdownText: {
    fontSize: 14,
  },
  modalSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
