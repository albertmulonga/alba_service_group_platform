/**
 * ALBA SERVICE GROUP PLATFORM — Offline-aware API wrapper
 * ══════════════════════════════════════════════════════════════════
 * Remplace les appels api.post/put/delete directs.
 * - En ligne  → appel direct
 * - Hors ligne → enregistrement en queue locale + retour optimiste
 *
 * Usage :
 *   import { offlinePost, offlinePut, offlineDelete } from '@/lib/offline/offlineApi'
 *
 *   // Au lieu de : api.post('/customers', data)
 *   const result = await offlinePost('/customers', data, userId)
 */

import { api } from '@/services/api'
import { enqueue, getDeviceId, generateUUID } from './offlineQueue'

type Method = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

async function offlineRequest<T = any>(
  method: Method,
  endpoint: string,
  body: any,
  userId: string,
): Promise<{ data: T; queued: boolean }> {
  if (navigator.onLine) {
    try {
      const r = method === 'POST'   ? await api.post(endpoint, body)
              : method === 'PUT'    ? await api.put(endpoint, body)
              : method === 'PATCH'  ? await api.patch(endpoint, body)
              : await api.delete(endpoint)
      return { data: r.data as T, queued: false }
    } catch (err: any) {
      // Network error even though navigator.onLine → queue it
      if (!err?.response) {
        const queued = await enqueue({ method, endpoint, body, userId, deviceId: getDeviceId() })
        const optimistic = { ...body, id: body.id || generateUUID(), _queued: true, _queueId: queued.id }
        return { data: optimistic as unknown as T, queued: true }
      }
      throw err
    }
  } else {
    // Offline — queue and return optimistic placeholder
    const queued = await enqueue({ method, endpoint, body, userId, deviceId: getDeviceId() })
    const optimistic = { ...body, id: body.id || generateUUID(), _queued: true, _queueId: queued.id }
    notifyOfflineAction()
    return { data: optimistic as unknown as T, queued: true }
  }
}

function notifyOfflineAction() {
  window.dispatchEvent(new CustomEvent('alba:offline-action'))
}

/** POST — crée une ressource. Offline → retour optimiste */
export async function offlinePost<T = any>(endpoint: string, body: any, userId: string) {
  return offlineRequest<T>('POST', endpoint, body, userId)
}

/** PUT — met à jour une ressource. Offline → retour optimiste */
export async function offlinePut<T = any>(endpoint: string, body: any, userId: string) {
  return offlineRequest<T>('PUT', endpoint, body, userId)
}

/** PATCH — mise à jour partielle. Offline → retour optimiste */
export async function offlinePatch<T = any>(endpoint: string, body: any, userId: string) {
  return offlineRequest<T>('PATCH', endpoint, body, userId)
}

/** DELETE — suppression. Offline → marqué en attente */
export async function offlineDelete(endpoint: string, userId: string) {
  return offlineRequest('DELETE', endpoint, {}, userId)
}

/** Vérifie si une donnée est en attente de synchronisation */
export function isQueuedItem(item: any): boolean {
  return !!item?._queued
}
