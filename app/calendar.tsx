import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarDays,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { MaintenanceRequest, STATUS_LABELS, REQUEST_CATEGORIES } from '@/types';
import { getStatusColor, getCategoryColor } from '@/utils/helpers';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  status: string;
  propertyName: string;
  unitLabel: string;
  tenantName: string;
  type: 'request';
  request: MaintenanceRequest;
}

async function addToDeviceCalendar(event: CalendarEvent): Promise<void> {
  if (Platform.OS === 'web') {
    const startDate = new Date(event.date);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(10, 0, 0, 0);

    const formatGCal = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.propertyName + ' - ' + event.unitLabel)}&dates=${formatGCal(startDate)}/${formatGCal(endDate)}`;

    window.open(googleUrl, '_blank');
    return;
  }

  try {
    const Calendar = await import('expo-calendar');
    await Calendar.createEventInCalendarAsync({
      title: event.title,
      notes: event.description,
      location: `${event.propertyName} - ${event.unitLabel}`,
      startDate: new Date(event.date),
      endDate: new Date(event.date.getTime() + 60 * 60 * 1000),
      alarms: [{ relativeOffset: -60 }],
    });
    console.log('[Calendar] Event created via system UI');
  } catch (err) {
    console.log('[Calendar] Error creating event:', err);
    Alert.alert('Error', 'Could not open calendar. Please try again.');
  }
}

export default function CalendarScreen() {
  const router = useRouter();
  const { requests } = useData();
  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [addingEventId, setAddingEventId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((direction: 1 | -1) => {
    slideAnim.setValue(direction * 40);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const goToPrevMonth = useCallback(() => {
    void Haptics.selectionAsync();
    animateTransition(-1);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }, [currentMonth, animateTransition]);

  const goToNextMonth = useCallback(() => {
    void Haptics.selectionAsync();
    animateTransition(1);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }, [currentMonth, animateTransition]);

  const goToToday = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
    animateTransition(1);
  }, [today, animateTransition]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return requests.map(r => ({
      id: r.id,
      title: `${REQUEST_CATEGORIES.find(c => c.key === r.category)?.icon ?? '🔧'} ${r.category.charAt(0).toUpperCase() + r.category.slice(1)} - ${r.propertyName}`,
      description: r.description,
      date: new Date(r.createdAt),
      category: r.category,
      status: r.status,
      propertyName: r.propertyName,
      unitLabel: r.unitLabel,
      tenantName: r.tenantName,
      type: 'request' as const,
      request: r,
    }));
  }, [requests]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of calendarEvents) {
      const key = toDateKey(event.date);
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [calendarEvents]);

  const selectedEvents = useMemo(() => {
    const key = toDateKey(selectedDate);
    return eventsByDate.get(key) ?? [];
  }, [selectedDate, eventsByDate]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; date: Date | null; isCurrentMonth: boolean }> = [];

    const prevMonthDays = getDaysInMonth(
      currentMonth === 0 ? currentYear - 1 : currentYear,
      currentMonth === 0 ? 11 : currentMonth - 1
    );
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        date: null,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        date: new Date(currentYear, currentMonth, d),
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, date: null, isCurrentMonth: false });
      }
    }

    return days;
  }, [currentYear, currentMonth, daysInMonth, firstDay]);

  const handleAddToCalendar = useCallback(async (event: CalendarEvent) => {
    setAddingEventId(event.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addToDeviceCalendar(event);
    } finally {
      setAddingEventId(null);
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'open': return <AlertCircle size={14} color={getStatusColor(status as 'open')} strokeWidth={2} />;
      case 'in_progress': return <Clock size={14} color={getStatusColor(status as 'in_progress')} strokeWidth={2} />;
      case 'resolved': return <CheckCircle size={14} color={getStatusColor(status as 'resolved')} strokeWidth={2} />;
      default: return null;
    }
  }, []);

  const getEventCount = useCallback((date: Date | null) => {
    if (!date) return 0;
    return eventsByDate.get(toDateKey(date))?.length ?? 0;
  }, [eventsByDate]);

  const renderDay = useCallback(
    (item: { day: number; date: Date | null; isCurrentMonth: boolean }, index: number) => {
      const isToday = item.date ? isSameDay(item.date, today) : false;
      const isSelected = item.date ? isSameDay(item.date, selectedDate) : false;
      const eventCount = getEventCount(item.date);
      const hasEvt = eventCount > 0;

      return (
        <TouchableOpacity
          key={`day-${index}`}
          style={[
            styles.dayCell,
            isSelected && { backgroundColor: colors.primary },
            isToday && !isSelected && { backgroundColor: colors.primaryFaint },
          ]}
          onPress={() => {
            if (item.date && item.isCurrentMonth) {
              void Haptics.selectionAsync();
              setSelectedDate(item.date);
            }
          }}
          disabled={!item.isCurrentMonth}
          activeOpacity={0.6}
        >
          <Text
            style={[
              styles.dayText,
              { color: item.isCurrentMonth ? colors.text : colors.textTertiary },
              isToday && !isSelected && { color: colors.primary, fontWeight: '700' as const },
              isSelected && { color: '#FFFFFF', fontWeight: '700' as const },
            ]}
          >
            {item.day}
          </Text>
          {hasEvt && (
            <View style={styles.dotRow}>
              {eventCount <= 3 ? (
                Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[
                      styles.eventDot,
                      {
                        backgroundColor: isSelected ? '#FFFFFF' : colors.primary,
                      },
                    ]}
                  />
                ))
              ) : (
                <>
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : colors.primary }]} />
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : colors.primary }]} />
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : colors.accent }]} />
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [today, selectedDate, colors, getEventCount]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="calendar-screen">
      <Stack.Screen options={{ title: 'Calendar' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceSecondary }]}>
              <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
              <Animated.Text
                style={[
                  styles.monthLabel,
                  { color: colors.text, transform: [{ translateX: slideAnim }], opacity: fadeAnim },
                ]}
              >
                {MONTH_NAMES[currentMonth]} {currentYear}
              </Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceSecondary }]}>
              <ChevronRight size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {DAYS_OF_WEEK.map(d => (
              <View key={d} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: colors.textTertiary }]}>{d}</Text>
              </View>
            ))}
          </View>

          <Animated.View style={[styles.daysGrid, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIdx) => (
              <View key={`row-${rowIdx}`} style={styles.weekRow}>
                {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((item, colIdx) =>
                  renderDay(item, rowIdx * 7 + colIdx)
                )}
              </View>
            ))}
          </Animated.View>
        </View>

        <View style={styles.selectedDateSection}>
          <Text style={[styles.selectedDateLabel, { color: colors.text }]}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={[styles.eventCountLabel, { color: colors.textSecondary }]}>
            {selectedEvents.length === 0
              ? 'No maintenance events'
              : `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}`}
          </Text>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
              <CalendarDays size={32} color={colors.primaryLight} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No events this day</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Maintenance requests will appear here based on their creation date.
            </Text>
          </View>
        ) : (
          selectedEvents.map(event => {
            const catInfo = REQUEST_CATEGORIES.find(c => c.key === event.category);
            const statusColor = getStatusColor(event.status as 'open' | 'in_progress' | 'resolved');
            const catColor = getCategoryColor(event.category as 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'other');

            return (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              >
                <TouchableOpacity
                  style={styles.eventCardContent}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/request-detail', params: { id: event.id } } as never);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventAccent, { backgroundColor: catColor }]} />
                  <View style={styles.eventBody}>
                    <View style={styles.eventTopRow}>
                      <View style={[styles.catBadge, { backgroundColor: catColor + '14' }]}>
                        <Text style={styles.catEmoji}>{catInfo?.icon ?? '🔧'}</Text>
                        <Text style={[styles.catText, { color: catColor }]}>{catInfo?.label ?? 'Other'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
                        {getStatusIcon(event.status)}
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {STATUS_LABELS[event.status as keyof typeof STATUS_LABELS]}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.eventDescription, { color: colors.text }]} numberOfLines={2}>
                      {event.description}
                    </Text>
                    <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                      {event.propertyName} · {event.unitLabel}
                    </Text>
                    {event.tenantName ? (
                      <Text style={[styles.eventTenant, { color: colors.textTertiary }]}>
                        From: {event.tenantName}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addCalBtn, { backgroundColor: colors.primaryFaint, borderColor: colors.primaryMuted }]}
                  onPress={() => handleAddToCalendar(event)}
                  disabled={addingEventId === event.id}
                  activeOpacity={0.7}
                >
                  {addingEventId === event.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <CalendarPlus size={15} color={colors.primary} strokeWidth={2} />
                      <Text style={[styles.addCalText, { color: colors.primary }]}>
                        {Platform.OS === 'web' ? 'Google Cal' : 'Add to Calendar'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

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
  calendarCard: {
    margin: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  daysGrid: {},
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 44,
    borderRadius: 12,
    marginVertical: 1,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  dotRow: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 3,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedDateSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  selectedDateLabel: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  eventCountLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  emptyDay: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 16,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eventCardContent: {
    flexDirection: 'row',
  },
  eventAccent: {
    width: 4,
  },
  eventBody: {
    flex: 1,
    padding: 14,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  catEmoji: {
    fontSize: 12,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    marginBottom: 6,
  },
  eventLocation: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  eventTenant: {
    fontSize: 12,
    marginTop: 3,
  },
  addCalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  addCalText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
