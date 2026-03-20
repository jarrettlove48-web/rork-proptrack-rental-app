export type RequestCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'other';
export type RequestStatus = 'open' | 'in_progress' | 'resolved';
export type ContractorCategory = 'plumber' | 'electrician' | 'general_contractor' | 'landscaper' | 'painter' | 'roofer' | 'hvac_tech' | 'other';
export type ContractorStatus = 'pending' | 'accepted' | 'declined';

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
  leaseEndDate?: string | null;
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
  serviceDate?: string;
  requestedDate?: string;
  assignedContractorId?: string | null;
  contractorStatus?: ContractorStatus | null;
}

export interface Contractor {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  company: string | null;
  website: string | null;
  category: ContractorCategory;
  phone: string | null;
  email: string | null;
  notes: string | null;
  inviteCode: string;
  userId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestMedia {
  id: string;
  requestId: string;
  mediaUrl: string;
  mediaType: string;
  uploadedBy: string | null;
  createdAt: string;
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
  receiptUri?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'request_created' | 'request_updated' | 'message_sent' | 'property_added' | 'unit_added' | 'expense_added' | 'tenant_invited' | 'contractor_added' | 'contractor_assigned';
  title: string;
  subtitle: string;
  timestamp: string;
  relatedId?: string;
  relatedPropertyId?: string;
}

export type CalendarEventType = 'maintenance' | 'rent_reminder' | 'move_in' | 'move_out' | 'inspection' | 'other';

export interface CalendarEvent {
  id: string;
  ownerId: string;
  propertyId: string | null;
  unitId: string | null;
  title: string;
  description: string | null;
  eventDate: string;
  eventType: CalendarEventType;
  createdAt: string;
}

export const CALENDAR_EVENT_TYPES: { key: CalendarEventType; label: string; color: string }[] = [
  { key: 'maintenance', label: 'Maintenance', color: '#E67E22' },
  { key: 'rent_reminder', label: 'Rent Reminder', color: '#27AE60' },
  { key: 'move_in', label: 'Move In', color: '#3498DB' },
  { key: 'move_out', label: 'Move Out', color: '#E74C3C' },
  { key: 'inspection', label: 'Inspection', color: '#9B59B6' },
  { key: 'other', label: 'Other', color: '#95A5A6' },
];

export interface Tenant {
  id: string;
  unitId: string;
  propertyId: string;
  ownerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  isActive: boolean;
  inviteCode: string | null;
  createdAt: string;
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

export const CONTRACTOR_CATEGORIES: { key: ContractorCategory; label: string }[] = [
  { key: 'plumber', label: 'Plumber' },
  { key: 'electrician', label: 'Electrician' },
  { key: 'general_contractor', label: 'General Contractor' },
  { key: 'landscaper', label: 'Landscaper' },
  { key: 'painter', label: 'Painter' },
  { key: 'roofer', label: 'Roofer' },
  { key: 'hvac_tech', label: 'HVAC Tech' },
  { key: 'other', label: 'Other' },
];

export const REQUEST_TO_CONTRACTOR_CATEGORY: Record<RequestCategory, ContractorCategory> = {
  plumbing: 'plumber',
  electrical: 'electrician',
  hvac: 'hvac_tech',
  appliance: 'general_contractor',
  other: 'other',
};
