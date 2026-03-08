import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Home, User, Phone, Mail, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';

export default function EditUnitScreen() {
  const router = useRouter();
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const { units, updateUnit } = useData();
  const { colors } = useTheme();

  const unit = useMemo(() => units.find(u => u.id === unitId), [units, unitId]);

  const [label, setLabel] = useState(unit?.label ?? '');
  const [isOccupied, setIsOccupied] = useState(unit?.isOccupied ?? true);
  const [tenantName, setTenantName] = useState(unit?.tenantName ?? '');
  const [tenantPhone, setTenantPhone] = useState(unit?.tenantPhone ?? '');
  const [tenantEmail, setTenantEmail] = useState(unit?.tenantEmail ?? '');

  const isValid = label.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid || !unitId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateUnit(unitId, {
      label: label.trim(),
      tenantName: tenantName.trim(),
      tenantPhone: tenantPhone.trim(),
      tenantEmail: tenantEmail.trim(),
      isOccupied,
    });
    router.back();
  }, [label, tenantName, tenantPhone, tenantEmail, isOccupied, unitId, isValid, updateUnit, router]);

  if (!unit) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Edit Unit' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Unit not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Edit Unit',
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
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryFaint }]}>
          <Home size={24} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={[styles.heading, { color: colors.text }]}>Edit Unit</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Update unit details and tenant info.</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Unit Label</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Home size={16} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={label}
              onChangeText={setLabel}
              placeholder='e.g. "Unit A" or "#201"'
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.toggleLabel, { color: colors.text }]}>Unit is occupied</Text>
          <Switch
            value={isOccupied}
            onValueChange={setIsOccupied}
            trackColor={{ false: colors.surfaceTertiary, true: colors.primaryMuted }}
            thumbColor={isOccupied ? colors.primary : colors.textTertiary}
          />
        </View>

        {isOccupied && (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tenant Name</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <User size={16} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tenantName}
                  onChangeText={setTenantName}
                  placeholder="Full name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Phone size={16} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tenantPhone}
                  onChangeText={setTenantPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Mail size={16} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={tenantEmail}
                  onChangeText={setTenantEmail}
                  placeholder="tenant@email.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
        >
          <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 16 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  heading: { fontSize: 22, fontWeight: '700' as const, textAlign: 'center', marginBottom: 4, letterSpacing: -0.3 },
  subheading: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600' as const, marginBottom: 8, letterSpacing: 0.2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, gap: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 18, borderWidth: 1 },
  toggleLabel: { fontSize: 15, fontWeight: '600' as const },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '600' as const },
});
