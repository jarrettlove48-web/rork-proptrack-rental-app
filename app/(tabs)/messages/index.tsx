import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, getStatusColor } from '@/utils/helpers';
import { STATUS_LABELS } from '@/types';

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
}

export default function MessagesScreen() {
  const router = useRouter();
  const { requests, messages, refetchAll } = useData();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

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
        };
      })
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    return requestsWithMessages;
  }, [requests, messages]);

  const renderThread = useCallback(({ item }: { item: ThreadSummary }) => {
    const statusColor = getStatusColor(item.status as 'open' | 'in_progress' | 'resolved');
    return (
      <TouchableOpacity
        style={[styles.threadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/request-detail', params: { id: item.requestId } } as never);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.threadTop}>
          <View style={[styles.threadAvatar, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.threadAvatarText, { color: colors.primary }]}>
              {item.tenantName ? item.tenantName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.threadInfo}>
            <View style={styles.threadNameRow}>
              <Text style={[styles.threadName, { color: colors.text }]} numberOfLines={1}>{item.tenantName || 'Unknown'}</Text>
              <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{formatDate(item.lastMessageTime)}</Text>
            </View>
            <Text style={[styles.threadProperty, { color: colors.textTertiary }]}>{item.propertyName} · {item.unitLabel}</Text>
            <Text style={[styles.threadLastMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
          </View>
        </View>
        <View style={[styles.threadBottom, { borderTopColor: colors.divider }]}>
          <View style={[styles.threadStatusBadge, { backgroundColor: statusColor + '14' }]}>
            <View style={[styles.threadStatusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.threadStatusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS]}
            </Text>
          </View>
          <Text style={[styles.messageCount, { color: colors.textTertiary }]}>{item.messageCount} msg{item.messageCount !== 1 ? 's' : ''}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [router, colors]);

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
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  threadCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  threadAvatarText: {
    fontSize: 17,
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
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
    marginRight: 8,
  },
  threadTime: {
    fontSize: 12,
  },
  threadProperty: {
    fontSize: 12,
    marginTop: 1,
  },
  threadLastMessage: {
    fontSize: 13,
    marginTop: 4,
  },
  threadBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  threadStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  threadStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  threadStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  messageCount: {
    fontSize: 12,
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
});
