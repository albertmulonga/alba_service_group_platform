/**
 * Hook React — statut de synchronisation offline
 * Expose : online, queueSize, syncStatus, forceSync
 */
import { useState, useEffect, useCallback } from 'react'
import { getQueueSize, getSyncLog, SyncLogEntry } from '@/lib/offline/offlineQueue'
import { sync } from '@/lib/offline/syncEngine'

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error' | 'conflict'

export interface OfflineSyncState {
  online: boolean
  queueSize: number
  syncStatus: SyncStatus
  lastSyncAt: string
  conflicts: number
  log: SyncLogEntry[]
  forceSync: () => Promise<void>
  refreshLog: () => Promise<void>
}

export function useOfflineSync(): OfflineSyncState {
  const [online,     setOnline]     = useState(navigator.onLine)
  const [queueSize,  setQueueSize]  = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncAt, setLastSyncAt] = useState('')
  const [conflicts,  setConflicts]  = useState(0)
  const [log,        setLog]        = useState<SyncLogEntry[]>([])

  const refreshQueue = useCallback(async () => {
    const size = await getQueueSize()
    setQueueSize(size)
  }, [])

  const refreshLog = useCallback(async () => {
    const entries = await getSyncLog()
    setLog(entries.slice(0, 100))
    const conflictCount = entries.filter(e => e.result === 'conflict').length
    setConflicts(conflictCount)
  }, [])

  const forceSync = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncStatus('syncing')
    try {
      const { conflicts: c } = await sync()
      setSyncStatus(c > 0 ? 'conflict' : 'done')
      setLastSyncAt(new Date().toLocaleTimeString('fr-FR'))
      setTimeout(() => setSyncStatus('idle'), 4000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 4000)
    }
    await refreshQueue()
    await refreshLog()
  }, [refreshQueue, refreshLog])

  useEffect(() => {
    // Initial load
    refreshQueue()
    refreshLog()

    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    const handleStart   = () => setSyncStatus('syncing')
    const handleDone    = () => { setSyncStatus('done'); setLastSyncAt(new Date().toLocaleTimeString('fr-FR')); refreshQueue(); refreshLog(); setTimeout(() => setSyncStatus('idle'), 4000) }
    const handleError   = () => { setSyncStatus('error'); refreshQueue(); refreshLog(); setTimeout(() => setSyncStatus('idle'), 4000) }
    const handleConflict= () => { setConflicts(c => c + 1); refreshLog() }
    const handleQueue   = () => refreshQueue()

    window.addEventListener('online',              handleOnline)
    window.addEventListener('offline',             handleOffline)
    window.addEventListener('alba:sync-start',     handleStart)
    window.addEventListener('alba:sync-done',      handleDone)
    window.addEventListener('alba:sync-error',     handleError)
    window.addEventListener('alba:sync-conflict',  handleConflict)
    window.addEventListener('alba:queue-changed',  handleQueue)

    return () => {
      window.removeEventListener('online',             handleOnline)
      window.removeEventListener('offline',            handleOffline)
      window.removeEventListener('alba:sync-start',    handleStart)
      window.removeEventListener('alba:sync-done',     handleDone)
      window.removeEventListener('alba:sync-error',    handleError)
      window.removeEventListener('alba:sync-conflict', handleConflict)
      window.removeEventListener('alba:queue-changed', handleQueue)
    }
  }, [refreshQueue, refreshLog])

  return { online, queueSize, syncStatus, lastSyncAt, conflicts, log, forceSync, refreshLog }
}
