import { useState, useCallback, useEffect } from 'react'

/**
 * Mock data store with localStorage persistence.
 * Data persists across page refreshes and sessions.
 * Initialize once with default data; subsequent reads come from localStorage.
 */
export function useMockDB<T extends { id: string }>(
  storageKey: string,
  defaultData: T[]
): {
  items: T[]
  add: (item: Omit<T, 'id'> & { id?: string }) => T
  update: (id: string, patch: Partial<T>) => void
  remove: (id: string) => void
  replaceAll: (items: T[]) => void
  getById: (id: string) => T | undefined
  count: number
} {
  const [items, setItems] = useState<T[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return defaultData
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items, storageKey])

  const add = useCallback((item: Omit<T, 'id'> & { id?: string }) => {
    const newItem = { ...item, id: item.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` } as T
    setItems(prev => [newItem, ...prev])
    return newItem
  }, [])

  const update = useCallback((id: string, patch: Partial<T>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
  }, [])

  const replaceAll = useCallback((newItems: T[]) => {
    setItems(newItems)
  }, [])

  const getById = useCallback((id: string) => {
    return items.find(it => it.id === id)
  }, [items])

  return { items, add, update, remove, replaceAll, getById, count: items.length }
}

/**
 * Reset all mock DB data to defaults (call from Settings page)
 */
export function resetAllMockDB(keys: string[]) {
  keys.forEach(k => localStorage.removeItem(k))
  window.location.reload()
}
