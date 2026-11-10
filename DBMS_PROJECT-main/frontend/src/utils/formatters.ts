/**
 * Formatting and helper utilities for CAMPUS MEMORY
 * JSS Science and Technology University Academic Administration Design Theme
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Ensures timestamp has a timezone offset as required by backend Pydantic validator
 */
export function toIsoWithTz(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Maps event status codes to human readable labels and color styles
 * Aligned with JSS STU specifications:
 * - Open: #0284C7
 * - Investigating: #7C3AED
 * - Resolved: #16A34A
 */
export function getStatusBadgeProps(statusCode: string | null | undefined): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor?: string;
} {
  const code = (statusCode || '').toLowerCase();
  switch (code) {
    case 'reported':
    case 'open':
      return {
        label: 'Open',
        bg: 'bg-[#EBF5FB]',
        text: 'text-[#0284C7]',
        border: 'border-[#BAE6FD]',
        dotColor: 'bg-[#0284C7]',
      };
    case 'under_investigation':
    case 'investigating':
      return {
        label: 'Investigating',
        bg: 'bg-[#F5F3FF]',
        text: 'text-[#7C3AED]',
        border: 'border-[#DDD6FE]',
        dotColor: 'bg-[#7C3AED]',
      };
    case 'resolved':
      return {
        label: 'Resolved',
        bg: 'bg-[#F0FDF4]',
        text: 'text-[#16A34A]',
        border: 'border-[#BBF7D0]',
        dotColor: 'bg-[#16A34A]',
      };
    case 'closed':
      return {
        label: 'Closed',
        bg: 'bg-[#F8FAFC]',
        text: 'text-[#64748B]',
        border: 'border-[#E2E8F0]',
        dotColor: 'bg-[#94A3B8]',
      };
    case 'void':
    case 'voided':
      return {
        label: 'Voided',
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#DC2626]',
        border: 'border-[#FECACA]',
        dotColor: 'bg-[#DC2626]',
      };
    default:
      return {
        label: statusCode ? statusCode.replace(/_/g, ' ') : 'Unknown',
        bg: 'bg-[#F8FAFC]',
        text: 'text-[#475569]',
        border: 'border-[#E2E8F0]',
        dotColor: 'bg-[#94A3B8]',
      };
  }
}

/**
 * Maps severity codes to visual indicator badges
 * Aligned with JSS STU specifications:
 * - Critical: #DC2626
 * - High: #EA580C
 * - Medium: #D97706
 * - Low: #2563EB
 */
export function getSeverityBadgeProps(severityCode: string | null | undefined): {
  label: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
} {
  const code = (severityCode || '').toLowerCase();
  switch (code) {
    case 'critical':
      return {
        label: 'Critical',
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#DC2626]',
        border: 'border-[#FECACA]',
        dotColor: 'bg-[#DC2626]',
      };
    case 'high':
      return {
        label: 'High',
        bg: 'bg-[#FFF7ED]',
        text: 'text-[#EA580C]',
        border: 'border-[#FFEDD5]',
        dotColor: 'bg-[#EA580C]',
      };
    case 'medium':
      return {
        label: 'Medium',
        bg: 'bg-[#FFFBEB]',
        text: 'text-[#D97706]',
        border: 'border-[#FEF3C7]',
        dotColor: 'bg-[#D97706]',
      };
    case 'low':
      return {
        label: 'Low',
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#2563EB]',
        border: 'border-[#BFDBFE]',
        dotColor: 'bg-[#2563EB]',
      };
    case 'informational':
    default:
      return {
        label: severityCode ? severityCode.charAt(0).toUpperCase() + severityCode.slice(1) : 'Informational',
        bg: 'bg-[#EBF3FC]',
        text: 'text-[#173D70]',
        border: 'border-[#C7DCF8]',
        dotColor: 'bg-[#315F91]',
      };
  }
}

export function formatConfidence(score: number | string | null | undefined): string {
  if (score === null || score === undefined) return '—';
  const num = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(num)) return '—';
  return `${Math.round(num * 100)}%`;
}

export function formatRoleName(roleCode: string): string {
  switch (roleCode) {
    case 'administrator':
      return 'Administrator';
    case 'event_reporter':
      return 'Incident Reporter';
    case 'event_investigator':
      return 'Incident Investigator';
    case 'decision_maker':
      return 'Decision Maker';
    default:
      return roleCode.replace(/_/g, ' ');
  }
}

export function getRoleBadgeClass(roleCode: string): string {
  switch (roleCode) {
    case 'administrator':
      return 'bg-[#EBF3FC] text-[#173D70] border-[#315F91]/30';
    case 'event_investigator':
      return 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]';
    case 'decision_maker':
      return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
    case 'event_reporter':
    default:
      return 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]';
  }
}
