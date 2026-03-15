import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Bell,
  BellOff,
  Calendar,
  Clock,
  Home,
  Wrench,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useData } from '@/context/DataContext';

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  console.log('[Notifications] expo-notifications not available');
}

const STORAGE_KEY = 'proptrack_notification_prefs';

interface NotificationPrefs {
  enabled: boolean;
  rentReminders: boolean;
  rentReminderDaysBefore: number;
  maintenanceAlerts: boolean;
  messageAlerts: boolean;
  rentDueDay: number;
}

const defaultPrefs: NotificationPrefs = {
  enabled: true,
  rentReminders: true,
  rentReminderDaysBefore: 3,
  maintenanceAlerts: true,
  messageAlerts: true,
  rentDueDay: 1,
};

const REMINDER_DAYS_OPTIONS = [1, 2, 3, 5, 7];
const RENT_DUE_DAYS = [1, 5, 10, 15, 20, 25];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { units } = useData();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.log('[NotifSettings] Failed to load prefs:', e);
      }

      if (Notifications && Platform.OS !== 'web') {
        try {
          const { status } = await Notifications.getPermissionsAsync();
          setPermissionStatus(status);
          console.log('[NotifSettings] Permission status:', status);
        } catch (e) {
          console.log('[NotifSettings] Permission check failed:', e);
        }
      }
      setLoading(false);
    };
    void load();
  }, []);

  const savePrefs = useCallback(async (newPrefs: NotificationPrefs) => {
    setPrefs(newPrefs);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      console.log('[NotifSettings] Prefs saved');
    } catch (e) {
      console.log('[NotifSettings] Failed to save prefs:', e);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') {
      Alert.alert('Notifications', 'Push notifications are only available on mobile devices.');
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      console.log('[NotifSettings] Permission result:', status);
      if (status === 'granted') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Enabled', 'Notifications have been enabled successfully.');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
      }
    } catch (e) {
      console.log('[NotifSettings] Permission request failed:', e);
      Alert.alert('Error', 'Failed to request notification permissions.');
    }
  }, []);

  const scheduleRentReminders = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;
    if (permissionStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Please enable notifications first.');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('[NotifSettings] Cleared existing scheduled notifications');

      if (!prefs.rentReminders) {
        console.log('[NotifSettings] Rent reminders disabled, skipping scheduling');
        return;
      }

      const occupiedUnits = units.filter(u => u.isOccupied);
      if (occupiedUnits.length === 0) {
        Alert.alert('No Tenants', 'You have no occupied units to set reminders for.');
        return;
      }

      const reminderDay = Math.max(1, prefs.rentDueDay - prefs.rentReminderDaysBefore);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Rent Reminder',
          body: `Rent is due in ${prefs.rentReminderDaysBefore} day${prefs.rentReminderDaysBefore !== 1 ? 's' : ''} for ${occupiedUnits.length} unit${occupiedUnits.length !== 1 ? 's' : ''}.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: reminderDay,
          hour: 9,
          minute: 0,
        },
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏠 Rent Due Today',
          body: `Rent is due today for ${occupiedUnits.length} unit${occupiedUnits.length !== 1 ? 's' : ''}. Check your tenant statuses.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: prefs.rentDueDay,
          hour: 9,
          minute: 0,
        },
      });

      console.log('[NotifSettings] Scheduled rent reminders for day', reminderDay, 'and', prefs.rentDueDay);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Reminders Set',
        `You'll get a reminder on day ${reminderDay} and a due notice on day ${prefs.rentDueDay} of each month.`
      );
    } catch (e) {
      console.log('[NotifSettings] Failed to schedule:', e);
      Alert.alert('Error', 'Failed to schedule rent reminders.');
    }
  }, [prefs, units, permissionStatus]);

  const togglePref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    void Haptics.selectionAsync();
    const newPrefs = { ...prefs, [key]: value };
    void savePrefs(newPrefs);
  }, [prefs, savePrefs]);

  const isNative = Platform.OS !== 'web';
  const permGranted = permissionStatus === 'granted';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isNative && !permGranted && (
          <View style={[styles.permissionBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning + '40' }]}>
            <View style={[styles.permBannerIcon, { backgroundColor: colors.warning }]}>
              <BellOff size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.permBannerContent}>
              <Text style={[styles.permBannerTitle, { color: colors.text }]}>Notifications Disabled</Text>
              <Text style={[styles.permBannerSub, { color: colors.textSecondary }]}>
                Enable notifications to receive rent reminders and maintenance alerts.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.permEnableBtn, { backgroundColor: colors.warning }]}
              onPress={requestPermission}
            >
              <Text style={styles.permEnableBtnText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isNative && (
          <View style={[styles.permissionBanner, { backgroundColor: colors.infoLight, borderColor: colors.info + '40' }]}>
            <View style={[styles.permBannerIcon, { backgroundColor: colors.info }]}>
              <AlertTriangle size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.permBannerContent}>
              <Text style={[styles.permBannerTitle, { color: colors.text }]}>Mobile Only</Text>
              <Text style={[styles.permBannerSub, { color: colors.textSecondary }]}>
                Push notifications are only available on mobile devices. Open this app on your phone to enable.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notification Types</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: colors.primaryFaint }]}>
                <Bell size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>All Notifications</Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>Master toggle for all notifications</Text>
              </View>
              <Switch
                value={prefs.enabled}
                onValueChange={(v) => togglePref('enabled', v)}
                trackColor={{ false: colors.surfaceTertiary, true: colors.primary }}
                thumbColor={prefs.enabled ? '#FFFFFF' : colors.textTertiary}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: colors.warningLight }]}>
                <Wrench size={16} color={colors.warning} strokeWidth={2} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Maintenance Alerts</Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>New requests & status updates</Text>
              </View>
              <Switch
                value={prefs.enabled && prefs.maintenanceAlerts}
                onValueChange={(v) => togglePref('maintenanceAlerts', v)}
                disabled={!prefs.enabled}
                trackColor={{ false: colors.surfaceTertiary, true: colors.primary }}
                thumbColor={prefs.maintenanceAlerts && prefs.enabled ? '#FFFFFF' : colors.textTertiary}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: colors.infoLight }]}>
                <MessageCircle size={16} color={colors.info} strokeWidth={2} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Message Alerts</Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>New messages from tenants</Text>
              </View>
              <Switch
                value={prefs.enabled && prefs.messageAlerts}
                onValueChange={(v) => togglePref('messageAlerts', v)}
                disabled={!prefs.enabled}
                trackColor={{ false: colors.surfaceTertiary, true: colors.primary }}
                thumbColor={prefs.messageAlerts && prefs.enabled ? '#FFFFFF' : colors.textTertiary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rent Reminders</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: colors.successLight }]}>
                <Calendar size={16} color={colors.success} strokeWidth={2} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Rent Reminders</Text>
                <Text style={[styles.settingDesc, { color: colors.textTertiary }]}>Get reminded before rent is due</Text>
              </View>
              <Switch
                value={prefs.enabled && prefs.rentReminders}
                onValueChange={(v) => togglePref('rentReminders', v)}
                disabled={!prefs.enabled}
                trackColor={{ false: colors.surfaceTertiary, true: colors.primary }}
                thumbColor={prefs.rentReminders && prefs.enabled ? '#FFFFFF' : colors.textTertiary}
              />
            </View>

            {prefs.rentReminders && prefs.enabled && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.optionSection}>
                  <View style={styles.optionHeader}>
                    <Home size={14} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Rent Due Day</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {RENT_DUE_DAYS.map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.surfaceSecondary },
                          prefs.rentDueDay === day && { backgroundColor: colors.text },
                        ]}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          void savePrefs({ ...prefs, rentDueDay: day });
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: colors.textSecondary },
                          prefs.rentDueDay === day && { color: colors.textInverse },
                        ]}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.optionSection}>
                  <View style={styles.optionHeader}>
                    <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Remind Me Before</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {REMINDER_DAYS_OPTIONS.map(days => (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.surfaceSecondary },
                          prefs.rentReminderDaysBefore === days && { backgroundColor: colors.text },
                        ]}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          void savePrefs({ ...prefs, rentReminderDaysBefore: days });
                        }}
                      >
                        <Text style={[
                          styles.chipText,
                          { color: colors.textSecondary },
                          prefs.rentReminderDaysBefore === days && { color: colors.textInverse },
                        ]}>
                          {days} day{days !== 1 ? 's' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {prefs.rentReminders && prefs.enabled && isNative && (
            <TouchableOpacity
              style={[styles.scheduleBtn, { backgroundColor: colors.primary }]}
              onPress={scheduleRentReminders}
              activeOpacity={0.85}
              testID="schedule-reminders-btn"
            >
              <CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />
              <Text style={[styles.scheduleBtnText, { color: colors.textInverse }]}>
                Schedule Rent Reminders
              </Text>
            </TouchableOpacity>
          )}

          {prefs.rentReminders && prefs.enabled && (
            <View style={[styles.previewCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight }]}>
              <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>Preview</Text>
              <Text style={[styles.previewBody, { color: colors.text }]}>
                You'll receive a reminder on the{' '}
                <Text style={{ fontWeight: '700' as const }}>
                  {Math.max(1, prefs.rentDueDay - prefs.rentReminderDaysBefore)}
                  {getSuffix(Math.max(1, prefs.rentDueDay - prefs.rentReminderDaysBefore))}
                </Text>
                {' '}and a due notice on the{' '}
                <Text style={{ fontWeight: '700' as const }}>
                  {prefs.rentDueDay}{getSuffix(prefs.rentDueDay)}
                </Text>
                {' '}of each month at 9:00 AM.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  const lastDigit = day % 10;
  if (lastDigit === 1) return 'st';
  if (lastDigit === 2) return 'nd';
  if (lastDigit === 3) return 'rd';
  return 'th';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  permBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBannerContent: {
    flex: 1,
  },
  permBannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  permBannerSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  permEnableBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permEnableBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  divider: {
    height: 0.5,
    marginLeft: 62,
  },
  optionSection: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 14,
  },
  scheduleBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  previewCard: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
