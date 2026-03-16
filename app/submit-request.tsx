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
import { X, ChevronDown, Camera, Send } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { RequestCategory, REQUEST_CATEGORIES } from '@/types';
import { getCategoryColor } from '@/utils/helpers';

export default function SubmitRequestScreen() {
  const router = useRouter();
  const { properties, units, addRequest } = useData();
  const { colors } = useTheme();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const availableUnits = useMemo(() => {
    return units.filter(u => u.propertyId === selectedPropertyId);
  }, [units, selectedPropertyId]);

  const selectedProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const selectedUnit = useMemo(() => units.find(u => u.id === selectedUnitId), [units, selectedUnitId]);

  const isValid = selectedPropertyId && selectedUnitId && selectedCategory && description.trim().length > 0;

  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      console.log('Image picker error');
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isValid || !selectedCategory) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void addRequest({
      unitId: selectedUnitId,
      propertyId: selectedPropertyId,
      category: selectedCategory,
      description: description.trim(),
      status: 'open',
      photoUri,
      tenantName: selectedUnit?.tenantName ?? '',
      unitLabel: selectedUnit?.label ?? '',
      propertyName: selectedProperty?.name ?? '',
      requestedDate: requestedDate || undefined,
    });
    Alert.alert('Request Submitted', 'Your maintenance request has been submitted successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [isValid, selectedCategory, selectedPropertyId, selectedUnitId, description, photoUri, requestedDate, selectedUnit, selectedProperty, addRequest, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'New Request',
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
        <Text style={[styles.heading, { color: colors.text }]}>Submit a Request</Text>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>Describe the maintenance issue and we'll get it sorted.</Text>

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
                  style={[styles.pickerOption, { borderBottomColor: colors.divider }, p.id === selectedPropertyId && { backgroundColor: colors.primaryFaint }]}
                  onPress={() => {
                    setSelectedPropertyId(p.id);
                    setSelectedUnitId('');
                    setShowPropertyPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, { color: colors.text }, p.id === selectedPropertyId && { color: colors.primary, fontWeight: '600' as const }]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {properties.length === 0 && (
                <Text style={[styles.noDataText, { color: colors.textTertiary }]}>No properties. Add one first.</Text>
              )}
            </View>
          )}
        </View>

        {selectedPropertyId ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Unit</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowUnitPicker(!showUnitPicker)}
            >
              <Text style={[styles.pickerBtnText, { color: colors.text }, !selectedUnit && { color: colors.textTertiary }]}>
                {selectedUnit?.label ?? 'Select a unit'}
              </Text>
              <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
            {showUnitPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {availableUnits.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.pickerOption, { borderBottomColor: colors.divider }, u.id === selectedUnitId && { backgroundColor: colors.primaryFaint }]}
                    onPress={() => {
                      setSelectedUnitId(u.id);
                      setShowUnitPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.text }, u.id === selectedUnitId && { color: colors.primary, fontWeight: '600' as const }]}>
                      {u.label} {u.tenantName ? `· ${u.tenantName}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
                {availableUnits.length === 0 && (
                  <Text style={[styles.noDataText, { color: colors.textTertiary }]}>No units in this property.</Text>
                )}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.categoryRow}>
            {REQUEST_CATEGORIES.map(cat => {
              const catColor = getCategoryColor(cat.key);
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryPill,
                    { borderColor: isActive ? catColor : colors.border },
                    isActive && { backgroundColor: catColor + '12' },
                  ]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedCategory(cat.key);
                  }}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, { color: colors.textSecondary }, isActive && { color: catColor, fontWeight: '700' as const }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue in a few words..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="request-description-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Requested Service Date (optional)</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={[styles.pickerBtnText, { color: colors.text }, !requestedDate && { color: colors.textTertiary }]}>
              {requestedDate ? new Date(requestedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a preferred date'}
            </Text>
            <ChevronDown size={16} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
          {showDatePicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i + 1);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                const isSelected = requestedDate === dateStr;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[styles.pickerOption, { borderBottomColor: colors.divider }, isSelected && { backgroundColor: colors.primaryFaint }]}
                    onPress={() => {
                      setRequestedDate(dateStr);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.text }, isSelected && { color: colors.primary, fontWeight: '600' as const }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Photo (optional)</Text>
          <TouchableOpacity style={[styles.photoBtn, { borderColor: colors.border }]} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
                <Camera size={22} color={colors.textTertiary} strokeWidth={1.8} />
                <Text style={[styles.photoPlaceholderText, { color: colors.textTertiary }]}>Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid}
          activeOpacity={0.8}
          testID="submit-request-btn"
        >
          <Send size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Submit Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700' as const, marginBottom: 4, letterSpacing: -0.3 },
  subheading: { fontSize: 14, marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600' as const, marginBottom: 8, letterSpacing: 0.2 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1 },
  pickerBtnText: { fontSize: 15 },
  pickerDropdown: { borderRadius: 12, marginTop: 4, borderWidth: 1, overflow: 'hidden' },
  pickerOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5 },
  pickerOptionText: { fontSize: 15 },
  noDataText: { padding: 14, fontSize: 14, textAlign: 'center' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 14, fontWeight: '500' as const },
  textArea: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, minHeight: 100, borderWidth: 1 },
  photoBtn: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed' },
  photoPreview: { width: '100%', height: 160, borderRadius: 12 },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30, gap: 8 },
  photoPlaceholderText: { fontSize: 14 },
  submitBtn: { flexDirection: 'row', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '600' as const },
});
