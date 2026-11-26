import { useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useElectron } from '@/hooks/useElectron'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isElectron, electron } = useElectron()
  const navigate = useNavigate()

  // Register the navigator so Electron menu items can trigger navigation
  useEffect(() => {
    if (!isElectron || !electron) return
    electron.registerNavigator(navigate)

    // Listen for sync-now from menu
    const unsubSync = electron.onSyncNow(() => {
      window.dispatchEvent(new CustomEvent('alba:sync-now'))
    })

    // Listen for theme changes from menu
    const unsubTheme = electron.onThemeChange((theme) => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    })

    return () => {
      unsubSync()
      unsubTheme()
    }
  }, [isElectron, electron, navigate])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#F5F7FA] dark:bg-gray-900 p-6">
          <Outlet />
        </main>
        {/* Electron status bar */}
        {isElectron && <ElectronStatusBar />}
      </div>
    </div>
  )
}

function ElectronStatusBar() {
  const [online, setOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [lastSync, setLastSync] = useState<string>('')

  useEffect(() => {
    const handleOnline  = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for sync events dispatched by the offline queue
    const handleSyncStart = () => setSyncStatus('syncing')
    const handleSyncDone  = () => { setSyncStatus('done'); setLastSync(new Date().toLocaleTimeString('fr-FR')); setTimeout(() => setSyncStatus('idle'), 3000) }
    const handleSyncError = () => { setSyncStatus('error'); setTimeout(() => setSyncStatus('idle'), 4000) }
    window.addEventListener('alba:sync-start', handleSyncStart)
    window.addEventListener('alba:sync-done',  handleSyncDone)
    window.addEventListener('alba:sync-error', handleSyncError)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('alba:sync-start', handleSyncStart)
      window.removeEventListener('alba:sync-done',  handleSyncDone)
      window.removeEventListener('alba:sync-error', handleSyncError)
    }
  }, [])

  const syncColor = syncStatus === 'syncing' ? 'text-blue-400'
    : syncStatus === 'done'    ? 'text-green-400'
    : syncStatus === 'error'   ? 'text-red-400'
    : 'text-gray-400'

  const syncLabel = syncStatus === 'syncing' ? '⟳ Synchronisation...'
    : syncStatus === 'done'    ? `✓ Synchronisé ${lastSync}`
    : syncStatus === 'error'   ? '✕ Erreur de sync'
    : lastSync               ? `✓ Sync ${lastSync}`
    : 'En attente de sync'

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-gray-900 text-xs border-t border-gray-700" style={{ height: 24 }}>
      <div className="flex items-center gap-4">
        <span className="text-gray-500">ALBA SERVICE GROUP PLATFORM</span>
        <span className="text-gray-600">v1.0.0</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={syncColor + ' ' + (syncStatus === 'syncing' ? 'animate-pulse' : '')}>{syncLabel}</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={online ? 'text-green-400' : 'text-red-400'}>{online ? 'En ligne' : 'Hors ligne'}</span>
        </div>
      </div>
    </div>
  )
}
