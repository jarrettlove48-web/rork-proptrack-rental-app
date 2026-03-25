import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Users,
  UserPlus,
  Send,
  Trash2,
  CheckSquare,
  Square,
  Building2,
  Phone,
  Mail,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
type BulkAction = 'invite' | 'remove';

export default function BulkTenantsScreen() {
  const { units, properties, inviteTenant, deleteUnit } = useData();
  const { colors } = useTheme();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionInProgress, setActionInProgress] = useState(false);

  const occupiedUnits = useMemo(() => {
    return units
      .filter(u => u.isOccupied && u.tenantName)
      .map(u => ({
        ...u,
        propertyName: properties.find(p => p.id === u.propertyId)?.name ?? 'Unknown',
      }));
  }, [units, properties]);

  const uninvitedUnits = useMemo(() => {
    return occupiedUnits.filter(u => !u.isInvited);
  }, [occupiedUnits]);

  const toggleSelect = useCallback((id: string) => {
    void Haptics.selectionAsync();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    void Haptics.selectionAsync();
    if (selectedIds.size === occupiedUnits.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(occupiedUnits.map(u => u.id)));
    }
  }, [occupiedUnits, selectedIds.size]);

  const selectAllUninvited = useCallback(() => {
    void Haptics.selectionAsync();
    setSelectedIds(new Set(uninvitedUnits.map(u => u.id)));
  }, [uninvitedUnits]);

  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one tenant.');
      return;
    }

    const count = selectedIds.size;
    const selectedUnits = occupiedUnits.filter(u => selectedIds.has(u.id));

    if (action === 'invite') {
      const uninvited = selectedUnits.filter(u => !u.isInvited);
      if (uninvited.length === 0) {
        Alert.alert('Already Invited', 'All selected tenants have already been invited.');
        return;
      }

      const noContact = uninvited.filter(u => !u.tenantPhone && !u.tenantEmail);
      if (noContact.length > 0) {
        Alert.alert(
          'Missing Contact Info',
          `${noContact.length} tenant${noContact.length !== 1 ? 's' : ''} don't have phone or email. They'll be skipped.`
        );
      }

      const toInvite = uninvited.filter(u => u.tenantPhone || u.tenantEmail);
      if (toInvite.length === 0) return;

      Alert.alert(
        'Bulk Invite',
        `Send invites to ${toInvite.length} tenant${toInvite.length !== 1 ? 's' : ''}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Invites',
            onPress: async () => {
              setActionInProgress(true);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              let successCount = 0;
              for (const unit of toInvite) {
                try {
                  await inviteTenant(unit.id);
                  successCount++;
                  console.log('[BulkTenants] Invited:', unit.tenantName);
                } catch (e) {
                  console.log('[BulkTenants] Failed to invite:', unit.tenantName, e);
                }
              }
              setActionInProgress(false);
              setSelectedIds(new Set());
              Alert.alert(
                'Invites Sent',
                `Successfully invited ${successCount} of ${toInvite.length} tenant${toInvite.length !== 1 ? 's' : ''}.`
              );
            },
          },
        ]
      );
    } else if (action === 'remove') {
      Alert.alert(
        'Remove Tenants',
        `Remove ${count} unit${count !== 1 ? 's' : ''} from your properties? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove All',
            style: 'destructive',
            onPress: async () => {
              setActionInProgress(true);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              for (const id of selectedIds) {
                try {
                  await deleteUnit(id);
                  console.log('[BulkTenants] Deleted unit:', id);
                } catch (e) {
                  console.log('[BulkTenants] Failed to delete:', id, e);
                }
              }
              setActionInProgress(false);
              setSelectedIds(new Set());
              Alert.alert('Done', `${count} unit${count !== 1 ? 's' : ''} removed.`);
            },
          },
        ]
      );
    }
  }, [selectedIds, occupiedUnits, inviteTenant, deleteUnit]);

  const allSelected = selectedIds.size === occupiedUnits.length && occupiedUnits.length > 0;

  const renderTenantCard = useCallback(({ item }: { item: typeof occupiedUnits[0] }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.tenantCard,
          { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.borderLight },
          isSelected && { borderWidth: 1.5 },
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
        testID={`tenant-card-${item.id}`}
      >
        <View style={styles.cardRow}>
          <View style={styles.checkWrap}>
            {isSelected ? (
              <CheckSquare size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Square size={20} color={colors.textTertiary} strokeWidth={1.5} />
            )}
          </View>
          <View style={[styles.tenantAvatar, { backgroundColor: isSelected ? colors.primaryFaint : colors.surfaceSecondary }]}>
            <Text style={[styles.tenantAvatarText, { color: isSelected ? colors.primary : colors.textTertiary }]}>
              {item.tenantName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.tenantInfo}>
            <Text style={[styles.tenantName, { color: colors.text }]}>{item.tenantName}</Text>
            <View style={styles.tenantMeta}>
              <Building2 size={10} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.tenantMetaText, { color: colors.textTertiary }]}>
                {item.propertyName} · {item.label}
              </Text>
            </View>
            <View style={styles.contactRow}>
              {item.tenantPhone ? (
                <View style={styles.contactChip}>
                  <Phone size={9} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.contactText, { color: colors.textTertiary }]}>{item.tenantPhone}</Text>
                </View>
              ) : null}
              {item.tenantEmail ? (
                <View style={styles.contactChip}>
                  <Mail size={9} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={[styles.contactText, { color: colors.textTertiary }]} numberOfLines={1}>{item.tenantEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {item.isInvited ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.statusText, { color: colors.success }]}>Invited</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.statusText, { color: colors.warning }]}>Pending</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, colors, toggleSelect]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{occupiedUnits.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {occupiedUnits.filter(u => u.isInvited).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Invited</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{uninvitedUnits.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Pending</Text>
        </View>
      </View>

      <View style={styles.selectionBar}>
        <TouchableOpacity
          style={[styles.selectAllBtn, { backgroundColor: allSelected ? colors.primaryFaint : colors.surfaceSecondary }]}
          onPress={selectAll}
        >
          {allSelected ? (
            <CheckSquare size={14} color={colors.primary} strokeWidth={2} />
          ) : (
            <Square size={14} color={colors.textTertiary} strokeWidth={1.5} />
          )}
          <Text style={[styles.selectAllText, { color: allSelected ? colors.primary : colors.textSecondary }]}>
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        {uninvitedUnits.length > 0 && (
          <TouchableOpacity
            style={[styles.selectAllBtn, { backgroundColor: colors.warningLight }]}
            onPress={selectAllUninvited}
          >
            <UserPlus size={14} color={colors.warning} strokeWidth={2} />
            <Text style={[styles.selectAllText, { color: colors.warning }]}>
              Uninvited ({uninvitedUnits.length})
            </Text>
          </TouchableOpacity>
        )}
        {selectedIds.size > 0 && (
          <TouchableOpacity
            style={[styles.selectAllBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => setSelectedIds(new Set())}
          >
            <X size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedIds.size > 0 && (
        <Text style={[styles.selectedCount, { color: colors.primary }]}>
          {selectedIds.size} selected
        </Text>
      )}
    </View>
  ), [occupiedUnits, uninvitedUnits, selectedIds, allSelected, colors, selectAll, selectAllUninvited]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <Users size={36} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No tenants yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add tenants to your units first, then use bulk management to invite or manage them all at once.
      </Text>
    </View>
  ), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Manage Tenants' }} />
      <FlatList
        data={occupiedUnits}
        keyExtractor={(item) => item.id}
        renderItem={renderTenantCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {selectedIds.size > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => void handleBulkAction('invite')}
            disabled={actionInProgress}
            activeOpacity={0.85}
            testID="bulk-invite-btn"
          >
            <Send size={16} color={colors.textInverse} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: colors.textInverse }]}>
              {actionInProgress ? 'Sending...' : `Invite (${selectedIds.size})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30', borderWidth: 1 }]}
            onPress={() => void handleBulkAction('remove')}
            disabled={actionInProgress}
            activeOpacity={0.85}
            testID="bulk-remove-btn"
          >
            <Trash2 size={16} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  selectionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  tenantCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkWrap: {
    marginRight: 10,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tenantAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tenantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tenantMetaText: {
    fontSize: 12,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  contactText: {
    fontSize: 11,
    maxWidth: 120,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
