import React, { useState, useMemo, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Plus,
  X,
  Trash2,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  Copy,
  Wrench,
  UserCheck,
  Clock,
  Lock,
  Zap,
  Search,
  StickyNote,
  Pencil,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canAddContractor, getContractorLimitMessage } from '@/constants/plans';
import { Contractor, ContractorCategory, CONTRACTOR_CATEGORIES } from '@/types';

const CATEGORY_COLORS: Record<ContractorCategory, string> = {
  plumber: '#2563EB',
  electrician: '#D97706',
  general_contractor: '#059669',
  landscaper: '#16A34A',
  painter: '#DB2777',
  roofer: '#9333EA',
  hvac_tech: '#7C3AED',
  other: '#78716C',
};

export default function ContractorsScreen() {
  const router = useRouter();
  const { contractors, addContractor, updateContractor, removeContractor } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState<ContractorCategory>('general_contractor');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const isStarter = currentPlan === 'starter';

  const filteredContractors = useMemo(() => {
    if (!searchQuery.trim()) return contractors;
    const q = searchQuery.toLowerCase();
    return contractors.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [contractors, searchQuery]);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setCompany('');
    setCategory('general_contractor');
    setPhone('');
    setEmail('');
    setWebsite('');
    setNotes('');
    setShowCategoryPicker(false);
    setEditingContractor(null);
  }, []);

  const openAddModal = useCallback(() => {
    if (isStarter) {
      Alert.alert(
        'Upgrade Required',
        getContractorLimitMessage(currentPlan),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
        ]
      );
      return;
    }
    if (!canAddContractor(currentPlan, contractors.length)) {
      Alert.alert(
        'Contractor Limit',
        getContractorLimitMessage(currentPlan),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
        ]
      );
      return;
    }
    resetForm();
    setShowAddModal(true);
  }, [isStarter, currentPlan, contractors.length, resetForm, router]);

  const openEditModal = useCallback((contractor: Contractor) => {
    setEditingContractor(contractor);
    setFirstName(contractor.firstName);
    setLastName(contractor.lastName);
    setCompany(contractor.company ?? '');
    setCategory(contractor.category);
    setPhone(contractor.phone ?? '');
    setEmail(contractor.email ?? '');
    setWebsite(contractor.website ?? '');
    setNotes(contractor.notes ?? '');
    setShowAddModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.');
      return;
    }
    setIsSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (editingContractor) {
      await updateContractor(editingContractor.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company: company.trim() || null,
        category,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        notes: notes.trim() || null,
      });
    } else {
      const result = await addContractor({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        category,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (result.limitReached) {
        setIsSubmitting(false);
        Alert.alert(
          'Contractor Limit',
          getContractorLimitMessage(currentPlan),
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
          ]
        );
        return;
      }
    }

    setIsSubmitting(false);
    setShowAddModal(false);
    resetForm();
  }, [firstName, lastName, company, category, phone, email, website, notes, editingContractor, addContractor, updateContractor, resetForm, currentPlan, router]);

  const handleRemove = useCallback((contractor: Contractor) => {
    Alert.alert(
      'Remove Contractor',
      `Remove "${contractor.firstName} ${contractor.lastName}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void removeContractor(contractor.id);
          },
        },
      ]
    );
  }, [removeContractor]);

  const handleCopyInvite = useCallback((contractor: Contractor) => {
    const link = `https://app.proptrack.app/contractor-invite?code=${contractor.inviteCode}`;
    if (Platform.OS === 'web') {
      void navigator.clipboard.writeText(link);
    } else {
      import('expo-clipboard').then(Clipboard => {
        void Clipboard.setStringAsync(link);
      }).catch(() => {});
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  }, []);

  const getCategoryLabel = useCallback((cat: ContractorCategory) => {
    return CONTRACTOR_CATEGORIES.find(c => c.key === cat)?.label ?? 'Other';
  }, []);

  const renderContractor = useCallback(({ item }: { item: Contractor }) => {
    const catColor = CATEGORY_COLORS[item.category] ?? colors.textTertiary;
    const hasJoined = !!item.userId;

    return (
      <View style={[styles.contractorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '14' }]}>
            <Wrench size={12} color={catColor} strokeWidth={2} />
            <Text style={[styles.catBadgeText, { color: catColor }]}>{getCategoryLabel(item.category)}</Text>
          </View>
          <View style={[styles.statusBadge, hasJoined ? { backgroundColor: colors.successLight } : { backgroundColor: colors.warningLight }]}>
            {hasJoined ? (
              <UserCheck size={11} color={colors.success} strokeWidth={2} />
            ) : (
              <Clock size={11} color={colors.warning} strokeWidth={2} />
            )}
            <Text style={[styles.statusBadgeText, hasJoined ? { color: colors.success } : { color: colors.warning }]}>
              {hasJoined ? 'Joined' : 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={[styles.contractorName, { color: colors.text }]}>
          {item.firstName} {item.lastName}
        </Text>
        {item.company ? (
          <Text style={[styles.contractorCompany, { color: colors.textSecondary }]}>{item.company}</Text>
        ) : null}

        <View style={styles.contactRow}>
          {item.phone ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => void Linking.openURL(`tel:${item.phone}`)}
            >
              <Phone size={12} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.contactText, { color: colors.textTertiary }]}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {item.email ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => void Linking.openURL(`mailto:${item.email}`)}
            >
              <Mail size={12} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.contactText, { color: colors.textTertiary }]}>{item.email}</Text>
            </TouchableOpacity>
          ) : null}
          {item.website ? (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => {
                const url = item.website?.startsWith('http') ? item.website : `https://${item.website}`;
                void Linking.openURL(url);
              }}
            >
              <Globe size={12} color={colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.contactText, { color: colors.textTertiary }]} numberOfLines={1}>{item.website}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {item.notes ? (
          <View style={[styles.notesRow, { backgroundColor: colors.surfaceSecondary }]}>
            <StickyNote size={11} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={[styles.cardActions, { borderTopColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleCopyInvite(item)}
          >
            <Copy size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Copy Invite</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEditModal(item)}
          >
            <Pencil size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Edit</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleRemove(item)}
          >
            <Trash2 size={14} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, getCategoryLabel, handleCopyInvite, handleRemove, openEditModal]);

  const renderEmpty = useCallback(() => {
    if (isStarter) {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.warningLight }]}>
            <Lock size={32} color={colors.warning} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Contractors Feature</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Manage your preferred contractors, assign them to requests, and let them view jobs through their own portal.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeCta, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/paywall' as never)}
          >
            <Zap size={16} color={colors.textInverse} strokeWidth={2} />
            <Text style={[styles.upgradeCtaText, { color: colors.textInverse }]}>Upgrade to Essential</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
          <Wrench size={32} color={colors.primaryLight} strokeWidth={1.5} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No contractors yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Add your preferred contractors to assign them to maintenance requests.
        </Text>
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={[styles.emptyCtaText, { color: colors.textInverse }]}>Add Contractor</Text>
        </TouchableOpacity>
      </View>
    );
  }, [isStarter, colors, router, openAddModal]);

  const renderAddModal = () => (
    <Modal visible={showAddModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingContractor ? 'Edit Contractor' : 'Add Contractor'}
            </Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={20} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.nameRow}>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>First Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={[styles.modalField, { flex: 1 }]}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Last Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Company (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={company}
                onChangeText={setCompany}
                placeholder="Company name"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[category] ?? '#78716C' }]} />
                <Text style={[styles.modalPickerText, { color: colors.text }]}>
                  {getCategoryLabel(category)}
                </Text>
                <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {CONTRACTOR_CATEGORIES.map(c => (
                    <TouchableOpacity
                      key={c.key}
                      style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, category === c.key && { backgroundColor: colors.primaryFaint }]}
                      onPress={() => { setCategory(c.key); setShowCategoryPicker(false); }}
                    >
                      <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[c.key] ?? '#78716C' }]} />
                      <Text style={[styles.modalDropdownText, { color: colors.text }, category === c.key && { color: colors.primary, fontWeight: '600' as const }]}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Phone (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Email (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="contractor@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Website (optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={website}
                onChangeText={setWebsite}
                placeholder="www.example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Notes (optional)</Text>
              <TextInput
                style={[styles.modalTextArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any notes about this contractor..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, (!firstName.trim() || !lastName.trim() || isSubmitting) && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={!firstName.trim() || !lastName.trim() || isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitText}>
                {editingContractor ? 'Save Changes' : 'Add Contractor'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="contractors-screen">
      <Stack.Screen
        options={{
          title: 'Contractors',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={styles.headerActions}>
              {contractors.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowSearch(!showSearch)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 16 }}
                >
                  <Search size={20} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={openAddModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isStarter ? (
                  <Lock size={20} color={colors.textTertiary} strokeWidth={2} />
                ) : (
                  <Plus size={22} color={colors.primary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <Search size={16} color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contractors..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <FlatList
        data={filteredContractors}
        keyExtractor={(item) => item.id}
        renderItem={renderContractor}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderAddModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  contractorCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  contractorName: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  contractorCompany: {
    fontSize: 13,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  notesText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionDivider: {
    width: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  upgradeCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  modalTextArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
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
