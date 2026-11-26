import { useState, useEffect } from 'react'

export interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'login' | 'logout'
  module: string // e.g. 'clients', 'invoices', 'employees'
  description: string // e.g. "Création du client 'Jean MUTOMBO'"
  details?: string // JSON of changes
}

const STORAGE_KEY = 'alba-audit-log'

export function useAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const log = (action: AuditEntry['action'], module: string, description: string, details?: string) => {
    const user = JSON.parse(localStorage.getItem('alba_user') || '{}')
    const entry: AuditEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      userId: user.id || 'system',
      userName: user.firstName ? `${user.firstName} ${user.lastName}` : 'Système',
      action, module, description, details
    }
    setEntries(prev => [entry, ...prev].slice(0, 500)) // keep last 500
  }

  const clearLog = () => setEntries([])

  return { entries, log, clearLog }
}
