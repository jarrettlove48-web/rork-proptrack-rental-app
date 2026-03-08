import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Phone, Mail, Calendar, Wrench, UserPlus, Check, MessageCircle, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { formatFullDate, formatDate, getStatusColor } from '@/utils/helpers';
import { STATUS_LABELS, REQUEST_CATEGORIES } from '@/types';

export default function TenantProfileScreen() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();
  const router = useRouter();
  const { units, properties, getRequestsForUnit } = useData();
  const { colors } = useTheme();

  const unit = useMemo(() => units.find(u => u.id === unitId), [units, unitId]);
  const property = useMemo(() => properties.find(p => p.id === unit?.propertyId), [properties, unit]);
  const unitRequests = useMemo(() => getRequestsForUnit(unitId ?? ''), [getRequestsForUnit, unitId]);
  const openRequests = useMemo(() => unitRequests.filter(r => r.status !== 'resolved'), [unitRequests]);

  const handleCall = useCallback(() => {
    if (unit?.tenantPhone) {
      Linking.openURL(`tel:${unit.tenantPhone}`);
    }
  }, [unit]);

  const handleEmail = useCallback(() => {
    if (unit?.tenantEmail) {
      Linking.openURL(`mailto:${unit.tenantEmail}`);
    }
  }, [unit]);

  if (!unit || !property) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Tenant Profile' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Tenant not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen
        options={{
          title: unit.tenantName || 'Tenant',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.textInverse }]}>
            {unit.tenantName ? unit.tenantName.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={[styles.tenantName, { color: colors.text }]}>{unit.tenantName || 'Unknown'}</Text>
        <Text style={[styles.tenantLocation, { color: colors.textTertiary }]}>{property.name} · {unit.label}</Text>

        {unit.isInvited ? (
          <View style={[styles.invitedBadge, { backgroundColor: colors.successLight }]}>
            <Check size={13} color={colors.success} strokeWidth={2.5} />
            <Text style={[styles.invitedBadgeText, { color: colors.success }]}>App Invited</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: colors.primaryFaint }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/invite-tenant', params: { unitId: unit.id } } as never);
            }}
          >
            <UserPlus size={13} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Send App Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {unit.tenantPhone ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
              <View style={[styles.infoIcon, { backgroundColor: colors.successLight }]}>
                <Phone size={13} color={colors.success} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{unit.tenantPhone}</Text>
              </View>
              <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          ) : null}
          {unit.tenantPhone && unit.tenantEmail ? <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} /> : null}
          {unit.tenantEmail ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
              <View style={[styles.infoIcon, { backgroundColor: colors.infoLight }]}>
                <Mail size={13} color={colors.info} strokeWidth={2} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{unit.tenantEmail}</Text>
              </View>
              <ChevronRight size={14} color={colors.textTertiary} strokeWidth={1.5} />
            </TouchableOpacity>
          ) : null}
          <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.accentLight }]}>
              <Calendar size={13} color={colors.accent} strokeWidth={2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Move-in</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatFullDate(unit.moveInDate)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Requests ({unitRequests.length})</Text>

        {openRequests.length > 0 && (
          <View style={[styles.requestsBanner, { backgroundColor: colors.dangerLight }]}>
            <Wrench size={13} color={colors.statusOpen} strokeWidth={2} />
            <Text style={[styles.requestsBannerText, { color: colors.statusOpen }]}>
              {openRequests.length} open request{openRequests.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {unitRequests.length === 0 ? (
          <View style={[styles.emptyRequests, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Wrench size={22} color={colors.textTertiary} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No requests from this tenant yet</Text>
          </View>
        ) : (
          unitRequests.map(req => {
            const statusColor = getStatusColor(req.status);
            const catInfo = REQUEST_CATEGORIES.find(c => c.key === req.category);
            return (
              <TouchableOpacity
                key={req.id}
                style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: '/request-detail', params: { id: req.id } } as never)}
                activeOpacity={0.7}
              >
                <View style={styles.requestTop}>
                  <Text style={styles.requestCatEmoji}>{catInfo?.icon}</Text>
                  <Text style={[styles.requestDesc, { color: colors.text }]} numberOfLines={1}>{req.description}</Text>
                  <View style={[styles.requestStatus, { backgroundColor: statusColor + '14' }]}>
                    <Text style={[styles.requestStatusText, { color: statusColor }]}>{STATUS_LABELS[req.status]}</Text>
                  </View>
                </View>
                <Text style={[styles.requestDate, { color: colors.textTertiary }]}>{formatDate(req.createdAt)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <TouchableOpacity
        style={[styles.messageBtn, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (unitRequests.length > 0) {
            router.push({ pathname: '/request-detail', params: { id: unitRequests[0].id } } as never);
          }
        }}
        activeOpacity={0.8}
      >
        <MessageCircle size={16} color={colors.textInverse} strokeWidth={2} />
        <Text style={[styles.messageBtnText, { color: colors.textInverse }]}>Message Tenant</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 100 },
  errorText: { fontSize: 16, textAlign: 'center', marginTop: 40 },
  profileCard: { alignItems: 'center', padding: 24, marginHorizontal: 20, marginTop: 12, marginBottom: 20, borderRadius: 16, borderWidth: 1 },
  avatarWrap: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700' as const },
  tenantName: { fontSize: 21, fontWeight: '600' as const, marginBottom: 4, letterSpacing: -0.3 },
  tenantLocation: { fontSize: 14, marginBottom: 12 },
  invitedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  invitedBadgeText: { fontSize: 13, fontWeight: '600' as const },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  inviteBtnText: { fontSize: 13, fontWeight: '600' as const },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 10, letterSpacing: -0.2 },
  infoCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '500' as const, marginTop: 1 },
  infoDivider: { height: 0.5, marginLeft: 56 },
  requestsBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, marginBottom: 10, gap: 6 },
  requestsBannerText: { fontSize: 13, fontWeight: '600' as const },
  emptyRequests: { alignItems: 'center', borderRadius: 14, paddingVertical: 24, gap: 8, borderWidth: 1 },
  emptyText: { fontSize: 14 },
  requestCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestCatEmoji: { fontSize: 16 },
  requestDesc: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  requestStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  requestStatusText: { fontSize: 11, fontWeight: '600' as const },
  requestDate: { fontSize: 12, marginTop: 6, marginLeft: 28 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, paddingVertical: 16, borderRadius: 14, gap: 8 },
  messageBtnText: { fontSize: 16, fontWeight: '600' as const },
});
