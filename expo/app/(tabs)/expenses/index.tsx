import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Plus,
  DollarSign,
  Download,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { canTrackExpenses } from '@/constants/plans';
import { Expense, EXPENSE_CATEGORIES } from '@/types';
import { formatCurrency, formatShortDate, expensesToCsv } from '@/utils/helpers';

type CategoryFilter = Expense['category'] | 'all';
type SortField = 'date' | 'amount' | 'category';
type SortOrder = 'asc' | 'desc';
type DateRange = 'all' | '7d' | '30d' | '90d' | '12m' | 'ytd';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '12m', label: '12 Months' },
  { key: 'ytd', label: 'YTD' },
];

function getDateRangeStart(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
  const days = daysMap[range] ?? 0;
  return new Date(now.getTime() - days * 86400000);
}

export default function ExpensesScreen() {
  const router = useRouter();
  const { expenses, properties, units, deleteExpense, refetchAll } = useData();
  const { colors } = useTheme();
  const { currentPlan } = useSubscription();
  const canExpense = canTrackExpenses(currentPlan);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const enrichedExpenses = useMemo(() => {
    return expenses.map(e => {
      const prop = properties.find(p => p.id === e.propertyId);
      const unit = e.unitId ? units.find(u => u.id === e.unitId) : undefined;
      return {
        ...e,
        propertyName: prop?.name ?? 'Unknown',
        unitLabel: unit?.label ?? '',
        tenantName: unit?.tenantName ?? '',
      };
    });
  }, [expenses, properties, units]);

  const filteredExpenses = useMemo(() => {
    let filtered = enrichedExpenses;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }

    if (propertyFilter !== 'all') {
      filtered = filtered.filter(e => e.propertyId === propertyFilter);
    }

    const rangeStart = getDateRangeStart(dateRange);
    if (rangeStart) {
      filtered = filtered.filter(e => new Date(e.date) >= rangeStart);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(q) ||
        e.propertyName.toLowerCase().includes(q) ||
        e.unitLabel.toLowerCase().includes(q) ||
        e.tenantName.toLowerCase().includes(q) ||
        (e.vendor ?? '').toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return filtered;
  }, [enrichedExpenses, categoryFilter, propertyFilter, dateRange, searchQuery, sortField, sortOrder]);

  const totalFiltered = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        info: EXPENSE_CATEGORIES.find(c => c.key === cat),
      }));
  }, [filteredExpenses]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (propertyFilter !== 'all') count++;
    if (dateRange !== 'all') count++;
    return count;
  }, [categoryFilter, propertyFilter, dateRange]);

  const handleExport = useCallback(async () => {
    if (filteredExpenses.length === 0) {
      Alert.alert('No Data', 'There are no expenses to export with the current filters.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const csv = expensesToCsv(filteredExpenses);
    const totalLine = `\nTotal,,"${formatCurrency(totalFiltered)}",,,,`;
    const fullCsv = csv + totalLine;

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([fullCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proptrack-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        Alert.alert('Export', 'CSV export is not supported on this platform.');
      }
    } else {
      try {
        await Share.share({
          message: fullCsv,
          title: `PropTrack Expenses - ${new Date().toLocaleDateString('en-US')}`,
        });
      } catch {
        console.log('Share cancelled or failed');
      }
    }
  }, [filteredExpenses, totalFiltered]);

  const handleDelete = useCallback((id: string, description: string) => {
    Alert.alert(
      'Delete Expense',
      `Remove "${description}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteExpense(id);
          },
        },
      ]
    );
  }, [deleteExpense]);

  const toggleSort = useCallback((field: SortField) => {
    void Haptics.selectionAsync();
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setPropertyFilter('all');
    setDateRange('all');
    setSearchQuery('');
  }, []);

  const renderExpense = useCallback(({ item }: { item: typeof enrichedExpenses[0] }) => {
    const catInfo = EXPENSE_CATEGORIES.find(c => c.key === item.category);

    return (
      <TouchableOpacity
        style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
        onLongPress={() => handleDelete(item.id, item.description)}
        activeOpacity={0.7}
        testID={`expense-card-${item.id}`}
      >
        <View style={styles.cardRow}>
          <View style={[styles.catIcon, { backgroundColor: colors.accentLight }]}>
            <Text style={styles.catEmoji}>{catInfo?.icon ?? '📋'}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.expenseDesc, { color: colors.text }]} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={[styles.expenseMeta, { color: colors.textTertiary }]}>
              {catInfo?.label ?? item.category} · {item.propertyName}
              {item.unitLabel ? ` · ${item.unitLabel}` : ''}
            </Text>
            {item.vendor ? (
              <Text style={[styles.vendorText, { color: colors.textSecondary }]}>
                {item.vendor}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.expenseAmount, { color: colors.danger }]}>
              -{formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.expenseDate, { color: colors.textTertiary }]}>
              {formatShortDate(item.date)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleDelete]);

  const renderSummary = useCallback(() => (
    <View style={styles.summarySection}>
      <View style={[styles.totalCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.totalTop}>
          <View style={[styles.totalIconWrap, { backgroundColor: colors.dangerLight }]}>
            <TrendingUp size={18} color={colors.danger} strokeWidth={2} />
          </View>
          <View style={styles.totalInfo}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Total Expenses
              {dateRange !== 'all' ? ` (${DATE_RANGES.find(d => d.key === dateRange)?.label})` : ''}
            </Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              {formatCurrency(totalFiltered)}
            </Text>
          </View>
          <Text style={[styles.countBadge, { color: colors.textTertiary }]}>
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {categoryBreakdown.length > 0 && (
          <View style={[styles.breakdownWrap, { borderTopColor: colors.divider }]}>
            {categoryBreakdown.slice(0, 4).map((b) => {
              const pct = totalFiltered > 0 ? (b.amount / totalFiltered) * 100 : 0;
              return (
                <View key={b.category} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownEmoji}>{b.info?.icon ?? '📋'}</Text>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                      {b.info?.label ?? b.category}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
                      <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: colors.accent }]} />
                    </View>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                      {formatCurrency(b.amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  ), [totalFiltered, filteredExpenses.length, categoryBreakdown, dateRange, colors]);

  const renderFilters = useCallback(() => {
    if (!showFilters) return null;

    return (
      <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Date Range</Text>
          <View style={styles.chipRow}>
            {DATE_RANGES.map(d => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceSecondary },
                  dateRange === d.key && { backgroundColor: colors.text },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setDateRange(d.key); }}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  dateRange === d.key && { color: colors.textInverse },
                ]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary },
                categoryFilter === 'all' && { backgroundColor: colors.text },
              ]}
              onPress={() => { void Haptics.selectionAsync(); setCategoryFilter('all'); }}
            >
              <Text style={[
                styles.chipText,
                { color: colors.textSecondary },
                categoryFilter === 'all' && { color: colors.textInverse },
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {EXPENSE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceSecondary },
                  categoryFilter === cat.key && { backgroundColor: colors.text },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setCategoryFilter(cat.key); }}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  categoryFilter === cat.key && { color: colors.textInverse },
                ]}>
                  {cat.icon} {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {properties.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Property</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceSecondary },
                  propertyFilter === 'all' && { backgroundColor: colors.text },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setPropertyFilter('all'); }}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  propertyFilter === 'all' && { color: colors.textInverse },
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {properties.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surfaceSecondary },
                    propertyFilter === p.id && { backgroundColor: colors.text },
                  ]}
                  onPress={() => { void Haptics.selectionAsync(); setPropertyFilter(p.id); }}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    propertyFilter === p.id && { color: colors.textInverse },
                  ]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort By</Text>
          <View style={styles.chipRow}>
            {([
              { key: 'date' as SortField, label: 'Date' },
              { key: 'amount' as SortField, label: 'Amount' },
              { key: 'category' as SortField, label: 'Category' },
            ]).map(s => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceSecondary },
                  sortField === s.key && { backgroundColor: colors.text },
                ]}
                onPress={() => toggleSort(s.key)}
              >
                <Text style={[
                  styles.chipText,
                  { color: colors.textSecondary },
                  sortField === s.key && { color: colors.textInverse },
                ]}>
                  {s.label} {sortField === s.key ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={clearFilters}
          >
            <X size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [showFilters, dateRange, categoryFilter, propertyFilter, sortField, sortOrder, properties, colors, activeFilterCount, toggleSort, clearFilters]);

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Expenses</Text>
        <View style={styles.titleActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
          >
            {showSearch
              ? <X size={16} color={colors.textSecondary} strokeWidth={2} />
              : <Search size={16} color={colors.textSecondary} strokeWidth={2} />
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: colors.surfaceSecondary },
              activeFilterCount > 0 && { backgroundColor: colors.primaryFaint },
            ]}
            onPress={() => {
              void Haptics.selectionAsync();
              setShowFilters(!showFilters);
            }}
          >
            <SlidersHorizontal size={16} color={activeFilterCount > 0 ? colors.primary : colors.textSecondary} strokeWidth={2} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.filterBadgeText, { color: colors.textInverse }]}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={handleExport}
            testID="export-btn"
          >
            <Download size={16} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/add-expense' as never);
            }}
            testID="add-expense-btn"
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
            placeholder="Search expenses..."
            placeholderTextColor={colors.textTertiary}
            autoFocus
            testID="expense-search-input"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {renderFilters()}
      {renderSummary()}
    </View>
  ), [
    colors, showSearch, searchQuery, showFilters, activeFilterCount,
    handleExport, router, renderFilters, renderSummary,
  ]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.accentLight }]}>
        <DollarSign size={36} color={colors.accent} strokeWidth={1.5} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery || activeFilterCount > 0 ? 'No matching expenses' : 'No expenses yet'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery || activeFilterCount > 0
          ? 'Try adjusting your filters or search term.'
          : 'Start logging expenses to track costs per property and export for tax season.'}
      </Text>
      {!searchQuery && activeFilterCount === 0 && (
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/add-expense' as never);
          }}
        >
          <Plus size={16} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={[styles.emptyCtaText, { color: colors.textInverse }]}>Log First Expense</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [searchQuery, activeFilterCount, colors, router]);

  if (!canExpense) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.gateContainer}>
          <View style={[styles.gateIconWrap, { backgroundColor: colors.warningLight }]}>
            <DollarSign size={40} color={colors.warning} strokeWidth={1.5} />
          </View>
          <Text style={[styles.gateTitle, { color: colors.text }]}>Expense Tracking</Text>
          <Text style={[styles.gateSubtitle, { color: colors.textSecondary }]}>
            Track repair costs, maintenance expenses, and export reports for tax season. Available on Essential and above.
          </Text>
          <TouchableOpacity
            style={[styles.gateBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/paywall' as never);
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.gateBtnText, { color: colors.textInverse }]}>Upgrade to Essential</Text>
          </TouchableOpacity>
          <View style={styles.gateFeatures}>
            {['Log unlimited expenses', 'Filter by property & category', 'Export CSV for tax season', 'Category breakdown charts'].map((f, i) => (
              <View key={i} style={styles.gateFeatureRow}>
                <View style={[styles.gateCheckDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.gateFeatureText, { color: colors.textSecondary }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        ListHeaderComponent={renderHeader}
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
  filterBadge: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  addBtn: {
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
  filtersPanel: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  summarySection: {
    marginBottom: 16,
  },
  totalCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  breakdownWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 110,
  },
  breakdownEmoji: {
    fontSize: 14,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  breakdownRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    maxWidth: 100,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600' as const,
    width: 75,
    textAlign: 'right' as const,
  },
  expenseCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catEmoji: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  expenseDesc: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  expenseMeta: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  vendorText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500' as const,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 11,
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
    marginBottom: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  gateIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  gateSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  gateBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 28,
  },
  gateBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  gateFeatures: {
    alignSelf: 'stretch',
    gap: 12,
  },
  gateFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gateCheckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gateFeatureText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
