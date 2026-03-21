import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Home, Wrench, MessageCircle, Plus, AlertCircle, Clock, CheckCircle, Send, User, LogOut, ChevronRight, CalendarClock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, getStatusColor } from '@/utils/helpers';
import { REQUEST_CATEGORIES, STATUS_LABELS, RequestCategory, MaintenanceRequest, ProposedTimeSlot } from '@/types';

type PortalTab = 'home' | 'requests' | 'messages';

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 7; h <= 20; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`);
    times.push(`${String(h).padStart(2, '0')}:30`);
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

function AddSlotPicker({ colors, onAdd }: { colors: Record<string, string>; onAdd: (slot: ProposedTimeSlot) => void }) {
  const [showForm, setShowForm] = React.useState(false);
  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('10:00');
  const [showDateList, setShowDateList] = React.useState(false);
  const [showStartList, setShowStartList] = React.useState(false);
  const [showEndList, setShowEndList] = React.useState(false);

  if (!showForm) {
    return (
      <TouchableOpacity
        style={[slotPickerStyles.addBtn, { borderColor: colors.border }]}
        onPress={() => setShowForm(true)}
      >
        <Plus size={14} color={colors.primary} strokeWidth={2} />
        <Text style={[slotPickerStyles.addBtnText, { color: colors.primary }]}>Add preferred time</Text>
      </TouchableOpacity>
    );
  }

  const dateOptions = Array.from({ length: 21 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { val, label };
  });

  return (
    <View style={[slotPickerStyles.form, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[slotPickerStyles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => { setShowDateList(!showDateList); setShowStartList(false); setShowEndList(false); }}
      >
        <Text style={[slotPickerStyles.pickerText, { color: date ? colors.text : colors.textTertiary }]}>
          {date ? dateOptions.find(d => d.val === date)?.label ?? date : 'Select date'}
        </Text>
      </TouchableOpacity>
      {showDateList && (
        <ScrollView style={[slotPickerStyles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
          {dateOptions.map(d => (
            <TouchableOpacity
              key={d.val}
              style={[slotPickerStyles.dropdownItem, { borderBottomColor: colors.divider }, date === d.val && { backgroundColor: colors.primaryFaint }]}
              onPress={() => { setDate(d.val); setShowDateList(false); }}
            >
              <Text style={[slotPickerStyles.dropdownText, { color: colors.text }, date === d.val && { color: colors.primary, fontWeight: '600' as const }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={slotPickerStyles.timeRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[slotPickerStyles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setShowStartList(!showStartList); setShowDateList(false); setShowEndList(false); }}
          >
            <Text style={[slotPickerStyles.pickerText, { color: colors.text }]}>{startTime}</Text>
          </TouchableOpacity>
          {showStartList && (
            <ScrollView style={[slotPickerStyles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={`s-${t}`}
                  style={[slotPickerStyles.dropdownItem, { borderBottomColor: colors.divider }, startTime === t && { backgroundColor: colors.primaryFaint }]}
                  onPress={() => { setStartTime(t); setShowStartList(false); }}
                >
                  <Text style={[slotPickerStyles.dropdownText, { color: colors.text }, startTime === t && { color: colors.primary, fontWeight: '600' as const }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
        <Text style={[slotPickerStyles.timeSep, { color: colors.textTertiary }]}>–</Text>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[slotPickerStyles.picker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { setShowEndList(!showEndList); setShowDateList(false); setShowStartList(false); }}
          >
            <Text style={[slotPickerStyles.pickerText, { color: colors.text }]}>{endTime}</Text>
          </TouchableOpacity>
          {showEndList && (
            <ScrollView style={[slotPickerStyles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={`e-${t}`}
                  style={[slotPickerStyles.dropdownItem, { borderBottomColor: colors.divider }, endTime === t && { backgroundColor: colors.primaryFaint }]}
                  onPress={() => { setEndTime(t); setShowEndList(false); }}
                >
                  <Text style={[slotPickerStyles.dropdownText, { color: colors.text }, endTime === t && { color: colors.primary, fontWeight: '600' as const }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      <View style={slotPickerStyles.formActions}>
        <TouchableOpacity
          style={[slotPickerStyles.cancelBtn, { borderColor: colors.border }]}
          onPress={() => setShowForm(false)}
        >
          <Text style={[slotPickerStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[slotPickerStyles.confirmBtn, { backgroundColor: colors.primary }, !date && { opacity: 0.4 }]}
          onPress={() => {
            if (!date) return;
            onAdd({ date, startTime, endTime });
            setShowForm(false);
            setDate('');
            setStartTime('09:00');
            setEndTime('10:00');
          }}
          disabled={!date}
        >
          <Text style={slotPickerStyles.confirmText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const slotPickerStyles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 6, marginTop: 8 },
  addBtnText: { fontSize: 13, fontWeight: '600' as const },
  form: { borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, gap: 8 },
  picker: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  pickerText: { fontSize: 14 },
  dropdown: { maxHeight: 150, borderRadius: 10, borderWidth: 1, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  dropdownText: { fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  timeSep: { paddingTop: 12, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: 13, fontWeight: '600' as const },
  confirmBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  confirmText: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
});

export default function TenantPortalScreen() {
  const { unit, property, requests, openRequests, resolvedRequests, submitRequest, sendMessage, getMessagesForRequest, logout, refetchAll } = useTenant();
  const { signOut } = useAuth();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [refreshing, setRefreshing] = useState(false);
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const [selectedCategory, setSelectedCategory] = useState<RequestCategory | null>(null);
  const [requestDescription, setRequestDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposedSlots, setProposedSlots] = useState<ProposedTimeSlot[]>([]);

  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeIn]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const handleTabChange = useCallback((tab: PortalTab) => {
    void Haptics.selectionAsync();
    setActiveTab(tab);
    setActiveRequestId(null);
    const toValue = tab === 'home' ? 0 : tab === 'requests' ? 1 : 2;
    Animated.spring(tabIndicator, { toValue, friction: 8, tension: 80, useNativeDriver: true }).start();
  }, [tabIndicator]);

  const handleSubmitRequest = useCallback(async () => {
    if (!selectedCategory || !requestDescription.trim()) {
      Alert.alert('Missing Info', 'Please select a category and describe the issue.');
      return;
    }
    setIsSubmitting(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const slotsToSend = proposedSlots;
    const result = await submitRequest({
      category: selectedCategory,
      description: requestDescription.trim(),
      proposedTimes: slotsToSend.length > 0 ? slotsToSend : undefined,
    });
    setIsSubmitting(false);
    if (result) {
      Alert.alert('Request Submitted', 'Your maintenance request has been sent to your landlord.');
      setSelectedCategory(null);
      setRequestDescription('');
      setProposedSlots([]);
      handleTabChange('home');
    }
  }, [selectedCategory, requestDescription, proposedSlots, submitRequest, handleTabChange]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeRequestId) return;
    setIsSending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(activeRequestId, messageText.trim());
    setMessageText('');
    setIsSending(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messageText, activeRequestId, sendMessage]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          await signOut();
        },
      },
    ]);
  }, [logout, signOut]);

  const getStatusIcon = useCallback((status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'open': return <AlertCircle size={13} color={getStatusColor('open')} strokeWidth={2} />;
      case 'in_progress': return <Clock size={13} color={getStatusColor('in_progress')} strokeWidth={2} />;
      case 'resolved': return <CheckCircle size={13} color={getStatusColor('resolved')} strokeWidth={2} />;
    }
  }, []);

  if (!unit || !property) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your portal...</Text>
        </View>
      </View>
    );
  }

  const activeMessages = activeRequestId ? getMessagesForRequest(activeRequestId) : [];
  const activeRequest = activeRequestId ? requests.find(r => r.id === activeRequestId) : null;

  const renderHome = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeIn }]}>
      <View style={[styles.welcomeCard, { backgroundColor: colors.primary }]}>
        <Text style={[styles.welcomeGreeting, { color: colors.textInverse }]}>
          Welcome, {unit.tenantName?.split(' ')[0] || 'Tenant'}
        </Text>
        <Text style={[styles.welcomeLocation, { color: colors.textInverse }]}>
          {property.name} · {unit.label}
        </Text>
        <View style={styles.welcomeStats}>
          <View style={[styles.welcomeStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.welcomeStatNum, { color: colors.textInverse }]}>{openRequests.length}</Text>
            <Text style={[styles.welcomeStatLabel, { color: colors.textInverse }]}>Open</Text>
          </View>
          <View style={[styles.welcomeStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.welcomeStatNum, { color: colors.textInverse }]}>{resolvedRequests.length}</Text>
            <Text style={[styles.welcomeStatLabel, { color: colors.textInverse }]}>Resolved</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.newRequestBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleTabChange('requests')}
        activeOpacity={0.7}
      >
        <View style={[styles.newRequestIcon, { backgroundColor: colors.primaryFaint }]}>
          <Plus size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.newRequestText}>
          <Text style={[styles.newRequestTitle, { color: colors.text }]}>Submit a Request</Text>
          <Text style={[styles.newRequestDesc, { color: colors.textTertiary }]}>Report a maintenance issue</Text>
        </View>
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={1.5} />
      </TouchableOpacity>

      {openRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Requests</Text>
          {openRequests.map(req => {
            const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
            const statusColor = getStatusColor(req.status);
            return (
              <TouchableOpacity
                key={req.id}
                style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setActiveRequestId(req.id);
                  handleTabChange('messages');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.requestTop}>
                  <Text style={styles.requestEmoji}>{catInfo?.icon}</Text>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>{req.description}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[styles.requestMeta, { color: colors.textTertiary }]}>{formatDate(req.createdAt)}</Text>
                      {req.confirmedTime ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#05966914' }]}>
                          <Text style={[styles.statusBadgeText, { color: '#059669' }]}>Scheduled</Text>
                        </View>
                      ) : req.proposedTimes && req.proposedTimes.length > 0 ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#D9770614' }]}>
                          <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>Waiting</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={[styles.statusTimeline, { backgroundColor: colors.surfaceSecondary }]}>
                  {(['open', 'in_progress', 'resolved'] as const).map((s, i) => {
                    const isActive = s === req.status;
                    const isPast = (s === 'open' && (req.status === 'in_progress' || req.status === 'resolved')) ||
                                   (s === 'in_progress' && req.status === 'resolved');
                    return (
                      <View key={s} style={styles.timelineStep}>
                        <View style={[
                          styles.timelineDot,
                          { backgroundColor: isActive ? statusColor : isPast ? colors.success : colors.border },
                        ]} />
                        <Text style={[
                          styles.timelineLabel,
                          { color: isActive ? statusColor : isPast ? colors.success : colors.textTertiary },
                          isActive && { fontWeight: '700' as const },
                        ]}>
                          {STATUS_LABELS[s]}
                        </Text>
                        {i < 2 && (
                          <View style={[
                            styles.timelineConnector,
                            { backgroundColor: isPast ? colors.success : colors.border },
                          ]} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {requests.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Wrench size={28} color={colors.primaryLight} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No requests yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
            Something broken? Submit your first maintenance request above.
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const renderRequests = () => (
    <View style={styles.tabContent}>
      <View style={[styles.submitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.submitTitle, { color: colors.text }]}>New Maintenance Request</Text>
        <Text style={[styles.submitDesc, { color: colors.textTertiary }]}>Pick a category and describe the issue.</Text>

        <View style={styles.categoryGrid}>
          {REQUEST_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryCard,
                  { backgroundColor: isActive ? colors.primaryFaint : colors.surfaceSecondary, borderColor: isActive ? colors.primary : colors.border },
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedCategory(cat.key);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryCardEmoji}>{cat.icon}</Text>
                <Text style={[styles.categoryCardLabel, { color: isActive ? colors.primary : colors.text }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={[styles.descInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={requestDescription}
          onChangeText={setRequestDescription}
          testID="tenant-request-description"
        />

        <View style={styles.slotsSection}>
          <View style={styles.slotsHeader}>
            <CalendarClock size={14} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.slotsTitle, { color: colors.textSecondary }]}>Preferred Times (optional)</Text>
          </View>
          <Text style={[styles.slotsHint, { color: colors.textTertiary }]}>Add up to 3 time slots for scheduling.</Text>
          {proposedSlots.map((slot, idx) => (
            <View key={idx} style={[styles.slotRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.slotInfo}>
                <Text style={[styles.slotDate, { color: colors.text }]}>
                  {new Date(slot.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.slotTime, { color: colors.textSecondary }]}>
                  {slot.startTime} – {slot.endTime}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setProposedSlots(prev => prev.filter((_, i) => i !== idx))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))}
          {proposedSlots.length < 3 && (
            <AddSlotPicker
              colors={colors}
              onAdd={(slot: ProposedTimeSlot) => setProposedSlots(prev => [...prev, slot])}
            />
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary },
            (!selectedCategory || !requestDescription.trim()) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmitRequest}
          disabled={!selectedCategory || !requestDescription.trim() || isSubmitting}
          activeOpacity={0.8}
          testID="tenant-submit-request-btn"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Send size={14} color={colors.textInverse} strokeWidth={2} />
              <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Requests</Text>
          {requests.map(req => {
            const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
            const statusColor = getStatusColor(req.status);
            return (
              <TouchableOpacity
                key={req.id}
                style={[styles.requestListItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setActiveRequestId(req.id);
                  handleTabChange('messages');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.requestListTop}>
                  <Text style={styles.requestEmoji}>{catInfo?.icon}</Text>
                  <Text style={[styles.requestListTitle, { color: colors.text }]} numberOfLines={1}>{req.description}</Text>
                  {getStatusIcon(req.status)}
                </View>
                <View style={styles.requestListBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[req.status]}</Text>
                    </View>
                    {req.confirmedTime ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#05966914' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#059669' }]}>Scheduled</Text>
                      </View>
                    ) : req.proposedTimes && req.proposedTimes.length > 0 ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#D9770614' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>{req.proposedTimes.length} times proposed</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.requestListDate, { color: colors.textTertiary }]}>{formatDate(req.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderMessageThread = () => {
    if (!activeRequest) return null;
    const catInfo = REQUEST_CATEGORIES.find(c => c.key === activeRequest.category);

    return (
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={160}
      >
        <View style={[styles.chatHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity onPress={() => setActiveRequestId(null)} style={styles.chatBackBtn}>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.chatHeaderEmoji}>{catInfo?.icon}</Text>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderTitle, { color: colors.text }]} numberOfLines={1}>{activeRequest.description}</Text>
            <Text style={[styles.chatHeaderMeta, { color: colors.textTertiary }]}>
              {STATUS_LABELS[activeRequest.status]} · {activeMessages.length} messages
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatMessages}
          contentContainerStyle={styles.chatMessagesContent}
          showsVerticalScrollIndicator={false}
        >
          {activeMessages.length === 0 && (
            <View style={styles.chatEmpty}>
              <MessageCircle size={24} color={colors.textTertiary} strokeWidth={1.5} />
              <Text style={[styles.chatEmptyText, { color: colors.textTertiary }]}>
                No messages yet. Send a message to your landlord.
              </Text>
            </View>
          )}
          {activeMessages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.senderRole === 'tenant'
                  ? [styles.messageBubbleSent, { backgroundColor: colors.primary }]
                  : [styles.messageBubbleReceived, { backgroundColor: colors.surfaceSecondary }],
              ]}
            >
              <Text style={[
                styles.messageSender,
                { color: colors.textSecondary },
                msg.senderRole === 'tenant' && { color: 'rgba(255,255,255,0.7)' },
              ]}>
                {msg.senderRole === 'tenant' ? 'You' : msg.senderName || 'Landlord'}
              </Text>
              <Text style={[
                styles.messageBody,
                { color: colors.text },
                msg.senderRole === 'tenant' && { color: colors.textInverse },
              ]}>
                {msg.body}
              </Text>
              <Text style={[
                styles.messageTime,
                { color: colors.textTertiary },
                msg.senderRole === 'tenant' && { color: 'rgba(255,255,255,0.5)' },
              ]}>
                {formatDate(msg.timestamp)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.chatInputBar, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
          <TextInput
            style={[styles.chatInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            testID="tenant-message-input"
          />
          <TouchableOpacity
            style={[styles.chatSendBtn, { backgroundColor: messageText.trim() ? colors.primary : colors.surfaceTertiary }]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            testID="tenant-send-message-btn"
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={16} color={messageText.trim() ? colors.textInverse : colors.textTertiary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderMessages = () => {
    if (activeRequestId && activeRequest) {
      return renderMessageThread();
    }

    return (
      <View style={styles.tabContent}>
        {requests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MessageCircle size={28} color={colors.primaryLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              Messages appear here once you have a maintenance request.
            </Text>
          </View>
        ) : (
          <>
            {requests.map(req => {
              const reqMessages = getMessagesForRequest(req.id);
              const lastMsg = reqMessages[reqMessages.length - 1];
              const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
              return (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.messageThread, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveRequestId(req.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.messageThreadHeader}>
                    <Text style={styles.requestEmoji}>{catInfo?.icon}</Text>
                    <View style={styles.messageThreadInfo}>
                      <Text style={[styles.messageThreadTitle, { color: colors.text }]} numberOfLines={1}>
                        {req.description}
                      </Text>
                      <Text style={[styles.messageThreadMeta, { color: colors.textTertiary }]}>
                        {STATUS_LABELS[req.status]} · {reqMessages.length} msg{reqMessages.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
                  </View>
                  {lastMsg && (
                    <View style={[styles.lastMessage, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.lastMessageSender, { color: colors.textSecondary }]}>
                        {lastMsg.senderRole === 'tenant' ? 'You' : 'Landlord'}:
                      </Text>
                      <Text style={[styles.lastMessageBody, { color: colors.text }]} numberOfLines={2}>
                        {lastMsg.body}
                      </Text>
                    </View>
                  )}
                  {reqMessages.length === 0 && (
                    <View style={[styles.lastMessage, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.lastMessageBody, { color: colors.textTertiary }]}>
                        No messages yet. Tap to start a conversation.
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const tabs: { key: PortalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', icon: <Home size={16} color={activeTab === 'home' ? colors.primary : colors.textTertiary} strokeWidth={2} /> },
    { key: 'requests', label: 'Requests', icon: <Wrench size={16} color={activeTab === 'requests' ? colors.primary : colors.textTertiary} strokeWidth={2} /> },
    { key: 'messages', label: 'Messages', icon: <MessageCircle size={16} color={activeTab === 'messages' ? colors.primary : colors.textTertiary} strokeWidth={2} /> },
  ];

  const tabWidth = (Platform.OS === 'web' ? 400 : 360) / 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.portalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.portalHeaderTop}>
          <View style={[styles.tenantBadge, { backgroundColor: colors.primaryFaint }]}>
            <User size={12} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.tenantBadgeText, { color: colors.primary }]}>{unit.tenantName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.dangerLight }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={13} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.7}
            >
              {tab.icon}
              <Text style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.primary : colors.textTertiary },
                activeTab === tab.key && { fontWeight: '700' as const },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View
            style={[
              styles.tabUnderline,
              {
                backgroundColor: colors.primary,
                width: tabWidth - 20,
                transform: [{
                  translateX: tabIndicator.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [10, tabWidth + 10, tabWidth * 2 + 10],
                  }),
                }],
              },
            ]}
          />
        </View>
      </View>

      {activeTab === 'messages' && activeRequestId ? (
        renderMessages()
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {activeTab === 'home' && renderHome()}
          {activeTab === 'requests' && renderRequests()}
          {activeTab === 'messages' && renderMessages()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  portalHeader: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 44, borderBottomWidth: 0.5 },
  portalHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tenantBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 6 },
  tenantBadgeText: { fontSize: 13, fontWeight: '600' as const },
  logoutBtn: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', position: 'relative' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 4 },
  tabLabel: { fontSize: 12, fontWeight: '500' as const },
  tabUnderline: { position: 'absolute', bottom: 0, height: 3, borderRadius: 2 },
  tabContent: { padding: 20 },
  welcomeCard: { borderRadius: 20, padding: 22, marginBottom: 16 },
  welcomeGreeting: { fontSize: 22, fontWeight: '700' as const, marginBottom: 4, letterSpacing: -0.3 },
  welcomeLocation: { fontSize: 14, opacity: 0.85, marginBottom: 18 },
  welcomeStats: { flexDirection: 'row', gap: 10 },
  welcomeStat: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  welcomeStatNum: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  welcomeStatLabel: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  newRequestBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  newRequestIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  newRequestText: { flex: 1 },
  newRequestTitle: { fontSize: 15, fontWeight: '600' as const },
  newRequestDesc: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12, letterSpacing: -0.2 },
  requestCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  requestTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  requestEmoji: { fontSize: 18, marginRight: 10 },
  requestInfo: { flex: 1 },
  requestTitle: { fontSize: 14, fontWeight: '600' as const },
  requestMeta: { fontSize: 12, marginTop: 2 },
  statusTimeline: { flexDirection: 'row', borderRadius: 10, padding: 12 },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  timelineLabel: { fontSize: 11, fontWeight: '500' as const },
  timelineConnector: { position: 'absolute', top: 4, right: -15, width: 30, height: 2, borderRadius: 1 },
  emptyState: { alignItems: 'center', borderRadius: 16, padding: 32, gap: 8, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  submitCard: { borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1 },
  submitTitle: { fontSize: 18, fontWeight: '600' as const, marginBottom: 4, letterSpacing: -0.2 },
  submitDesc: { fontSize: 13, marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  categoryCardEmoji: { fontSize: 16 },
  categoryCardLabel: { fontSize: 13, fontWeight: '500' as const },
  descInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 100, borderWidth: 1, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '600' as const },
  requestListItem: { borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1 },
  requestListTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestListTitle: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  requestListBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginLeft: 28 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' as const },
  requestListDate: { fontSize: 12 },
  messageThread: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  messageThreadHeader: { flexDirection: 'row', alignItems: 'center' },
  messageThreadInfo: { flex: 1, marginLeft: 2 },
  messageThreadTitle: { fontSize: 14, fontWeight: '600' as const },
  messageThreadMeta: { fontSize: 12, marginTop: 2 },
  lastMessage: { borderRadius: 10, padding: 12, marginTop: 10 },
  lastMessageSender: { fontSize: 12, fontWeight: '600' as const, marginBottom: 2 },
  lastMessageBody: { fontSize: 13, lineHeight: 18 },
  chatContainer: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 8 },
  chatBackBtn: { padding: 4 },
  chatHeaderEmoji: { fontSize: 18 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { fontSize: 14, fontWeight: '600' as const },
  chatHeaderMeta: { fontSize: 12, marginTop: 1 },
  chatMessages: { flex: 1 },
  chatMessagesContent: { padding: 16, paddingBottom: 8 },
  chatEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  chatEmptyText: { fontSize: 14, textAlign: 'center' },
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  messageBubbleSent: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messageBubbleReceived: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageSender: { fontSize: 11, fontWeight: '600' as const, marginBottom: 3 },
  messageBody: { fontSize: 15, lineHeight: 20 },
  messageTime: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  chatInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 0.5, gap: 8 },
  chatInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  slotsSection: { marginBottom: 16 },
  slotsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  slotsTitle: { fontSize: 13, fontWeight: '600' as const },
  slotsHint: { fontSize: 12, marginBottom: 6 },
  slotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, padding: 10, borderWidth: 1, marginTop: 6 },
  slotInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slotDate: { fontSize: 13, fontWeight: '600' as const },
  slotTime: { fontSize: 13 },
});
