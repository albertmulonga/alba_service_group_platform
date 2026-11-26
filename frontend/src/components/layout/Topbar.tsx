import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getInitials } from '@/lib/utils'
import {
  Menu, Search, Bell, Sun, Moon, ChevronDown,
  User, Settings, LogOut, MessageSquare, Wifi, WifiOff, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface TopbarProps {
  onMenuClick: () => void
}

const typeColors: Record<string, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
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

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { online, queueSize, syncStatus, forceSync } = useOfflineSync()
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [search, setSearch] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const recentNotifications = notifications.slice(0, 5)

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm flex items-center px-4 gap-4">
      {/* Menu button */}
      <button onClick={onMenuClick}
        className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 transition-colors lg:hidden">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher clients, factures, commandes..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 dark:text-gray-200 placeholder-gray-400 transition-all"
          />
          {search && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl p-3 z-50">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-2">Résultats pour "{search}"...</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Sync indicator */}
        <button
          onClick={() => forceSync()}
          title={online ? (queueSize > 0 ? `${queueSize} opération(s) en attente` : 'Synchronisé') : 'Hors ligne'}
          className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors',
            !online             ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : queueSize > 0     ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100'
            : syncStatus === 'syncing' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-500 hover:bg-green-100')}>
          {!online
            ? <WifiOff size={13} />
            : syncStatus === 'syncing'
              ? <RefreshCw size={13} className="animate-spin" />
              : <Wifi size={13} />}
          <span className="hidden sm:inline">
            {!online ? 'Hors ligne'
              : syncStatus === 'syncing' ? 'Sync...'
              : queueSize > 0 ? `${queueSize} en attente`
              : 'Synchronisé'}
          </span>
        </button>

        {/* Dark mode toggle */}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Messages */}
        <button className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 transition-colors relative">
          <MessageSquare size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false) }}
            className="relative p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 transition-colors">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl animate-fade-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Notifications</h3>
                <button onClick={markAllRead}
                  className="text-xs text-blue-600 font-medium hover:underline">
                  Tout marquer lu
                </button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">Aucune notification</p>
                  </div>
                ) : (
                  recentNotifications.map(n => (
                    <div key={n.id}
                      onClick={() => { markRead(n.id); setShowNotif(false); navigate('/notifications') }}
                      className={cn('flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors', !n.read && 'bg-blue-50/40 dark:bg-blue-900/20')}>
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', typeColors[n.type])} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 text-center">
                <button onClick={() => { setShowNotif(false); navigate('/notifications') }}
                  className="text-xs text-blue-600 font-medium hover:underline">
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-2" />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false) }}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold overflow-hidden"
              style={{ background: user?.photo ? 'transparent' : 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              {user?.photo
                ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
                : getInitials(`${user?.firstName} ${user?.lastName}`)
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{user?.role?.name}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xl animate-fade-in overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0"
                  style={{ background: user?.photo ? 'transparent' : 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  {user?.photo
                    ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
                    : getInitials(`${user?.firstName} ${user?.lastName}`)
                  }
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                    {user?.role?.name}
                  </span>
                </div>
              </div>
              <div className="py-1">
                {[
                  { icon: <User size={14} />, label: 'Mon profil', action: () => navigate('/profile') },
                  { icon: <Settings size={14} />, label: 'Paramètres', action: () => navigate('/settings') },
                ].map((item, i) => (
                  <button key={i} onClick={() => { item.action(); setShowProfile(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="py-1 border-t border-gray-100 dark:border-gray-700">
                <button onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut size={14} />
                  Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
