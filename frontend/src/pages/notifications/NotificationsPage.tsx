import { useState, useMemo } from 'react'
import { useNotifications, type Notification } from '@/contexts/NotificationContext'
import {
  Bell, CheckCircle, AlertTriangle, Info, AlertOctagon,
  Trash2, CheckCheck, Eye, Clock, Calendar, Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'

const typeConfig: Record<Notification['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  info:    { icon: <Info size={16} />,          color: 'text-blue-600',   bg: 'bg-blue-50' },
  warning: { icon: <AlertTriangle size={16} />, color: 'text-amber-600',  bg: 'bg-amber-50' },
  success: { icon: <CheckCircle size={16} />,   color: 'text-green-600',  bg: 'bg-green-50' },
  danger:  { icon: <AlertOctagon size={16} />,  color: 'text-red-600',    bg: 'bg-red-50' },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHour < 24) return `il y a ${diffHour}h`
  if (diffDay === 1) return 'Hier'
  if (diffDay < 7) return `il y a ${diffDay} jours`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

type Tab = 'all' | 'unread' | 'today' | 'week'

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, deleteNotification, clearAll } = useNotifications()
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all',    label: 'Toutes',       count: notifications.length },
    { key: 'unread', label: 'Non lues',     count: notifications.filter(n => !n.read).length },
    { key: 'today',  label: "Aujourd'hui",  count: notifications.filter(n => {
      const d = new Date(n.createdAt); const now = new Date()
      return d.toDateString() === now.toDateString()
    }).length },
    { key: 'week',   label: 'Cette semaine', count: notifications.filter(n => {
      const d = new Date(n.createdAt); const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    }).length },
  ]

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab === 'unread') return !n.read
      if (activeTab === 'today') {
        const d = new Date(n.createdAt); const now = new Date()
        if (d.toDateString() !== now.toDateString()) return false
      }
      if (activeTab === 'week') {
        const d = new Date(n.createdAt); const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        if (d < weekAgo) return false
      }
      if (filterType !== 'all' && n.type !== filterType) return false
      return true
    })
  }, [notifications, activeTab, filterType])

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Bell size={22} className="text-blue-600" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {notifications.filter(n => !n.read).length} non lue(s) sur {notifications.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
              <CheckCheck size={14} /> Marquer tout comme lu
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => { if (confirm('Supprimer toutes les notifications ?')) clearAll() }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
              <Trash2 size={14} /> Tout supprimer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl transition-all',
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Type filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {[['all', 'Tous'], ['info', 'Info'], ['success', 'Succès'], ['warning', 'Avertissement'], ['danger', 'Alerte']].map(([key, label]) => (
          <button key={key} onClick={() => setFilterType(key)}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-full transition-all border',
              filterType === key
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Inbox size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-sm">Aucune notification</p>
            <p className="text-gray-400 text-xs mt-1">
              {activeTab === 'unread' ? 'Toutes les notifications sont lues' : 'Aucune notification pour cette période'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(n => {
              const config = typeConfig[n.type]
              return (
                <div key={n.id}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex gap-4 px-5 py-4 hover:bg-gray-50/50 cursor-pointer transition-colors group',
                    !n.read && 'bg-blue-50/30'
                  )}>
                  {/* Icon */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
                    <span className={config.color}>{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={cn('text-sm', n.read ? 'text-gray-600' : 'text-gray-800 font-semibold')}>
                            {n.title}
                          </h3>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!n.read && (
                          <button onClick={e => { e.stopPropagation(); markRead(n.id) }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Marquer comme lu">
                            <Eye size={13} />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={10} />
                        {timeAgo(n.createdAt)}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {n.module}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
