import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Building2, MapPin, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';

export default function AddPropertyScreen() {
  const router = useRouter();
  const { addProperty } = useData();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [unitCount, setUnitCount] = useState('');

  const isValid = name.trim().length > 0 && address.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addProperty({
      name: name.trim(),
      address: address.trim(),
      unitCount: parseInt(unitCount, 10) || 0,
    });
    router.back();
  }, [name, address, unitCount, isValid, addProperty, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Add Property',
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
          <Building2 size={28} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={[styles.heading, { color: colors.text }]}>New Property</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Add a property to start managing units and tenants.</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Property Name</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Building2 size={16} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder='e.g. "Oak Street Duplex"'
              placeholderTextColor={colors.textTertiary}
              testID="property-name-input"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin size={16} color={colors.textTertiary} strokeWidth={2} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, City, State"
              placeholderTextColor={colors.textTertiary}
              testID="property-address-input"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Number of Units (optional)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={unitCount}
              onChangeText={setUnitCount}
              placeholder="e.g. 4"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              testID="property-units-input"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
          testID="submit-property-btn"
        >
          <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Add Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
