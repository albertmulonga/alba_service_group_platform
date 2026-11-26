import { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { useMessaging } from '@/contexts/MessagingContext'
import type { Permission } from '@/lib/permissions'
import {
  LayoutDashboard, Users, UserCheck, Building2, Printer,
  FileText, Monitor, Palette, Wrench, GraduationCap,
  ShoppingCart, Package, Truck, Wallet, BookOpen,
  FolderOpen, Calendar, BarChart3, Settings, ChevronDown,
  ChevronRight, X, History, Layers, Clock, DollarSign, MessageSquare, Shield
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  path?: string
  icon: React.ReactNode
  badge?: number
  color?: string
  permission?: Permission
  children?: { label: string; path: string; permission?: Permission }[]
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', path: '/dashboard', icon: <LayoutDashboard size={18} />, color: 'text-blue-400', permission: 'dashboard.view' },
  { label: 'Clients / CRM', icon: <Users size={18} />, color: 'text-cyan-400', permission: 'clients.view',
    children: [
      { label: 'Liste clients', path: '/clients', permission: 'clients.view' },
      { label: 'Historique interactions', path: '/clients/history', permission: 'clients.view' },
      { label: 'Segments', path: '/clients/segments', permission: 'clients.view' },
    ]
  },
  { label: 'RH', icon: <UserCheck size={18} />, color: 'text-green-400',
    children: [
      { label: 'Ma Paie', path: '/hr/ma-paie' },
      { label: 'Congés', path: '/hr/leaves', permission: 'employees.view' },
      { label: 'Paie', path: '/hr/payroll', permission: 'employees.view' },
      { label: 'Pointage', path: '/hr/attendance', permission: 'employees.view' },
    ]
  },
  { label: 'Départements', path: '/departments', icon: <Building2 size={18} />, color: 'text-violet-400', permission: 'departments.view' },
  { label: 'Agences', path: '/agencies', icon: <Building2 size={18} />, color: 'text-emerald-400' },
  {
    label: 'Imprimerie', icon: <Printer size={18} />, color: 'text-orange-400', permission: 'printing.view',
    children: [
      { label: 'Commandes', path: '/print/orders', permission: 'printing.view' },
      { label: 'Production', path: '/print/production', permission: 'production.view' },
      { label: 'Machines', path: '/print/machines', permission: 'machines.view' },
      { label: 'Consommables', path: '/print/consumables', permission: 'consumables.view' },
    ]
  },
  { label: 'Secrétariat', path: '/secretariat', icon: <FileText size={18} />, color: 'text-pink-400', permission: 'secretariat.view' },
  {
    label: 'Informatique', icon: <Monitor size={18} />, color: 'text-blue-500', permission: 'it.view',
    children: [
      { label: 'Projets', path: '/it/projects', permission: 'it.view' },
      { label: 'Tâches', path: '/it/tasks', permission: 'it.view' },
      { label: 'Tickets', path: '/it/tickets', permission: 'it.view' },
    ]
  },
  { label: 'Graphisme', path: '/graphics', icon: <Palette size={18} />, color: 'text-fuchsia-400', permission: 'graphics.view' },
  { label: 'Maintenance', path: '/maintenance', icon: <Wrench size={18} />, color: 'text-yellow-500', permission: 'maintenance.view' },
  { label: 'Formation', icon: <GraduationCap size={18} />, color: 'text-emerald-400', permission: 'training.view',
    children: [
      { label: 'Formations', path: '/training', permission: 'training.view' },
      { label: 'Étudiants', path: '/training', permission: 'training.view' },
      { label: 'Certificats', path: '/training/certificates', permission: 'training.view' },
      { label: 'Présences', path: '/training/attendance', permission: 'training.view' },
    ]
  },
  {
    label: 'Commercial', icon: <ShoppingCart size={18} />, color: 'text-teal-400', permission: 'commercial.view',
    children: [
      { label: 'Devis', path: '/commercial/quotes', permission: 'commercial.view' },
      { label: 'Commandes', path: '/commercial/orders', permission: 'commercial.view' },
      { label: 'Factures', path: '/commercial/invoices', permission: 'commercial.view' },
      { label: 'Paiements', path: '/commercial/payments', permission: 'commercial.view' },
    ]
  },
  { label: 'Stock', icon: <Package size={18} />, color: 'text-amber-400', permission: 'stock.view',
    children: [
      { label: 'Inventaire', path: '/stock', permission: 'stock.view' },
      { label: 'Mouvements', path: '/stock/movements', permission: 'stock.view' },
    ]
  },
  { label: 'Achats', path: '/purchases', icon: <Truck size={18} />, color: 'text-rose-400', permission: 'purchases.view' },
  {
    label: 'Finance', icon: <Wallet size={18} />, color: 'text-green-500', permission: 'finance.view',
    children: [
      { label: 'Caisse', path: '/finance/cash', permission: 'finance.view' },
      { label: 'Comptabilité', path: '/finance/accounting', permission: 'accounting.view' },
      { label: 'Budget', path: '/finance/budget', permission: 'budget.view' },
      { label: 'États financiers', path: '/finance/statements', permission: 'finance.view' },
      { label: 'Impôts/TVA', path: '/finance/tax', permission: 'finance.view' },
    ]
  },
  { label: 'Messagerie', path: '/messaging', icon: <MessageSquare size={18} />, color: 'text-sky-400', permission: 'dashboard.view' },
  { label: 'Documents', path: '/documents', icon: <FolderOpen size={18} />, color: 'text-indigo-400', permission: 'documents.view' },
  { label: 'Agenda', path: '/agenda', icon: <Calendar size={18} />, color: 'text-sky-400', permission: 'agenda.view' },
  { label: 'Rapports', path: '/reports', icon: <BarChart3 size={18} />, color: 'text-purple-400', permission: 'reports.view' },
  {
    label: 'Administration', icon: <Shield size={18} />, color: 'text-red-400', permission: 'admin.users',
    children: [
      { label: 'Utilisateurs', path: '/admin/users', permission: 'admin.users' },
    ]
  },
  { label: 'Paramètres', path: '/settings', icon: <Settings size={18} />, color: 'text-slate-400', permission: 'settings.view' },
]

function NavItemRow({ item, depth = 0, can, primaryColor }: {
  item: NavItem
  depth?: number
  can: (p: Permission) => boolean
  primaryColor: string
}) {
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()

  const allowed = !item.permission || can(item.permission)
  const visibleChildren = item.children?.filter(c => !c.permission || can(c.permission))
  const hasVisibleChildren = visibleChildren && visibleChildren.length > 0
  const isChildActive = visibleChildren?.some(c => location.pathname.startsWith(c.path))

  useEffect(() => {
    if (isChildActive) setExpanded(true)
  }, [isChildActive])

  if (!allowed) return null

  if (item.children && hasVisibleChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            (expanded || isChildActive)
              ? 'bg-white/15 text-white'
              : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          )}>
          <span className={cn('flex-shrink-0', item.color)}>{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge ? (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full mr-1">
              {item.badge}
            </span>
          ) : null}
          {expanded
            ? <ChevronDown size={14} className="text-gray-500" />
            : <ChevronRight size={14} className="text-gray-500" />}
        </button>
        {expanded && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {visibleChildren!.map(child => (
              <NavLink key={child.path} to={child.path}
                className={({ isActive }) => cn(
                  'block px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                )}>
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (item.children && !hasVisibleChildren) return null

  return (
    <NavLink to={item.path!}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
        isActive
          ? 'text-white shadow-lg'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      )}
      style={({ isActive }) => isActive ? {
        background: `linear-gradient(135deg, ${primaryColor}cc, ${primaryColor}88)`,
        boxShadow: `0 4px 15px ${primaryColor}44`,
      } : {}}>
      <span className={cn('flex-shrink-0', item.color)}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { can, user } = useAuth()
  const { primaryColor, companyName } = useTheme()
  const { getConversationsForUser } = useMessaging()

  const totalUnread = useMemo(() => {
    if (!user) return 0
    return getConversationsForUser(user.id)
      .filter(c => !c.archived)
      .reduce((sum, c) => sum + c.unreadCount, 0)
  }, [user, getConversationsForUser])

  const dynamicNavItems = useMemo(() => {
    return navItems.map(item => {
      if (item.path === '/messaging') {
        return { ...item, badge: totalUnread > 0 ? totalUnread : undefined }
      }
      return item
    })
  }, [totalUnread])

  // Derive darker shades from primaryColor for gradient
  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : { r:15, g:30, b:74 }
  }
  const darken = (hex: string, amt: number) => {
    const { r, g, b } = hexToRgb(hex)
    const d = (v: number) => Math.max(0, v - amt).toString(16).padStart(2,'0')
    return `#${d(r)}${d(g)}${d(b)}`
  }
  const sidebarBg = `linear-gradient(180deg, ${darken(primaryColor,10)} 0%, ${darken(primaryColor,25)} 60%, ${darken(primaryColor,40)} 100%)`

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-50 w-64 flex flex-col sidebar-transition',
        'lg:relative lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
        style={{ background: sidebarBg }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur overflow-hidden">
              <img src="/alba-logo.png" alt="ALBA SERVICE" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{companyName || 'ALBA SERVICE'}</p>
              <p className="text-white/50 text-[10px] font-medium tracking-wider uppercase">Group Platform</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">
          {dynamicNavItems.map((item, i) => (
            <NavItemRow key={i} item={item} can={can} primaryColor={primaryColor} />
          ))}
        </nav>

        {/* Version */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-white/30 text-xs text-center">v1.0.0 · Juillet 2026</p>
        </div>
      </aside>
    </>
  )
}
