import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  BarChart3,
  PieChart,
  Download,
  Building2,
  DollarSign,
  Wrench,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/helpers';
import { EXPENSE_CATEGORIES } from '@/types';

type TimeRange = 'ytd' | '12m' | '6m' | '3m';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'ytd', label: 'YTD' },
  { key: '12m', label: '12M' },
  { key: '6m', label: '6M' },
  { key: '3m', label: '3M' },
];

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function getMonthYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getRangeStart(range: TimeRange): Date {
  const now = new Date();
  if (range === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const monthsMap: Record<TimeRange, number> = { '12m': 12, '6m': 6, '3m': 3, ytd: 0 };
  const months = monthsMap[range];
  return new Date(now.getFullYear(), now.getMonth() - months, 1);
}

export default function ReportsScreen() {
  const { expenses, properties, units, requests } = useData();
  const { colors } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('ytd');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const rangeStart = useMemo(() => getRangeStart(timeRange), [timeRange]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => new Date(e.date) >= rangeStart);
    if (selectedProperty !== 'all') {
      filtered = filtered.filter(e => e.propertyId === selectedProperty);
    }
    return filtered;
  }, [expenses, rangeStart, selectedProperty]);

  const previousRangeExpenses = useMemo(() => {
    const now = new Date();
    const rangeDuration = now.getTime() - rangeStart.getTime();
    const prevStart = new Date(rangeStart.getTime() - rangeDuration);
    let filtered = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= prevStart && d < rangeStart;
    });
    if (selectedProperty !== 'all') {
      filtered = filtered.filter(e => e.propertyId === selectedProperty);
    }
    return filtered;
  }, [expenses, rangeStart, selectedProperty]);

  const totalCurrent = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const totalPrevious = useMemo(() => previousRangeExpenses.reduce((s, e) => s + e.amount, 0), [previousRangeExpenses]);
  const percentChange = useMemo(() => {
    if (totalPrevious === 0) return totalCurrent > 0 ? 100 : 0;
    return ((totalCurrent - totalPrevious) / totalPrevious) * 100;
  }, [totalCurrent, totalPrevious]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { label: string; amount: number; count: number }> = {};
    const now = new Date();
    const months: Date[] = [];
    const start = new Date(rangeStart);
    while (start <= now) {
      months.push(new Date(start));
      start.setMonth(start.getMonth() + 1);
    }
    months.forEach(m => {
      const key = getMonthYear(m);
      map[key] = { label: getMonthLabel(m), amount: 0, count: 0 };
    });
    filteredExpenses.forEach(e => {
      const d = new Date(e.date);
      const key = getMonthYear(d);
      if (map[key]) {
        map[key].amount += e.amount;
        map[key].count += 1;
      }
    });
    return Object.values(map);
  }, [filteredExpenses, rangeStart]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map(m => m.amount), 1), [monthlyData]);

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
        percentage: totalCurrent > 0 ? (amount / totalCurrent) * 100 : 0,
        info: EXPENSE_CATEGORIES.find(c => c.key === cat),
      }));
  }, [filteredExpenses, totalCurrent]);

  const propertyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.propertyId] = (map[e.propertyId] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([propId, amount]) => ({
        property: properties.find(p => p.id === propId),
        amount,
        percentage: totalCurrent > 0 ? (amount / totalCurrent) * 100 : 0,
      }))
      .filter(p => p.property);
  }, [filteredExpenses, totalCurrent, properties]);

  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(r => new Date(r.createdAt) >= rangeStart);
    if (selectedProperty !== 'all') {
      filtered = filtered.filter(r => r.propertyId === selectedProperty);
    }
    return filtered;
  }, [requests, rangeStart, selectedProperty]);

  const requestStats = useMemo(() => {
    const total = filteredRequests.length;
    const resolved = filteredRequests.filter(r => r.status === 'resolved').length;
    const open = filteredRequests.filter(r => r.status === 'open').length;
    const inProgress = filteredRequests.filter(r => r.status === 'in_progress').length;
    const avgResolutionTime = (() => {
      const resolvedReqs = filteredRequests.filter(r => r.status === 'resolved');
      if (resolvedReqs.length === 0) return 0;
      const totalDays = resolvedReqs.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const updated = new Date(r.updatedAt).getTime();
        return sum + (updated - created) / 86400000;
      }, 0);
      return totalDays / resolvedReqs.length;
    })();
    return { total, resolved, open, inProgress, avgResolutionTime };
  }, [filteredRequests]);

  const occupancyRate = useMemo(() => {
    const relevantUnits = selectedProperty === 'all'
      ? units
      : units.filter(u => u.propertyId === selectedProperty);
    if (relevantUnits.length === 0) return 0;
    return (relevantUnits.filter(u => u.isOccupied).length / relevantUnits.length) * 100;
  }, [units, selectedProperty]);

  const avgExpensePerUnit = useMemo(() => {
    const relevantUnits = selectedProperty === 'all'
      ? units
      : units.filter(u => u.propertyId === selectedProperty);
    if (relevantUnits.length === 0) return 0;
    return totalCurrent / relevantUnits.length;
  }, [totalCurrent, units, selectedProperty]);

  const handleExport = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const lines: string[] = [
      `PropTrack Annual Report`,
      `Period: ${timeRange.toUpperCase()}`,
      `Generated: ${new Date().toLocaleDateString('en-US')}`,
      ``,
      `--- SUMMARY ---`,
      `Total Expenses: ${formatCurrency(totalCurrent)}`,
      `Previous Period: ${formatCurrency(totalPrevious)}`,
      `Change: ${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
      ``,
      `--- MAINTENANCE ---`,
      `Total Requests: ${requestStats.total}`,
      `Resolved: ${requestStats.resolved}`,
      `Open: ${requestStats.open}`,
      `Avg Resolution: ${requestStats.avgResolutionTime.toFixed(1)} days`,
      ``,
      `--- OCCUPANCY ---`,
      `Occupancy Rate: ${occupancyRate.toFixed(0)}%`,
      `Avg Expense/Unit: ${formatCurrency(avgExpensePerUnit)}`,
      ``,
      `--- EXPENSE BREAKDOWN ---`,
    ];
    categoryBreakdown.forEach(c => {
      lines.push(`${c.info?.label ?? c.category}: ${formatCurrency(c.amount)} (${c.percentage.toFixed(1)}%)`);
    });
    lines.push('');
    lines.push('--- MONTHLY EXPENSES ---');
    monthlyData.forEach(m => {
      lines.push(`${m.label}: ${formatCurrency(m.amount)} (${m.count} items)`);
    });

    const report = lines.join('\n');

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proptrack-report-${timeRange}-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        Alert.alert('Export', 'Report export not supported on this platform.');
      }
    } else {
      try {
        await Share.share({ message: report, title: 'PropTrack Report' });
      } catch {
        console.log('[Reports] Share cancelled');
      }
    }
  }, [timeRange, totalCurrent, totalPrevious, percentChange, requestStats, occupancyRate, avgExpensePerUnit, categoryBreakdown, monthlyData]);

  const barColors = ['#0C8276', '#D4883A', '#2563EB', '#059669', '#DC2626', '#7C3AED'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Reports & Analytics' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.timeRangeRow}>
            {TIME_RANGES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.timeChip,
                  { backgroundColor: colors.surfaceSecondary },
                  timeRange === t.key && { backgroundColor: colors.text },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setTimeRange(t.key); }}
              >
                <Text style={[
                  styles.timeChipText,
                  { color: colors.textSecondary },
                  timeRange === t.key && { color: colors.textInverse },
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {properties.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propFilterRow} contentContainerStyle={styles.propFilterContent}>
              <TouchableOpacity
                style={[
                  styles.propChip,
                  { backgroundColor: colors.surfaceSecondary },
                  selectedProperty === 'all' && { backgroundColor: colors.primary },
                ]}
                onPress={() => { void Haptics.selectionAsync(); setSelectedProperty('all'); }}
              >
                <Text style={[
                  styles.propChipText,
                  { color: colors.textSecondary },
                  selectedProperty === 'all' && { color: colors.textInverse },
                ]}>
                  All Properties
                </Text>
              </TouchableOpacity>
              {properties.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.propChip,
                    { backgroundColor: colors.surfaceSecondary },
                    selectedProperty === p.id && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => { void Haptics.selectionAsync(); setSelectedProperty(p.id); }}
                >
                  <Text style={[
                    styles.propChipText,
                    { color: colors.textSecondary },
                    selectedProperty === p.id && { color: colors.textInverse },
                  ]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
              <Text style={[styles.summaryAmount, { color: colors.text }]}>{formatCurrency(totalCurrent)}</Text>
            </View>
            <View style={[
              styles.changeBadge,
              { backgroundColor: percentChange <= 0 ? colors.successLight : colors.dangerLight },
            ]}>
              {percentChange <= 0 ? (
                <ArrowDownRight size={14} color={colors.success} strokeWidth={2} />
              ) : (
                <ArrowUpRight size={14} color={colors.danger} strokeWidth={2} />
              )}
              <Text style={[
                styles.changeText,
                { color: percentChange <= 0 ? colors.success : colors.danger },
              ]}>
                {Math.abs(percentChange).toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={[styles.summaryCompare, { color: colors.textTertiary }]}>
            vs. previous period: {formatCurrency(totalPrevious)}
          </Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.primaryFaint }]}>
              <Users size={16} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{occupancyRate.toFixed(0)}%</Text>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>Occupancy</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.warningLight }]}>
              <Wrench size={16} color={colors.warning} strokeWidth={2} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{requestStats.total}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>Requests</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.successLight }]}>
              <DollarSign size={16} color={colors.success} strokeWidth={2} />
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(avgExpensePerUnit)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textTertiary }]}>Per Unit</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Expenses</Text>
          </View>
          <View style={styles.chartContainer}>
            {monthlyData.map((m, i) => {
              const height = maxMonthly > 0 ? (m.amount / maxMonthly) * 120 : 0;
              return (
                <View key={i} style={styles.barColumn}>
                  <Text style={[styles.barValue, { color: colors.textTertiary }]}>
                    {m.amount > 0 ? `$${Math.round(m.amount)}` : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: Math.max(height, m.amount > 0 ? 4 : 0),
                          backgroundColor: colors.primary,
                          borderRadius: 4,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <PieChart size={16} color={colors.accent} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>By Category</Text>
          </View>
          {categoryBreakdown.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No expenses in this period</Text>
          ) : (
            <View style={styles.breakdownList}>
              {categoryBreakdown.map((c, i) => (
                <View key={c.category} style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.catDot, { backgroundColor: barColors[i % barColors.length] }]} />
                    <Text style={[styles.breakdownCatLabel, { color: colors.text }]}>
                      {c.info?.icon} {c.info?.label ?? c.category}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.breakdownBarTrack, { backgroundColor: colors.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${Math.min(c.percentage, 100)}%`,
                            backgroundColor: barColors[i % barColors.length],
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                      {formatCurrency(c.amount)}
                    </Text>
                    <Text style={[styles.breakdownPct, { color: colors.textTertiary }]}>
                      {c.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {propertyBreakdown.length > 1 && selectedProperty === 'all' && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.sectionHeader}>
              <Building2 size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>By Property</Text>
            </View>
            <View style={styles.breakdownList}>
              {propertyBreakdown.map((p, i) => (
                <View key={p.property?.id} style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.catDot, { backgroundColor: barColors[i % barColors.length] }]} />
                    <Text style={[styles.breakdownCatLabel, { color: colors.text }]} numberOfLines={1}>
                      {p.property?.name}
                    </Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={[styles.breakdownBarTrack, { backgroundColor: colors.surfaceSecondary }]}>
                      <View
                        style={[
                          styles.breakdownBarFill,
                          {
                            width: `${Math.min(p.percentage, 100)}%`,
                            backgroundColor: barColors[i % barColors.length],
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                      {formatCurrency(p.amount)}
                    </Text>
                    <Text style={[styles.breakdownPct, { color: colors.textTertiary }]}>
                      {p.percentage.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <Wrench size={16} color={colors.warning} strokeWidth={2} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Maintenance Summary</Text>
          </View>
          <View style={styles.maintenanceGrid}>
            <View style={styles.maintenanceItem}>
              <Text style={[styles.maintenanceValue, { color: colors.text }]}>{requestStats.total}</Text>
              <Text style={[styles.maintenanceLabel, { color: colors.textTertiary }]}>Total</Text>
            </View>
            <View style={[styles.maintenanceDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.maintenanceItem}>
              <Text style={[styles.maintenanceValue, { color: colors.success }]}>{requestStats.resolved}</Text>
              <Text style={[styles.maintenanceLabel, { color: colors.textTertiary }]}>Resolved</Text>
            </View>
            <View style={[styles.maintenanceDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.maintenanceItem}>
              <Text style={[styles.maintenanceValue, { color: colors.danger }]}>{requestStats.open}</Text>
              <Text style={[styles.maintenanceLabel, { color: colors.textTertiary }]}>Open</Text>
            </View>
            <View style={[styles.maintenanceDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.maintenanceItem}>
              <Text style={[styles.maintenanceValue, { color: colors.warning }]}>{requestStats.avgResolutionTime.toFixed(1)}d</Text>
              <Text style={[styles.maintenanceLabel, { color: colors.textTertiary }]}>Avg Time</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={handleExport}
          activeOpacity={0.85}
          testID="export-report-btn"
        >
          <Download size={18} color={colors.textInverse} strokeWidth={2} />
          <Text style={[styles.exportBtnText, { color: colors.textInverse }]}>Export Report</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  timeRangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  timeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  propFilterRow: {
    marginBottom: 4,
  },
  propFilterContent: {
    gap: 8,
  },
  propChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  propChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  summaryCompare: {
    fontSize: 12,
    marginTop: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 170,
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%' as const,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
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
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownCatLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  breakdownRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  breakdownBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    maxWidth: 80,
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600' as const,
    width: 70,
    textAlign: 'right' as const,
  },
  breakdownPct: {
    fontSize: 11,
    width: 30,
    textAlign: 'right' as const,
  },
  maintenanceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maintenanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  maintenanceValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  maintenanceLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  maintenanceDivider: {
    width: 1,
    height: 36,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  exportBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
