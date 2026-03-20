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
  Linking,
  TextInput,
  Modal,
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
  Plus,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { MaintenanceRequest, STATUS_LABELS, REQUEST_CATEGORIES, CALENDAR_EVENT_TYPES, CalendarEventType, CalendarEvent as CalendarEventModel } from '@/types';
import { getStatusColor } from '@/utils/helpers';

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

type EventColorType = 'maintenance' | 'service' | 'requested' | 'lease_end' | 'rent_reminder' | 'move_in' | 'move_out' | 'inspection' | 'other';

const EVENT_COLORS: Record<EventColorType, string> = {
  maintenance: '#E67E22',
  service: '#E67E22',
  requested: '#3498DB',
  lease_end: '#E74C3C',
  rent_reminder: '#27AE60',
  move_in: '#3498DB',
  move_out: '#E74C3C',
  inspection: '#9B59B6',
  other: '#95A5A6',
};

interface DisplayEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  category: string;
  status: string;
  propertyName: string;
  unitLabel: string;
  tenantName: string;
  type: 'request_created' | 'service_date' | 'requested_date' | 'lease_end' | 'calendar_event';
  request?: MaintenanceRequest;
  calendarEvent?: CalendarEventModel;
  colorType: EventColorType;
}

function buildGoogleCalUrl(event: DisplayEvent): string {
  const startDate = new Date(event.date);
  startDate.setHours(9, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(10, 0, 0, 0);
  const formatGCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.propertyName + (event.unitLabel ? ' - ' + event.unitLabel : ''))}&dates=${formatGCal(startDate)}/${formatGCal(endDate)}`;
}

async function addToDeviceCalendar(event: DisplayEvent): Promise<void> {
  if (Platform.OS === 'web') {
    const url = buildGoogleCalUrl(event);
    window.open(url, '_blank');
    return;
  }

  try {
    const ExpoCalendar = await import('expo-calendar');
    const isAvailable = await ExpoCalendar.isAvailableAsync();
    if (!isAvailable) {
      console.log('[Calendar] Calendar API not available, using fallback');
      const url = buildGoogleCalUrl(event);
      await Linking.openURL(url);
      return;
    }
    const startDate = new Date(event.date);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(10, 0, 0, 0);
    await ExpoCalendar.createEventInCalendarAsync({
      title: event.title,
      notes: event.description,
      location: `${event.propertyName}${event.unitLabel ? ' - ' + event.unitLabel : ''}`,
      startDate,
      endDate,
      alarms: [{ relativeOffset: -60 }],
    });
    console.log('[Calendar] Event created via system UI');
  } catch (err) {
    console.log('[Calendar] Error creating event via native, trying fallback:', err);
    try {
      const url = buildGoogleCalUrl(event);
      await Linking.openURL(url);
    } catch (fallbackErr) {
      console.log('[Calendar] Fallback also failed:', fallbackErr);
      Alert.alert('Error', 'Could not open calendar. Please try again.');
    }
  }
}

export default function CalendarScreen() {
  const router = useRouter();
  const { requests, units, properties, calendarEvents, tenants, addCalendarEvent, deleteCalendarEvent } = useData();
  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [addingEventId, setAddingEventId] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEventType>('maintenance');
  const [newPropertyId, setNewPropertyId] = useState<string>('');
  const [newUnitId, setNewUnitId] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const availableUnits = useMemo(() => units.filter(u => u.propertyId === newPropertyId), [units, newPropertyId]);

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

  const displayEvents = useMemo<DisplayEvent[]>(() => {
    const events: DisplayEvent[] = [];

    for (const r of requests) {
      const catIcon = REQUEST_CATEGORIES.find(c => c.key === r.category)?.icon ?? '🔧';
      const catLabel = r.category.charAt(0).toUpperCase() + r.category.slice(1);
      events.push({
        id: `${r.id}-created`,
        title: `${catIcon} ${catLabel} - ${r.propertyName}`,
        description: r.description,
        date: new Date(r.createdAt),
        category: r.category,
        status: r.status,
        propertyName: r.propertyName,
        unitLabel: r.unitLabel,
        tenantName: r.tenantName,
        type: 'request_created',
        request: r,
        colorType: 'maintenance',
      });
      if (r.serviceDate) {
        events.push({
          id: `${r.id}-service`,
          title: `🛠 Service: ${catLabel} - ${r.propertyName}`,
          description: `Scheduled service for: ${r.description}`,
          date: new Date(r.serviceDate + 'T12:00:00'),
          category: r.category,
          status: r.status,
          propertyName: r.propertyName,
          unitLabel: r.unitLabel,
          tenantName: r.tenantName,
          type: 'service_date',
          request: r,
          colorType: 'service',
        });
      }
      if (r.requestedDate) {
        events.push({
          id: `${r.id}-requested`,
          title: `📅 Requested: ${catLabel} - ${r.propertyName}`,
          description: `Tenant requested service on this date: ${r.description}`,
          date: new Date(r.requestedDate + 'T12:00:00'),
          category: r.category,
          status: r.status,
          propertyName: r.propertyName,
          unitLabel: r.unitLabel,
          tenantName: r.tenantName,
          type: 'requested_date',
          request: r,
          colorType: 'requested',
        });
      }
    }

    for (const u of units) {
      if (u.leaseEndDate && u.isOccupied) {
        const prop = properties.find(p => p.id === u.propertyId);
        events.push({
          id: `lease-${u.id}`,
          title: `📋 Lease Ends - ${u.label}`,
          description: `Lease ending for ${u.tenantName} at ${prop?.name ?? 'property'}`,
          date: new Date(u.leaseEndDate + 'T12:00:00'),
          category: 'lease_end',
          status: '',
          propertyName: prop?.name ?? '',
          unitLabel: u.label,
          tenantName: u.tenantName,
          type: 'lease_end',
          colorType: 'lease_end',
        });
      }
    }

    const seenLeaseEnds = new Set(units.filter(u => u.leaseEndDate).map(u => `${u.id}-${u.leaseEndDate}`));
    for (const t of tenants) {
      if (t.leaseEnd && t.isActive) {
        const alreadyFromUnit = seenLeaseEnds.has(`${t.unitId}-${t.leaseEnd}`);
        if (alreadyFromUnit) continue;
        const prop = properties.find(p => p.id === t.propertyId);
        const unit = units.find(u => u.id === t.unitId);
        events.push({
          id: `tenant-lease-${t.id}`,
          title: `📋 Lease Ends - ${t.name}`,
          description: `Lease ending for ${t.name} at ${prop?.name ?? 'property'}`,
          date: new Date(t.leaseEnd + 'T12:00:00'),
          category: 'lease_end',
          status: '',
          propertyName: prop?.name ?? '',
          unitLabel: unit?.label ?? '',
          tenantName: t.name,
          type: 'lease_end',
          colorType: 'lease_end',
        });
      }
    }

    for (const ce of calendarEvents) {
      const prop = properties.find(p => p.id === ce.propertyId);
      const unit = units.find(u => u.id === ce.unitId);
      events.push({
        id: `cal-${ce.id}`,
        title: ce.title,
        description: ce.description ?? '',
        date: new Date(ce.eventDate + 'T12:00:00'),
        category: ce.eventType,
        status: '',
        propertyName: prop?.name ?? '',
        unitLabel: unit?.label ?? '',
        tenantName: '',
        type: 'calendar_event',
        calendarEvent: ce,
        colorType: ce.eventType as EventColorType,
      });
    }

    return events;
  }, [requests, units, properties, calendarEvents, tenants]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DisplayEvent[]>();
    for (const event of displayEvents) {
      const key = toDateKey(event.date);
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }
    return map;
  }, [displayEvents]);

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
      days.push({ day: prevMonthDays - i, date: null, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, date: new Date(currentYear, currentMonth, d), isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({ day: i, date: null, isCurrentMonth: false });
      }
    }
    return days;
  }, [currentYear, currentMonth, daysInMonth, firstDay]);

  const handleAddToCalendar = useCallback(async (event: DisplayEvent) => {
    setAddingEventId(event.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await addToDeviceCalendar(event);
    } finally {
      setAddingEventId(null);
    }
  }, []);

  const handleDeleteCalendarEvent = useCallback((eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          void deleteCalendarEvent(eventId);
        },
      },
    ]);
  }, [deleteCalendarEvent]);

  const handleAddEvent = useCallback(async () => {
    if (!newTitle.trim() || !newEventDate) {
      Alert.alert('Missing Info', 'Please provide a title and date.');
      return;
    }
    setIsAddingEvent(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await addCalendarEvent({
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      eventDate: newEventDate,
      eventType: newEventType,
      propertyId: newPropertyId || null,
      unitId: newUnitId || null,
    });
    setIsAddingEvent(false);
    if (result) {
      setShowAddForm(false);
      setNewTitle('');
      setNewDescription('');
      setNewEventType('maintenance');
      setNewPropertyId('');
      setNewUnitId('');
      setNewEventDate('');
    }
  }, [newTitle, newDescription, newEventDate, newEventType, newPropertyId, newUnitId, addCalendarEvent]);

  const openAddForm = useCallback(() => {
    setNewEventDate(toDateKey(selectedDate));
    setShowAddForm(true);
  }, [selectedDate]);

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

  const getEventDotColor = useCallback((date: Date | null): string | null => {
    if (!date) return null;
    const evts = eventsByDate.get(toDateKey(date));
    if (!evts || evts.length === 0) return null;
    return EVENT_COLORS[evts[0].colorType] ?? colors.primary;
  }, [eventsByDate, colors]);

  const renderDay = useCallback(
    (item: { day: number; date: Date | null; isCurrentMonth: boolean }, index: number) => {
      const isToday = item.date ? isSameDay(item.date, today) : false;
      const isSelected = item.date ? isSameDay(item.date, selectedDate) : false;
      const eventCount = getEventCount(item.date);
      const hasEvt = eventCount > 0;
      const dotColor = getEventDotColor(item.date);

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
                      { backgroundColor: isSelected ? '#FFFFFF' : (dotColor ?? colors.primary) },
                    ]}
                  />
                ))
              ) : (
                <>
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : (dotColor ?? colors.primary) }]} />
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : (dotColor ?? colors.primary) }]} />
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? '#FFFFFF' : colors.accent }]} />
                </>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [today, selectedDate, colors, getEventCount, getEventDotColor]
  );

  const renderAddEventModal = () => (
    <Modal visible={showAddForm} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Event</Text>
            <TouchableOpacity onPress={() => setShowAddForm(false)}>
              <X size={20} color={colors.textTertiary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Event title"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Type</Text>
              <TouchableOpacity
                style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowTypePicker(!showTypePicker)}
              >
                <View style={[styles.eventTypeDot, { backgroundColor: EVENT_COLORS[newEventType as EventColorType] ?? '#95A5A6' }]} />
                <Text style={[styles.modalPickerText, { color: colors.text }]}>
                  {CALENDAR_EVENT_TYPES.find(t => t.key === newEventType)?.label ?? 'Other'}
                </Text>
                <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              {showTypePicker && (
                <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {CALENDAR_EVENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, newEventType === t.key && { backgroundColor: colors.primaryFaint }]}
                      onPress={() => { setNewEventType(t.key); setShowTypePicker(false); }}
                    >
                      <View style={[styles.eventTypeDot, { backgroundColor: t.color }]} />
                      <Text style={[styles.modalDropdownText, { color: colors.text }, newEventType === t.key && { color: colors.primary, fontWeight: '600' as const }]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Date</Text>
              <TouchableOpacity
                style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowNewDatePicker(!showNewDatePicker)}
              >
                <Text style={[styles.modalPickerText, { color: newEventDate ? colors.text : colors.textTertiary }]}>
                  {newEventDate
                    ? new Date(newEventDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Select a date'}
                </Text>
                <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              {showNewDatePicker && (
                <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 200 }]}>
                  {Array.from({ length: 60 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i - 7);
                    const dateStr = toDateKey(d);
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, newEventDate === dateStr && { backgroundColor: colors.primaryFaint }]}
                        onPress={() => { setNewEventDate(dateStr); setShowNewDatePicker(false); }}
                      >
                        <Text style={[styles.modalDropdownText, { color: colors.text }, newEventDate === dateStr && { color: colors.primary, fontWeight: '600' as const }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Property (optional)</Text>
              <TouchableOpacity
                style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowPropertyPicker(!showPropertyPicker)}
              >
                <Text style={[styles.modalPickerText, { color: newPropertyId ? colors.text : colors.textTertiary }]}>
                  {properties.find(p => p.id === newPropertyId)?.name ?? 'Select property'}
                </Text>
                <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
              </TouchableOpacity>
              {showPropertyPicker && (
                <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }]}
                    onPress={() => { setNewPropertyId(''); setNewUnitId(''); setShowPropertyPicker(false); }}
                  >
                    <Text style={[styles.modalDropdownText, { color: colors.textTertiary }]}>None</Text>
                  </TouchableOpacity>
                  {properties.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, newPropertyId === p.id && { backgroundColor: colors.primaryFaint }]}
                      onPress={() => { setNewPropertyId(p.id); setNewUnitId(''); setShowPropertyPicker(false); }}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.text }, newPropertyId === p.id && { color: colors.primary, fontWeight: '600' as const }]}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {newPropertyId && availableUnits.length > 0 ? (
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Unit (optional)</Text>
                <TouchableOpacity
                  style={[styles.modalPickerBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  onPress={() => setShowUnitPicker(!showUnitPicker)}
                >
                  <Text style={[styles.modalPickerText, { color: newUnitId ? colors.text : colors.textTertiary }]}>
                    {units.find(u => u.id === newUnitId)?.label ?? 'Select unit'}
                  </Text>
                  <ChevronDown size={14} color={colors.textTertiary} strokeWidth={2} />
                </TouchableOpacity>
                {showUnitPicker && (
                  <View style={[styles.modalDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }]}
                      onPress={() => { setNewUnitId(''); setShowUnitPicker(false); }}
                    >
                      <Text style={[styles.modalDropdownText, { color: colors.textTertiary }]}>None</Text>
                    </TouchableOpacity>
                    {availableUnits.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.modalDropdownOption, { borderBottomColor: colors.divider }, newUnitId === u.id && { backgroundColor: colors.primaryFaint }]}
                        onPress={() => { setNewUnitId(u.id); setShowUnitPicker(false); }}
                      >
                        <Text style={[styles.modalDropdownText, { color: colors.text }, newUnitId === u.id && { color: colors.primary, fontWeight: '600' as const }]}>{u.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Description (optional)</Text>
              <TextInput
                style={[styles.modalTextArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Add notes..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }, (!newTitle.trim() || !newEventDate) && { opacity: 0.4 }]}
              onPress={handleAddEvent}
              disabled={!newTitle.trim() || !newEventDate || isAddingEvent}
              activeOpacity={0.8}
            >
              {isAddingEvent ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Add Event</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="calendar-screen">
      <Stack.Screen
        options={{
          title: 'Calendar',
          headerRight: () => (
            <TouchableOpacity onPress={openAddForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Plus size={22} color={colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />
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
          <View style={styles.selectedDateRow}>
            <View>
              <Text style={[styles.selectedDateLabel, { color: colors.text }]}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={[styles.eventCountLabel, { color: colors.textSecondary }]}>
                {selectedEvents.length === 0
                  ? 'No events'
                  : `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addEventSmallBtn, { backgroundColor: colors.primaryFaint }]}
              onPress={openAddForm}
            >
              <Plus size={16} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {selectedEvents.length === 0 ? (
          <View style={styles.emptyDay}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryFaint }]}>
              <CalendarDays size={32} color={colors.primaryLight} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No events this day</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Maintenance requests, lease dates, and custom events will appear here.
            </Text>
          </View>
        ) : (
          selectedEvents.map(event => {
            const accentColor = EVENT_COLORS[event.colorType] ?? colors.primary;
            const isCalendarEvent = event.type === 'calendar_event';
            const isLeaseEnd = event.type === 'lease_end';

            const eventTypeLabel = event.type === 'service_date'
              ? '🛠 Service'
              : event.type === 'requested_date'
              ? '📅 Requested'
              : event.type === 'lease_end'
              ? '📋 Lease End'
              : event.type === 'calendar_event'
              ? CALENDAR_EVENT_TYPES.find(t => t.key === event.calendarEvent?.eventType)?.label ?? 'Event'
              : null;

            return (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
              >
                <TouchableOpacity
                  style={styles.eventCardContent}
                  onPress={() => {
                    if (event.request) {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: '/request-detail', params: { id: event.request.id } } as never);
                    }
                  }}
                  activeOpacity={event.request ? 0.7 : 1}
                >
                  <View style={[styles.eventAccent, { backgroundColor: accentColor }]} />
                  <View style={styles.eventBody}>
                    <View style={styles.eventTopRow}>
                      <View style={[styles.catBadge, { backgroundColor: accentColor + '14' }]}>
                        <View style={[styles.eventTypeDotSmall, { backgroundColor: accentColor }]} />
                        <Text style={[styles.catText, { color: accentColor }]}>
                          {eventTypeLabel ?? (REQUEST_CATEGORIES.find(c => c.key === event.category)?.label ?? 'Other')}
                        </Text>
                      </View>
                      {event.status && (
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status as 'open' | 'in_progress' | 'resolved') + '14' }]}>
                          {getStatusIcon(event.status)}
                          <Text style={[styles.statusText, { color: getStatusColor(event.status as 'open' | 'in_progress' | 'resolved') }]}>
                            {STATUS_LABELS[event.status as keyof typeof STATUS_LABELS]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.eventDescription, { color: colors.text }]} numberOfLines={2}>
                      {event.description || event.title}
                    </Text>
                    {event.propertyName ? (
                      <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                        {event.propertyName}{event.unitLabel ? ` · ${event.unitLabel}` : ''}
                      </Text>
                    ) : null}
                    {event.tenantName ? (
                      <Text style={[styles.eventTenant, { color: colors.textTertiary }]}>
                        {isLeaseEnd ? 'Tenant' : 'From'}: {event.tenantName}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <View style={[styles.eventActions, { borderTopColor: colors.divider }]}>
                  <TouchableOpacity
                    style={[styles.addCalBtn, { borderRightColor: colors.divider, borderRightWidth: isCalendarEvent ? 1 : 0 }]}
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
                  {isCalendarEvent && event.calendarEvent && (
                    <TouchableOpacity
                      style={styles.deleteCalBtn}
                      onPress={() => handleDeleteCalendarEvent(event.calendarEvent!.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color={colors.danger} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderAddEventModal()}
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
  selectedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addEventSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 5,
  },
  eventTypeDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
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
  eventActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  addCalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addCalText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deleteCalBtn: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  modalTextArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
  },
  modalPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 8,
  },
  modalPickerText: {
    flex: 1,
    fontSize: 15,
  },
  modalDropdown: {
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  modalDropdownText: {
    fontSize: 14,
  },
  modalSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
