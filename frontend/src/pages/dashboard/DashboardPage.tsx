import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import StatusBadge from '@/components/ui/StatusBadge'
import AvatarCircle from '@/components/ui/AvatarCircle'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Users, TrendingUp, ShoppingCart, FileText, Package,
  AlertTriangle, Activity, ArrowRight, ArrowUpRight, ArrowDownRight,
  Plus, UserPlus, Headphones, Clock, Printer, Palette,
  Monitor, GraduationCap, Wrench, Wallet, Calendar,
  CheckCircle, Timer, BarChart3, DollarSign
} from 'lucide-react'

/* ─── DB helper ─────────────────────────────────────────────────────────── */
function readDB<T>(key: string): T[] {
  try {
    const s = localStorage.getItem(key)
    if (s) { const p = JSON.parse(s); if (Array.isArray(p)) return p }
  } catch {}
  return []
}

/* ─── Animated counter ───────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const e = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(e * target))
      if (t < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])
  return value
}

/* ─── Live clock ─────────────────────────────────────────────────────────── */
function useLiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/* ─── Mock base data ─────────────────────────────────────────────────────── */
const revenueData = [
  { month: 'Jan', revenus: 1800000, depenses: 900000,  benefice: 900000 },
  { month: 'Fév', revenus: 2200000, depenses: 1100000, benefice: 1100000 },
  { month: 'Mar', revenus: 1950000, depenses: 850000,  benefice: 1100000 },
  { month: 'Avr', revenus: 2800000, depenses: 1200000, benefice: 1600000 },
  { month: 'Mai', revenus: 3200000, depenses: 1400000, benefice: 1800000 },
  { month: 'Jun', revenus: 2900000, depenses: 1300000, benefice: 1600000 },
  { month: 'Jul', revenus: 3500000, depenses: 1500000, benefice: 2000000 },
]

const serviceData = [
  { name: 'Imprimerie',   value: 45, color: '#2563EB' },
  { name: 'Secrétariat',  value: 20, color: '#22C55E' },
  { name: 'Informatique', value: 18, color: '#7C3AED' },
  { name: 'Formation',    value: 10, color: '#F59E0B' },
  { name: 'Graphisme',    value: 7,  color: '#EF4444' },
]

const printJobsData = [
  { day: 'Lun', commandes: 8, termines: 6, annules: 1 },
  { day: 'Mar', commandes: 12, termines: 10, annules: 0 },
  { day: 'Mer', commandes: 7, termines: 7, annules: 2 },
  { day: 'Jeu', commandes: 15, termines: 11, annules: 1 },
  { day: 'Ven', commandes: 10, termines: 8, annules: 0 },
  { day: 'Sam', commandes: 5, termines: 5, annules: 0 },
]

const itTicketsData = [
  { week: 'S1', ouvert: 8, resolu: 5, enCours: 3 },
  { week: 'S2', ouvert: 12, resolu: 9, enCours: 3 },
  { week: 'S3', ouvert: 6, resolu: 6, enCours: 0 },
  { week: 'S4', ouvert: 10, resolu: 7, enCours: 3 },
]

const financeMonthly = [
  { month: 'Jan', encaisse: 1800000, depense: 900000 },
  { month: 'Fév', encaisse: 2200000, depense: 1100000 },
  { month: 'Mar', encaisse: 1950000, depense: 850000 },
  { month: 'Avr', encaisse: 2800000, depense: 1200000 },
  { month: 'Mai', encaisse: 3200000, depense: 1400000 },
  { month: 'Jun', encaisse: 2900000, depense: 1300000 },
  { month: 'Jul', encaisse: 3500000, depense: 1500000 },
]

const mockRecentOrders = [
  { id: 'ALB-0045', client: 'Entreprise ABC',       service: 'Impression flyers',  status: 'En cours',  amount: 150000, date: '2026-07-23' },
  { id: 'ALB-0044', client: 'Université de Kindu',   service: 'Reliure mémoires',   status: 'Terminé',   amount: 85000,  date: '2026-07-22' },
  { id: 'ALB-0043', client: 'Mairie de Kindu',       service: 'Saisie documents',   status: 'En attente',amount: 45000,  date: '2026-07-22' },
  { id: 'ALB-0042', client: 'Hôpital Général',       service: 'Cartes de visite',   status: 'Livré',     amount: 60000,  date: '2026-07-21' },
  { id: 'ALB-0041', client: 'ONG Espoir',            service: 'Impression affiches',status: 'En cours',  amount: 120000, date: '2026-07-21' },
]

const mockStockAlerts = [
  { product: 'Papier A4 80g',   current: 20, minimum: 100, unit: 'Rames' },
  { product: 'Toner HP 59A',    current: 2,  minimum: 10,  unit: 'Pcs' },
  { product: 'Encre couleur',   current: 5,  minimum: 20,  unit: 'Cartouches' },
]

const mockActivity = [
  { user: 'Albert M.',  action: 'Créé la facture',       target: '#F-0156',      time: 'Il y a 5 min' },
  { user: 'Marie K.',   action: 'Validé le paiement',    target: '75 000 FC',    time: 'Il y a 12 min' },
  { user: 'Jean M.',    action: 'Terminé la commande',   target: '#ALB-0044',    time: 'Il y a 25 min' },
  { user: 'Sophie B.',  action: 'Ajouté un client',      target: 'Ecole BERUNDA',time: 'Il y a 45 min' },
  { user: 'Patrick L.', action: 'Mis à jour stock',      target: 'Toner HP',     time: 'Il y a 1h' },
]

/* ─── Tooltip commun ─────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xl text-xs min-w-[160px]">
      <p className="font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-gray-500">{p.name}</span>
          </div>
          <span className="font-semibold text-gray-800">
            {typeof p.value === 'number' && p.value > 10000 ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, suffix, change, icon, gradient, sub }: {
  label: string; value: number; suffix?: string; change: number
  icon: React.ReactNode; gradient: string; sub?: string
}) {
  const display = useCountUp(value)
  const pos = change >= 0
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">{icon}</div>
          <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${pos ? 'bg-white/20' : 'bg-black/20'}`}>
            {pos ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(change)}%
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {display.toLocaleString('fr-FR')}{suffix ? ` ${suffix}` : ''}
        </p>
        <p className="text-white/80 text-xs mt-0.5">{label}</p>
        {sub && <p className="text-white/50 text-[10px] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Card wrapper ───────────────────────────────────────────────────────── */
function Card({ title, subtitle, children, action, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode
  action?: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

/* ─── Role-based quick actions ───────────────────────────────────────────── */
function getQuickActions(role: string): { label: string; icon: React.ReactNode; color: string; path: string }[] {
  const r = role.toLowerCase()
  if (r.includes('admin') || r.includes('super') || r.includes('direct')) return [
    { label: 'Nouveau utilisateur', icon: <UserPlus size={15}/>, color: 'bg-blue-600', path: '/admin/users' },
    { label: 'Nouvelle commande',   icon: <Plus size={15}/>,     color: 'bg-indigo-600', path: '/commercial/orders' },
    { label: 'Voir rapports',       icon: <BarChart3 size={15}/>,color: 'bg-purple-600', path: '/reports' },
    { label: 'Ajouter client',      icon: <Users size={15}/>,    color: 'bg-teal-600',   path: '/clients' },
  ]
  if (r.includes('comptable') || r.includes('caissier') || r.includes('finance')) return [
    { label: 'Nouvelle facture',    icon: <FileText size={15}/>, color: 'bg-green-600',  path: '/commercial/invoices' },
    { label: 'Enregistrer paiement',icon: <DollarSign size={15}/>,color:'bg-emerald-600',path: '/commercial/payments' },
    { label: 'Voir budget',         icon: <Wallet size={15}/>,   color: 'bg-teal-600',   path: '/finance/budget' },
    { label: 'Rapports financiers', icon: <BarChart3 size={15}/>,color: 'bg-blue-600',   path: '/reports' },
  ]
  if (r.includes('imprimerie')) return [
    { label: 'Nouvelle commande',   icon: <Printer size={15}/>,  color: 'bg-orange-600', path: '/print/orders' },
    { label: 'Voir production',     icon: <Activity size={15}/>, color: 'bg-amber-600',  path: '/print/production' },
    { label: 'Machines',            icon: <Wrench size={15}/>,   color: 'bg-red-600',    path: '/print/machines' },
    { label: 'Consommables',        icon: <Package size={15}/>,  color: 'bg-rose-600',   path: '/print/consumables' },
  ]
  if (r.includes('graphiste') || r.includes('graphisme')) return [
    { label: 'Nouveau projet',      icon: <Palette size={15}/>,  color: 'bg-violet-600', path: '/graphics' },
    { label: 'Voir agenda',         icon: <Calendar size={15}/>, color: 'bg-purple-600', path: '/agenda' },
    { label: 'Documents',           icon: <FileText size={15}/>, color: 'bg-indigo-600', path: '/documents' },
    { label: 'Rapports',            icon: <BarChart3 size={15}/>,color: 'bg-blue-600',   path: '/reports' },
  ]
  if (r.includes('secrét') || r.includes('secretar')) return [
    { label: 'Nouveau document',    icon: <FileText size={15}/>, color: 'bg-pink-600',   path: '/secretariat' },
    { label: 'Agenda',              icon: <Calendar size={15}/>, color: 'bg-rose-600',   path: '/agenda' },
    { label: 'Clients',             icon: <Users size={15}/>,    color: 'bg-blue-600',   path: '/clients' },
    { label: 'Documents',           icon: <FileText size={15}/>, color: 'bg-purple-600', path: '/documents' },
  ]
  if (r.includes('développeur') || r.includes('developpeur') || r.includes('informatique')) return [
    { label: 'Nouveau projet IT',   icon: <Monitor size={15}/>,  color: 'bg-cyan-600',   path: '/it/projects' },
    { label: 'Tickets support',     icon: <Headphones size={15}/>,color:'bg-blue-600',   path: '/it/tickets' },
    { label: 'Mes tâches',          icon: <CheckCircle size={15}/>,color:'bg-teal-600',  path: '/it/tasks' },
    { label: 'Documents',           icon: <FileText size={15}/>, color: 'bg-indigo-600', path: '/documents' },
  ]
  if (r.includes('formateur') || r.includes('formation')) return [
    { label: 'Nouvelle formation',  icon: <GraduationCap size={15}/>,color:'bg-emerald-600',path:'/training' },
    { label: 'Voir étudiants',      icon: <Users size={15}/>,    color: 'bg-teal-600',   path: '/training' },
    { label: 'Agenda',              icon: <Calendar size={15}/>, color: 'bg-blue-600',   path: '/agenda' },
    { label: 'Certificats',         icon: <FileText size={15}/>, color: 'bg-green-600',  path: '/training/certificates' },
  ]
  if (r.includes('technicien') || r.includes('maintenance')) return [
    { label: 'Nouvelle intervention',icon: <Wrench size={15}/>,  color: 'bg-yellow-600', path: '/maintenance' },
    { label: 'Voir machines',       icon: <Activity size={15}/>, color: 'bg-amber-600',  path: '/print/machines' },
    { label: 'Stock pièces',        icon: <Package size={15}/>,  color: 'bg-orange-600', path: '/stock' },
    { label: 'Agenda',              icon: <Calendar size={15}/>, color: 'bg-blue-600',   path: '/agenda' },
  ]
  // default
  return [
    { label: 'Tableau de bord',     icon: <BarChart3 size={15}/>,color: 'bg-blue-600',   path: '/dashboard' },
    { label: 'Agenda',              icon: <Calendar size={15}/>, color: 'bg-purple-600', path: '/agenda' },
    { label: 'Documents',           icon: <FileText size={15}/>, color: 'bg-teal-600',   path: '/documents' },
    { label: 'Mon profil',          icon: <Users size={15}/>,    color: 'bg-gray-600',   path: '/profile' },
  ]
}

/* ─── Role-based KPI config ──────────────────────────────────────────────── */
function getRoleKpis(role: string, data: Record<string, number>) {
  const r = role.toLowerCase()
  if (r.includes('admin') || r.includes('super') || r.includes('direct')) return [
    { label: 'Clients actifs',    value: data.clients,     change: 8.5,  icon: <Users size={20}/>,      gradient: 'bg-gradient-to-br from-blue-600 to-blue-700' },
    { label: 'Revenus du mois',   value: data.revenue,     change: 12.3, icon: <TrendingUp size={20}/>, gradient: 'bg-gradient-to-br from-green-500 to-emerald-600', suffix: 'FC' },
    { label: 'Commandes actives', value: data.orders,      change: -2.1, icon: <ShoppingCart size={20}/>,gradient: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Employés actifs',   value: data.employees,   change: 3.2,  icon: <Users size={20}/>,      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600' },
    { label: 'Factures impayées', value: data.unpaid,      change: -15,  icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-red-500 to-rose-600' },
    { label: 'Alertes stock',     value: data.stock,       change: -8,   icon: <AlertTriangle size={20}/>,gradient:'bg-gradient-to-br from-yellow-500 to-amber-600'},
    { label: 'Productions actives',value: data.production, change: 5,    icon: <Printer size={20}/>,    gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
    { label: 'Projets IT actifs', value: data.itProjects,  change: 0,    icon: <Monitor size={20}/>,    gradient: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
  ]
  if (r.includes('comptable') || r.includes('caissier') || r.includes('finance')) return [
    { label: 'Revenus du mois',   value: data.revenue,    change: 12.3,  icon: <TrendingUp size={20}/>, gradient: 'bg-gradient-to-br from-green-500 to-emerald-600', suffix: 'FC' },
    { label: 'Dépenses du mois',  value: data.expenses,   change: -4.1,  icon: <Wallet size={20}/>,     gradient: 'bg-gradient-to-br from-red-500 to-rose-600', suffix: 'FC' },
    { label: 'Factures impayées', value: data.unpaid,     change: -15,   icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Paiements reçus',   value: data.paidInvoices,change: 8.5,  icon: <DollarSign size={20}/>, gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
  ]
  if (r.includes('imprimerie')) return [
    { label: 'Commandes en cours',value: data.printOrders,change: 5,     icon: <Printer size={20}/>,    gradient: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Productions actives',value:data.production, change: 3,     icon: <Activity size={20}/>,   gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: 'Machines actives',  value: data.machines,   change: 0,     icon: <Wrench size={20}/>,     gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Alertes consommables',value:data.stock,     change: -8,    icon: <AlertTriangle size={20}/>,gradient:'bg-gradient-to-br from-red-500 to-rose-600' },
  ]
  if (r.includes('graphiste') || r.includes('graphisme')) return [
    { label: 'Projets actifs',    value: data.graphicsProjects,change:5,  icon: <Palette size={20}/>,    gradient: 'bg-gradient-to-br from-violet-500 to-purple-600' },
    { label: 'Projets terminés',  value: data.graphicsDone,change: 12,    icon: <CheckCircle size={20}/>,gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'En révision',       value: data.graphicsReview,change: -2,  icon: <Timer size={20}/>,      gradient: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Documents créés',   value: data.documents,  change: 8,     icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
  ]
  if (r.includes('secrét') || r.includes('secretar')) return [
    { label: 'Documents traités', value: data.documents,  change: 5,     icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-pink-500 to-rose-600' },
    { label: 'Rendez-vous ce mois',value:data.events,     change: 3,     icon: <Calendar size={20}/>,   gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: 'Clients enregistrés',value:data.clients,    change: 8.5,   icon: <Users size={20}/>,      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600' },
    { label: 'Courriers sortants', value: data.courriers, change: -2,    icon: <ArrowRight size={20}/>, gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
  ]
  if (r.includes('développeur') || r.includes('developpeur') || r.includes('informatique')) return [
    { label: 'Projets actifs',    value: data.itProjects, change: 0,     icon: <Monitor size={20}/>,    gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
    { label: 'Tickets ouverts',   value: data.itTickets,  change: -5,    icon: <Headphones size={20}/>, gradient: 'bg-gradient-to-br from-orange-500 to-amber-600' },
    { label: 'Tâches en cours',   value: data.itTasks,    change: 3,     icon: <Activity size={20}/>,   gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
    { label: 'Résolus ce mois',   value: data.itResolved, change: 18,    icon: <CheckCircle size={20}/>,gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
  ]
  if (r.includes('formateur') || r.includes('formation')) return [
    { label: 'Formations actives',value: data.trainings,  change: 5,     icon: <GraduationCap size={20}/>,gradient:'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { label: 'Étudiants inscrits',value: data.students,   change: 12,    icon: <Users size={20}/>,      gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: 'Certificats émis',  value: data.certificates,change: 8,    icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
    { label: 'Sessions ce mois',  value: data.sessions,   change: 3,     icon: <Calendar size={20}/>,   gradient: 'bg-gradient-to-br from-purple-500 to-violet-600' },
  ]
  if (r.includes('technicien') || r.includes('maintenance')) return [
    { label: 'Interventions actives',value:data.maintenance,change:3,    icon: <Wrench size={20}/>,     gradient: 'bg-gradient-to-br from-yellow-500 to-amber-600' },
    { label: 'Machines surveillées',value:data.machines,   change: 0,    icon: <Activity size={20}/>,   gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: 'En panne',           value: data.machineDown,change: -10,  icon: <AlertTriangle size={20}/>,gradient:'bg-gradient-to-br from-red-500 to-rose-600' },
    { label: 'Stock pièces OK',    value: data.stockOk,    change: -2,   icon: <Package size={20}/>,    gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
  ]
  return [
    { label: 'Agenda événements', value: data.events,     change: 3,     icon: <Calendar size={20}/>,   gradient: 'bg-gradient-to-br from-blue-500 to-blue-600' },
    { label: 'Documents',         value: data.documents,  change: 5,     icon: <FileText size={20}/>,   gradient: 'bg-gradient-to-br from-purple-500 to-violet-600' },
    { label: 'Messages',          value: 7,               change: 2,     icon: <Headphones size={20}/>, gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600' },
    { label: 'Tâches du jour',    value: 4,               change: 0,     icon: <CheckCircle size={20}/>,gradient: 'bg-gradient-to-br from-green-500 to-emerald-600' },
  ]
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const now       = useLiveClock()

  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dateStr  = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const timeStr  = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)

  /* ── Profile from API + localStorage ────────────────────────────────────── */
  const [profilePhoto,     setProfilePhoto]     = useState<string | null>(user?.photo || null)
  const [displayFirstName, setDisplayFirstName] = useState(user?.firstName || 'Utilisateur')
  const [displayLastName,  setDisplayLastName]  = useState(user?.lastName  || '')

  useEffect(() => {
    if (user?.photo) setProfilePhoto(user.photo)
    if (user?.firstName) setDisplayFirstName(user.firstName)
    if (user?.lastName) setDisplayLastName(user.lastName)
  }, [user])

  /* ── KPI data from API ──────────────────────────────────────────────────── */
  const [stats, setStats] = useState({
    totalClients: 0,
    totalProducts: 0,
    totalInvoices: 0,
    totalOrders: 0,
    totalEmployees: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  })

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Try the dedicated dashboard endpoint first
        const { data: dash } = await api.get('/reports/dashboard')
        setStats(prev => ({
          ...prev,
          totalClients: dash.totalCustomers ?? prev.totalClients,
          totalOrders: dash.totalOrders ?? prev.totalOrders,
          totalInvoices: dash.totalInvoices ?? prev.totalInvoices,
          totalEmployees: dash.totalEmployees ?? prev.totalEmployees,
        }))

        // Fetch revenue/expense summary
        const { data: finSummary } = await api.get('/finance/dashboard/financial-summary').catch(() => ({ data: null }))
        if (finSummary) {
          setStats(prev => ({
            ...prev,
            totalRevenue: finSummary.totalRevenue ?? prev.totalRevenue,
            totalExpenses: finSummary.totalExpenses ?? prev.totalExpenses,
          }))
        }
      } catch {
        // Fallback: individual counts
        try {
          const [customers, products, invoices, orders, employees] = await Promise.allSettled([
            api.get('/customers'),
            api.get('/stock/products'),
            api.get('/commercial/invoices'),
            api.get('/commercial/orders'),
            api.get('/users'),
          ])

          const countOf = (r: PromiseSettledResult<any>): number =>
            r.status === 'fulfilled'
              ? (Array.isArray(r.value.data) ? r.value.data.length : r.value.data?.total ?? r.value.data?.items?.length ?? 0)
              : 0

          setStats(prev => ({
            ...prev,
            totalClients:   countOf(customers),
            totalProducts:  countOf(products),
            totalInvoices:  countOf(invoices),
            totalOrders:    countOf(orders),
            totalEmployees: countOf(employees),
          }))
        } catch (err) {
          console.error('Dashboard fetch error:', err)
        }
      }
    }
    fetchDashboard()
  }, [])

  /* ── KPI data from localStorage ─────────────────────────────────────────── */
  const kpiData = useMemo(() => {
    const clients        = readDB<any>('alba-clients')
    const employees      = readDB<any>('alba-employees')
    const orders         = readDB<any>('alba-commercial-orders')
    const invoices       = readDB<any>('alba-invoices')
    const production     = readDB<any>('alba-production')
    const itProjects     = readDB<any>('alba-it-projects')
    const itTickets      = readDB<any>('alba-it-tickets')
    const itTasks        = readDB<any>('alba-it-tasks')
    const consumables    = readDB<any>('alba-consumables')
    const graphics       = readDB<any>('alba-graphics')
    const trainings      = readDB<any>('alba-courses')
    const students       = readDB<any>('alba-students')
    const maintenance    = readDB<any>('alba-maintenance')
    const machines       = readDB<any>('alba-machines')
    const documents      = readDB<any>('alba-documents')
    const events         = readDB<any>('alba-events')
    const transactions   = readDB<any>('alba-cash-transactions')
    const printOrders    = readDB<any>('alba-print-orders')

    const income  = transactions.filter((t:any) => t.type === 'income').reduce((s:number,t:any) => s + (t.amount||0), 0)
    const expense = transactions.filter((t:any) => t.type === 'expense').reduce((s:number,t:any) => s + (t.amount||0), 0)

    return {
      clients:         stats.totalClients || clients.length     || 0,
      employees:       stats.totalEmployees || employees.filter((e:any) => e.status === 'active').length || 0,
      orders:          stats.totalOrders || orders.filter((o:any) => ['in_progress','confirmée','pending'].includes(o.status)).length || 0,
      revenue:         stats.totalRevenue || income              || 0,
      expenses:        stats.totalExpenses || expense             || 0,
      unpaid:          stats.totalInvoices > 0 ? Math.floor(stats.totalInvoices * 0.3) : invoices.filter((i:any) => i.balance > 0 || i.status === 'pending').length || 0,
      paidInvoices:    stats.totalInvoices > 0 ? Math.floor(stats.totalInvoices * 0.7) : invoices.filter((i:any) => i.status === 'paid').length || 0,
      production:      production.filter((j:any) => j.status !== 'termine').length || 7,
      itProjects:      itProjects.filter((p:any) => p.status === 'in_progress').length || 4,
      itTickets:       itTickets.filter((t:any) => t.status !== 'closed').length || 6,
      itTasks:         itTasks.filter((t:any) => t.status === 'in_progress').length || 8,
      itResolved:      itTickets.filter((t:any) => t.status === 'closed').length || 22,
      stock:           consumables.filter((c:any) => c.stock <= c.minStock).length || 3,
      stockOk:         consumables.filter((c:any) => c.stock > c.minStock).length || 24,
      graphicsProjects:graphics.filter((g:any) => g.status === 'in_progress').length || 5,
      graphicsDone:    graphics.filter((g:any) => g.status === 'completed').length || 12,
      graphicsReview:  graphics.filter((g:any) => g.status === 'review').length || 2,
      trainings:       trainings.filter((t:any) => t.status === 'active').length || 4,
      students:        students.length    || 87,
      certificates:    students.filter((s:any) => s.certified).length || 43,
      sessions:        events.length      || 12,
      maintenance:     maintenance.filter((m:any) => m.status === 'in_progress').length || 3,
      machines:        machines.length    || 8,
      machineDown:     machines.filter((m:any) => m.status === 'panne').length || 1,
      printOrders:     printOrders?.filter((o:any) => o.status !== 'livré').length || 8,
      documents:       documents.length   || 34,
      events:          events.length      || 12,
      courriers:       documents.filter((d:any) => d.type === 'courrier').length || 7,
    }
  }, [stats])

  /* ── Recent orders ─────────────────────────────────────────────────────── */
  const recentOrders = useMemo(() => {
    const all = readDB<any>('alba-commercial-orders')
    if (all.length === 0) return mockRecentOrders
    return all
      .sort((a:any,b:any) => new Date(b.createdAt||b.date||0).getTime() - new Date(a.createdAt||a.date||0).getTime())
      .slice(0,5)
      .map((o:any) => ({
        id: o.orderNumber || o.id,
        client: o.client?.name || o.client || o.clientName || 'Client',
        service: o.service || o.serviceType || 'Service',
        status: ({ in_progress:'En cours', confirmée:'Confirmé', completed:'Terminé', cancelled:'Annulé', pending:'En attente' } as any)[o.status] || o.status || 'En attente',
        amount: o.total || o.amount || 0,
        date: o.createdAt || o.date || '',
      }))
  }, [])

  /* ── Stock alerts ──────────────────────────────────────────────────────── */
  const stockAlerts = useMemo(() => {
    const c = readDB<any>('alba-consumables')
    if (c.length === 0) return mockStockAlerts
    return c.filter((x:any) => x.stock <= x.minStock).map((x:any) => ({
      product: x.name || 'Produit', current: x.stock || 0, minimum: x.minStock || 0, unit: x.unit || 'Pcs'
    }))
  }, [])

  const role       = user?.role?.name || 'Utilisateur'
  const kpis       = getRoleKpis(role, kpiData)
  const quickActions = getQuickActions(role)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50/20">
      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">

        {/* ═══ HERO BANNER ═════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0F1F5C 0%, #1E3A8A 45%, #1D4ED8 100%)' }}>

          {/* Decorative blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-indigo-400/10 blur-2xl translate-y-1/2" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-stretch gap-0">

            {/* ── Left: Profile ── */}
            <div className="flex items-center gap-6 p-7 lg:border-r border-white/10 flex-shrink-0">
              {/* Big avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-2xl ring-4 ring-white/20 shadow-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Profil" className="w-full h-full object-cover" />
                    : <span className="text-white text-3xl font-bold">
                        {displayFirstName?.[0]?.toUpperCase()}{displayLastName?.[0]?.toUpperCase()}
                      </span>
                  }
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white shadow-md" />
              </div>

              {/* Name + role */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                    <img src="/alba-logo.png" alt="ALBA" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-white/50 text-[10px] font-medium tracking-widest uppercase">ALBA SERVICE GROUP</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none">
                  {greeting},
                </h1>
                <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {displayFirstName} {displayLastName}
                </h2>
                <div className="flex items-center flex-wrap gap-2 mt-3">
                  <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
                    {role}
                  </span>
                  {user?.department && (
                    <span className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full border border-white/20">
                      {user.department}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Center: Date + Clock ── */}
            <div className="flex flex-col justify-center px-8 py-6 flex-1">
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">
                {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
              </p>
              {/* Big live clock */}
              <div className="font-mono text-5xl lg:text-6xl font-black text-white tracking-wider tabular-nums leading-none">
                {timeStr}
              </div>
              <div className="flex items-center gap-2 mt-3 text-white/40 text-xs">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span>Kindu, Province du Maniema — RDC</span>
              </div>
            </div>

            {/* ── Right: Quick actions ── */}
            <div className="px-6 py-6 flex flex-col justify-center flex-shrink-0">
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest mb-3">Actions rapides</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((a, i) => (
                  <button key={i} onClick={() => navigate(a.path)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all ${a.color}`}>
                    {a.icon}
                    <span className="truncate">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ KPI CARDS (role-based) ══════════════════════════════════════ */}
        <div className={`grid gap-4 ${kpis.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-8'}`}>
          {kpis.map((k, i) => (
            <KpiCard key={i} label={k.label} value={k.value} change={k.change}
              icon={k.icon} gradient={k.gradient} suffix={(k as any).suffix} />
          ))}
        </div>

        {/* ═══ CHARTS SECTION ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue area chart */}
          <Card title="Revenus vs Dépenses vs Bénéfices" subtitle="Comparaison mensuelle sur 7 mois" className="lg:col-span-2"
            action={
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50 focus:outline-none">
                <option>7 derniers mois</option><option>Cette année</option>
              </select>
            }>
            <div className="p-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label:'Total revenus', value: revenueData.reduce((s,d)=>s+d.revenus,0), color:'text-blue-600', bg:'bg-blue-50' },
                  { label:'Total dépenses', value: revenueData.reduce((s,d)=>s+d.depenses,0), color:'text-red-600', bg:'bg-red-50' },
                  { label:'Bénéfice net', value: revenueData.reduce((s,d)=>s+d.benefice,0), color:'text-green-600', bg:'bg-green-50' },
                ].map((s,i) => (
                  <div key={i} className={`${s.bg} rounded-xl p-3 text-center`}>
                    <p className={`text-sm font-black ${s.color}`}>{formatCurrency(s.value)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    {[['rev','#2563EB'],['dep','#EF4444'],['ben','#22C55E']].map(([id,c]) => (
                      <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.18}/>
                        <stop offset="100%" stopColor={c} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} dy={6}/>
                  <YAxis tick={{ fontSize:10, fill:'#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'11px', paddingTop:'8px' }}/>
                  <Area type="monotone" dataKey="revenus"  name="Revenus"  stroke="#2563EB" strokeWidth={2.5} fill="url(#g-rev)" dot={false} activeDot={{ r:5, fill:'#2563EB', stroke:'#fff', strokeWidth:2 }}/>
                  <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#EF4444" strokeWidth={2}   fill="url(#g-dep)" dot={false} activeDot={{ r:4, fill:'#EF4444', stroke:'#fff', strokeWidth:2 }}/>
                  <Area type="monotone" dataKey="benefice" name="Bénéfice" stroke="#22C55E" strokeWidth={2}   fill="url(#g-ben)" dot={false} activeDot={{ r:4, fill:'#22C55E', stroke:'#fff', strokeWidth:2 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Donut chart */}
          <Card title="Ventes par service" subtitle="Répartition ce mois">
            <div className="p-5">
              <div className="relative mb-4">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={serviceData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                      {serviceData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v:any) => `${v}%`}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-800">100%</p>
                    <p className="text-[10px] text-gray-400">Total</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {serviceData.map((s,i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:s.color}}/>
                      <span className="text-xs text-gray-600">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${s.value}%`,background:s.color}}/>
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{s.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ Second charts row ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Print jobs bar chart */}
          <Card title="Production Imprimerie" subtitle="Commandes par jour cette semaine">
            <div className="p-5">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={printJobsData} margin={{top:5,right:5,left:-15,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:'11px'}}/>
                  <Bar dataKey="commandes" name="Commandes" fill="#2563EB" radius={[4,4,0,0]}/>
                  <Bar dataKey="termines"  name="Terminés"  fill="#22C55E" radius={[4,4,0,0]}/>
                  <Bar dataKey="annules"   name="Annulés"   fill="#EF4444" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* IT tickets area */}
          <Card title="Tickets IT par semaine" subtitle="Ouvert / Résolu / En cours">
            <div className="p-5">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={itTicketsData} margin={{top:5,right:5,left:-15,bottom:0}}>
                  <defs>
                    {[['o','#F59E0B'],['r','#22C55E'],['c','#2563EB']].map(([id,col]) => (
                      <linearGradient key={id} id={`it-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={col} stopOpacity={0.2}/>
                        <stop offset="100%" stopColor={col} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                  <XAxis dataKey="week" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:'11px'}}/>
                  <Area type="monotone" dataKey="ouvert"  name="Ouvert"   stroke="#F59E0B" strokeWidth={2} fill="url(#it-o)" dot={false}/>
                  <Area type="monotone" dataKey="resolu"  name="Résolu"   stroke="#22C55E" strokeWidth={2} fill="url(#it-r)" dot={false}/>
                  <Area type="monotone" dataKey="enCours" name="En cours" stroke="#2563EB" strokeWidth={2} fill="url(#it-c)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ═══ Bottom row ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent orders */}
          <Card title="Commandes récentes" subtitle="5 dernières commandes" className="lg:col-span-2"
            action={
              <button onClick={() => navigate('/commercial/orders')}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700">
                Voir tout <ArrowRight size={12}/>
              </button>
            }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    {['Réf.','Client','Service','Statut','Montant'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((o, i) => (
                    <tr key={i} className="hover:bg-blue-50/20 transition-colors cursor-pointer group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">#{o.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <AvatarCircle photo={null} name={o.client} size={28}/>
                          <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">{o.client}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{o.service}</td>
                      <td className="px-4 py-3.5"><StatusBadge label={o.status}/></td>
                      <td className="px-4 py-3.5 text-xs font-bold text-gray-800">{formatCurrency(o.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Right column: stock + activity */}
          <div className="space-y-5">

            {/* Stock alerts */}
            <Card title="Alertes stock" subtitle={`${stockAlerts.length} article(s) en rupture`}
              action={<span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{stockAlerts.length}</span>}>
              <div className="divide-y divide-gray-50">
                {stockAlerts.slice(0,3).map((a,i) => {
                  const ratio = Math.min((a.current / Math.max(a.minimum,1)) * 100, 100)
                  const crit  = ratio < 30
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {crit && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/></span>}
                          <span className="text-xs font-medium text-gray-700">{a.product}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${crit?'text-red-600':'text-amber-600'}`}>{a.current}/{a.minimum} {a.unit}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${crit?'bg-red-500':ratio<60?'bg-amber-400':'bg-green-500'}`} style={{width:`${ratio}%`}}/>
                      </div>
                    </div>
                  )
                })}
                {stockAlerts.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">Aucune alerte de stock ✓</div>
                )}
              </div>
            </Card>

            {/* Activity feed */}
            <Card title="Activités récentes" subtitle="Dernières actions">
              <div className="relative px-4 py-2">
                <div className="absolute left-[26px] top-3 bottom-3 w-px bg-gray-100"/>
                <div className="space-y-0.5">
                  {mockActivity.map((a,i) => (
                    <div key={i} className="relative flex items-start gap-3 py-2.5">
                      <div className="relative z-10 flex-shrink-0">
                        <AvatarCircle photo={null} name={a.user} size={28}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">
                          <span className="font-semibold text-gray-800">{a.user}</span>{' '}
                          <span className="text-gray-500">{a.action}</span>{' '}
                          <span className="font-semibold text-blue-600">{a.target}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  )
}
