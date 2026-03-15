import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { X, DollarSign, ChevronDown, Camera, Crown, Repeat } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canTrackExpenses } from '@/constants/plans';
import * as ImagePicker from 'expo-image-picker';
import { EXPENSE_CATEGORIES, Expense } from '@/types';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { properties, units, addExpense } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();
  const canExpense = canTrackExpenses(currentPlan);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category'] | null>(null);
  const [vendor, setVendor] = useState('');
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const { isPro } = useSubscription();

  const availableUnits = useMemo(() => units.filter(u => u.propertyId === selectedPropertyId), [units, selectedPropertyId]);
  const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId), [units, selectedUnitId]);

  const isValid = selectedPropertyId && description.trim().length > 0 && amount.trim().length > 0 && category;

  const handleSubmit = useCallback(() => {
    if (!isValid || !category) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void addExpense({
      propertyId: selectedPropertyId,
      unitId: selectedUnitId || undefined,
      description: description.trim(),
      amount: parsedAmount,
      category,
      date: new Date().toISOString(),
      vendor: vendor.trim() || undefined,
    });
    Alert.alert('Expense Logged', `$${parsedAmount.toFixed(2)} expense has been recorded.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [isValid, category, amount, selectedPropertyId, selectedUnitId, description, vendor, addExpense, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Add Expense',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!canExpense ? (
          <View style={styles.lockedSection}>
            <View style={[styles.iconWrap, { backgroundColor: colors.warningLight }]}>
              <DollarSign size={24} color={colors.warning} strokeWidth={2} />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Expense Tracking</Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>Expense tracking is available on the Essential plan and above. Upgrade to start logging expenses for tax season.</Text>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/paywall' as never)}
              activeOpacity={0.8}
            >
              <Text style={[styles.upgradeBtnText, { color: colors.textInverse }]}>Upgrade Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
          <DollarSign size={24} color={colors.accent} strokeWidth={2} />
        </View>
        <Text style={[styles.heading, { color: colors.text }]}>Log Expense</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Track repair and maintenance costs for tax season.</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <DollarSign size={16} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              testID="expense-amount-input"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoryRow}>
            {EXPENSE_CATEGORIES.map(cat => {
              const isActive = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryPill,
                    { borderColor: isActive ? colors.primary : colors.border },
                    isActive && { backgroundColor: colors.primaryFaint },
                  ]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, { color: colors.textSecondary }, isActive && { color: colors.primary, fontWeight: '700' as const }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Property</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPropertyPicker(!showPropertyPicker)}
          >
            <Text style={[styles.pickerBtnText, { color: colors.text }, !selectedProperty && { color: colors.textTertiary }]}>
              {selectedProperty?.name ?? 'Select a property'}
            </Text>
            <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
          {showPropertyPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {properties.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerOption, p.id === selectedPropertyId && { backgroundColor: colors.primaryFaint }, { borderBottomColor: colors.divider }]}
                  onPress={() => { setSelectedPropertyId(p.id); setSelectedUnitId(''); setShowPropertyPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, { color: colors.text }, p.id === selectedPropertyId && { color: colors.primary, fontWeight: '600' as const }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {selectedPropertyId && availableUnits.length > 0 ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Unit (optional)</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowUnitPicker(!showUnitPicker)}
            >
              <Text style={[styles.pickerBtnText, { color: colors.text }, !selectedUnit && { color: colors.textTertiary }]}>
                {selectedUnit?.label ?? 'Select a unit (optional)'}
              </Text>
              <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
            {showUnitPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {availableUnits.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.pickerOption, u.id === selectedUnitId && { backgroundColor: colors.primaryFaint }, { borderBottomColor: colors.divider }]}
                    onPress={() => { setSelectedUnitId(u.id); setShowUnitPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.text }, u.id === selectedUnitId && { color: colors.primary, fontWeight: '600' as const }]}>{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What was this expense for?"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Vendor (optional)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={vendor}
              onChangeText={setVendor}
              placeholder="e.g. Joe's Plumbing"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {isPro && (
          <View style={styles.fieldGroup}>
            <View style={styles.proLabelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Receipt Photo</Text>
              <View style={[styles.proBadge, { backgroundColor: colors.accentLight }]}>
                <Crown size={10} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.proBadgeText, { color: colors.accent }]}>PRO</Text>
              </View>
            </View>
            {receiptUri ? (
              <View style={[styles.receiptPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Camera size={16} color={colors.success} strokeWidth={2} />
                <Text style={[styles.receiptText, { color: colors.success }]} numberOfLines={1}>Receipt attached</Text>
                <TouchableOpacity onPress={() => setReceiptUri('')}>
                  <X size={16} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.receiptBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={async () => {
                  try {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      quality: 0.7,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setReceiptUri(result.assets[0].uri);
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  } catch (e) {
                    console.log('[AddExpense] Image picker failed:', e);
                  }
                }}
              >
                <Camera size={18} color={colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.receiptBtnText, { color: colors.textSecondary }]}>Attach Receipt Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isPro && (
          <View style={styles.fieldGroup}>
            <View style={styles.proLabelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Recurring</Text>
              <View style={[styles.proBadge, { backgroundColor: colors.accentLight }]}>
                <Crown size={10} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.proBadgeText, { color: colors.accent }]}>PRO</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.recurringBtn,
                { backgroundColor: colors.surface, borderColor: isRecurring ? colors.primary : colors.border },
                isRecurring && { backgroundColor: colors.primaryFaint },
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                setIsRecurring(!isRecurring);
              }}
            >
              <Repeat size={16} color={isRecurring ? colors.primary : colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.recurringBtnText, { color: isRecurring ? colors.primary : colors.textSecondary }]}>
                {isRecurring ? 'Monthly recurring expense' : 'Mark as recurring monthly'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <DollarSign size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Log Expense</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  heading: { fontSize: 22, fontWeight: '700' as const, textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  subheading: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600' as const, marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, gap: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 14, fontWeight: '500' as const },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1 },
  pickerBtnText: { fontSize: 15 },
  pickerDropdown: { borderRadius: 12, marginTop: 4, borderWidth: 1, overflow: 'hidden' },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5 },
  pickerOptionText: { fontSize: 15 },
  textArea: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, minHeight: 80, borderWidth: 1 },
  submitBtn: { flexDirection: 'row', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '600' as const },
  lockedSection: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  upgradeBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  upgradeBtnText: { fontSize: 16, fontWeight: '600' as const },
  proLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  proBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 },
  proBadgeText: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.5 },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 16, borderWidth: 1, borderStyle: 'dashed' as const, gap: 8 },
  receiptBtnText: { fontSize: 14, fontWeight: '500' as const },
  receiptPreview: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, gap: 8 },
  receiptText: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  recurringBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, gap: 10 },
  recurringBtnText: { fontSize: 14, fontWeight: '500' as const },
});
