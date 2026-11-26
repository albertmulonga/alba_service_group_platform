import React from 'react'
import { cn } from '@/lib/utils'

type StatusType = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'purple' | 'default'

interface StatusBadgeProps {
  label: string
  type?: StatusType
  dot?: boolean
  className?: string
}

const configs: Record<StatusType, { bg: string; text: string; dot: string }> = {
  success:  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  danger:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  warning:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  info:     { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  primary:  { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  secondary:{ bg: 'bg-gray-100',  text: 'text-gray-600',   dot: 'bg-gray-400' },
  purple:   { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  default:  { bg: 'bg-gray-100',  text: 'text-gray-700',   dot: 'bg-gray-400' },
}

const statusMap: Record<string, StatusType> = {
  actif: 'success', active: 'success', terminé: 'success', completed: 'success', payé: 'success', paid: 'success',
  inactif: 'danger', inactive: 'danger', annulé: 'danger', cancelled: 'danger', annulée: 'danger',
  'en attente': 'warning', pending: 'warning', 'en cours': 'primary', 'in progress': 'primary',
  livré: 'success', delivered: 'success', brouillon: 'secondary', draft: 'secondary',
  impression: 'primary', 'contrôle': 'warning', urgente: 'danger', normal: 'info',
  envoyée: 'info', confirmée: 'warning', reçue: 'success', validée: 'success',
  résolu: 'success', fermé: 'secondary', converted: 'success', expired: 'danger',
  sent: 'info', failed: 'danger', refunded: 'warning', processing: 'primary',
  shipped: 'primary', terme: 'success',
  'à faire': 'warning', bloquée: 'danger', planification: 'info', analyse: 'info',
  developpement: 'primary', tests: 'warning', livraison: 'info',
}

export default function StatusBadge({ label, type, dot = true, className }: StatusBadgeProps) {
  const resolvedType = type || statusMap[label.toLowerCase()] || 'secondary'
  const config = configs[resolvedType]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.bg, config.text, className
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />}
      {label}
    </span>
  )
}
