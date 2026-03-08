export type RequestCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'other';
export type RequestStatus = 'open' | 'in_progress' | 'resolved';

export interface Property {
  id: string;
  name: string;
  address: string;
  unitCount: number;
  createdAt: string;
}

export interface Unit {
  id: string;
  propertyId: string;
  label: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  moveInDate: string;
  isOccupied: boolean;
  isInvited?: boolean;
  invitedAt?: string;
  inviteCode?: string;
  tenantPortalActive?: boolean;
}

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  propertyId: string;
  category: RequestCategory;
  description: string;
  status: RequestStatus;
  photoUri?: string;
  createdAt: string;
  updatedAt: string;
  tenantName: string;
  unitLabel: string;
  propertyName: string;
}

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: 'landlord' | 'tenant';
  body: string;
  timestamp: string;
}

export interface Expense {
  id: string;
  requestId?: string;
  propertyId: string;
  unitId?: string;
  description: string;
  amount: number;
  category: 'repair' | 'maintenance' | 'upgrade' | 'inspection' | 'other';
  date: string;
  vendor?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'request_created' | 'request_updated' | 'message_sent' | 'property_added' | 'unit_added' | 'expense_added' | 'tenant_invited';
  title: string;
  subtitle: string;
  timestamp: string;
  relatedId?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  plan: 'starter' | 'essential' | 'pro';
  darkMode?: boolean;
}

export const REQUEST_CATEGORIES: { key: RequestCategory; label: string; icon: string }[] = [
  { key: 'plumbing', label: 'Plumbing', icon: '🚰' },
  { key: 'electrical', label: 'Electrical', icon: '⚡' },
  { key: 'hvac', label: 'HVAC', icon: '❄️' },
  { key: 'appliance', label: 'Appliance', icon: '🔧' },
  { key: 'other', label: 'Other', icon: '📦' },
];

export const EXPENSE_CATEGORIES: { key: Expense['category']; label: string; icon: string }[] = [
  { key: 'repair', label: 'Repair', icon: '🔧' },
  { key: 'maintenance', label: 'Maintenance', icon: '🧹' },
  { key: 'upgrade', label: 'Upgrade', icon: '⬆️' },
  { key: 'inspection', label: 'Inspection', icon: '🔍' },
  { key: 'other', label: 'Other', icon: '📋' },
];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};
