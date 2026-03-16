import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, X, Plus, AlertCircle, Clock, CheckCircle, CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { MaintenanceRequest, RequestStatus, STATUS_LABELS, REQUEST_CATEGORIES } from '@/types';
import { formatDate, getStatusColor, getCategoryColor } from '@/utils/helpers';

type FilterType = 'all' | RequestStatus;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'Active' },
  { key: 'resolved', label: 'Done' },
];

export default function RequestsScreen() {
  const router = useRouter();
  const { requests, refetchAll } = useData();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(r => r.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.description.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q) ||
        r.unitLabel.toLowerCase().includes(q) ||
        r.tenantName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [requests, activeFilter, searchQuery]);

  const getStatusIcon = useCallback((status: RequestStatus) => {
    const c = getStatusColor(status);
    switch (status) {
      case 'open': return <AlertCircle size={13} color={c} strokeWidth={2} />;
      case 'in_progress': return <Clock size={13} color={c} strokeWidth={2} />;
      case 'resolved': return <CheckCircle size={13} color={c} strokeWidth={2} />;
    }
  }, []);

  const getCategoryInfo = useCallback((category: string) => {
    return REQUEST_CATEGORIES.find(c => c.key === category) ?? REQUEST_CATEGORIES[4];
  }, []);

  const renderRequest = useCallback(({ item }: { item: MaintenanceRequest }) => {
    const catInfo = getCategoryInfo(item.category);
    const statusColor = getStatusColor(item.status);
    const catColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/request-detail', params: { id: item.id } } as never);
        }}
        activeOpacity={0.7}
        testID={`request-card-${item.id}`}
      >
        <View style={styles.cardTop}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '14' }]}>
            <Text style={styles.categoryEmoji}>{catInfo.icon}</Text>
            <Text style={[styles.categoryText, { color: catColor }]}>{catInfo.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>
        <Text style={[styles.requestDescription, { color: colors.text }]} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardBottom}>
          <Text style={[styles.requestMeta, { color: colors.textTertiary }]}>{item.propertyName} · {item.unitLabel}</Text>
          <Text style={[styles.requestTime, { color: colors.textTertiary }]}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.tenantName ? (
          <Text style={[styles.tenantInfo, { color: colors.textSecondary }]}>From: {item.tenantName}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }, [getCategoryInfo, getStatusIcon, router, colors]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
        <AlertCircle size={36} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery ? 'No matching requests' : activeFilter === 'all' ? 'No requests yet' : `No ${FILTERS.find(f => f.key === activeFilter)?.label.toLowerCase()} requests`}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery
          ? 'Try a different search term or clear the filter.'
          : activeFilter === 'all'
          ? 'Maintenance requests from your tenants will appear here.'
          : 'Try switching filters to see other requests.'}
      </Text>
    </View>
  ), [activeFilter, searchQuery, colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.text }]}>Requests</Text>
              <View style={styles.titleActions}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) setSearchQuery('');
                  }}
                >
                  {showSearch ? <X size={16} color={colors.textSecondary} strokeWidth={2} /> : <Search size={16} color={colors.textSecondary} strokeWidth={2} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/calendar' as never);
                  }}
                  testID="calendar-btn"
                >
                  <CalendarDays size={16} color={colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.newRequestBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/submit-request' as never);
                  }}
                  testID="new-request-btn"
                >
                  <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            {showSearch && (
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Search size={15} color={colors.textTertiary} strokeWidth={2} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search requests..."
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  testID="search-input"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={15} color={colors.textTertiary} strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            <View style={styles.filterRow}>
              {FILTERS.map(filter => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.surfaceSecondary },
                    activeFilter === filter.key && { backgroundColor: colors.text },
                  ]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setActiveFilter(filter.key);
                  }}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    activeFilter === filter.key && { color: colors.textInverse },
                  ]}>
                    {filter.label}
                    {filter.key !== 'all' && (
                      ` ${requests.filter(r => r.status === filter.key).length}`
                    )}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRequestBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  requestCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 13,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  requestDescription: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 21,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestMeta: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  requestTime: {
    fontSize: 12,
  },
  tenantInfo: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500' as const,
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
