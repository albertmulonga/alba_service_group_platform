import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  module: string
  read: boolean
  createdAt: string
  link?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
}

const STORAGE_KEY = 'alba-notifications'
const MAX_NOTIFICATIONS = 100

const NotificationContext = createContext<NotificationContextType | null>(null)

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveNotifications(notifs: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs))
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, token, user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [hydratedLocalUserId, setHydratedLocalUserId] = useState<string | null>(null)
  const serverBacked = Boolean(token && !token.startsWith('local-token-'))

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      setNotifications([])
      setHydratedLocalUserId(null)
      return
    }
    if (!serverBacked) {
      setNotifications(loadNotifications())
      setHydratedLocalUserId(user?.id || null)
      return
    }

    setNotifications([])
    setHydratedLocalUserId(null)
    let cancelled = false
    api.get('/notifications')
      .then(({ data }) => {
        if (cancelled) return
        setNotifications(data.map((item: any) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type,
          module: item.module || 'Général',
          read: item.isRead,
          createdAt: item.createdAt,
          link: item.link || undefined,
        })))
      })
      .catch(error => console.error('Impossible de charger les notifications.', error))
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isLoading, serverBacked, token, user?.id])

  useEffect(() => {
    if (
      !isLoading &&
      token?.startsWith('local-token-') &&
      user?.id &&
      hydratedLocalUserId === user.id
    ) {
      saveNotifications(notifications)
    }
  }, [hydratedLocalUserId, isLoading, notifications, token, user?.id])

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: Notification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    setNotifications(prev => {
      const updated = [newNotif, ...prev]
      return updated.slice(0, MAX_NOTIFICATIONS)
    })
  }, [])

  const markRead = useCallback((id: string) => {
    if (serverBacked) {
      void api.patch(`/notifications/${id}/read`)
        .then(() => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)))
        .catch(error => console.error('Impossible de marquer la notification comme lue.', error))
      return
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [serverBacked])

  const markAllRead = useCallback(() => {
    if (serverBacked) {
      void api.patch('/notifications/read-all')
        .then(() => setNotifications(prev => prev.map(n => ({ ...n, read: true }))))
        .catch(error => console.error('Impossible de marquer toutes les notifications comme lues.', error))
      return
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [serverBacked])

  const deleteNotification = useCallback((id: string) => {
    if (serverBacked) {
      void api.delete(`/notifications/${id}`)
        .then(() => setNotifications(prev => prev.filter(n => n.id !== id)))
        .catch(error => console.error('Impossible de supprimer la notification.', error))
      return
    }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [serverBacked])

  const clearAll = useCallback(() => {
    if (serverBacked) {
      void api.delete('/notifications')
        .then(() => setNotifications([]))
        .catch(error => console.error('Impossible de supprimer les notifications.', error))
      return
    }
    setNotifications([])
  }, [serverBacked])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      deleteNotification,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
