/**
 * ALBA SERVICE GROUP PLATFORM — Synchronisation Engine
 * ══════════════════════════════════════════════════════════════════
 * Moteur de synchronisation offline → backend NestJS.
 *
 * Algorithme :
 *  1. Lorsque la connexion revient, rejoue les opérations en attente
 *  2. Chaque opération est envoyée avec son UUID en header X-Idempotency-Key
 *  3. HTTP 409 = conflit géré (garde les deux versions + notification)
 *  4. HTTP 2xx = succès, retire de la queue
 *  5. Autres erreurs (5xx, réseau) = retry exponentiel (max 5 tentatives)
 *  6. Chaque résultat est journalisé dans SyncLog
 *
 * Les opérations financières (POST /finance/*, POST /commercial/*) et
 * les mouvements de stock ne sont JAMAIS écrasés silencieusement.
 */

import { api } from '@/services/api'
import {
  getQueue, updateOperation, removeOperation, logSync, QueuedOperation,
} from './offlineQueue'

const MAX_RETRIES = 5
const RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000] // ms

// Protected endpoints — conflict resolution required, never silent overwrite
const PROTECTED_PATTERNS = [
  /^\/finance/,
  /^\/commercial\/invoices/,
  /^\/commercial\/payments/,
  /^\/stock\/stock-movements/,
  /^\/hr\/salaries/,
]

function isProtected(endpoint: string): boolean {
  return PROTECTED_PATTERNS.some(p => p.test(endpoint))
}

let syncInProgress = false

export async function sync(): Promise<{ synced: number; failed: number; conflicts: number }> {
  if (syncInProgress || !navigator.onLine) return { synced: 0, failed: 0, conflicts: 0 }

  syncInProgress = true
  window.dispatchEvent(new CustomEvent('alba:sync-start'))

  let synced = 0, failed = 0, conflicts = 0

  try {
    const queue = await getQueue()
    if (queue.length === 0) {
      window.dispatchEvent(new CustomEvent('alba:sync-done'))
      return { synced: 0, failed: 0, conflicts: 0 }
    }

    for (const op of queue) {
      if (!navigator.onLine) break // stop if we went offline mid-sync

      try {
        await executeOperation(op)
        await removeOperation(op.id)
        await logSync({ operationId: op.id, result: 'success' })
        synced++
      } catch (err: any) {
        const status = err?.response?.status as number | undefined
        const isConflict = status === 409

        if (isConflict) {
          // Mark as conflict — do not retry, requires human resolution
          await updateOperation({ ...op, status: 'conflict', lastError: 'Conflit détecté côté serveur (409)' })
          await logSync({ operationId: op.id, result: 'conflict', httpStatus: status,
            detail: JSON.stringify(err?.response?.data).slice(0, 300) })
          conflicts++

          // Notify UI
          window.dispatchEvent(new CustomEvent('alba:sync-conflict', { detail: op }))
        } else {
          const nextAttempts = op.attempts + 1
          if (nextAttempts >= MAX_RETRIES || (isProtected(op.endpoint) && nextAttempts >= 3)) {
            await updateOperation({ ...op, status: 'failed', attempts: nextAttempts,
              lastError: err?.response?.data?.message || err?.message || 'Erreur inconnue' })
            await logSync({ operationId: op.id, result: 'error', httpStatus: status,
              detail: err?.message })
            failed++
          } else {
            await updateOperation({ ...op, attempts: nextAttempts, lastError: err?.message })
            // Retry later with exponential backoff
            const delay = RETRY_DELAYS[Math.min(nextAttempts, RETRY_DELAYS.length - 1)]
            setTimeout(() => sync(), delay)
          }
        }
      }
    }
  } finally {
    syncInProgress = false
    if (failed === 0 && conflicts === 0) {
      window.dispatchEvent(new CustomEvent('alba:sync-done'))
    } else {
      window.dispatchEvent(new CustomEvent('alba:sync-error'))
    }
  }

  return { synced, failed, conflicts }
}

async function executeOperation(op: QueuedOperation): Promise<any> {
  const headers: Record<string, string> = {
    'X-Idempotency-Key': op.id,
    'X-Device-Id': op.deviceId,
    'X-User-Id': op.userId,
  }

  switch (op.method) {
    case 'POST':   return api.post(op.endpoint, op.body, { headers }).then(r => r.data)
    case 'PUT':    return api.put(op.endpoint,  op.body, { headers }).then(r => r.data)
    case 'PATCH':  return api.patch(op.endpoint, op.body, { headers }).then(r => r.data)
    case 'DELETE': return api.delete(op.endpoint, { headers }).then(r => r.data)
    default: throw new Error(`Méthode non supportée : ${op.method}`)
  }
}

// ─── Auto-sync on reconnection ────────────────────────────────────────────────
export function initAutoSync(): () => void {
  const handleOnline = () => {
    console.info('[ALBA Sync] Connexion rétablie — démarrage de la synchronisation')
    setTimeout(sync, 1500) // slight delay to let network stabilize
  }

  const handleSyncNow = () => sync()

  window.addEventListener('online', handleOnline)
  window.addEventListener('alba:sync-now', handleSyncNow)

  // Initial sync if already online
  if (navigator.onLine) setTimeout(sync, 3000)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('alba:sync-now', handleSyncNow)
  }
}
