/**
 * ALBA SERVICE GROUP PLATFORM — Offline-First Queue
 * ══════════════════════════════════════════════════════════════════
 * File d'attente persistée (IndexedDB) des opérations effectuées hors ligne.
 *
 * Chaque opération reçoit :
 *  - un UUID (idempotency key)
 *  - un horodatage
 *  - l'identifiant de l'utilisateur
 *  - l'identifiant de l'appareil
 *
 * La synchronisation rejoue les opérations dans l'ordre, gère les conflits
 * (409 = conflit détecté côté serveur) et journalise chaque tentative.
 */

export interface QueuedOperation {
  id: string                                  // UUID — clé d'idempotence
  endpoint: string                            // ex: '/customers'
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: any                                   // payload
  userId: string                              // auteur
  deviceId: string                            // appareil émetteur
  createdAt: string                           // ISO
  attempts: number                            // tentatives de sync
  lastError?: string                          // dernière erreur
  status: 'pending' | 'syncing' | 'failed' | 'conflict'
}

export interface SyncLogEntry {
  id: string
  operationId: string
  timestamp: string
  result: 'success' | 'error' | 'conflict'
  detail?: string
  httpStatus?: number
}

// ─── IndexedDB setup ──────────────────────────────────────────────────────────
const DB_NAME = 'alba-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'queue'
const LOG_STORE = 'synclog'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(LOG_STORE))    db.createObjectStore(LOG_STORE,    { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = fn(t.objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror   = () => reject(req.error)
  })
}

// ─── Device identity ─────────────────────────────────────────────────────────
export function getDeviceId(): string {
  let id = localStorage.getItem('alba-device-id')
  if (!id) {
    id = generateUUID()
    localStorage.setItem('alba-device-id', id)
  }
  return id
}

// ─── UUID (crypto-native with fallback) ─────────────────────────────────────
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Queue operations ───────────────────────────────────────────────────────
export async function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'attempts' | 'status'>): Promise<QueuedOperation> {
  const queued: QueuedOperation = {
    ...op,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  }
  await tx(QUEUE_STORE, 'readwrite', s => s.add(queued))
  notifyQueueChanged()
  return queued
}

export async function getQueue(): Promise<QueuedOperation[]> {
  const all = await tx<QueuedOperation[]>(QUEUE_STORE, 'readonly', s => s.getAll())
  return all.filter(o => o.status === 'pending' || o.status === 'failed' || o.status === 'conflict')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getQueueSize(): Promise<number> {
  const q = await getQueue()
  return q.length
}

export async function updateOperation(op: QueuedOperation): Promise<void> {
  await tx(QUEUE_STORE, 'readwrite', s => s.put(op))
  notifyQueueChanged()
}

export async function removeOperation(id: string): Promise<void> {
  await tx(QUEUE_STORE, 'readwrite', s => s.delete(id))
  notifyQueueChanged()
}

// ─── Sync log ────────────────────────────────────────────────────────────────
export async function logSync(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const full: SyncLogEntry = { ...entry, id: generateUUID(), timestamp: new Date().toISOString() }
  await tx(LOG_STORE, 'readwrite', s => s.add(full))
  // Keep only the last 500 entries
  const all = await tx<SyncLogEntry[]>(LOG_STORE, 'readonly', s => s.getAll())
  if (all.length > 500) {
    const toDelete = all.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(0, all.length - 500)
    for (const e of toDelete) await tx(LOG_STORE, 'readwrite', s => s.delete(e.id))
  }
}

export async function getSyncLog(): Promise<SyncLogEntry[]> {
  const all = await tx<SyncLogEntry[]>(LOG_STORE, 'readonly', s => s.getAll())
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

// ─── Events ─────────────────────────────────────────────────────────────────
function notifyQueueChanged() {
  window.dispatchEvent(new CustomEvent('alba:queue-changed'))
  getQueueSize().then(size => {
    window.dispatchEvent(new CustomEvent('alba:queue-size', { detail: size }))
  })
}
