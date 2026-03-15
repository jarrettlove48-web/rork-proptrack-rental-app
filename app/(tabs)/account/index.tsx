import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Mail, Phone, DollarSign, Receipt, Check, Sun, Moon, Bell, Shield, HelpCircle, ChevronRight, Crown, Zap, ArrowUpRight, LogOut, BarChart3, Lock, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

export default function AccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { profile, updateProfile, properties, units, totalExpenses, expenses } = useData();
  const { isDark, toggleTheme, colors } = useTheme();
  const { currentPlan, isPro, isEssential } = useSubscription();
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [phoneInput, setPhoneInput] = useState(profile.phone);

  const handleSaveName = useCallback(() => {
    void updateProfile({ name: nameInput });
    setEditingName(false);
  }, [nameInput, updateProfile]);

  const handleSaveEmail = useCallback(() => {
    void updateProfile({ email: emailInput });
    setEditingEmail(false);
  }, [emailInput, updateProfile]);

  const handleSavePhone = useCallback(() => {
    void updateProfile({ phone: phoneInput });
    setEditingPhone(false);
  }, [phoneInput, updateProfile]);

  const planLabel = isPro ? 'Pro' : isEssential ? 'Essential' : 'Starter';
  const planColor = isPro ? '#D4883A' : isEssential ? colors.primary : colors.textTertiary;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Account</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'L'}
          </Text>
        </View>
        <Text style={[styles.profileName, { color: colors.text }]}>{profile.name || 'Landlord'}</Text>
        <View style={styles.profileStats}>
          <Text style={[styles.profileStat, { color: colors.textSecondary }]}>{properties.length} Properties</Text>
          <View style={[styles.profileStatDot, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.profileStat, { color: colors.textSecondary }]}>{units.length} Units</Text>
        </View>
      </View>

      {(isPro || isEssential) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Summary</Text>
          <View style={[styles.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.expenseRow}>
              <View style={[styles.expenseIconWrap, { backgroundColor: colors.accentLight }]}>
                <DollarSign size={16} color={colors.accent} strokeWidth={2} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseAmount, { color: colors.text }]}>${totalExpenses.toFixed(2)}</Text>
                <Text style={[styles.expenseLabel, { color: colors.textTertiary }]}>Total · {expenses.length} entries</Text>
              </View>
              <TouchableOpacity
                style={[styles.addExpenseBtn, { backgroundColor: colors.primaryFaint }]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/add-expense' as never);
                }}
              >
                <Receipt size={13} color={colors.primary} strokeWidth={2} />
                <Text style={[styles.addExpenseBtnText, { color: colors.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Info</Text>
        <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.primaryFaint }]}>
              <User size={14} color={colors.primary} strokeWidth={2} />
            </View>
            {editingName ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.primary }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveName} style={[styles.saveBtn, { backgroundColor: colors.primaryFaint }]}>
                  <Check size={14} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setNameInput(profile.name); setEditingName(true); }}>
                <Text style={[styles.fieldValue, { color: colors.text }, !profile.name && { color: colors.textTertiary }]}>
                  {profile.name || 'Add your name'}
                </Text>
                <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.primaryFaint }]}>
              <Mail size={14} color={colors.primary} strokeWidth={2} />
            </View>
            {editingEmail ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.primary }]}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="Email address"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSaveEmail} style={[styles.saveBtn, { backgroundColor: colors.primaryFaint }]}>
                  <Check size={14} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setEmailInput(profile.email); setEditingEmail(true); }}>
                <Text style={[styles.fieldValue, { color: colors.text }, !profile.email && { color: colors.textTertiary }]}>
                  {profile.email || 'Add email'}
                </Text>
                <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.primaryFaint }]}>
              <Phone size={14} color={colors.primary} strokeWidth={2} />
            </View>
            {editingPhone ? (
              <View style={styles.editRow}>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, borderBottomColor: colors.primary }]}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSavePhone} style={[styles.saveBtn, { backgroundColor: colors.primaryFaint }]}>
                  <Check size={14} color={colors.primary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setPhoneInput(profile.phone); setEditingPhone(true); }}>
                <Text style={[styles.fieldValue, { color: colors.text }, !profile.phone && { color: colors.textTertiary }]}>
                  {profile.phone || 'Add phone'}
                </Text>
                <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Plan</Text>
        <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.planHeader}>
            <View style={[styles.planIconCircle, { backgroundColor: currentPlan === 'starter' ? colors.surfaceSecondary : colors.primaryFaint }]}>
              {isPro ? (
                <Crown size={20} color={planColor} strokeWidth={1.8} />
              ) : isEssential ? (
                <Zap size={20} color={planColor} strokeWidth={1.8} />
              ) : (
                <User size={20} color={planColor} strokeWidth={1.8} />
              )}
            </View>
            <View style={styles.planInfo}>
              <View style={styles.planNameRow}>
                <Text style={[styles.planName, { color: colors.text }]}>{planLabel}</Text>
                <View style={[styles.planBadge, { backgroundColor: planColor + '20' }]}>
                  <Text style={[styles.planBadgeText, { color: planColor }]}>ACTIVE</Text>
                </View>
              </View>
              <Text style={[styles.planUnits, { color: colors.textSecondary }]}>
                {isPro ? 'Unlimited properties & units' : isEssential ? 'Up to 5 properties · 15 units' : '1 property · 3 units'}
              </Text>
            </View>
          </View>
          {currentPlan === 'starter' && (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/paywall' as never);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: colors.textInverse }]}>Upgrade Plan</Text>
              <ArrowUpRight size={16} color={colors.textInverse} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {currentPlan !== 'starter' && (
            <TouchableOpacity
              style={[styles.managePlanBtn, { backgroundColor: colors.surfaceSecondary }]}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/paywall' as never);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.managePlanText, { color: colors.textSecondary }]}>Manage Subscription</Text>
              <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
        <View style={[styles.fieldCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleTheme();
            }}
          >
            {isDark ? <Sun size={15} color={colors.accent} strokeWidth={2} /> : <Moon size={15} color={colors.textSecondary} strokeWidth={2} />}
            <Text style={[styles.settingText, { color: colors.text }]}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
            <View style={[styles.themeToggle, isDark ? { backgroundColor: colors.primary } : { backgroundColor: colors.surfaceTertiary }]}>
              <View style={[styles.themeToggleDot, isDark ? { alignSelf: 'flex-end' as const, backgroundColor: colors.textInverse } : { alignSelf: 'flex-start' as const, backgroundColor: colors.textTertiary }]} />
            </View>
          </TouchableOpacity>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              if (!isPro) {
                Alert.alert(
                  'Pro Feature',
                  'Reports & Analytics is available on the Pro plan. Upgrade to access detailed insights.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
                  ]
                );
                return;
              }
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/reports' as never);
            }}
          >
            <BarChart3 size={15} color={isPro ? colors.accent : colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.settingText, { color: colors.text }]}>Reports & Analytics</Text>
            {!isPro && <Lock size={13} color={colors.textTertiary} strokeWidth={2} />}
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              if (!isPro) {
                Alert.alert(
                  'Pro Feature',
                  'Bulk Tenant Management is available on the Pro plan.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => router.push('/paywall' as never) },
                  ]
                );
                return;
              }
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/bulk-tenants' as never);
            }}
          >
            <Users size={15} color={isPro ? colors.primary : colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.settingText, { color: colors.text }]}>Manage Tenants</Text>
            {!isPro && <Lock size={13} color={colors.textTertiary} strokeWidth={2} />}
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notification-settings' as never);
            }}
          >
            <Bell size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={styles.settingRow}>
            <Shield size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.settingText, { color: colors.text }]}>Privacy & Security</Text>
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
          <View style={[styles.fieldDivider, { backgroundColor: colors.divider }]} />
          <TouchableOpacity style={styles.settingRow}>
            <HelpCircle size={15} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.settingText, { color: colors.text }]}>Help & Support</Text>
            <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
          }}
          activeOpacity={0.85}
        >
          <LogOut size={16} color={colors.danger} strokeWidth={2} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.versionText, { color: colors.textTertiary }]}>PropTrack v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 16,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700' as const,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileStat: {
    fontSize: 13,
  },
  profileStatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  expenseCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  expenseLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  addExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addExpenseBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  fieldCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fieldValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: 15,
    flex: 1,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  fieldDivider: {
    height: 0.5,
    marginLeft: 58,
  },
  planCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  planUnits: {
    fontSize: 13,
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  upgradeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  managePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 4,
  },
  managePlanText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 15,
  },
  themeToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  themeToggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    paddingBottom: 20,
    marginTop: 8,
  },
});
