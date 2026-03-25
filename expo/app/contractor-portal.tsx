import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Briefcase,
  MessageCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  LogOut,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Wrench,
  FileText,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { formatDate, getStatusColor } from '@/utils/helpers';
import { STATUS_LABELS, REQUEST_CATEGORIES, MaintenanceRequest, Message, ProposedTimeSlot } from '@/types';

type PortalTab = 'jobs' | 'messages';

interface ContractorJob extends MaintenanceRequest {
  ownerName?: string;
}

function mapRequest(row: Record<string, unknown>): ContractorJob {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    propertyId: row.property_id as string,
    category: row.category as MaintenanceRequest['category'],
    description: (row.description as string) ?? '',
    status: row.status as MaintenanceRequest['status'],
    photoUri: row.photo_uri as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tenantName: (row.tenant_name as string) ?? '',
    unitLabel: (row.unit_label as string) ?? '',
    propertyName: (row.property_name as string) ?? '',
    assignedContractorId: (row.assigned_contractor_id as string | null) ?? null,
    contractorStatus: (row.contractor_status as MaintenanceRequest['contractorStatus']) ?? null,
    proposedTimes: (row.proposed_times as ProposedTimeSlot[] | null) ?? null,
    confirmedTime: (row.confirmed_time as string | null) ?? null,
    confirmedBy: (row.confirmed_by as string | null) ?? null,
    serviceDate: row.service_date as string | undefined,
    requestedDate: row.requested_date as string | undefined,
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    senderId: row.sender_id as string,
    senderName: (row.sender_name as string) ?? '',
    senderRole: row.sender_role as Message['senderRole'],
    body: (row.body as string) ?? '',
    timestamp: row.created_at as string,
  };
}

export default function ContractorPortalScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const userId = user?.id;

  const [tab, setTab] = useState<PortalTab>('jobs');
  const [jobs, setJobs] = useState<ContractorJob[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contractorInfo, setContractorInfo] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const fetchContractorData = useCallback(async () => {
    if (!userId) return;
    console.log('[ContractorPortal] Fetching contractor data for user:', userId);

    const { data: contractorRow, error: cError } = await supabase
      .from('contractors')
      .select('id, first_name, last_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (cError || !contractorRow) {
      console.log('[ContractorPortal] No contractor record found:', cError?.message);
      setIsLoading(false);
      return;
    }

    const row = contractorRow as Record<string, unknown>;
    const cInfo = {
      id: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
    };
    setContractorInfo(cInfo);
    console.log('[ContractorPortal] Contractor found:', cInfo.id);

    const { data: jobRows, error: jError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('assigned_contractor_id', cInfo.id)
      .order('created_at', { ascending: false });

    if (jError) {
      console.log('[ContractorPortal] Jobs fetch error:', jError.message);
    } else {
      const mapped = (jobRows ?? []).map((r: Record<string, unknown>) => mapRequest(r));
      setJobs(mapped);
      console.log('[ContractorPortal] Loaded', mapped.length, 'jobs');
    }

    const requestIds = (jobRows ?? []).map((r: Record<string, unknown>) => r.id as string);
    if (requestIds.length > 0) {
      const { data: msgRows, error: mError } = await supabase
        .from('messages')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true });

      if (mError) {
        console.log('[ContractorPortal] Messages fetch error:', mError.message);
      } else {
        setMessages((msgRows ?? []).map((m: Record<string, unknown>) => mapMessage(m)));
      }
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchContractorData();
  }, [fetchContractorData]);

  useEffect(() => {
    if (!contractorInfo?.id) return;
    const channel = supabase
      .channel('contractor-messages-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = mapMessage(payload.new as Record<string, unknown>);
        const isForMyJobs = jobs.some(j => j.id === newMsg.requestId);
        if (isForMyJobs) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [contractorInfo?.id, jobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContractorData();
    setRefreshing(false);
  }, [fetchContractorData]);

  const handleAcceptJob = useCallback(async (jobId: string) => {
    console.log('[ContractorPortal] Accepting job:', jobId);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ contractor_status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (error) {
      Alert.alert('Error', 'Failed to accept job.');
      console.log('[ContractorPortal] Accept error:', error.message);
    } else {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, contractorStatus: 'accepted' } : j));
    }
  }, []);

  const handleDeclineJob = useCallback((jobId: string) => {
    Alert.alert('Decline Job', 'Are you sure you want to decline this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const { error } = await supabase
            .from('maintenance_requests')
            .update({ contractor_status: 'declined', updated_at: new Date().toISOString() })
            .eq('id', jobId);
          if (error) {
            Alert.alert('Error', 'Failed to decline job.');
          } else {
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, contractorStatus: 'declined' } : j));
          }
        },
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !selectedJobId || !userId || !contractorInfo) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { data, error } = await supabase
      .from('messages')
      .insert({
        request_id: selectedJobId,
        sender_id: userId,
        sender_name: `${contractorInfo.firstName} ${contractorInfo.lastName}`,
        sender_role: 'contractor',
        body: messageText.trim(),
      })
      .select()
      .single();
    if (error) {
      Alert.alert('Error', 'Failed to send message.');
    } else if (data) {
      const newMsg = mapMessage(data as Record<string, unknown>);
      setMessages(prev => [...prev, newMsg]);
    }
    setMessageText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messageText, selectedJobId, userId, contractorInfo]);

  const handleAddNote = useCallback(async (jobId: string) => {
    if (!noteText.trim() || !userId || !contractorInfo) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase
      .from('messages')
      .insert({
        request_id: jobId,
        sender_id: userId,
        sender_name: `${contractorInfo.firstName} ${contractorInfo.lastName}`,
        sender_role: 'contractor',
        body: `[Work Note] ${noteText.trim()}`,
      })
      .select()
      .single();
    setNoteText('');
    setShowNoteInput(null);
    void fetchContractorData();
  }, [noteText, userId, contractorInfo, fetchContractorData]);

  const activeJobs = useMemo(() => jobs.filter(j => j.status !== 'resolved'), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'resolved'), [jobs]);
  const selectedJobMessages = useMemo(() => {
    if (!selectedJobId) return [];
    return messages.filter(m => m.requestId === selectedJobId);
  }, [messages, selectedJobId]);

  const jobThreads = useMemo(() => {
    return jobs
      .filter(j => {
        const jobMsgs = messages.filter(m => m.requestId === j.id);
        return jobMsgs.length > 0;
      })
      .map(j => {
        const jobMsgs = messages.filter(m => m.requestId === j.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return { job: j, lastMessage: jobMsgs[0], count: jobMsgs.length };
      })
      .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
  }, [jobs, messages]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your jobs...</Text>
        </View>
      </View>
    );
  }

  if (!contractorInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyPortal}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.warningLight }]}>
            <Wrench size={36} color={colors.warning} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contractor Profile</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your account is not linked to a contractor profile yet. Ask the property manager to invite you.
          </Text>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.dangerLight }]}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }}
          >
            <LogOut size={16} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.logoutBtnText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (selectedJobId) {
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) {
      setSelectedJobId(null);
      return null;
    }
    const catInfo = REQUEST_CATEGORIES.find(c => c.key === job.category);
    const statusColor = getStatusColor(job.status);

    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            onPress={() => setSelectedJobId(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.detailHeaderCenter}>
            <Text style={[styles.detailHeaderTitle, { color: colors.text }]} numberOfLines={1}>
              {job.propertyName} · {job.unitLabel}
            </Text>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.detailScroll}
          contentContainerStyle={styles.detailScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.jobDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.detailBadges}>
              <View style={[styles.badge, { backgroundColor: (catInfo ? getStatusColor('open') : colors.textTertiary) + '14' }]}>
                <Text style={styles.badgeEmoji}>{catInfo?.icon ?? '📦'}</Text>
                <Text style={[styles.badgeText, { color: colors.text }]}>{catInfo?.label ?? 'Other'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor + '14' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
              </View>
            </View>
            <Text style={[styles.jobDetailDescription, { color: colors.text }]}>{job.description}</Text>
            <View style={styles.detailMeta}>
              <Text style={[styles.detailMetaLabel, { color: colors.textTertiary }]}>Tenant</Text>
              <Text style={[styles.detailMetaValue, { color: colors.text }]}>{job.tenantName || 'N/A'}</Text>
            </View>
            <View style={styles.detailMeta}>
              <Text style={[styles.detailMetaLabel, { color: colors.textTertiary }]}>Submitted</Text>
              <Text style={[styles.detailMetaValue, { color: colors.text }]}>{formatDate(job.createdAt)}</Text>
            </View>
            {job.serviceDate && (
              <View style={styles.detailMeta}>
                <Text style={[styles.detailMetaLabel, { color: colors.textTertiary }]}>Service Date</Text>
                <Text style={[styles.detailMetaValue, { color: colors.text }]}>
                  {new Date(job.serviceDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}

            {job.contractorStatus === 'pending' && (
              <View style={styles.acceptDeclineRow}>
                <TouchableOpacity
                  style={[styles.acceptBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleAcceptJob(job.id)}
                  activeOpacity={0.8}
                >
                  <ThumbsUp size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.declineBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
                  onPress={() => handleDeclineJob(job.id)}
                  activeOpacity={0.8}
                >
                  <ThumbsDown size={16} color={colors.danger} strokeWidth={2} />
                  <Text style={[styles.declineBtnText, { color: colors.danger }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {job.contractorStatus === 'accepted' && (
              <View style={[styles.acceptedBanner, { backgroundColor: colors.successLight }]}>
                <CheckCircle size={14} color={colors.success} strokeWidth={2} />
                <Text style={[styles.acceptedBannerText, { color: colors.success }]}>You accepted this job</Text>
              </View>
            )}

            {showNoteInput === job.id ? (
              <View style={styles.noteInputWrap}>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add a work note or progress update..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  autoFocus
                />
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    style={[styles.noteCancelBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => { setShowNoteInput(null); setNoteText(''); }}
                  >
                    <Text style={[styles.noteCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.noteSaveBtn, { backgroundColor: colors.primary }, !noteText.trim() && { opacity: 0.4 }]}
                    onPress={() => handleAddNote(job.id)}
                    disabled={!noteText.trim()}
                  >
                    <Text style={styles.noteSaveText}>Add Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addNoteBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setShowNoteInput(job.id)}
              >
                <FileText size={14} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.addNoteBtnText, { color: colors.primary }]}>Add Work Note</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.messagesSection}>
            <Text style={[styles.messagesSectionTitle, { color: colors.text }]}>
              Messages ({selectedJobMessages.length})
            </Text>
            {selectedJobMessages.length === 0 && (
              <Text style={[styles.noMessagesText, { color: colors.textTertiary }]}>No messages yet.</Text>
            )}
            {selectedJobMessages.map(msg => {
              const isMine = msg.senderRole === 'contractor';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.msgBubble,
                    isMine
                      ? [styles.msgBubbleSent, { backgroundColor: colors.primary }]
                      : [styles.msgBubbleReceived, { backgroundColor: colors.surfaceSecondary }],
                  ]}
                >
                  <Text style={[styles.msgSender, isMine ? { color: 'rgba(255,255,255,0.7)' } : { color: colors.textTertiary }]}>
                    {msg.senderName} · {msg.senderRole}
                  </Text>
                  <Text style={[styles.msgBody, isMine ? { color: '#FFFFFF' } : { color: colors.text }]}>
                    {msg.body}
                  </Text>
                  <Text style={[styles.msgTime, isMine ? { color: 'rgba(255,255,255,0.5)' } : { color: colors.textTertiary }]}>
                    {formatDate(msg.timestamp)}
                  </Text>
                </View>
              );
            })}
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
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: colors.primary }, !messageText.trim() && { backgroundColor: colors.surfaceTertiary }]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Send size={16} color={messageText.trim() ? '#FFFFFF' : colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const renderJobCard = (job: ContractorJob) => {
    const catInfo = REQUEST_CATEGORIES.find(c => c.key === job.category);
    const statusColor = getStatusColor(job.status);
    const csColor = job.contractorStatus === 'accepted' ? colors.success
      : job.contractorStatus === 'declined' ? colors.danger
      : colors.warning;

    return (
      <TouchableOpacity
        key={job.id}
        style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedJobId(job.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.jobCardTop}>
          <View style={[styles.badge, { backgroundColor: statusColor + '14' }]}>
            {job.status === 'open' && <AlertCircle size={12} color={statusColor} strokeWidth={2} />}
            {job.status === 'in_progress' && <Clock size={12} color={statusColor} strokeWidth={2} />}
            {job.status === 'resolved' && <CheckCircle size={12} color={statusColor} strokeWidth={2} />}
            <Text style={[styles.badgeText, { color: statusColor }]}>{STATUS_LABELS[job.status]}</Text>
          </View>
          {job.contractorStatus && (
            <View style={[styles.badge, { backgroundColor: csColor + '14' }]}>
              <Text style={[styles.badgeText, { color: csColor }]}>
                {job.contractorStatus.charAt(0).toUpperCase() + job.contractorStatus.slice(1)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.jobCardTitle, { color: colors.text }]} numberOfLines={2}>{job.description}</Text>
        <Text style={[styles.jobCardSub, { color: colors.textTertiary }]}>
          {catInfo?.icon} {catInfo?.label} · {job.propertyName} · {job.unitLabel}
        </Text>
        <View style={styles.jobCardBottom}>
          <Text style={[styles.jobCardDate, { color: colors.textTertiary }]}>{formatDate(job.createdAt)}</Text>
          <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.portalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <View style={styles.portalHeaderTop}>
          <View>
            <Text style={[styles.portalGreeting, { color: colors.textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.portalName, { color: colors.text }]}>
              {contractorInfo.firstName} {contractorInfo.lastName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LogOut size={20} color={colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {jobs.filter(j => j.contractorStatus === 'pending').length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.warning }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primaryFaint }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{activeJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{completedJobs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.success }]}>Done</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {([
            { key: 'jobs' as PortalTab, label: 'Jobs', icon: Briefcase },
            { key: 'messages' as PortalTab, label: 'Messages', icon: MessageCircle },
          ]).map(t => {
            const isActive = tab === t.key;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabItem, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setTab(t.key)}
              >
                <Icon size={16} color={isActive ? colors.primary : colors.textTertiary} strokeWidth={2} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }, isActive && { fontWeight: '600' as const }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tab === 'jobs' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {jobs.length === 0 ? (
            <View style={styles.emptyTab}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
                <Briefcase size={32} color={colors.primaryLight} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No jobs assigned</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                When a property manager assigns you to a maintenance request, it will appear here.
              </Text>
            </View>
          ) : (
            <>
              {activeJobs.length > 0 && (
                <View style={styles.jobSection}>
                  <Text style={[styles.jobSectionTitle, { color: colors.text }]}>Active Jobs ({activeJobs.length})</Text>
                  {activeJobs.map(renderJobCard)}
                </View>
              )}
              {completedJobs.length > 0 && (
                <View style={styles.jobSection}>
                  <Text style={[styles.jobSectionTitle, { color: colors.textSecondary }]}>Completed ({completedJobs.length})</Text>
                  {completedJobs.map(renderJobCard)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'messages' && (
        <ScrollView
          style={styles.tabContent}
          contentContainerStyle={styles.tabContentInner}
          showsVerticalScrollIndicator={false}
        >
          {jobThreads.length === 0 ? (
            <View style={styles.emptyTab}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
                <MessageCircle size={32} color={colors.primaryLight} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Messages related to your jobs will appear here.
              </Text>
            </View>
          ) : (
            jobThreads.map(({ job, lastMessage, count: _count }) => (
              <TouchableOpacity
                key={job.id}
                style={[styles.threadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedJobId(job.id);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.threadTop}>
                  <View style={[styles.threadAvatar, { backgroundColor: colors.primaryMuted }]}>
                    <Text style={[styles.threadAvatarText, { color: colors.primary }]}>
                      {job.propertyName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.threadInfo}>
                    <View style={styles.threadNameRow}>
                      <Text style={[styles.threadName, { color: colors.text }]} numberOfLines={1}>
                        {job.propertyName} · {job.unitLabel}
                      </Text>
                      <Text style={[styles.threadTime, { color: colors.textTertiary }]}>
                        {formatDate(lastMessage.timestamp)}
                      </Text>
                    </View>
                    <Text style={[styles.threadLastMsg, { color: colors.textSecondary }]} numberOfLines={1}>
                      {lastMessage.body}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyPortal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  portalHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 0.5,
  },
  portalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  portalGreeting: {
    fontSize: 13,
  },
  portalName: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
  },
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    paddingBottom: 100,
  },
  emptyTab: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  jobSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  jobSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  jobCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  jobCardTop: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  jobCardSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  jobCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobCardDate: {
    fontSize: 12,
  },
  threadCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  threadAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  threadInfo: {
    flex: 1,
  },
  threadNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 8,
  },
  threadTime: {
    fontSize: 11,
  },
  threadLastMsg: {
    fontSize: 13,
    marginTop: 3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  detailHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 20,
  },
  jobDetailCard: {
    margin: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  jobDetailDescription: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  detailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailMetaLabel: {
    fontSize: 13,
  },
  detailMetaValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  acceptDeclineRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  acceptedBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  addNoteBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noteInputWrap: {
    marginTop: 14,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  noteCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noteCancelText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  noteSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  noteSaveText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  messagesSection: {
    paddingHorizontal: 20,
  },
  messagesSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  noMessagesText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  msgBubbleSent: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  msgBubbleReceived: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgSender: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 10,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
