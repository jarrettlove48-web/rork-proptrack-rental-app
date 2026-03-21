import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Property, Unit, MaintenanceRequest, Message, UserProfile, Expense, ActivityItem, CalendarEvent, Tenant, Contractor, ContractorCategory, RequestMedia, ProposedTimeSlot } from '@/types';

function mapProperty(row: Record<string, unknown>): Property {
  return {
    id: row.id as string,
    name: row.name as string,
    address: (row.address as string) ?? '',
    unitCount: (row.unit_count as number) ?? 0,
    createdAt: row.created_at as string,
  };
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
    leaseEndDate: (row.lease_end_date as string | null) ?? null,
    isOccupied: (row.is_occupied as boolean) ?? false,
    isInvited: (row.is_invited as boolean) ?? false,
    invitedAt: row.invited_at as string | undefined,
    inviteCode: row.invite_code as string | undefined,
    tenantPortalActive: (row.tenant_portal_active as boolean) ?? false,
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
    serviceDate: row.service_date as string | undefined,
    requestedDate: row.requested_date as string | undefined,
    assignedContractorId: (row.assigned_contractor_id as string | null) ?? null,
    contractorStatus: (row.contractor_status as MaintenanceRequest['contractorStatus']) ?? null,
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

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    requestId: row.request_id as string | undefined,
    propertyId: row.property_id as string,
    unitId: row.unit_id as string | undefined,
    description: (row.description as string) ?? '',
    amount: Number(row.amount) || 0,
    category: row.category as Expense['category'],
    date: (row.date as string) ?? '',
    vendor: row.vendor as string | undefined,
    receiptUri: row.receipt_uri as string | undefined,
    isRecurring: (row.is_recurring as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

function mapActivity(row: Record<string, unknown>): ActivityItem {
  return {
    id: row.id as string,
    type: row.type as ActivityItem['type'],
    title: (row.title as string) ?? '',
    subtitle: (row.subtitle as string) ?? '',
    timestamp: row.created_at as string,
    relatedId: row.related_id as string | undefined,
    relatedPropertyId: row.related_property_id as string | undefined,
  };
}

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id: row.id as string,
    unitId: row.unit_id as string,
    propertyId: row.property_id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    userId: (row.user_id as string) ?? null,
    leaseStart: (row.lease_start as string) ?? null,
    leaseEnd: (row.lease_end as string) ?? null,
    moveInDate: (row.move_in_date as string) ?? null,
    moveOutDate: (row.move_out_date as string) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    inviteCode: (row.invite_code as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapContractor(row: Record<string, unknown>): Contractor {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    company: (row.company as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    category: row.category as Contractor['category'],
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    inviteCode: (row.invite_code as string) ?? '',
    userId: (row.user_id as string | null) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRequestMedia(row: Record<string, unknown>): RequestMedia {
  return {
    id: row.id as string,
    requestId: row.request_id as string,
    mediaUrl: row.media_url as string,
    mediaType: (row.media_type as string) ?? 'image',
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    propertyId: (row.property_id as string | null) ?? null,
    unitId: (row.unit_id as string | null) ?? null,
    title: (row.title as string) ?? '',
    description: (row.description as string | null) ?? null,
    eventDate: row.event_date as string,
    eventType: row.event_type as CalendarEvent['eventType'],
    createdAt: row.created_at as string,
  };
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    name: (row.name as string) ?? '',
    email: (row.email as string) ?? '',
    phone: (row.phone as string) ?? '',
    plan: (row.plan as UserProfile['plan']) ?? 'starter',
    darkMode: (row.dark_mode as boolean) ?? false,
  };
}

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  plan: 'starter',
  darkMode: false,
};

export const [DataProvider, useData] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);

  const propertiesQuery = useQuery({
    queryKey: ['properties', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching properties...');
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[Data] Properties fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapProperty);
    },
    enabled: !!userId,
  });

  const unitsQuery = useQuery({
    queryKey: ['units', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching units...');
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[Data] Units fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapUnit);
    },
    enabled: !!userId,
  });

  const requestsQuery = useQuery({
    queryKey: ['requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching requests...');
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[Data] Requests fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapRequest);
    },
    enabled: !!userId,
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching messages...');
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) {
        console.log('[Data] Messages fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapMessage);
    },
    enabled: !!userId,
  });

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return defaultProfile;
      console.log('[Data] Fetching profile...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.log('[Data] Profile fetch error:', error.message);
        return defaultProfile;
      }
      return data ? mapProfile(data) : defaultProfile;
    },
    enabled: !!userId,
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching expenses...');
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.log('[Data] Expenses fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapExpense);
    },
    enabled: !!userId,
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching activities...');
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.log('[Data] Activities fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapActivity);
    },
    enabled: !!userId,
  });

  const tenantsQuery = useQuery({
    queryKey: ['tenants', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching tenants...');
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      if (error) {
        console.log('[Data] Tenants fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapTenant);
    },
    enabled: !!userId,
  });

  const contractorsQuery = useQuery({
    queryKey: ['contractors', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching contractors...');
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('is_active', true)
        .order('first_name');
      if (error) {
        console.log('[Data] Contractors fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapContractor);
    },
    enabled: !!userId,
  });

  const calendarEventsQuery = useQuery({
    queryKey: ['calendarEvents', userId],
    queryFn: async () => {
      if (!userId) return [];
      console.log('[Data] Fetching calendar events...');
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('owner_id', userId)
        .order('event_date', { ascending: true });
      if (error) {
        console.log('[Data] Calendar events fetch error:', error.message);
        throw error;
      }
      return (data ?? []).map(mapCalendarEvent);
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (propertiesQuery.data) setProperties(propertiesQuery.data);
  }, [propertiesQuery.data]);

  useEffect(() => {
    if (unitsQuery.data) setUnits(unitsQuery.data);
  }, [unitsQuery.data]);

  useEffect(() => {
    if (requestsQuery.data) setRequests(requestsQuery.data);
  }, [requestsQuery.data]);

  useEffect(() => {
    if (messagesQuery.data) setMessages(messagesQuery.data);
  }, [messagesQuery.data]);

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  useEffect(() => {
    if (expensesQuery.data) setExpenses(expensesQuery.data);
  }, [expensesQuery.data]);

  useEffect(() => {
    if (activitiesQuery.data) setActivities(activitiesQuery.data);
  }, [activitiesQuery.data]);

  useEffect(() => {
    if (calendarEventsQuery.data) setCalendarEvents(calendarEventsQuery.data);
  }, [calendarEventsQuery.data]);

  useEffect(() => {
    if (tenantsQuery.data) setTenants(tenantsQuery.data);
  }, [tenantsQuery.data]);

  useEffect(() => {
    if (contractorsQuery.data) setContractors(contractorsQuery.data);
  }, [contractorsQuery.data]);

  useEffect(() => {
    if (!userId) return;
    console.log('[Data] Setting up realtime subscription for messages...');
    const channel = supabase
      .channel('landlord-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = mapMessage(payload.new as Record<string, unknown>);
          console.log('[Data] Realtime new message:', newMsg.id);
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maintenance_requests',
        },
        () => {
          console.log('[Data] Realtime new request detected, refetching...');
          void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
        }
      )
      .subscribe();

    return () => {
      console.log('[Data] Cleaning up realtime subscription');
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const addActivityRecord = useCallback(async (item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    if (!userId) return;
    const { error } = await supabase.from('activities').insert({
      owner_id: userId,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      related_id: item.relatedId ?? null,
      related_property_id: item.relatedPropertyId ?? null,
    });
    if (error) console.log('[Data] Add activity error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['activities', userId] });
  }, [userId, queryClient]);

  const addProperty = useCallback(async (data: Omit<Property, 'id' | 'createdAt'>) => {
    if (!userId) return null;
    console.log('[Data] Adding property:', data.name);
    const { data: inserted, error } = await supabase
      .from('properties')
      .insert({
        owner_id: userId,
        name: data.name,
        address: data.address,
        unit_count: data.unitCount,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add property error:', error.message);
      return null;
    }
    const newProperty = mapProperty(inserted);
    void queryClient.invalidateQueries({ queryKey: ['properties', userId] });
    void addActivityRecord({ type: 'property_added', title: 'Property added', subtitle: newProperty.name, relatedId: newProperty.id, relatedPropertyId: newProperty.id });
    return newProperty;
  }, [userId, queryClient, addActivityRecord]);

  const updateProperty = useCallback(async (id: string, data: Partial<Omit<Property, 'id' | 'createdAt'>>) => {
    if (!userId) return;
    console.log('[Data] Updating property:', id);
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.unitCount !== undefined) updateData.unit_count = data.unitCount;
    const { error } = await supabase.from('properties').update(updateData).eq('id', id);
    if (error) console.log('[Data] Update property error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['properties', userId] });
  }, [userId, queryClient]);

  const deleteProperty = useCallback(async (id: string) => {
    if (!userId) return;
    console.log('[Data] Deleting property:', id);
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) console.log('[Data] Delete property error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['properties', userId] });
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
    void queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
  }, [userId, queryClient]);

  const addUnit = useCallback(async (data: Omit<Unit, 'id'>) => {
    if (!userId) return null;
    console.log('[Data] Adding unit:', data.label);
    const { data: inserted, error } = await supabase
      .from('units')
      .insert({
        property_id: data.propertyId,
        owner_id: userId,
        label: data.label,
        tenant_name: data.tenantName,
        tenant_phone: data.tenantPhone,
        tenant_email: data.tenantEmail,
        move_in_date: data.moveInDate,
        lease_end_date: data.leaseEndDate ?? null,
        is_occupied: data.isOccupied,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add unit error:', error.message);
      return null;
    }
    const newUnit = mapUnit(inserted);
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
    const prop = properties.find(p => p.id === data.propertyId);
    void addActivityRecord({ type: 'unit_added', title: 'Unit added', subtitle: `${newUnit.label} at ${prop?.name ?? 'property'}`, relatedId: newUnit.id, relatedPropertyId: data.propertyId });
    return newUnit;
  }, [userId, queryClient, properties, addActivityRecord]);

  const updateUnit = useCallback(async (id: string, data: Partial<Omit<Unit, 'id' | 'propertyId'>>) => {
    if (!userId) return;
    console.log('[Data] Updating unit:', id);
    const updateData: Record<string, unknown> = {};
    if (data.label !== undefined) updateData.label = data.label;
    if (data.tenantName !== undefined) updateData.tenant_name = data.tenantName;
    if (data.tenantPhone !== undefined) updateData.tenant_phone = data.tenantPhone;
    if (data.tenantEmail !== undefined) updateData.tenant_email = data.tenantEmail;
    if (data.moveInDate !== undefined) updateData.move_in_date = data.moveInDate;
    if (data.leaseEndDate !== undefined) updateData.lease_end_date = data.leaseEndDate;
    if (data.isOccupied !== undefined) updateData.is_occupied = data.isOccupied;
    if (data.isInvited !== undefined) updateData.is_invited = data.isInvited;
    if (data.invitedAt !== undefined) updateData.invited_at = data.invitedAt;
    if (data.inviteCode !== undefined) updateData.invite_code = data.inviteCode;
    if (data.tenantPortalActive !== undefined) updateData.tenant_portal_active = data.tenantPortalActive;
    const { error } = await supabase.from('units').update(updateData).eq('id', id);
    if (error) console.log('[Data] Update unit error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
  }, [userId, queryClient]);

  const deleteUnit = useCallback(async (id: string) => {
    if (!userId) return;
    console.log('[Data] Deleting unit:', id);
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) console.log('[Data] Delete unit error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
  }, [userId, queryClient]);

  const inviteTenant = useCallback(async (unitId: string) => {
    if (!userId) return '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log('[Data] Inviting tenant with code:', code);
    const { error } = await supabase
      .from('units')
      .update({
        is_invited: true,
        invited_at: new Date().toISOString(),
        invite_code: code,
        tenant_portal_active: true,
      })
      .eq('id', unitId);
    if (error) console.log('[Data] Invite tenant error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
    const unit = units.find(u => u.id === unitId);
    const prop = properties.find(p => p.id === unit?.propertyId);
    void addActivityRecord({
      type: 'tenant_invited',
      title: 'Tenant invited',
      subtitle: `${unit?.tenantName ?? 'Tenant'} at ${prop?.name ?? 'property'}`,
      relatedId: unitId,
      relatedPropertyId: unit?.propertyId ?? undefined,
    });
    return code;
  }, [userId, units, properties, queryClient, addActivityRecord]);

  const addRequest = useCallback(async (data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) return null;
    console.log('[Data] Adding request:', data.category);
    const { data: inserted, error } = await supabase
      .from('maintenance_requests')
      .insert({
        unit_id: data.unitId,
        property_id: data.propertyId,
        owner_id: userId,
        category: data.category,
        description: data.description,
        status: data.status,
        photo_uri: data.photoUri ?? null,
        tenant_name: data.tenantName,
        unit_label: data.unitLabel,
        property_name: data.propertyName,
        service_date: data.serviceDate ?? null,
        requested_date: data.requestedDate ?? null,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add request error:', error.message);
      return null;
    }
    const newRequest = mapRequest(inserted);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
    void addActivityRecord({
      type: 'request_created',
      title: 'New request',
      subtitle: `${data.category} - ${data.propertyName} ${data.unitLabel}`,
      relatedId: newRequest.id,
      relatedPropertyId: data.propertyId,
    });
    return newRequest;
  }, [userId, queryClient, addActivityRecord]);

  const updateRequestStatus = useCallback(async (id: string, status: MaintenanceRequest['status']) => {
    if (!userId) return;
    console.log('[Data] Updating request status:', id, status);
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) console.log('[Data] Update request status error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
    const req = requests.find(r => r.id === id);
    void addActivityRecord({
      type: 'request_updated',
      title: `Request ${status === 'in_progress' ? 'acknowledged' : 'resolved'}`,
      subtitle: `${req?.propertyName ?? ''} ${req?.unitLabel ?? ''}`,
      relatedId: id,
    });
  }, [userId, requests, queryClient, addActivityRecord]);

  const updateRequestDates = useCallback(async (id: string, dates: { serviceDate?: string | null; requestedDate?: string | null }) => {
    if (!userId) return;
    console.log('[Data] Updating request dates:', id, dates);
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dates.serviceDate !== undefined) updateData.service_date = dates.serviceDate;
    if (dates.requestedDate !== undefined) updateData.requested_date = dates.requestedDate;
    const { error } = await supabase
      .from('maintenance_requests')
      .update(updateData)
      .eq('id', id);
    if (error) console.log('[Data] Update request dates error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
  }, [userId, queryClient]);

  const addMessage = useCallback(async (data: Omit<Message, 'id' | 'timestamp'>) => {
    if (!userId) return null;
    console.log('[Data] Adding message');
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        request_id: data.requestId,
        sender_id: userId,
        sender_name: data.senderName,
        sender_role: data.senderRole,
        body: data.body,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add message error:', error.message);
      return null;
    }
    const newMessage = mapMessage(inserted);
    void queryClient.invalidateQueries({ queryKey: ['messages', userId] });
    void addActivityRecord({
      type: 'message_sent',
      title: 'Message sent',
      subtitle: data.body.substring(0, 60),
      relatedId: data.requestId,
    });
    return newMessage;
  }, [userId, queryClient, addActivityRecord]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!userId) return null;
    console.log('[Data] Adding expense');
    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert({
        request_id: data.requestId ?? null,
        property_id: data.propertyId,
        unit_id: data.unitId ?? null,
        owner_id: userId,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        vendor: data.vendor ?? null,
        receipt_uri: data.receiptUri ?? null,
        is_recurring: data.isRecurring ?? false,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add expense error:', error.message);
      return null;
    }
    const newExpense = mapExpense(inserted);
    void queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    const prop = properties.find(p => p.id === data.propertyId);
    void addActivityRecord({
      type: 'expense_added',
      title: 'Expense logged',
      subtitle: `${data.amount.toFixed(2)} - ${prop?.name ?? 'property'}`,
      relatedId: newExpense.id,
      relatedPropertyId: data.propertyId,
    });
    return newExpense;
  }, [userId, properties, queryClient, addActivityRecord]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!userId) return;
    console.log('[Data] Deleting expense:', id);
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) console.log('[Data] Delete expense error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
  }, [userId, queryClient]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!userId) return;
    console.log('[Data] Updating profile');
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.darkMode !== undefined) updateData.dark_mode = data.darkMode;
    updateData.updated_at = new Date().toISOString();
    const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
    if (error) console.log('[Data] Update profile error:', error.message);
    setProfile(prev => ({ ...prev, ...data }));
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }, [userId, queryClient]);

  const getUnitsForProperty = useCallback((propertyId: string) => {
    return units.filter(u => u.propertyId === propertyId);
  }, [units]);

  const getRequestsForProperty = useCallback((propertyId: string) => {
    return requests.filter(r => r.propertyId === propertyId);
  }, [requests]);

  const getRequestsForUnit = useCallback((unitId: string) => {
    return requests.filter(r => r.unitId === unitId);
  }, [requests]);

  const getMessagesForRequest = useCallback((requestId: string) => {
    return messages.filter(m => m.requestId === requestId);
  }, [messages]);

  const getExpensesForProperty = useCallback((propertyId: string) => {
    return expenses.filter(e => e.propertyId === propertyId);
  }, [expenses]);

  const getTenantsForUnit = useCallback((unitId: string) => {
    return tenants.filter(t => t.unitId === unitId);
  }, [tenants]);

  const addTenant = useCallback(async (data: {
    unitId: string;
    propertyId: string;
    name: string;
    email?: string;
    phone?: string;
    moveInDate?: string;
    leaseStart?: string;
    leaseEnd?: string;
  }) => {
    if (!userId) return null;
    console.log('[Data] Adding tenant:', data.name);
    const { data: inserted, error } = await supabase
      .from('tenants')
      .insert({
        unit_id: data.unitId,
        property_id: data.propertyId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        move_in_date: data.moveInDate || null,
        lease_start: data.leaseStart || null,
        lease_end: data.leaseEnd || null,
        is_active: true,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add tenant error:', error.message);
      return null;
    }
    await supabase.from('units').update({
      is_occupied: true,
      tenant_name: data.name,
      tenant_email: data.email || '',
      tenant_phone: data.phone || '',
    }).eq('id', data.unitId);
    void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
    return mapTenant(inserted);
  }, [userId, queryClient]);

  const moveTenantOut = useCallback(async (tenantId: string, unitId: string) => {
    if (!userId) return;
    console.log('[Data] Moving tenant out:', tenantId);
    await supabase.from('tenants').update({
      is_active: false,
      move_out_date: new Date().toISOString().split('T')[0],
    }).eq('id', tenantId);
    const { data: remaining } = await supabase
      .from('tenants')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true);
    if (!remaining || remaining.length === 0) {
      await supabase.from('units').update({
        is_occupied: false,
        tenant_name: '',
        tenant_email: '',
        tenant_phone: '',
      }).eq('id', unitId);
    } else {
      const next = remaining[0];
      await supabase.from('units').update({
        tenant_name: (next as Record<string, unknown>).name as string || '',
        tenant_email: (next as Record<string, unknown>).email as string || '',
        tenant_phone: (next as Record<string, unknown>).phone as string || '',
      }).eq('id', unitId);
    }
    void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
    void queryClient.invalidateQueries({ queryKey: ['units', userId] });
  }, [userId, queryClient]);

  const updateTenant = useCallback(async (tenantId: string, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    move_in_date: string;
    lease_start: string;
    lease_end: string;
  }>) => {
    if (!userId) return;
    console.log('[Data] Updating tenant:', tenantId);
    const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId);
    if (error) console.log('[Data] Update tenant error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['tenants', userId] });
  }, [userId, queryClient]);

  const addContractor = useCallback(async (data: {
    firstName: string;
    lastName: string;
    category: ContractorCategory;
    company?: string;
    website?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => {
    if (!userId) return null;
    console.log('[Data] Adding contractor:', data.firstName, data.lastName);
    const { data: inserted, error } = await supabase
      .from('contractors')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        category: data.category,
        company: data.company || null,
        website: data.website || null,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add contractor error:', error.message);
      return null;
    }
    const newContractor = mapContractor(inserted);
    void queryClient.invalidateQueries({ queryKey: ['contractors', userId] });
    void addActivityRecord({
      type: 'contractor_added',
      title: 'Contractor added',
      subtitle: `${data.firstName} ${data.lastName}${data.company ? ` — ${data.company}` : ''}`,
      relatedId: newContractor.id,
    });
    return newContractor;
  }, [userId, queryClient, addActivityRecord]);

  const updateContractor = useCallback(async (contractorId: string, updates: Partial<{
    first_name: string;
    last_name: string;
    category: ContractorCategory;
    company: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }>) => {
    if (!userId) return;
    console.log('[Data] Updating contractor:', contractorId);
    const { error } = await supabase.from('contractors').update(updates).eq('id', contractorId);
    if (error) console.log('[Data] Update contractor error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['contractors', userId] });
  }, [userId, queryClient]);

  const removeContractor = useCallback(async (contractorId: string) => {
    if (!userId) return;
    console.log('[Data] Removing contractor:', contractorId);
    await supabase.from('contractors').update({ is_active: false }).eq('id', contractorId);
    void queryClient.invalidateQueries({ queryKey: ['contractors', userId] });
  }, [userId, queryClient]);

  const assignContractor = useCallback(async (requestId: string, contractorId: string) => {
    if (!userId) return;
    console.log('[Data] Assigning contractor:', contractorId, 'to request:', requestId);
    const { error } = await supabase.from('maintenance_requests').update({
      assigned_contractor_id: contractorId,
      contractor_status: 'pending',
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) console.log('[Data] Assign contractor error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
    const contractor = contractors.find(c => c.id === contractorId);
    const req = requests.find(r => r.id === requestId);
    void addActivityRecord({
      type: 'contractor_assigned',
      title: 'Contractor assigned',
      subtitle: `${contractor?.firstName ?? ''} ${contractor?.lastName ?? ''} → ${req?.propertyName ?? ''} ${req?.unitLabel ?? ''}`,
      relatedId: requestId,
    });
  }, [userId, queryClient, contractors, requests, addActivityRecord]);

  const unassignContractor = useCallback(async (requestId: string) => {
    if (!userId) return;
    console.log('[Data] Unassigning contractor from request:', requestId);
    const { error } = await supabase.from('maintenance_requests').update({
      assigned_contractor_id: null,
      contractor_status: null,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) console.log('[Data] Unassign contractor error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
  }, [userId, queryClient]);

  const getRequestMedia = useCallback(async (requestId: string): Promise<RequestMedia[]> => {
    console.log('[Data] Fetching media for request:', requestId);
    const { data, error } = await supabase
      .from('request_media')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at');
    if (error) {
      console.log('[Data] Request media fetch error:', error.message);
      return [];
    }
    return (data ?? []).map(mapRequestMedia);
  }, []);

  const confirmTimeSlot = useCallback(async (requestId: string, slot: ProposedTimeSlot) => {
    if (!userId) return;
    console.log('[Data] Confirming time slot for request:', requestId, slot);
    const confirmedTime = new Date(`${slot.date}T${slot.startTime}:00`).toISOString();
    const { error } = await supabase.from('maintenance_requests').update({
      confirmed_time: confirmedTime,
      confirmed_by: userId,
      updated_at: new Date().toISOString(),
    }).eq('id', requestId);
    if (error) console.log('[Data] Confirm time slot error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['requests', userId] });
  }, [userId, queryClient]);

  const openRequestCount = useMemo(() => {
    return requests.filter(r => r.status !== 'resolved').length;
  }, [requests]);

  const occupiedUnitCount = useMemo(() => {
    return units.filter(u => u.isOccupied).length;
  }, [units]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const recentActivities = useMemo(() => {
    return activities.slice(0, 5);
  }, [activities]);

  const addCalendarEvent = useCallback(async (data: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt'>) => {
    if (!userId) return null;
    console.log('[Data] Adding calendar event:', data.title);
    const { data: inserted, error } = await supabase
      .from('calendar_events')
      .insert({
        title: data.title,
        event_date: data.eventDate,
        event_type: data.eventType,
        property_id: data.propertyId ?? null,
        unit_id: data.unitId ?? null,
        description: data.description ?? null,
      })
      .select()
      .single();
    if (error) {
      console.log('[Data] Add calendar event error:', error.message);
      return null;
    }
    const newEvent = mapCalendarEvent(inserted);
    void queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] });
    return newEvent;
  }, [userId, queryClient]);

  const deleteCalendarEvent = useCallback(async (id: string) => {
    if (!userId) return;
    console.log('[Data] Deleting calendar event:', id);
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) console.log('[Data] Delete calendar event error:', error.message);
    void queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] });
  }, [userId, queryClient]);

  const isLoading = propertiesQuery.isLoading || unitsQuery.isLoading || requestsQuery.isLoading;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['properties', userId] }),
      queryClient.invalidateQueries({ queryKey: ['units', userId] }),
      queryClient.invalidateQueries({ queryKey: ['requests', userId] }),
      queryClient.invalidateQueries({ queryKey: ['messages', userId] }),
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] }),
      queryClient.invalidateQueries({ queryKey: ['activities', userId] }),
      queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId] }),
      queryClient.invalidateQueries({ queryKey: ['tenants', userId] }),
      queryClient.invalidateQueries({ queryKey: ['contractors', userId] }),
      queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
    ]);
  }, [queryClient, userId]);

  return useMemo(() => ({
    properties,
    units,
    requests,
    messages,
    expenses,
    activities,
    calendarEvents,
    tenants,
    contractors,
    recentActivities,
    profile,
    isLoading,
    addProperty,
    updateProperty,
    deleteProperty,
    addUnit,
    updateUnit,
    deleteUnit,
    inviteTenant,
    addRequest,
    updateRequestStatus,
    updateRequestDates,
    addMessage,
    addExpense,
    deleteExpense,
    updateProfile,
    addCalendarEvent,
    deleteCalendarEvent,
    addTenant,
    moveTenantOut,
    updateTenant,
    addContractor,
    updateContractor,
    removeContractor,
    assignContractor,
    unassignContractor,
    getRequestMedia,
    confirmTimeSlot,
    getUnitsForProperty,
    getRequestsForProperty,
    getRequestsForUnit,
    getMessagesForRequest,
    getExpensesForProperty,
    getTenantsForUnit,
    openRequestCount,
    occupiedUnitCount,
    totalExpenses,
    refetchAll,
  }), [
    properties, units, requests, messages, expenses, activities, calendarEvents, tenants, contractors, recentActivities,
    profile, isLoading, addProperty, updateProperty, deleteProperty, addUnit,
    updateUnit, deleteUnit, inviteTenant, addRequest, updateRequestStatus,
    updateRequestDates, addMessage, addExpense, deleteExpense, updateProfile,
    addCalendarEvent, deleteCalendarEvent, addTenant, moveTenantOut, updateTenant,
    addContractor, updateContractor, removeContractor, assignContractor, unassignContractor, getRequestMedia, confirmTimeSlot,
    getUnitsForProperty, getRequestsForProperty, getRequestsForUnit, getMessagesForRequest,
    getExpensesForProperty, getTenantsForUnit, openRequestCount, occupiedUnitCount, totalExpenses,
    refetchAll,
  ]);
});
