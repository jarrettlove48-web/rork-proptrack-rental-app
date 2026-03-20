import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AlertCircle, Clock, CheckCircle, ArrowRight, DollarSign, Send, Calendar, ChevronDown, X, Wrench, UserCheck, UserX, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { REQUEST_CATEGORIES, STATUS_LABELS, REQUEST_TO_CONTRACTOR_CATEGORY, RequestMedia, ContractorCategory } from '@/types';
import { formatDate, formatFullDate, getStatusColor, getCategoryColor, getNextStatus, getNextStatusLabel } from '@/utils/helpers';

const CONTRACTOR_STATUS_COLORS: Record<string, string> = {
  pending: '#D97706',
  accepted: '#059669',
  declined: '#DC2626',
};

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

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { requests, updateRequestStatus, updateRequestDates, getMessagesForRequest, addMessage, profile, contractors, assignContractor, unassignContractor, getRequestMedia } = useData();
  const { colors } = useTheme();
  const [messageText, setMessageText] = useState('');
  const [showServiceDatePicker, setShowServiceDatePicker] = useState(false);
  const [showRequestedDatePicker, setShowRequestedDatePicker] = useState(false);
  const [showContractorPicker, setShowContractorPicker] = useState(false);
  const [mediaItems, setMediaItems] = useState<RequestMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const request = useMemo(() => requests.find(r => r.id === id), [requests, id]);
  const requestMessages = useMemo(() => getMessagesForRequest(id ?? ''), [getMessagesForRequest, id]);
  const catInfo = useMemo(() => REQUEST_CATEGORIES.find(c => c.key === request?.category), [request]);

  const assignedContractor = useMemo(() => {
    if (!request?.assignedContractorId) return null;
    return contractors.find(c => c.id === request.assignedContractorId) ?? null;
  }, [request?.assignedContractorId, contractors]);

  const sortedContractors = useMemo(() => {
    if (!request) return contractors;
    const matchCategory = REQUEST_TO_CONTRACTOR_CATEGORY[request.category];
    const matched = contractors.filter(c => c.category === matchCategory);
    const others = contractors.filter(c => c.category !== matchCategory);
    return [...matched, ...others];
  }, [contractors, request]);

  const bestMatchCategory = useMemo(() => {
    if (!request) return null;
    return REQUEST_TO_CONTRACTOR_CATEGORY[request.category];
  }, [request]);

  const nextStatus = request ? getNextStatus(request.status) : null;
  const nextStatusLabel = request ? getNextStatusLabel(request.status) : null;

  useEffect(() => {
    if (id) {
      setMediaLoading(true);
      getRequestMedia(id).then(items => {
        setMediaItems(items);
        setMediaLoading(false);
      }).catch(() => setMediaLoading(false));
    }
  }, [id, getRequestMedia]);

  useEffect(() => {
    if (requestMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [requestMessages.length]);

  const handleStatusUpdate = useCallback(() => {
    if (!request || !nextStatus) return;
    Alert.alert(
      `${nextStatusLabel} Request?`,
      `This will change the status to "${STATUS_LABELS[nextStatus]}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatusLabel ?? 'Update',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void updateRequestStatus(request.id, nextStatus);
          },
        },
      ]
    );
  }, [request, nextStatus, nextStatusLabel, updateRequestStatus]);

  const handleDateUpdate = useCallback((field: 'serviceDate' | 'requestedDate', dateStr: string | null) => {
    if (!request) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void updateRequestDates(request.id, { [field]: dateStr });
    if (field === 'serviceDate') setShowServiceDatePicker(false);
    if (field === 'requestedDate') setShowRequestedDatePicker(false);
  }, [request, updateRequestDates]);

  const generateDateOptions = useCallback(() => {
    const dates: { value: string; label: string }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dates.push({ value: val, label });
    }
    return dates;
  }, []);

  const dateOptions = useMemo(() => generateDateOptions(), [generateDateOptions]);

  const isEditable = request?.status !== 'resolved';

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !id) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void addMessage({
      requestId: id,
      senderId: 'landlord',
      senderName: profile.name || 'Landlord',
      senderRole: 'landlord',
      body: messageText.trim(),
    });
    setMessageText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messageText, id, addMessage, profile.name]);

  const handleAssignContractor = useCallback((contractorId: string) => {
    if (!request) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void assignContractor(request.id, contractorId);
    setShowContractorPicker(false);
  }, [request, assignContractor]);

  const handleUnassignContractor = useCallback(() => {
    if (!request) return;
    Alert.alert('Unassign Contractor', 'Remove the assigned contractor from this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unassign',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          void unassignContractor(request.id);
        },
      },
    ]);
  }, [request, unassignContractor]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} color={colors.statusOpen} strokeWidth={2} />;
      case 'in_progress': return <Clock size={14} color={colors.statusInProgress} strokeWidth={2} />;
      case 'resolved': return <CheckCircle size={14} color={colors.statusResolved} strokeWidth={2} />;
      default: return null;
    }
  }, [colors]);

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Request Detail', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Request not found</Text>
      </View>
    );
  }

  const statusColor = getStatusColor(request.status);
  const catColor = getCategoryColor(request.category);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: `${request.propertyName} · ${request.unitLabel}`, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.requestHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerBadges}>
            <View style={[styles.badge, { backgroundColor: catColor + '14' }]}>
              <Text style={styles.badgeEmoji}>{catInfo?.icon}</Text>
              <Text style={[styles.badgeText, { color: catColor }]}>{catInfo?.label}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + '14' }]}>
              {getStatusIcon(request.status)}
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {STATUS_LABELS[request.status]}
              </Text>
            </View>
          </View>
          <Text style={[styles.requestDescription, { color: colors.text }]}>{request.description}</Text>

          {request.photoUri && (
            <TouchableOpacity onPress={() => setViewingImage(request.photoUri ?? null)}>
              <Image source={{ uri: request.photoUri }} style={styles.requestPhoto} contentFit="cover" />
            </TouchableOpacity>
          )}

          {mediaItems.length > 0 && (
            <View style={styles.mediaGrid}>
              {mediaItems.map(m => (
                <TouchableOpacity key={m.id} onPress={() => setViewingImage(m.mediaUrl)} style={styles.mediaThumbnailWrap}>
                  <Image source={{ uri: m.mediaUrl }} style={styles.mediaThumbnail} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {mediaLoading && mediaItems.length === 0 && !request.photoUri && (
            <ActivityIndicator size="small" color={colors.textTertiary} style={{ marginBottom: 14 }} />
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Submitted</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{formatFullDate(request.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Updated</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(request.updatedAt)}</Text>
            </View>
          </View>

          <View style={[styles.datesSection, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.dateField}>
              <View style={styles.dateFieldHeader}>
                <Calendar size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Requested Date</Text>
              </View>
              {isEditable ? (
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setShowRequestedDatePicker(!showRequestedDatePicker);
                    setShowServiceDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.datePickerBtnText, { color: request.requestedDate ? colors.text : colors.textTertiary }]}>
                    {request.requestedDate
                      ? new Date(request.requestedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Set date'}
                  </Text>
                  <View style={styles.datePickerActions}>
                    {request.requestedDate ? (
                      <TouchableOpacity onPress={() => handleDateUpdate('requestedDate', null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={14} color={colors.textTertiary} strokeWidth={2} />
                      </TouchableOpacity>
                    ) : null}
                    <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.dateReadOnly, { color: colors.text }]}>
                  {request.requestedDate
                    ? new Date(request.requestedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not set'}
                </Text>
              )}
              {showRequestedDatePicker && (
                <ScrollView style={[styles.dateDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
                  {dateOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.dateOption, { borderBottomColor: colors.divider }, request.requestedDate === opt.value && { backgroundColor: colors.primaryFaint }]}
                      onPress={() => handleDateUpdate('requestedDate', opt.value)}
                    >
                      <Text style={[styles.dateOptionText, { color: colors.text }, request.requestedDate === opt.value && { color: colors.primary, fontWeight: '600' as const }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />

            <View style={styles.dateField}>
              <View style={styles.dateFieldHeader}>
                <CheckCircle size={14} color={colors.accent ?? colors.statusResolved} strokeWidth={2} />
                <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Service Date</Text>
              </View>
              {isEditable ? (
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => {
                    setShowServiceDatePicker(!showServiceDatePicker);
                    setShowRequestedDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.datePickerBtnText, { color: request.serviceDate ? colors.text : colors.textTertiary }]}>
                    {request.serviceDate
                      ? new Date(request.serviceDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Set date'}
                  </Text>
                  <View style={styles.datePickerActions}>
                    {request.serviceDate ? (
                      <TouchableOpacity onPress={() => handleDateUpdate('serviceDate', null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <X size={14} color={colors.textTertiary} strokeWidth={2} />
                      </TouchableOpacity>
                    ) : null}
                    <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
                  </View>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.dateReadOnly, { color: colors.text }]}>
                  {request.serviceDate
                    ? new Date(request.serviceDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not set'}
                </Text>
              )}
              {showServiceDatePicker && (
                <ScrollView style={[styles.dateDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
                  {dateOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.dateOption, { borderBottomColor: colors.divider }, request.serviceDate === opt.value && { backgroundColor: colors.primaryFaint }]}
                      onPress={() => handleDateUpdate('serviceDate', opt.value)}
                    >
                      <Text style={[styles.dateOptionText, { color: colors.text }, request.serviceDate === opt.value && { color: colors.primary, fontWeight: '600' as const }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {request.tenantName ? (
            <TouchableOpacity
              style={[styles.tenantBanner, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => {
                router.push({ pathname: '/tenant-profile', params: { unitId: request.unitId } } as never);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.tenantAvatar, { backgroundColor: colors.primaryMuted }]}>
                <Text style={[styles.tenantAvatarText, { color: colors.primary }]}>{request.tenantName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tenantBannerName, { color: colors.text }]}>{request.tenantName}</Text>
                <Text style={[styles.tenantBannerSub, { color: colors.textTertiary }]}>{request.propertyName} · {request.unitLabel}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={[styles.contractorSection, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.contractorHeader}>
              <Wrench size={14} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.contractorHeaderText, { color: colors.textSecondary }]}>Assigned Contractor</Text>
            </View>
            {assignedContractor ? (
              <View>
                <View style={styles.assignedRow}>
                  <View style={styles.assignedInfo}>
                    <Text style={[styles.assignedName, { color: colors.text }]}>
                      {assignedContractor.firstName} {assignedContractor.lastName}
                    </Text>
                    {assignedContractor.company ? (
                      <Text style={[styles.assignedCompany, { color: colors.textTertiary }]}>{assignedContractor.company}</Text>
                    ) : null}
                  </View>
                  {request.contractorStatus && (
                    <View style={[styles.contractorStatusBadge, { backgroundColor: (CONTRACTOR_STATUS_COLORS[request.contractorStatus] ?? '#78716C') + '14' }]}>
                      {request.contractorStatus === 'accepted' && <UserCheck size={11} color={CONTRACTOR_STATUS_COLORS.accepted} strokeWidth={2} />}
                      {request.contractorStatus === 'pending' && <Clock size={11} color={CONTRACTOR_STATUS_COLORS.pending} strokeWidth={2} />}
                      {request.contractorStatus === 'declined' && <UserX size={11} color={CONTRACTOR_STATUS_COLORS.declined} strokeWidth={2} />}
                      <Text style={[styles.contractorStatusText, { color: CONTRACTOR_STATUS_COLORS[request.contractorStatus] ?? '#78716C' }]}>
                        {request.contractorStatus.charAt(0).toUpperCase() + request.contractorStatus.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {isEditable && (
                  <TouchableOpacity
                    style={[styles.unassignBtn, { backgroundColor: colors.dangerLight }]}
                    onPress={handleUnassignContractor}
                  >
                    <X size={12} color={colors.danger} strokeWidth={2} />
                    <Text style={[styles.unassignBtnText, { color: colors.danger }]}>Unassign</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : isEditable && contractors.length > 0 ? (
              <View>
                <TouchableOpacity
                  style={[styles.assignBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowContractorPicker(!showContractorPicker)}
                >
                  <Text style={[styles.assignBtnText, { color: colors.primary }]}>Assign Contractor</Text>
                  <ChevronDown size={14} color={colors.primary} strokeWidth={2} />
                </TouchableOpacity>
                {showContractorPicker && (
                  <ScrollView style={[styles.contractorDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} nestedScrollEnabled>
                    {sortedContractors.map((c, idx) => {
                      const isBestMatch = c.category === bestMatchCategory;
                      const isFirstOther = idx > 0 && sortedContractors[idx - 1]?.category === bestMatchCategory && c.category !== bestMatchCategory;
                      const catCol = CATEGORY_COLORS[c.category] ?? '#78716C';
                      return (
                        <View key={c.id}>
                          {isFirstOther && (
                            <View style={[styles.contractorDividerRow, { borderTopColor: colors.divider }]}>
                              <Text style={[styles.contractorDividerText, { color: colors.textTertiary }]}>Other contractors</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={[styles.contractorOption, { borderBottomColor: colors.divider }]}
                            onPress={() => handleAssignContractor(c.id)}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={styles.contractorOptionNameRow}>
                                <Text style={[styles.contractorOptionName, { color: colors.text }]}>
                                  {c.firstName} {c.lastName}
                                </Text>
                                {isBestMatch && (
                                  <View style={[styles.bestMatchBadge, { backgroundColor: colors.accentLight }]}>
                                    <Star size={9} color={colors.accent} strokeWidth={2.5} />
                                    <Text style={[styles.bestMatchText, { color: colors.accent }]}>Best match</Text>
                                  </View>
                                )}
                              </View>
                              {c.company ? (
                                <Text style={[styles.contractorOptionCompany, { color: colors.textTertiary }]}>{c.company}</Text>
                              ) : null}
                            </View>
                            <View style={[styles.contractorCatBadge, { backgroundColor: catCol + '14' }]}>
                              <Text style={[styles.contractorCatText, { color: catCol }]}>
                                {c.category.replace('_', ' ')}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ) : contractors.length === 0 ? (
              <TouchableOpacity
                style={[styles.assignBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/contractors' as never)}
              >
                <Text style={[styles.assignBtnText, { color: colors.textTertiary }]}>Add contractors first</Text>
                <Wrench size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.noContractorText, { color: colors.textTertiary }]}>Not assigned</Text>
            )}
          </View>

          <View style={styles.actionRow}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.statusUpdateBtn, { backgroundColor: getStatusColor(nextStatus) }]}
                onPress={handleStatusUpdate}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusUpdateBtnText, { color: colors.textInverse }]}>{nextStatusLabel}</Text>
                <ArrowRight size={16} color={colors.textInverse} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            {request.status === 'resolved' && (
              <TouchableOpacity
                style={[styles.logExpenseBtn, { backgroundColor: colors.accentLight }]}
                onPress={() => router.push('/add-expense' as never)}
                activeOpacity={0.8}
              >
                <DollarSign size={14} color={colors.accent} strokeWidth={2} />
                <Text style={[styles.logExpenseBtnText, { color: colors.accent }]}>Log Expense</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.statusTimeline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>Timeline</Text>
          <View style={styles.timelineSteps}>
            {(['open', 'in_progress', 'resolved'] as const).map((step, i) => {
              const isCompleted = (['open', 'in_progress', 'resolved'].indexOf(request.status) >= i);
              const stepColor = isCompleted ? getStatusColor(step) : colors.textTertiary;
              return (
                <View key={step} style={styles.timelineStep}>
                  <View style={[styles.timelineDot, { backgroundColor: isCompleted ? stepColor : colors.surfaceTertiary }]}>
                    {isCompleted && <CheckCircle size={12} color={colors.textInverse} strokeWidth={2.5} />}
                  </View>
                  <Text style={[styles.timelineLabel, { color: colors.textTertiary }, isCompleted && { color: stepColor, fontWeight: '600' as const }]}>
                    {STATUS_LABELS[step]}
                  </Text>
                  {i < 2 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.surfaceTertiary }, isCompleted && { backgroundColor: stepColor }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.messagesSection}>
          <Text style={[styles.messagesTitle, { color: colors.text }]}>Messages ({requestMessages.length})</Text>
          {requestMessages.length === 0 && (
            <Text style={[styles.noMessages, { color: colors.textTertiary }]}>No messages yet. Start the conversation below.</Text>
          )}
          {requestMessages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.senderRole === 'landlord'
                  ? [styles.messageBubbleSent, { backgroundColor: colors.primary }]
                  : [styles.messageBubbleReceived, { backgroundColor: colors.surfaceSecondary }],
              ]}
            >
              <Text style={[
                styles.messageSender,
                { color: colors.textSecondary },
                msg.senderRole === 'landlord' && { color: 'rgba(255,255,255,0.7)' },
              ]}>
                {msg.senderName}
              </Text>
              <Text style={[
                styles.messageBody,
                { color: colors.text },
                msg.senderRole === 'landlord' && { color: colors.textInverse },
              ]}>
                {msg.body}
              </Text>
              <Text style={[
                styles.messageTime,
                { color: colors.textTertiary },
                msg.senderRole === 'landlord' && { color: 'rgba(255,255,255,0.5)' },
              ]}>
                {formatDate(msg.timestamp)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
        <TextInput
          style={[styles.messageInput, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          multiline
          testID="message-input"
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }, !messageText.trim() && { backgroundColor: colors.surfaceTertiary }]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
          testID="send-message-btn"
        >
          <Send size={16} color={messageText.trim() ? colors.textInverse : colors.textTertiary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <Modal visible={!!viewingImage} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setViewingImage(null)}>
            <X size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          {viewingImage && (
            <Image source={{ uri: viewingImage }} style={styles.imageModalFull} contentFit="contain" />
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  requestHeader: {
    margin: 20,
    marginBottom: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  requestDescription: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  requestPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 14,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  mediaThumbnailWrap: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  tenantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 14,
  },
  tenantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantAvatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  tenantBannerName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tenantBannerSub: {
    fontSize: 12,
  },
  contractorSection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  contractorHeaderText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignedInfo: {
    flex: 1,
  },
  assignedName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  assignedCompany: {
    fontSize: 12,
    marginTop: 2,
  },
  contractorStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  contractorStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  unassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 5,
  },
  unassignBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  assignBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noContractorText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  contractorDropdown: {
    maxHeight: 240,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  contractorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  contractorOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractorOptionName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  contractorOptionCompany: {
    fontSize: 12,
    marginTop: 1,
  },
  bestMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  bestMatchText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  contractorCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contractorCatText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  contractorDividerRow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 0.5,
  },
  contractorDividerText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  actionRow: {
    gap: 8,
  },
  statusUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  statusUpdateBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  logExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  logExpenseBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  datesSection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  dateField: {
    marginBottom: 0,
  },
  dateFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dateFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  datePickerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateReadOnly: {
    fontSize: 14,
    fontWeight: '500' as const,
    paddingVertical: 2,
  },
  dateDropdown: {
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dateOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  dateOptionText: {
    fontSize: 14,
  },
  dateDivider: {
    height: 1,
    marginVertical: 12,
  },
  statusTimeline: {
    margin: 20,
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  timelineSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
  },
  messagesSection: {
    padding: 20,
  },
  messagesTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  noMessages: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  messageBubbleSent: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageBubbleReceived: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 3,
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 0.5,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalFull: {
    width: '100%',
    height: '80%',
  },
});
