import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, getStatusColor } from '@/utils/helpers';
import { Message } from '@/types';

interface ThreadSummary {
  requestId: string;
  requestDescription: string;
  propertyName: string;
  unitLabel: string;
  status: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  tenantName: string;
  unreadHint: boolean;
}

function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - messageDay.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { requests, messages, addMessage, profile, refetchAll } = useData();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const threads = useMemo((): ThreadSummary[] => {
    const requestsWithMessages = requests
      .filter(r => {
        const reqMessages = messages.filter(m => m.requestId === r.id);
        return reqMessages.length > 0;
      })
      .map(r => {
        const reqMessages = messages
          .filter(m => m.requestId === r.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const last = reqMessages[0];
        return {
          requestId: r.id,
          requestDescription: r.description,
          propertyName: r.propertyName,
          unitLabel: r.unitLabel,
          status: r.status,
          lastMessage: last?.body ?? '',
          lastMessageTime: last?.timestamp ?? r.createdAt,
          messageCount: reqMessages.length,
          tenantName: r.tenantName,
          unreadHint: last?.senderRole !== 'landlord',
        };
      })
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return requestsWithMessages;
  }, [requests, messages]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find(t => t.requestId === activeThreadId) ?? null;
  }, [threads, activeThreadId]);

  const threadMessages = useMemo(() => {
    if (!activeThreadId) return [];
    return messages
      .filter(m => m.requestId === activeThreadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, activeThreadId]);

  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: Message[] }[] = [];
    let currentLabel = '';
    let currentGroup: Message[] = [];

    for (const msg of threadMessages) {
      const label = getDateGroupLabel(msg.timestamp);
      if (label !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ label: currentLabel, messages: currentGroup });
        }
        currentLabel = label;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ label: currentLabel, messages: currentGroup });
    }
    return groups;
  }, [threadMessages]);

  const openThread = useCallback((threadId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveThreadId(threadId);
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const closeThread = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveThreadId(null);
      setMessageText('');
    });
  }, [slideAnim]);

  useEffect(() => {
    if (activeThreadId && threadMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [threadMessages.length, activeThreadId]);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !activeThreadId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void addMessage({
      requestId: activeThreadId,
      senderId: 'landlord',
      senderName: profile.name || 'Landlord',
      senderRole: 'landlord',
      body: messageText.trim(),
    });
    setMessageText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messageText, activeThreadId, addMessage, profile.name]);

  const renderThread = useCallback(({ item }: { item: ThreadSummary }) => {
    const isLastFromOther = item.unreadHint;

    return (
      <TouchableOpacity
        style={[styles.threadRow, { borderBottomColor: colors.divider }]}
        onPress={() => openThread(item.requestId)}
        activeOpacity={0.6}
      >
        <View style={[styles.threadAvatar, { backgroundColor: colors.primaryMuted }]}>
          <Text style={[styles.threadAvatarText, { color: colors.primary }]}>
            {item.tenantName ? item.tenantName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.threadContent}>
          <View style={styles.threadTopRow}>
            <Text style={[styles.threadName, { color: colors.text }, isLastFromOther && styles.threadNameBold]} numberOfLines={1}>
              {item.tenantName || 'Unknown'}
            </Text>
            <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{formatDate(item.lastMessageTime)}</Text>
          </View>
          <Text style={[styles.threadSubtitle, { color: colors.textTertiary }]} numberOfLines={1}>
            {item.propertyName} · {item.unitLabel}
          </Text>
          <View style={styles.threadPreviewRow}>
            <Text
              style={[
                styles.threadPreview,
                { color: isLastFromOther ? colors.text : colors.textSecondary },
                isLastFromOther && styles.threadPreviewBold,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {isLastFromOther && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, openThread]);

  const renderMessageBubble = useCallback(({ item: msg }: { item: Message }) => {
    const isSent = msg.senderRole === 'landlord';
    const roleBadge = msg.senderRole === 'contractor' ? 'Contractor' : null;

    return (
      <View style={[styles.bubbleRow, isSent ? styles.bubbleRowSent : styles.bubbleRowReceived]}>
        {!isSent && (
          <View style={[styles.bubbleAvatar, { backgroundColor: msg.senderRole === 'contractor' ? colors.accentLight : colors.primaryMuted }]}>
            <Text style={[styles.bubbleAvatarText, { color: msg.senderRole === 'contractor' ? colors.accent : colors.primary }]}>
              {msg.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isSent
            ? [styles.bubbleSent, { backgroundColor: colors.primary }]
            : [styles.bubbleReceived, { backgroundColor: colors.surfaceSecondary }],
        ]}>
          {!isSent && (
            <View style={styles.bubbleSenderRow}>
              <Text style={[styles.bubbleSenderName, { color: colors.textSecondary }]}>{msg.senderName}</Text>
              {roleBadge && (
                <View style={[styles.roleBadge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{roleBadge}</Text>
                </View>
              )}
            </View>
          )}
          <Text style={[
            styles.bubbleBody,
            { color: isSent ? '#FFFFFF' : colors.text },
          ]}>
            {msg.body}
          </Text>
          <Text style={[
            styles.bubbleTime,
            { color: isSent ? 'rgba(255,255,255,0.55)' : colors.textTertiary },
          ]}>
            {formatMessageTime(msg.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, [colors]);

  const renderDateHeader = useCallback((label: string) => (
    <View style={styles.dateHeaderWrap} key={`date-${label}`}>
      <View style={[styles.dateHeaderPill, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.dateHeaderText, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  ), [colors]);

  const chatFlatListData = useMemo(() => {
    const items: ({ type: 'header'; label: string } | { type: 'message'; message: Message })[] = [];
    for (const group of groupedMessages) {
      items.push({ type: 'header', label: group.label });
      for (const msg of group.messages) {
        items.push({ type: 'message', message: msg });
      }
    }
    return items;
  }, [groupedMessages]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <MessageCircle size={36} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No conversations yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Messages will appear here when you communicate with tenants about maintenance requests.
      </Text>
    </View>
  ), [colors]);

  if (activeThreadId && activeThread) {
    return (
      <Animated.View
        style={[
          styles.chatContainer,
          { backgroundColor: colors.background, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={[styles.chatHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={styles.chatBackBtn}
            onPress={closeThread}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.text }]} numberOfLines={1}>
              {activeThread.tenantName || 'Unknown'}
            </Text>
            <View style={styles.chatHeaderMetaRow}>
              <View style={[styles.chatStatusDot, { backgroundColor: getStatusColor(activeThread.status as 'open' | 'in_progress' | 'resolved') }]} />
              <Text style={[styles.chatHeaderMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                {activeThread.propertyName} · {activeThread.unitLabel}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.chatDetailBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/request-detail', params: { id: activeThreadId } } as never);
            }}
          >
            <Text style={[styles.chatDetailBtnText, { color: colors.primary }]}>Details</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={chatFlatListData}
            keyExtractor={(item, idx) => item.type === 'header' ? `h-${item.label}-${idx}` : `m-${item.message.id}`}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return renderDateHeader(item.label);
              }
              return renderMessageBubble({ item: item.message });
            }}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={() => (
              <View style={styles.chatEmptyState}>
                <Text style={[styles.chatEmptyText, { color: colors.textTertiary }]}>
                  No messages yet. Start the conversation below.
                </Text>
              </View>
            )}
          />

          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
            <TextInput
              style={[styles.messageInput, { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border }]}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Message..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={2000}
              testID="message-input"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: messageText.trim() ? colors.primary : colors.surfaceTertiary },
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              testID="send-message-btn"
            >
              <Send size={16} color={messageText.trim() ? '#FFFFFF' : colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={threads}
        keyExtractor={(item) => item.requestId}
        renderItem={renderThread}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Messages</Text>
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  threadAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  threadAvatarText: {
    fontSize: 19,
    fontWeight: '700' as const,
  },
  threadContent: {
    flex: 1,
  },
  threadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  threadName: {
    fontSize: 16,
    fontWeight: '500' as const,
    flex: 1,
    marginRight: 8,
  },
  threadNameBold: {
    fontWeight: '700' as const,
  },
  threadTime: {
    fontSize: 12,
  },
  threadSubtitle: {
    fontSize: 12,
    marginBottom: 3,
  },
  threadPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadPreview: {
    fontSize: 14,
    flex: 1,
  },
  threadPreviewBold: {
    fontWeight: '600' as const,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
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
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  chatBackBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  chatHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  chatStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chatHeaderMeta: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  chatDetailBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  chatDetailBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  chatBody: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  chatEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  chatEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  dateHeaderWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
    maxWidth: '85%',
  },
  bubbleRowSent: {
    alignSelf: 'flex-end',
  },
  bubbleRowReceived: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  bubbleAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleSent: {
    borderBottomRightRadius: 6,
  },
  bubbleReceived: {
    borderBottomLeftRadius: 6,
  },
  bubbleSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  bubbleSenderName: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  bubbleBody: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 0.5,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 0 : 0,
  },
});
