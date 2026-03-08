import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { X, CheckCircle, Copy, Share2, Clock, Smartphone, MessageCircle, Shield, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';

export default function InviteTenantScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const { units, properties, inviteTenant } = useData();
  const { colors } = useTheme();

  const unit = useMemo(() => units.find(u => u.id === unitId), [units, unitId]);
  const property = useMemo(() => properties.find(p => p.id === unit?.propertyId), [properties, unit]);

  const [inviteCode, setInviteCode] = useState<string>(unit?.inviteCode ?? '');
  const [sent, setSent] = useState<boolean>(unit?.isInvited ?? false);
  const [copiedCode, setCopiedCode] = useState(false);

  const successAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const inviteLink = `https://proptrack.app/join/${inviteCode || 'XXXXXX'}`;

  const smsMessage = useMemo(() => {
    if (!unit || !property) return '';
    return `Hi ${unit.tenantName}! Your landlord has invited you to PropTrack to submit maintenance requests for ${unit.label} at ${property.name}.\n\nJoin here: ${inviteLink}\n\nYour invite code: ${inviteCode || '------'}`;
  }, [unit, property, inviteLink, inviteCode]);

  const handleSendInvite = useCallback(async () => {
    if (!unit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const code = await inviteTenant(unit.id);
    setInviteCode(code);
    setSent(true);

    Animated.spring(successAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();

    Alert.alert(
      'Invite Sent!',
      `${unit.tenantName} will receive an SMS with their invite link and code.`,
    );
  }, [unit, inviteTenant, successAnim]);

  const handleCopyCode = useCallback(async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [inviteCode]);

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  }, [inviteLink]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: smsMessage, title: 'PropTrack Tenant Invite' });
    } catch {
      console.log('Share failed');
    }
  }, [smsMessage]);

  const handlePreviewPortal = useCallback(() => {
    if (!unitId) return;
    router.push({ pathname: '/tenant-portal', params: { unitId } } as never);
  }, [router, unitId]);

  if (!unit || !property) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Invite Tenant' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Unit not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: 'Invite Tenant',
          presentation: 'modal',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />

      <Animated.View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarLetter, { color: colors.textInverse }]}>
            {unit.tenantName ? unit.tenantName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={[styles.tenantNameText, { color: colors.text }]}>{unit.tenantName}</Text>
        <Text style={[styles.unitInfoText, { color: colors.textTertiary }]}>{property.name} · {unit.label}</Text>

        {unit.tenantPhone ? (
          <View style={[styles.contactChip, { backgroundColor: colors.surfaceSecondary }]}>
            <Smartphone size={12} color={colors.textSecondary} strokeWidth={2} />
            <Text style={[styles.contactChipText, { color: colors.textSecondary }]}>{unit.tenantPhone}</Text>
          </View>
        ) : null}
      </Animated.View>

      {sent || unit.isInvited ? (
        <Animated.View style={[styles.successBanner, { backgroundColor: colors.successLight, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <CheckCircle size={18} color={colors.success} strokeWidth={2} />
          <View style={styles.successTextWrap}>
            <Text style={[styles.successTitle, { color: colors.success }]}>Invite Sent</Text>
            <Text style={[styles.successSubtitle, { color: colors.success }]}>
              {unit.tenantName} can now join and submit requests
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Invite Code</Text>
        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.codeDisplay, { backgroundColor: colors.surfaceSecondary }]}>
            {(inviteCode || '------').split('').map((char, i) => (
              <View key={i} style={[styles.codeCharBox, { borderColor: colors.border }]}>
                <Text style={[styles.codeChar, { color: inviteCode ? colors.primary : colors.textTertiary }]}>{char}</Text>
              </View>
            ))}
          </View>
          <View style={styles.codeActions}>
            <TouchableOpacity
              style={[styles.codeActionBtn, { backgroundColor: copiedCode ? colors.successLight : colors.primaryFaint }]}
              onPress={handleCopyCode}
              disabled={!inviteCode}
              activeOpacity={0.7}
            >
              {copiedCode ? (
                <CheckCircle size={14} color={colors.success} strokeWidth={2} />
              ) : (
                <Copy size={14} color={inviteCode ? colors.primary : colors.textTertiary} strokeWidth={2} />
              )}
              <Text style={[styles.codeActionText, { color: copiedCode ? colors.success : inviteCode ? colors.primary : colors.textTertiary }]}>
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.codeActionBtn, { backgroundColor: colors.primaryFaint }]}
              onPress={handleCopyLink}
              disabled={!inviteCode}
              activeOpacity={0.7}
            >
              <Copy size={14} color={inviteCode ? colors.primary : colors.textTertiary} strokeWidth={2} />
              <Text style={[styles.codeActionText, { color: inviteCode ? colors.primary : colors.textTertiary }]}>Copy Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>SMS Preview</Text>
        <View style={[styles.smsPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.smsHeader, { borderBottomColor: colors.divider }]}>
            <MessageCircle size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={[styles.smsHeaderText, { color: colors.textTertiary }]}>Text to {unit.tenantPhone || unit.tenantEmail || 'Tenant'}</Text>
          </View>
          <View style={styles.smsBubbleWrap}>
            <View style={[styles.smsBubble, { backgroundColor: colors.primary }]}>
              <Text style={[styles.smsBubbleText, { color: colors.textInverse }]}>
                {`Hi ${unit.tenantName}! Your landlord has invited you to PropTrack for ${unit.label} at ${property.name}.`}
              </Text>
              <Text style={[styles.smsBubbleText, { color: colors.textInverse, marginTop: 8 }]}>
                {`Join: ${inviteLink}`}
              </Text>
              <Text style={[styles.smsBubbleText, { color: colors.textInverse, marginTop: 8, fontWeight: '600' as const }]}>
                {`Code: ${inviteCode || '------'}`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>How It Works</Text>
        <View style={[styles.stepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: <MessageCircle size={14} color={colors.primary} strokeWidth={2} />, label: 'Tenant receives SMS invite' },
            { icon: <Smartphone size={14} color={colors.primary} strokeWidth={2} />, label: 'Taps link — no download needed' },
            { icon: <Shield size={14} color={colors.primary} strokeWidth={2} />, label: 'Sets password in 60 seconds' },
            { icon: <CheckCircle size={14} color={colors.primary} strokeWidth={2} />, label: 'Ready to submit requests' },
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNumberWrap, { backgroundColor: colors.primaryFaint }]}>
                <Text style={[styles.stepNumber, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.text }]}>{step.label}</Text>
              {i < 3 ? <View style={[styles.stepLine, { backgroundColor: colors.primaryFaint }]} /> : null}
            </View>
          ))}
        </View>
      </View>

      {!(sent || unit.isInvited) ? (
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={handleSendInvite}
          activeOpacity={0.8}
          testID="send-invite-btn"
        >
          <Share2 size={16} color={colors.textInverse} strokeWidth={2} />
          <Text style={[styles.sendBtnText, { color: colors.textInverse }]}>Send Invite to {unit.tenantName}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sentActions}>
          <TouchableOpacity
            style={[styles.sentActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={14} color={colors.textInverse} strokeWidth={2} />
            <Text style={[styles.sentActionBtnText, { color: colors.textInverse }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sentActionBtn, { backgroundColor: colors.surfaceTertiary }]}
            onPress={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const code = await inviteTenant(unit.id);
              setInviteCode(code);
              Alert.alert('Resent!', 'A new invite has been sent.');
            }}
            activeOpacity={0.8}
          >
            <Clock size={14} color={colors.text} strokeWidth={2} />
            <Text style={[styles.sentActionBtnText, { color: colors.text }]}>Resend</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.previewPortalBtn, { borderColor: colors.primary }]}
        onPress={handlePreviewPortal}
        activeOpacity={0.7}
      >
        <Smartphone size={14} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.previewPortalText, { color: colors.primary }]}>Preview Tenant Portal</Text>
        <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  heroCard: { alignItems: 'center', borderRadius: 18, padding: 24, marginBottom: 20, borderWidth: 1 },
  avatarCircle: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLetter: { fontSize: 26, fontWeight: '700' as const },
  tenantNameText: { fontSize: 19, fontWeight: '600' as const, marginBottom: 2, letterSpacing: -0.2 },
  unitInfoText: { fontSize: 14, marginBottom: 12 },
  contactChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  contactChipText: { fontSize: 13 },
  successBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 20, gap: 12 },
  successTextWrap: { flex: 1 },
  successTitle: { fontSize: 15, fontWeight: '600' as const },
  successSubtitle: { fontSize: 13, marginTop: 2, opacity: 0.85 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10, letterSpacing: -0.2 },
  codeCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  codeDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 8, borderRadius: 12, padding: 16, marginBottom: 14 },
  codeCharBox: { width: 40, height: 48, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  codeChar: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 1 },
  codeActions: { flexDirection: 'row', gap: 10 },
  codeActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  codeActionText: { fontSize: 13, fontWeight: '600' as const },
  smsPreview: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  smsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 8 },
  smsHeaderText: { fontSize: 13, fontWeight: '500' as const },
  smsBubbleWrap: { padding: 16, alignItems: 'flex-end' },
  smsBubble: { borderRadius: 18, borderBottomRightRadius: 4, padding: 14, maxWidth: '90%' },
  smsBubbleText: { fontSize: 14, lineHeight: 20 },
  stepsCard: { borderRadius: 16, padding: 18, borderWidth: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, position: 'relative' },
  stepNumberWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumber: { fontSize: 14, fontWeight: '700' as const },
  stepLabel: { fontSize: 14, fontWeight: '500' as const, flex: 1 },
  stepLine: { position: 'absolute', left: 14, top: 32, width: 2, height: 16, borderRadius: 1 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, marginBottom: 12 },
  sendBtnText: { fontSize: 16, fontWeight: '600' as const },
  sentActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sentActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  sentActionBtnText: { fontSize: 15, fontWeight: '600' as const },
  previewPortalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, gap: 8, marginBottom: 20 },
  previewPortalText: { fontSize: 15, fontWeight: '600' as const, flex: 1, textAlign: 'center' },
});
