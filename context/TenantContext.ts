import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Property, Unit, MaintenanceRequest, Message } from '@/types';

const TENANT_UNIT_KEY = 'proptrack_tenant_unit';

interface TenantSession {
  unitId: string;
  inviteCode: string;
}

function mapUnit(row: Record<string, unknown>): Unit {
  return {
    id: row.id as string,
    propertyId: row.property_id as string,
    label: row.label as string,
    tenantName: (row.tenant_name as string) ?? '',
    tenantPhone: (row.tenant_phone as string) ?? '',
    tenantEmail: (row.tenant_email as string) ?? '',
    moveInDate: (row.move_in_date as string) ?? '',
    isOccupied: (row.is_occupied as boolean) ?? false,
    isInvited: (row.is_invited as boolean) ?? false,
    invitedAt: row.invited_at as string | undefined,
    inviteCode: row.invite_code as string | undefined,
    tenantPortalActive: (row.tenant_portal_active as boolean) ?? false,
  };
}

function mapProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string) ?? '',
    unitCount: (row.unit_count as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

function mapRequest(row: Record<string, unknown>): MaintenanceRequest {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    propertyId: row.property_id as string,
    category: row.category as MaintenanceRequest['category'],
    description: (row.description as string) ?? '',
    status: row.status as MaintenanceRequest['status'],
    photoUri: row.photo_uri as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    tenantName: (row.tenant_name as string) ?? '',
    unitLabel: (row.unit_label as string) ?? '',
    propertyName: (row.property_name as string) ?? '',
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    senderId: row.sender_id as string,
    senderName: (row.sender_name as string) ?? '',
    senderRole: row.sender_role as Message['senderRole'],
    body: (row.body as string) ?? '',
    timestamp: row.created_at as string,
  };
}

export const [TenantProvider, useTenant] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const [tenantSession, setTenantSession] = useState<TenantSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTenantRole, setIsTenantRole] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsLoadingSession(false);
      return;
    }
    console.log('[Tenant] Checking tenant role...');
    const checkRole = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        const role = (data as Record<string, unknown> | null)?.role as string | undefined;
        console.log('[Tenant] Profile role:', role);
        if (role === 'tenant') {
          setIsTenantRole(true);
          try {
            const val = await AsyncStorage.getItem(TENANT_UNIT_KEY);
            if (val) {
              try {
                const parsed = JSON.parse(val) as TenantSession;
                console.log('[Tenant] Restored session:', parsed.unitId);
                setTenantSession(parsed);
              } catch {
                console.log('[Tenant] Failed to parse stored session');
              }
            }
          } catch {
            console.log('[Tenant] AsyncStorage read error');
          }
        } else {
          setIsTenantRole(false);
        }
      } catch {
        console.log('[Tenant] Role check error');
      } finally {
        setIsLoadingSession(false);
      }
    };
    void checkRole();
  }, [userId]);

  const verifyInviteCode = useCallback(async (code: string): Promise<boolean> => {
    if (!userId) return false;
    const normalizedCode = code.toUpperCase().trim();
    console.log('[Tenant] Verifying invite code:', normalizedCode);

    const { error: updateError } = await supabase
      .from('units')
      .update({ tenant_user_id: userId, tenant_portal_active: true })
      .eq('invite_code', normalizedCode)
      .eq('is_invited', true);

    if (updateError) {
      console.log('[Tenant] Update error:', updateError.message);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return false;
    }

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('tenant_user_id', userId)
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log('[Tenant] Invalid invite code - no unit linked after update');
      Alert.alert('Invalid Code', 'This invite code is not valid or has expired.');
      return false;
    }

    const unitRow = data[0] as Record<string, unknown>;
    const unitId = unitRow.id as string;
    console.log('[Tenant] Valid code, linked to unit:', unitId);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'tenant' })
      .eq('id', userId);
    if (profileError) console.log('[Tenant] Profile update error:', profileError.message);

    const session: TenantSession = { unitId, inviteCode: normalizedCode };
    setTenantSession(session);
    setIsTenantRole(true);
    await AsyncStorage.setItem(TENANT_UNIT_KEY, JSON.stringify(session));
    return true;
  }, [userId]);

  const unitQuery = useQuery({
    queryKey: ['tenant-unit', tenantSession?.unitId],
    queryFn: async () => {
      if (!tenantSession?.unitId) return null;
      console.log('[Tenant] Fetching unit:', tenantSession.unitId);
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('id', tenantSession.unitId)
        .single();
      if (error || !data) return null;
      return mapUnit(data as Record<string, unknown>);
    },
    enabled: !!tenantSession?.unitId,
  });

  const propertyQuery = useQuery({
    queryKey: ['tenant-property', unit?.propertyId],
    queryFn: async () => {
      if (!unit?.propertyId) return null;
      console.log('[Tenant] Fetching property:', unit.propertyId);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', unit.propertyId)
        .single();
      if (error || !data) return null;
      return mapProperty(data as Record<string, unknown>);
    },
    enabled: !!unit?.propertyId,
  });

  const requestsQuery = useQuery({
    queryKey: ['tenant-requests', tenantSession?.unitId],
    queryFn: async () => {
      if (!tenantSession?.unitId) return [];
      console.log('[Tenant] Fetching requests for unit:', tenantSession.unitId);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('unit_id', tenantSession.unitId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[Tenant] Requests fetch error:', error.message);
        return [];
      }
      return (data ?? []).map((r: Record<string, unknown>) => mapRequest(r));
    },
    enabled: !!tenantSession?.unitId,
  });

  const messagesQuery = useQuery({
    queryKey: ['tenant-messages', tenantSession?.unitId],
    queryFn: async () => {
      if (!tenantSession?.unitId || requests.length === 0) return [];
      const requestIds = requests.map(r => r.id);
      console.log('[Tenant] Fetching messages for', requestIds.length, 'requests');
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true });
      if (error) {
        console.log('[Tenant] Messages fetch error:', error.message);
        return [];
      }
      return (data ?? []).map((m: Record<string, unknown>) => mapMessage(m));
    },
    enabled: !!tenantSession?.unitId && requests.length > 0,
  });

  useEffect(() => {
    if (unitQuery.data) setUnit(unitQuery.data);
  }, [unitQuery.data]);

  useEffect(() => {
    if (propertyQuery.data) setProperty(propertyQuery.data);
  }, [propertyQuery.data]);

  useEffect(() => {
    if (requestsQuery.data) setRequests(requestsQuery.data);
  }, [requestsQuery.data]);

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!tenantSession?.unitId) return;

    console.log('[Tenant] Setting up realtime subscription for messages...');
    const channel = supabase
      .channel('tenant-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = mapMessage(payload.new as Record<string, unknown>);
          const isForMyRequests = requests.some(r => r.id === newMsg.requestId);
          if (isForMyRequests) {
            console.log('[Tenant] Realtime new message:', newMsg.id);
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Tenant] Cleaning up realtime subscription');
      void supabase.removeChannel(channel);
    };
  }, [tenantSession?.unitId, requests]);

  const submitRequest = useCallback(async (data: {
    category: MaintenanceRequest['category'];
    description: string;
    photoUri?: string;
  }): Promise<MaintenanceRequest | null> => {
    if (!userId || !unit || !property) return null;
    console.log('[Tenant] Submitting request:', data.category);

    const ownerIdResult = await supabase
      .from('units')
      .select('owner_id')
      .eq('id', unit.id)
      .single();

    const ownerId = (ownerIdResult.data as Record<string, unknown> | null)?.owner_id as string;
    if (!ownerId) {
      console.log('[Tenant] Could not determine owner');
      Alert.alert('Error', 'Could not submit request. Please try again.');
      return null;
    }

    const { data: inserted, error } = await supabase
      .from('maintenance_requests')
      .insert({
        unit_id: unit.id,
        property_id: property.id,
        owner_id: ownerId,
        category: data.category,
        description: data.description,
        status: 'open',
        photo_uri: data.photoUri ?? null,
        tenant_name: unit.tenantName,
        unit_label: unit.label,
        property_name: property.name,
      })
      .select()
      .single();

    if (error) {
      console.log('[Tenant] Submit request error:', error.message);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
      return null;
    }

    const newRequest = mapRequest(inserted as Record<string, unknown>);
    void queryClient.invalidateQueries({ queryKey: ['tenant-requests', unit.id] });
    return newRequest;
  }, [userId, unit, property, queryClient]);

  const sendMessage = useCallback(async (requestId: string, body: string): Promise<Message | null> => {
    if (!userId || !unit) return null;
    console.log('[Tenant] Sending message for request:', requestId);

    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        request_id: requestId,
        sender_id: userId,
        sender_name: unit.tenantName || 'Tenant',
        sender_role: 'tenant',
        body,
      })
      .select()
      .single();

    if (error) {
      console.log('[Tenant] Send message error:', error.message);
      Alert.alert('Error', 'Failed to send message.');
      return null;
    }

    const newMessage = mapMessage(inserted as Record<string, unknown>);
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, [userId, unit]);

  const getMessagesForRequest = useCallback((requestId: string) => {
    return messages.filter(m => m.requestId === requestId);
  }, [messages]);

  const openRequests = useMemo(() => requests.filter(r => r.status !== 'resolved'), [requests]);
  const resolvedRequests = useMemo(() => requests.filter(r => r.status === 'resolved'), [requests]);
  const isLoading = isLoadingSession || unitQuery.isLoading;

  const logout = useCallback(async () => {
    console.log('[Tenant] Logging out tenant session');
    setTenantSession(null);
    setUnit(null);
    setProperty(null);
    setRequests([]);
    setMessages([]);
    setIsTenantRole(false);
    await AsyncStorage.removeItem(TENANT_UNIT_KEY);
    queryClient.clear();
  }, [queryClient]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tenant-unit'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-property'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-messages'] }),
    ]);
  }, [queryClient]);

  return useMemo(() => ({
    isTenantRole,
    tenantSession,
    unit,
    property,
    requests,
    messages,
    openRequests,
    resolvedRequests,
    isLoading,
    verifyInviteCode,
    submitRequest,
    sendMessage,
    getMessagesForRequest,
    logout,
    refetchAll,
  }), [
    isTenantRole, tenantSession, unit, property, requests, messages,
    openRequests, resolvedRequests, isLoading, verifyInviteCode,
    submitRequest, sendMessage, getMessagesForRequest, logout, refetchAll,
  ]);
});
