import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'FC'): string {
  return `${new Intl.NumberFormat('fr-CD').format(amount)} ${currency}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-CD', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function truncate(text: string, length = 30): string {
  return text.length > length ? text.slice(0, length) + '…' : text
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'success',
    actif: 'success',
    inactive: 'danger',
    inactif: 'danger',
    pending: 'warning',
    'en attente': 'warning',
    completed: 'success',
    terminé: 'success',
    cancelled: 'danger',
    annulé: 'danger',
    'in progress': 'primary',
    'en cours': 'primary',
  }
  return map[status.toLowerCase()] || 'secondary'
}
