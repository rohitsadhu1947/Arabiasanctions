import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

export function getRiskColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'critical':
      return 'text-red-500 bg-red-500/10';
    case 'high':
      return 'text-orange-500 bg-orange-500/10';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/10';
    case 'low':
      return 'text-green-500 bg-green-500/10';
    default:
      return 'text-surface-400 bg-surface-700';
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending_review':
    case 'pending':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'released':
    case 'approved':
      return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'flagged':
    case 'rejected':
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'escalated':
      return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
    case 'in_progress':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    default:
      return 'text-surface-400 bg-surface-700 border-surface-600';
  }
}

