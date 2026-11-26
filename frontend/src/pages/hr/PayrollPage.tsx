import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import AvatarCircle from '@/components/ui/AvatarCircle'
import { api } from '@/services/api'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  DollarSign, Plus, Search, Filter,
  Eye, X, Save, FileText, CheckCircle,
  Calculator, TrendingUp, Users, Printer,
  Settings, Percent, Pencil, Clock
} from 'lucide-react'

type PayrollStatus = 'DRAFT' | 'VALIDATED' | 'PAID'

type Employee = {
  id: string
  firstName: string
  lastName: string
  code: string
  department: string
  role: string
  salary: number
  photo: string | null
}

type SalaryRecord = {
  id: string
  employeeId: string
  employee?: Employee
  baseAmount: number
  bonuses: number
  deductions: number
  netAmount: number
  month: number
  year: number
  paid: boolean
  paidAt?: string
  notes?: string
}

type EnrichedSalary = SalaryRecord & {
  employeeName: string
  matricule: string
  department: string
  baseSalary: number
  prime: number
  bonus: number
  deductions: number
  netPay: number
  status: PayrollStatus
  photo: string | null
}

const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

const monthNames = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const formatMonthLabel = (m: number, y: number) => `${monthNames[m]} ${y}`

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaries, setSalaries] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [monthFilter, setMonthFilter] = useState(currentMonth)
  const [yearFilter, setYearFilter] = useState(currentYear)
  const [showPayslip, setShowPayslip] = useState<EnrichedSalary | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState<EnrichedSalary | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('Espèces')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showSalaryConfig, setShowSalaryConfig] = useState<Employee | null>(null)
  const [salaryForm, setSalaryForm] = useState({ baseSalary: 0, percentage: 0, usePercentage: false })

  const fetchEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/users')
      const list = Array.isArray(data) ? data : data.data || data.items || []
      const saved = JSON.parse(localStorage.getItem('alba-salaries') || '{}')
      const mapped: Employee[] = list.map((u: any) => ({
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        code: u.id.slice(-8).toUpperCase(),
        department: typeof u.department === 'object' ? u.department?.name || '' : u.department || '',
        role: typeof u.roles === 'object' && Array.isArray(u.roles)
          ? (u.roles[0]?.role?.name || u.roles[0]?.name || '')
          : (typeof u.role === 'object' ? u.role?.name || '' : u.role || ''),
        salary: saved[u.id] || 0,
        photo: u.photo || null,
      }))
      setEmployees(mapped)
    } catch {
      setEmployees([])
    }
  }, [])

  const fetchSalaries = useCallback(async () => {
    try {
      const { data } = await api.get(`/hr/salaries?limit=9999&month=${monthFilter}&year=${yearFilter}`)
      const list = Array.isArray(data) ? data : data.data || []
      setSalaries(list)
    } catch {
      setSalaries([])
    }
  }, [monthFilter, yearFilter])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchSalaries()]).finally(() => setLoading(false))
  }, [fetchEmployees, fetchSalaries])

  const getEmployeeName = (emp: Employee) => `${emp.firstName} ${emp.lastName}`
  const getDepartmentName = (emp: Employee) => emp.department || ''
  const getEmployeeSalary = (emp: Employee): number => emp.salary

  const enrichedPayroll: EnrichedSalary[] = salaries.map(s => {
    const emp = s.employee || employees.find(e => e.id === s.employeeId)
    return {
      ...s,
      employeeName: emp ? getEmployeeName(emp) : 'Inconnu',
      matricule: emp?.code || '',
      department: emp ? getDepartmentName(emp) : '',
      baseSalary: Number(s.baseAmount),
      prime: 0,
      bonus: Number(s.bonuses),
      deductions: Number(s.deductions),
      netPay: Number(s.netAmount),
      status: s.paid ? 'PAID' as PayrollStatus : (Number(s.baseAmount) > 0 ? 'VALIDATED' as PayrollStatus : 'DRAFT' as PayrollStatus),
      photo: (emp as any)?.photo || null,
    }
  })

  const filtered: EnrichedSalary[] = enrichedPayroll.filter(p => {
    const ms = `${p.employeeName} ${p.matricule} ${p.department}`.toLowerCase()
    const matchSearch = ms.includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const monthPayroll: EnrichedSalary[] = enrichedPayroll
  const totalGross = monthPayroll.reduce((s, p) => s + p.baseSalary + p.bonus, 0)
  const totalDeductions = monthPayroll.reduce((s, p) => s + p.deductions, 0)
  const totalNet = monthPayroll.reduce((s, p) => s + p.netPay, 0)
  const paidCount = monthPayroll.filter(p => p.paid).length

  const handleGenerate = async () => {
    const existing = monthPayroll
    if (existing.length > 0) {
      if (!confirm(`La paie de ${formatMonthLabel(monthFilter, yearFilter)} existe déjà (${existing.length} lignes). Voulez-vous la régénérer ?`)) return
    }

    try {
      setLoading(true)
      const activeEmployees = employees.filter(e => e.salary > 0)
      if (activeEmployees.length === 0) {
        alert('Veuillez d\'abord configurer le salaire pour au moins un employé.')
        setLoading(false)
        return
      }
      for (const emp of activeEmployees) {
        const baseSalary = getEmployeeSalary(emp)
        if (baseSalary <= 0) continue
        const cnss = Math.round(baseSalary * 0.05)
        const ipr = Math.round(baseSalary * 0.03)
        const totalDeductions = cnss + ipr
        await api.post('/hr/salaries', {
          employeeId: emp.id,
          baseAmount: baseSalary,
          bonuses: 0,
          deductions: totalDeductions,
          month: monthFilter,
          year: yearFilter,
          notes: 'Généré automatiquement',
        })
      }
      await fetchSalaries()
      setShowGenerateModal(false)
    } catch (err: any) {
      alert('Erreur lors de la génération: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async (id: string) => {
    try {
      await api.post(`/hr/salaries/${id}/pay`)
      await fetchSalaries()
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  const openPaymentModal = (entry: EnrichedSalary) => {
    setShowPaymentModal(entry)
    setPaymentAmount(entry.netPay)
    setPaymentMethod('Espèces')
    setPaymentNotes('')
  }

  const confirmPayment = async () => {
    if (!showPaymentModal) return
    if (paymentAmount <= 0) { alert('Le montant doit être supérieur à 0'); return }
    try {
      setLoading(true)
      await api.put(`/hr/salaries/${showPaymentModal.id}`, {
        baseAmount: showPaymentModal.baseSalary,
        notes: `Payé ${formatCurrency(paymentAmount)} via ${paymentMethod}. ${paymentNotes}`.trim(),
      })
      await api.post(`/hr/salaries/${showPaymentModal.id}/pay`)
      await fetchSalaries()
      setShowPaymentModal(null)
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handlePayAll = async () => {
    if (!confirm('Marquer comme payés tous les bulletins validés de ce mois ?')) return
    const validated = monthPayroll.filter(p => !p.paid && p.status === 'VALIDATED')
    for (const v of validated) {
      try { await api.post(`/hr/salaries/${v.id}/pay`) } catch {}
    }
    await fetchSalaries()
  }

  const handleSaveSalaryConfig = async () => {
    if (!showSalaryConfig) return
    try {
      setLoading(true)
      setEmployees(prev => prev.map(e =>
        e.id === showSalaryConfig.id ? { ...e, salary: salaryForm.baseSalary } : e
      ))
      const saved = JSON.parse(localStorage.getItem('alba-salaries') || '{}')
      saved[showSalaryConfig.id] = salaryForm.baseSalary
      localStorage.setItem('alba-salaries', JSON.stringify(saved))
      setShowSalaryConfig(null)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAmount = async (record: EnrichedSalary, newAmount: number) => {
    try {
      await api.put(`/hr/salaries/${record.id}`, {
        baseAmount: newAmount,
      })
      await fetchSalaries()
    } catch (err: any) {
      alert('Erreur: ' + (err.response?.data?.message || err.message))
    }
  }

  const availableMonths = [...new Set(salaries.map(s => `${s.year}-${s.month}`))].sort().reverse()

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion de la Paie"
        subtitle={`${monthPayroll.length} bulletins — ${formatMonthLabel(monthFilter, yearFilter)}`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'RH' }, { label: 'Paie' }]}
        icon={<DollarSign size={22} />}
        iconBg="gradient-success"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map(p => ({
                Matricule: p.matricule, Employé: p.employeeName, Département: p.department,
                'Salaire de base': p.baseSalary, Bonus: p.bonus,
                Déductions: p.deductions, 'Net à payer': p.netPay,
                Statut: p.paid ? 'Payé' : 'En attente',
              }))}
              filename={`paie-${yearFilter}-${String(monthFilter).padStart(2, '0')}-alba`}
              title={`Bulletin de paie ${formatMonthLabel(monthFilter, yearFilter)} — ALBA SERVICE GROUP`}
            />
            {monthPayroll.some(p => !p.paid && p.status === 'VALIDATED') && (
              <button onClick={handlePayAll}
                className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 border border-green-200 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                <DollarSign size={15} /> Payer tout
              </button>
            )}
            <button onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
              <Calculator size={15} /> Générer la paie
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-sm text-gray-500">Chargement...</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">⚠ {error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Masse salariale" value={`${(totalGross / 1_000_000).toFixed(1)}M`} icon={<TrendingUp size={20} />} gradient="gradient-primary" />
        <KpiCard title="Charges sociales" value={`${(totalDeductions / 1_000_000).toFixed(1)}M`} icon={<Filter size={20} />} gradient="gradient-warning" />
        <KpiCard title="Net total à payer" value={`${(totalNet / 1_000_000).toFixed(1)}M`} icon={<DollarSign size={20} />} gradient="gradient-success" />
        <KpiCard title="Bulletins" value={`${paidCount}/${monthPayroll.length}`} icon={<Users size={20} />} gradient="gradient-purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employé, matricule..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            {monthNames.slice(1).map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="VALIDATED">Validé</option>
            <option value="PAID">Payé</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Masse salariale totale</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(totalGross)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Salaires de base</span><span className="font-medium text-gray-700">{formatCurrency(monthPayroll.reduce((s, p) => s + p.baseSalary, 0))}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Bonus</span><span className="font-medium text-gray-700">{formatCurrency(monthPayroll.reduce((s, p) => s + p.bonus, 0))}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50">
              <Filter size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Charges sociales</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalDeductions)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">CNSS (5%)</span><span className="font-medium text-gray-700">{formatCurrency(monthPayroll.reduce((s, p) => s + Math.round(p.baseSalary * 0.05), 0))}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">IPR (3%)</span><span className="font-medium text-gray-700">{formatCurrency(monthPayroll.reduce((s, p) => s + Math.round(p.baseSalary * 0.03), 0))}</span></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Net total à payer</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalNet)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Payés</span><span className="font-medium text-green-600">{paidCount} bulletins</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">En attente</span><span className="font-medium text-yellow-600">{monthPayroll.length - paidCount} bulletins</span></div>
          </div>
        </div>
      </div>

      {/* Salary Configuration per Employee */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Configuration des salaires</h3>
            <p className="text-[10px] text-gray-400">Définir le salaire fixe ou le pourcentage par employé</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employé', 'Département', 'Salaire actuel', 'Type', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => {
                const salary = getEmployeeSalary(emp)
                return (
                  <tr key={emp.id} className="hover:bg-green-50/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarCircle photo={emp.photo} name={getEmployeeName(emp)} size={44} />
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{getEmployeeName(emp)}</p>
                          <p className="text-gray-400 text-[10px] font-mono">{emp.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{getDepartmentName(emp)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(salary)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        Fixe mensuel
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => {
                        setShowSalaryConfig(emp)
                        setSalaryForm({ baseSalary: salary, percentage: 0, usePercentage: false })
                      }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {employees.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                  {loading ? 'Chargement...' : 'Aucun utilisateur trouvé. Créez des utilisateurs dans Administration > Utilisateurs.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Bulletins de paie — {formatMonthLabel(monthFilter, yearFilter)}</h3>
          <span className="text-[10px] text-gray-400">{filtered.length} résultats</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Employé</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Salaire base</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Bonus</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Déductions</th>
                <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3">Net à payer</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-5 py-3">Statut</th>
                <th className="text-center text-xs font-semibold text-gray-500 px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(entry => (
                <tr key={entry.id} className={`transition-colors ${entry.paid ? 'bg-green-50/30' : 'hover:bg-amber-50/30'}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarCircle photo={entry.photo} name={entry.employeeName} size={44} />
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{entry.employeeName}</p>
                        <p className="text-gray-400 text-[10px] font-mono">{entry.matricule} · {entry.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-gray-600">{formatCurrency(entry.baseSalary)}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-green-600 font-medium">{entry.bonus > 0 ? formatCurrency(entry.bonus) : '—'}</td>
                  <td className="px-5 py-3.5 text-right text-xs text-red-500">{entry.deductions > 0 ? `-${formatCurrency(entry.deductions)}` : '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold ${entry.paid ? 'text-green-600' : 'text-gray-800'}`}>
                      {formatCurrency(entry.netPay)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {entry.paid ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle size={12} /> Payé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock size={12} /> En attente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {entry.paid ? (
                      <button onClick={() => setShowPayslip(entry)}
                        className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Eye size={12} className="inline mr-1" />Reçu
                      </button>
                    ) : (
                      <button onClick={() => openPaymentModal(entry)}
                        className="text-[10px] font-bold px-4 py-2 rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                        <DollarSign size={12} className="inline mr-1" />Payer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  Aucune donnée de paie pour ce mois. Cliquez sur "Générer la paie" pour commencer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
            pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {/* Payslip Modal */}
      {showPayslip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPayslip(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #064E3B, #16A34A)' }}>
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Bulletin de paie</h3>
                  <p className="text-[10px] text-gray-400">{formatMonthLabel(monthFilter, yearFilter)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Printer size={16} /></button>
                <button onClick={() => setShowPayslip(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
              </div>
            </div>

            <div className="p-6" id="payslip-content">
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
                <h1 className="text-lg font-bold text-gray-800">ALBA SERVICE GROUP</h1>
                <p className="text-xs text-gray-500">Kindu, Province du Maniema — R.D. Congo</p>
                <p className="text-[10px] text-gray-400 mt-1">RC/N° 001234 — NIF/N° 123456789</p>
                <h2 className="text-sm font-bold text-gray-700 mt-3 bg-gray-100 py-2 rounded-lg">BULLETIN DE PAIE</h2>
                <p className="text-xs text-gray-500 mt-1">Période : {formatMonthLabel(monthFilter, yearFilter)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 mb-3">
                    <AvatarCircle photo={showPayslip.photo} name={showPayslip.employeeName} size={56} />
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{showPayslip.employeeName}</p>
                      <p className="text-gray-400 text-[10px] font-mono">{showPayslip.matricule}</p>
                    </div>
                  </div>
                  <p><span className="text-gray-400">Département :</span> <span className="font-bold text-gray-800">{showPayslip.department}</span></p>
                </div>
                <div className="space-y-1">
                  <p><span className="text-gray-400">Période :</span> <span className="font-bold text-gray-800">{formatMonthLabel(monthFilter, yearFilter)}</span></p>
                  <p><span className="text-gray-400">Statut :</span> <span className="font-bold">{showPayslip.paid ? 'Payé' : 'En attente'}</span></p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-white bg-gray-800 px-3 py-1.5 rounded-t-lg">ÉLÉMENTS DE RÉMUNÉRATION</h3>
                <div className="border border-gray-200 rounded-b-lg divide-y divide-gray-100">
                  <div className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-gray-600">Salaire de base</span>
                    <span className="font-bold text-gray-800">{formatCurrency(showPayslip.baseSalary)}</span>
                  </div>
                  {showPayslip.bonus > 0 && (
                    <div className="flex justify-between px-3 py-2 text-xs">
                      <span className="text-gray-600">Bonus</span>
                      <span className="font-bold text-gray-800">{formatCurrency(showPayslip.bonus)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 text-xs bg-green-50">
                    <span className="font-bold text-green-700">TOTAL GAINS</span>
                    <span className="font-bold text-green-700">{formatCurrency(showPayslip.baseSalary + showPayslip.bonus)}</span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-white bg-red-600 px-3 py-1.5 rounded-t-lg">RETENUES</h3>
                <div className="border border-gray-200 rounded-b-lg divide-y divide-gray-100">
                  <div className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-gray-600">CNSS — Part employé (5%)</span>
                    <span className="font-bold text-red-600">-{formatCurrency(Math.round(showPayslip.baseSalary * 0.05))}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-gray-600">IPR — Impôt sur les traitements (3%)</span>
                    <span className="font-bold text-red-600">-{formatCurrency(Math.round(showPayslip.baseSalary * 0.03))}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 text-xs bg-red-50">
                    <span className="font-bold text-red-700">TOTAL RETENUES</span>
                    <span className="font-bold text-red-700">-{formatCurrency(showPayslip.deductions)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 uppercase font-bold tracking-wider">Salaire net à payer</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(showPayslip.netPay)}</p>
                <p className="text-[10px] text-green-500 mt-1">(Arrêté à la somme de {formatCurrency(showPayslip.netPay)} Francs Congolais)</p>
              </div>

              <div className="mt-6 text-center text-[10px] text-gray-400 border-t border-gray-100 pt-3">
                <p>Document émis le {formatDate(new Date())} — ALBA SERVICE GROUP</p>
                <p className="mt-1">Ce bulletin est un justificatif de paiement. Conservez-le précieusement.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                  <Calculator size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Générer la paie</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP</p>
                </div>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mois</label>
                  <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                    {monthNames.slice(1).map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Année</label>
                  <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                    {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
                <p className="font-semibold mb-1">Génération automatique :</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>{employees.filter(e => e.salary > 0).length} bulletins seront créés</li>
                  <li>Uniquement les employés avec salaire configuré</li>
                  <li>CNSS : 5% du salaire de base</li>
                  <li>IPR : 3% du salaire de base</li>
                  <li>Les salaires sont ceux configurés par l'administrateur</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleGenerate} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                <Calculator size={13} /> {loading ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Config Modal */}
      {showSalaryConfig && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSalaryConfig(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                  <Settings size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Configuration du salaire</h3>
                  <p className="text-[10px] text-gray-400">{getEmployeeName(showSalaryConfig)}</p>
                </div>
              </div>
              <button onClick={() => setShowSalaryConfig(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Département</p>
                <p className="text-sm font-bold text-gray-800">{getDepartmentName(showSalaryConfig)}</p>
                <p className="text-xs text-gray-400 mt-2">Salaire actuel</p>
                <p className="text-sm font-bold text-gray-800">{formatCurrency(getEmployeeSalary(showSalaryConfig))}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input type="radio" id="fixed" name="salaryType" checked={!salaryForm.usePercentage}
                    onChange={() => setSalaryForm({ ...salaryForm, usePercentage: false })}
                    className="w-4 h-4 text-green-600" />
                  <label htmlFor="fixed" className="text-sm font-medium text-gray-700">Salaire fixe mensuel (FC)</label>
                </div>
                {!salaryForm.usePercentage && (
                  <input type="number" min={0} value={salaryForm.baseSalary}
                    onChange={e => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    placeholder="Ex: 500000" />
                )}

                <div className="flex items-center gap-3">
                  <input type="radio" id="percent" name="salaryType" checked={salaryForm.usePercentage}
                    onChange={() => setSalaryForm({ ...salaryForm, usePercentage: true })}
                    className="w-4 h-4 text-green-600" />
                  <label htmlFor="percent" className="text-sm font-medium text-gray-700">Pourcentage du chiffre d'affaires</label>
                </div>
                {salaryForm.usePercentage && (
                  <div className="flex items-center gap-3">
                    <input type="number" min={0} max={100} step={0.5} value={salaryForm.percentage}
                      onChange={e => setSalaryForm({ ...salaryForm, percentage: Number(e.target.value) })}
                      className="w-32 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      placeholder="Ex: 5" />
                    <span className="text-sm text-gray-500">% du CA mensuel</span>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
                <p className="font-semibold mb-1">Note :</p>
                <p>Le salaire de base est utilisé pour calculer les charges sociales (CNSS 5%, IPR 3%) et le net à payer.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowSalaryConfig(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleSaveSalaryConfig} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                <Save size={13} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #064E3B, #16A34A)' }}>
                  <DollarSign size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Confirmer le paiement</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Employee Info */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                <AvatarCircle photo={showPaymentModal.photo} name={showPaymentModal.employeeName} size={56} />
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{showPaymentModal.employeeName}</p>
                  <p className="text-[10px] text-gray-400">{showPaymentModal.matricule} · {showPaymentModal.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Net à payer</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(showPaymentModal.netPay)}</p>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] text-blue-500 font-medium">Salaire base</p>
                  <p className="text-sm font-bold text-blue-700">{formatCurrency(showPaymentModal.baseSalary)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] text-red-500 font-medium">Déductions</p>
                  <p className="text-sm font-bold text-red-600">-{formatCurrency(showPaymentModal.deductions)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] text-green-500 font-medium">Net</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(showPaymentModal.netPay)}</p>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant payé (FC) *</label>
                  <input type="number" min={0} value={paymentAmount}
                    onChange={e => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 font-bold"
                    placeholder="Montant en FC" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setPaymentAmount(showPaymentModal.netPay)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">
                      Montant exact
                    </button>
                    <button onClick={() => setPaymentAmount(0)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium">
                      Réinitialiser
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode de paiement</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Espèces', 'Virement', 'Mobile Money'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={`text-xs py-2.5 rounded-xl font-medium border transition-colors ${
                          paymentMethod === m
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes (optionnel)</label>
                  <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                    rows={2} placeholder="Ex: Paiement du mois de juillet..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
                </div>
              </div>

              {paymentAmount > 0 && paymentAmount !== showPaymentModal.netPay && (
                <div className={`rounded-xl p-3 text-xs ${paymentAmount > showPaymentModal.netPay ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                  {paymentAmount > showPaymentModal.netPay
                    ? `Surplus: ${formatCurrency(paymentAmount - showPaymentModal.netPay)}`
                    : `Reste à payer: ${formatCurrency(showPaymentModal.netPay - paymentAmount)}`
                  }
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowPaymentModal(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={confirmPayment} disabled={loading || paymentAmount <= 0}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #064E3B, #16A34A)' }}>
                <CheckCircle size={14} /> {loading ? 'Enregistrement...' : 'Confirmer le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
