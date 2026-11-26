import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '@/services/api'

/**
 * API-backed data store that mirrors useMockDB's interface.
 * Fetches data from the NestJS backend (PostgreSQL).
 * Falls back gracefully if the backend is unreachable.
 */
export function useApiDB<T extends { id: string }>(
  endpoint: string,
  defaultData: T[] = [],
  mapper?: (raw: any) => T
): {
  items: T[]
  total: number
  loading: boolean
  error: string | null
  add: (item: Omit<T, 'id'>) => Promise<T | null>
  update: (id: string, patch: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => Promise<void>
  getById: (id: string) => T | undefined
  count: number
} {
  const [items, setItems] = useState<T[]>(defaultData)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Track whether initial load happened to avoid re-fetching on unmount
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async () => {
    if (!mounted.current) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(endpoint)
      if (!mounted.current) return
      // Handle both array responses and paginated { data, total } responses
      let list: any[]
      if (Array.isArray(data)) {
        list = data
        setTotal(data.length)
      } else if (Array.isArray(data?.data)) {
        list = data.data
        setTotal(data.total ?? data.data.length)
      } else if (Array.isArray(data?.items)) {
        list = data.items
        setTotal(data.total ?? data.items.length)
      } else {
        list = []
      }
      setItems(mapper ? list.map(mapper) : list)
    } catch (err: any) {
      if (!mounted.current) return
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erreur de connexion au serveur')
      // Keep existing items on error rather than clearing them
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [endpoint, mapper])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (item: Omit<T, 'id'>): Promise<T | null> => {
    try {
      const { data } = await api.post(endpoint, item)
      const mapped = mapper ? mapper(data) : data as T
      setItems(prev => [mapped, ...prev])
      setTotal(prev => prev + 1)
      return mapped
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erreur lors de la création')
      return null
    }
  }, [endpoint, mapper])

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    try {
      const { data } = await api.put(`${endpoint}/${id}`, patch)
      const mapped = mapper ? mapper(data) : data as T
      setItems(prev => prev.map(it => it.id === id ? { ...it, ...mapped } : it))
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erreur lors de la mise à jour')
      throw err
    }
  }, [endpoint, mapper])

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`${endpoint}/${id}`)
      setItems(prev => prev.filter(it => it.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
    } catch (err: any) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erreur lors de la suppression')
      throw err
    }
  }, [endpoint])

  const getById = useCallback((id: string) => {
    return items.find(it => it.id === id)
  }, [items])

  return { items, total, loading, error, add, update, remove, refresh, getById, count: items.length }
}

export { api } from '@/services/api'
