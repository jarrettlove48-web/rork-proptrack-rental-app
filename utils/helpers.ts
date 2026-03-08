import Colors from '@/constants/colors';
import { RequestCategory, RequestStatus } from '@/types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getCategoryColor(category: RequestCategory): string {
  const map: Record<RequestCategory, string> = {
    plumbing: Colors.categoryPlumbing,
    electrical: Colors.categoryElectrical,
    hvac: Colors.categoryHVAC,
    appliance: Colors.categoryAppliance,
    other: Colors.categoryOther,
  };
  return map[category];
}

export function getStatusColor(status: RequestStatus): string {
  const map: Record<RequestStatus, string> = {
    open: Colors.statusOpen,
    in_progress: Colors.statusInProgress,
    resolved: Colors.statusResolved,
  };
  return map[status];
}

export function getNextStatus(status: RequestStatus): RequestStatus | null {
  if (status === 'open') return 'in_progress';
  if (status === 'in_progress') return 'resolved';
  return null;
}

export function getNextStatusLabel(status: RequestStatus): string | null {
  if (status === 'open') return 'Acknowledge';
  if (status === 'in_progress') return 'Resolve';
  return null;
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function formatCurrency(amount: number): string {
  const sign = '\u0024';
  return sign + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function expensesToCsv(
  expenses: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
    vendor?: string;
    propertyName: string;
    unitLabel: string;
    tenantName: string;
  }>,
): string {
  const header = 'Date,Description,Amount,Category,Vendor,Property,Unit,Tenant';
  const rows = expenses.map(e => {
    const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
    return [
      new Date(e.date).toLocaleDateString('en-US'),
      escape(e.description),
      e.amount.toFixed(2),
      e.category,
      escape(e.vendor ?? ''),
      escape(e.propertyName),
      escape(e.unitLabel),
      escape(e.tenantName),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
