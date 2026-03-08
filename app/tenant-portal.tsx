import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Home, Wrench, MessageCircle, Plus, ChevronRight, AlertCircle, Clock, CheckCircle, Send, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, getStatusColor } from '@/utils/helpers';
import { REQUEST_CATEGORIES, STATUS_LABELS, MaintenanceRequest } from '@/types';

type PortalTab = 'home' | 'requests' | 'messages';

export default function TenantPortalScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const { units, properties, requests, messages, getRequestsForUnit, getMessagesForRequest } = useData();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const unit = useMemo(() => units.find(u => u.id === unitId), [units, unitId]);
  const property = useMemo(() => properties.find(p => p.id === unit?.propertyId), [properties, unit]);
  const unitRequests = useMemo(() => getRequestsForUnit(unitId ?? ''), [getRequestsForUnit, unitId]);
  const openRequests = useMemo(() => unitRequests.filter(r => r.status !== 'resolved'), [unitRequests]);
  const resolvedRequests = useMemo(() => unitRequests.filter(r => r.status === 'resolved'), [unitRequests]);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const handleTabChange = useCallback((tab: PortalTab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    const toValue = tab === 'home' ? 0 : tab === 'requests' ? 1 : 2;
    Animated.spring(tabIndicator, { toValue, friction: 8, tension: 80, useNativeDriver: true }).start();
  }, [tabIndicator]);

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
        <Stack.Screen options={{ title: 'Tenant Portal' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Unit not found</Text>
      </View>
    );
  }

  const renderHome = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeIn }]}>
      <View style={[styles.welcomeCard, { backgroundColor: colors.primary }]}>
        <Text style={[styles.welcomeGreeting, { color: colors.textInverse }]}>
          Welcome back, {unit.tenantName?.split(' ')[0] || 'Tenant'}
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
              <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.requestTop}>
                  <Text style={styles.requestEmoji}>{catInfo?.icon}</Text>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>{req.description}</Text>
                    <Text style={[styles.requestMeta, { color: colors.textTertiary }]}>{formatDate(req.createdAt)}</Text>
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
              </View>
            );
          })}
        </View>
      )}

      {unitRequests.length === 0 && (
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
        <Text style={[styles.submitTitle, { color: colors.text }]}>Submit a Request</Text>
        <Text style={[styles.submitDesc, { color: colors.textTertiary }]}>Pick a category, describe the issue, and submit.</Text>

        <View style={styles.categoryGrid}>
          {REQUEST_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => Haptics.selectionAsync()}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryCardEmoji}>{cat.icon}</Text>
              <Text style={[styles.categoryCardLabel, { color: colors.text }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.descInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
          placeholder="Describe the issue..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
          activeOpacity={0.8}
        >
          <Send size={14} color={colors.textInverse} strokeWidth={2} />
          <Text style={[styles.submitBtnText, { color: colors.textInverse }]}>Submit Request</Text>
        </TouchableOpacity>
      </View>

      {unitRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Requests</Text>
          {unitRequests.map(req => {
            const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
            const statusColor = getStatusColor(req.status);
            return (
              <View key={req.id} style={[styles.requestListItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.requestListTop}>
                  <Text style={styles.requestEmoji}>{catInfo?.icon}</Text>
                  <Text style={[styles.requestListTitle, { color: colors.text }]} numberOfLines={1}>{req.description}</Text>
                  {getStatusIcon(req.status)}
                </View>
                <View style={styles.requestListBottom}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[req.status]}</Text>
                  </View>
                  <Text style={[styles.requestListDate, { color: colors.textTertiary }]}>{formatDate(req.createdAt)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderMessages = () => {
    return (
      <View style={styles.tabContent}>
        {unitRequests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MessageCircle size={28} color={colors.primaryLight} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations</Text>
            <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
              Messages appear here once you have an active request.
            </Text>
          </View>
        ) : (
          <>
            {unitRequests.map(req => {
              const reqMessages = getMessagesForRequest(req.id);
              const lastMsg = reqMessages[reqMessages.length - 1];
              const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
              return (
                <View key={req.id} style={[styles.messageThread, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
                        {lastMsg.senderRole === 'landlord' ? 'Landlord' : 'You'}:
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
                </View>
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
      <Stack.Screen
        options={{
          title: 'Tenant Portal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={[styles.previewBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.previewBadgeText, { color: colors.accent }]}>Preview</Text>
            </View>
          ),
        }}
      />

      <View style={[styles.portalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={[styles.tenantBadge, { backgroundColor: colors.primaryFaint }]}>
          <User size={12} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.tenantBadgeText, { color: colors.primary }]}>{unit.tenantName}</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'requests' && renderRequests()}
        {activeTab === 'messages' && renderMessages()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  portalHeader: { paddingHorizontal: 20, paddingTop: 12, borderBottomWidth: 0.5 },
  tenantBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 6, marginBottom: 12 },
  tenantBadgeText: { fontSize: 13, fontWeight: '600' as const },
  previewBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  previewBadgeText: { fontSize: 11, fontWeight: '700' as const },
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
  categoryCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 6 },
  categoryCardEmoji: { fontSize: 16 },
  categoryCardLabel: { fontSize: 13, fontWeight: '500' as const },
  descInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, borderWidth: 1, marginBottom: 16 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
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
});
