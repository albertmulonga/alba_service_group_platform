import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { api } from '@/services/api'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  CalendarDays, Plus, Search, Filter,
  CheckCircle, XCircle, Clock, Eye, X, Save,
  Calendar, Users, AlertTriangle, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle
} from 'lucide-react'

type LeaveType = 'Congé annuel' | 'Congé maladie' | 'Congé maternité' | 'Congé sans solde' | 'Congé exceptionnel'
type LeaveStatus = 'En attente' | 'Approuvé' | 'Refusé' | 'Annulé'

type LeaveRequest = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  createdAt: string
  approvedBy?: string
}

type LeaveBalance = {
  employeeId: string
  employeeName: string
  department: string
  annualTotal: number
  annualTaken: number
  sickTaken: number
  otherTaken: number
}

const LEAVE_TYPES: { name: LeaveType; maxDays: number; color: string }[] = [
  { name: 'Congé annuel', maxDays: 30, color: 'bg-blue-50 text-blue-700' },
  { name: 'Congé maladie', maxDays: 15, color: 'bg-red-50 text-red-700' },
  { name: 'Congé maternité', maxDays: 90, color: 'bg-pink-50 text-pink-700' },
  { name: 'Congé sans solde', maxDays: 30, color: 'bg-gray-100 text-gray-600' },
  { name: 'Congé exceptionnel', maxDays: 5, color: 'bg-purple-50 text-purple-700' },
]

const employees: { id: string; name: string; dept: string }[] = []

const mockLeaves: LeaveRequest[] = [
  { id: '1', employeeId: '4', employeeName: 'Sophie Banza', department: 'Secrétariat', type: 'Congé annuel', startDate: '2026-08-10', endDate: '2026-08-22', days: 10, reason: 'Congé familial annuel', status: 'Approuvé', createdAt: '2026-08-01', approvedBy: 'Directeur' },
  { id: '2', employeeId: '1', employeeName: 'Jean Mukendi', department: 'Imprimerie', type: 'Congé maladie', startDate: '2026-08-18', endDate: '2026-08-20', days: 3, reason: 'Arrêt médical', status: 'Approuvé', createdAt: '2026-08-17', approvedBy: 'DRH' },
  { id: '3', employeeId: '2', employeeName: 'Marie Kabange', department: 'Graphisme', type: 'Congé annuel', startDate: '2026-08-25', endDate: '2026-08-29', days: 5, reason: 'Voyage personnel', status: 'En attente', createdAt: '2026-08-15' },
  { id: '4', employeeId: '3', employeeName: 'Paul Ilunga', department: 'Informatique', type: 'Congé exceptionnel', startDate: '2026-08-21', endDate: '2026-08-22', days: 2, reason: 'Événement familial', status: 'En attente', createdAt: '2026-08-18' },
  { id: '5', employeeId: '5', employeeName: 'Pierre Mutombo', department: 'Finance', type: 'Congé annuel', startDate: '2026-07-01', endDate: '2026-07-15', days: 11, reason: 'Congé annuel planifié', status: 'Approuvé', createdAt: '2026-06-20', approvedBy: 'Directeur' },
  { id: '6', employeeId: '6', employeeName: 'Grace Tshiamba', department: 'Formation', type: 'Congé sans solde', startDate: '2026-09-01', endDate: '2026-09-10', days: 8, reason: 'Formation personnelle', status: 'Refusé', createdAt: '2026-08-10' },
]

const mockBalances: LeaveBalance[] = [
  { employeeId: '1', employeeName: 'Jean Mukendi', department: 'Imprimerie', annualTotal: 30, annualTaken: 12, sickTaken: 3, otherTaken: 0 },
  { employeeId: '2', employeeName: 'Marie Kabange', department: 'Graphisme', annualTotal: 30, annualTaken: 8, sickTaken: 0, otherTaken: 0 },
  { employeeId: '3', employeeName: 'Paul Ilunga', department: 'Informatique', annualTotal: 30, annualTaken: 5, sickTaken: 2, otherTaken: 0 },
  { employeeId: '4', employeeName: 'Sophie Banza', department: 'Secrétariat', annualTotal: 30, annualTaken: 20, sickTaken: 0, otherTaken: 0 },
  { employeeId: '5', employeeName: 'Pierre Mutombo', department: 'Finance', annualTotal: 30, annualTaken: 22, sickTaken: 0, otherTaken: 0 },
  { employeeId: '6', employeeName: 'Grace Tshiamba', department: 'Formation', annualTotal: 30, annualTaken: 3, sickTaken: 0, otherTaken: 8 },
]

const statusColors: Record<LeaveStatus, string> = {
  'En attente': 'bg-amber-50 text-amber-700',
  'Approuvé': 'bg-green-50 text-green-700',
  'Refusé': 'bg-red-50 text-red-700',
  'Annulé': 'bg-gray-100 text-gray-500',
}

const typeColors: Record<string, string> = {
  'Congé annuel': 'bg-blue-50 text-blue-700',
  'Congé maladie': 'bg-red-50 text-red-700',
  'Congé maternité': 'bg-pink-50 text-pink-700',
  'Congé sans solde': 'bg-gray-100 text-gray-600',
  'Congé exceptionnel': 'bg-purple-50 text-purple-700',
}

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 0
}

function getMonthDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function generateCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = getMonthDays(year, month)
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function mapLeave(raw: any): LeaveRequest {
  return {
    id: raw.id,
    employeeId: raw.employeeId || '',
    employeeName: raw.employee
      ? `${raw.employee.firstName || ''} ${raw.employee.lastName || ''}`.trim()
      : (raw.employeeName || ''),
    department: raw.employee?.department?.name || raw.department || '',
    type: raw.type as LeaveType || 'Congé annuel',
    startDate: raw.startDate || '',
    endDate: raw.endDate || '',
    days: raw.days || Math.max(1, Math.round((new Date(raw.endDate).getTime() - new Date(raw.startDate).getTime()) / 86400000)),
    reason: raw.reason || '',
    status: (raw.status || 'PENDING').toLowerCase() === 'pending' ? 'En attente'
      : (raw.status || '').toLowerCase() === 'approved' ? 'Approuvé'
      : (raw.status || '').toLowerCase() === 'rejected' ? 'Refusé' : 'Annulé',
    createdAt: raw.createdAt || '',
    approvedBy: raw.approvedBy || '',
  } as LeaveRequest
}

export default function LeavePage() {
  const { items: leaves, add, update, remove, loading, error, refresh } = useApiDB<LeaveRequest>('/hr/leaves', [], mapLeave)
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; dept: string }[]>([])
  const [balances] = useState<LeaveBalance[]>([])

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get('/users')
        const list = Array.isArray(data) ? data : data.data || data.items || []
        setEmployeeList(list.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          dept: typeof u.department === 'object' ? u.department?.name || '' : u.department || '',
        })))
      } catch { setEmployeeList([]) }
    }
    fetchEmployees()
  }, [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<LeaveRequest | null>(null)
  const [showBalance, setShowBalance] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  const [form, setForm] = useState({
    employeeId: '',
    type: 'Congé annuel' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
  })

  const filtered = leaves.filter(l => {
    const ms = `${l.employeeName} ${l.type} ${l.reason} ${l.department}`.toLowerCase()
    const matchSearch = ms.includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchType = typeFilter === 'all' || l.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const pendingCount = leaves.filter(l => l.status === 'En attente').length
  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const ongoingCount = leaves.filter(l =>
    l.status === 'Approuvé' && l.startDate <= today && l.endDate >= today
  ).length
  const avgDays = leaves.length > 0 ? (leaves.reduce((s, l) => s + l.days, 0) / leaves.length).toFixed(1) : '0'

  const calDays = generateCalendar(calYear, calMonth)

  const isOnLeave = (empId: string, day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaves.some(l =>
      l.employeeId === empId && l.status === 'Approuvé' && l.startDate <= dateStr && l.endDate >= dateStr
    )
  }

  const openCreateModal = () => {
    setForm({ employeeId: '', type: 'Congé annuel', startDate: '', endDate: '', reason: '' })
    setShowModal(true)
  }

  const handleCreate = () => {
    if (!form.employeeId || !form.startDate || !form.endDate || !form.reason.trim()) {
      alert('Veuillez remplir tous les champs')
      return
    }
    const emp = employeeList.find(e => e.id === form.employeeId)
    if (!emp) return
    const days = calcDays(form.startDate, form.endDate)
    add({
      employeeId: form.employeeId,
      employeeName: emp.name,
      department: emp.dept,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      days,
      reason: form.reason,
      status: 'En attente',
      createdAt: today,
    })
    setShowModal(false)
  }

  const handleApprove = (id: string) => {
    update(id, { status: 'Approuvé', approvedBy: 'DRH' })
    setShowDetail(null)
  }

  const handleReject = (id: string) => {
    update(id, { status: 'Refusé', approvedBy: 'DRH' })
    setShowDetail(null)
  }

  const handleCancel = (id: string) => {
    update(id, { status: 'Annulé' })
    setShowDetail(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Congés"
        subtitle={`${leaves.length} demandes enregistrées`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'RH' }, { label: 'Congés' }]}
        icon={<CalendarDays size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map(l => ({
                Employé: l.employeeName, Département: l.department, Type: l.type,
                'Date début': l.startDate, 'Date fin': l.endDate, Jours: l.days,
                Motif: l.reason, Statut: l.status, 'Créé le': l.createdAt,
              }))}
              filename="conges-alba"
              title="Liste des Congés — ALBA SERVICE GROUP"
            />
            <button onClick={() => setShowBalance(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${showBalance ? 'bg-green-50 border-green-300 text-green-700' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}>
              <Users size={15} /> Solde congés
            </button>
            <button onClick={() => setShowCalendar(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${showCalendar ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}>
              <Calendar size={15} /> Calendrier
            </button>
            <button onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
              <Plus size={15} /> Nouvelle demande
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Demandes en attente" value={String(pendingCount)} icon={<Clock size={20} />} gradient="gradient-warning" change={-10} />
        <KpiCard title="Congés en cours ce mois" value={String(ongoingCount)} icon={<AlertTriangle size={20} />} gradient="gradient-primary" />
        <KpiCard title="Jours moyens / employé" value={`${avgDays}j`} icon={<CalendarDays size={20} />} gradient="gradient-success" />
        <KpiCard title="Total demandes" value={String(leaves.length)} icon={<Users size={20} />} gradient="gradient-purple" change={15} />
      </div>

      {/* Balance View */}
      {showBalance && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800">Solde de congés par employé</h3>
            <button onClick={() => setShowBalance(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Employé', 'Département', 'Congé annuel', 'Restants', 'Maladie pris', 'Autre pris'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {balances.map(b => (
                  <tr key={b.employeeId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                          {getInitials(b.employeeName)}
                        </div>
                        <span className="font-medium text-gray-800 text-xs">{b.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.department}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{b.annualTaken} / {b.annualTotal} jours</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${((b.annualTotal - b.annualTaken) / b.annualTotal) * 100}%`,
                              background: ((b.annualTotal - b.annualTaken) / b.annualTotal) > 0.3 ? '#16A34A' : '#F59E0B'
                            }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{b.annualTotal - b.annualTaken}j</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{b.sickTaken} jours</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{b.otherTaken} jours</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Calendar View */}
      {showCalendar && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={16} /></button>
              <h3 className="text-sm font-bold text-gray-800 min-w-[160px] text-center">
                {new Date(calYear, calMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={16} /></button>
            </div>
            <button onClick={() => setShowCalendar(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="bg-gray-50 text-center text-[10px] font-semibold text-gray-500 py-2">{d}</div>
            ))}
            {calDays.map((day, i) => (
              <div key={i} className={`bg-white min-h-[80px] p-1.5 ${day ? '' : 'bg-gray-50/50'}`}>
                {day && (
                  <>
                    <span className="text-xs font-semibold text-gray-600">{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {employeeList.filter(e => isOnLeave(e.id, day)).slice(0, 3).map(e => (
                        <div key={e.id} className="text-[9px] font-medium px-1 py-0.5 rounded bg-blue-100 text-blue-700 truncate">
                          {e.name.split(' ')[0]}
                        </div>
                      ))}
                      {employeeList.filter(e => isOnLeave(e.id, day)).length > 3 && (
                        <div className="text-[9px] text-gray-400">+{employeeList.filter(e => isOnLeave(e.id, day)).length - 3}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employé, type, motif..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Approuvé">Approuvé</option>
            <option value="Refusé">Refusé</option>
            <option value="Annulé">Annulé</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les types</option>
            {LEAVE_TYPES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employé', 'Type', 'Date début', 'Date fin', 'Jours', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(leave => (
                <tr key={leave.id} className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                  onClick={() => setShowDetail(leave)}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                        {getInitials(leave.employeeName)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{leave.employeeName}</p>
                        <p className="text-gray-400 text-[10px]">{leave.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeColors[leave.type] || 'bg-gray-100 text-gray-600'}`}>
                      {leave.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{formatDate(leave.startDate)}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{formatDate(leave.endDate)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-bold text-gray-800">{leave.days}</span>
                    <span className="text-xs text-gray-400 ml-0.5">j</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={leave.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setShowDetail(leave) }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={13} /></button>
                      {leave.status === 'En attente' && (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleApprove(leave.id) }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><CheckCircle size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); handleReject(leave.id) }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><XCircle size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucune demande de congé trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
            pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                  <CalendarDays size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Détail de la demande</h3>
                  <p className="text-[10px] text-gray-400">Réf: {showDetail.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                  {getInitials(showDetail.employeeName)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{showDetail.employeeName}</h4>
                  <p className="text-xs text-gray-500">{showDetail.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Type</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{showDetail.type}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Statut</p>
                  <div className="mt-1"><StatusBadge label={showDetail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Date début</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{formatDate(showDetail.startDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Date fin</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{formatDate(showDetail.endDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Durée</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">{showDetail.days} jour{showDetail.days > 1 ? 's' : ''}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Demandé le</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{formatDate(showDetail.createdAt)}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] text-gray-400 uppercase font-medium mb-1">Motif</p>
                <p className="text-sm text-gray-700">{showDetail.reason}</p>
              </div>
              {showDetail.approvedBy && (
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] text-green-600 uppercase font-medium">Traité par</p>
                  <p className="text-xs font-bold text-green-700 mt-0.5">{showDetail.approvedBy}</p>
                </div>
              )}
              {showDetail.status === 'En attente' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleApprove(showDetail.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-white rounded-xl font-medium"
                    style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                    <CheckCircle size={15} /> Approuver
                  </button>
                  <button onClick={() => handleReject(showDetail.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm text-white bg-red-500 rounded-xl font-medium hover:bg-red-600 transition-colors">
                    <XCircle size={15} /> Refuser
                  </button>
                </div>
              )}
              {showDetail.status === 'Approuvé' && (
                <button onClick={() => handleCancel(showDetail.id)}
                  className="w-full py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  Annuler cette demande
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                  <CalendarDays size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Nouvelle demande de congé</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employé *</label>
                <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                  <option value="">— Sélectionner un employé —</option>
                  {employeeList.map(e => <option key={e.id} value={e.id}>{e.name} ({e.dept || 'Sans département'})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de congé *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as LeaveType })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                  {LEAVE_TYPES.map(t => <option key={t.name} value={t.name}>{t.name} (max {t.maxDays}j)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                </div>
              </div>
              {form.startDate && form.endDate && (
                <div className="bg-blue-50 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
                  Durée: {calcDays(form.startDate, form.endDate)} jour{calcDays(form.startDate, form.endDate) > 1 ? 's' : ''}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motif / Justification *</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Décrivez le motif de votre demande..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                <Save size={13} /> Soumettre la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
