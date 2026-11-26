import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  Wallet, CheckCircle, Clock, AlertTriangle,
  Calendar, TrendingUp, Eye, X, Banknote
} from 'lucide-react'

type SalaryRecord = {
  id: string
  employeeId: string
  employee: { id: string; firstName: string; lastName: string; email: string }
  baseAmount: number
  bonuses: number
  deductions: number
  netAmount: number
  month: number
  year: number
  paid: boolean
  paidAt: string | null
  confirmed: boolean
  confirmedAt: string | null
  notes: string | null
  createdAt: string
}

const MONTH_NAMES = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const statusColors = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
}

function getStatus(s: SalaryRecord): { label: string; color: string } {
  if (s.confirmed) return { label: 'Reçu & Confirmé', color: statusColors.confirmed }
  if (s.paid) return { label: 'Payé (en attente confirmation)', color: statusColors.paid }
  return { label: 'En attente de paiement', color: statusColors.pending }
}

export default function MaPaiePage() {
  const { user } = useAuth()
  const [salaries, setSalaries] = useState<SalaryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SalaryRecord | null>(null)
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [confirming, setConfirming] = useState<string | null>(null)

  const fetchSalaries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (monthFilter !== 'all') params.set('month', monthFilter)
      if (yearFilter !== 'all') params.set('year', yearFilter)
      const qs = params.toString()
      const { data } = await api.get(`/hr/salaries/my${qs ? `?${qs}` : ''}`)
      const list = Array.isArray(data) ? data : data.data || data.items || []
      setSalaries(list.map((s: any) => ({
        id: s.id,
        employeeId: s.employeeId,
        employee: s.employee || { id: s.employeeId, firstName: '', lastName: '', email: '' },
        baseAmount: Number(s.baseAmount || 0),
        bonuses: Number(s.bonuses || 0),
        deductions: Number(s.deductions || 0),
        netAmount: Number(s.netAmount || 0),
        month: s.month,
        year: s.year,
        paid: s.paid,
        paidAt: s.paidAt || null,
        confirmed: s.confirmed || false,
        confirmedAt: s.confirmedAt || null,
        notes: s.notes || null,
        createdAt: s.createdAt || '',
      })))
    } catch {
      setSalaries([])
    } finally {
      setLoading(false)
    }
  }, [monthFilter, yearFilter])

  useEffect(() => { fetchSalaries() }, [fetchSalaries])

  const handleConfirm = async (id: string) => {
    setConfirming(id)
    try {
      await api.post(`/hr/salaries/${id}/confirm`)
      await fetchSalaries()
      if (selected?.id === id) {
        setSelected(prev => prev ? { ...prev, confirmed: true, confirmedAt: new Date().toISOString() } : null)
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur lors de la confirmation')
    } finally {
      setConfirming(null)
    }
  }

  const filtered = salaries
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 12)

  const totalPaid = salaries.filter(s => s.paid).reduce((sum, s) => sum + s.netAmount, 0)
  const totalConfirmed = salaries.filter(s => s.confirmed).reduce((sum, s) => sum + s.netAmount, 0)
  const pendingCount = salaries.filter(s => !s.paid).length
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const thisMonthSalary = salaries.find(s => s.month === currentMonth && s.year === currentYear)

  const years = [...new Set(salaries.map(s => s.year))].sort((a, b) => b - a)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Ma Paie"
        subtitle={`${salaries.length} bulletin(s) de salaire`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'RH' }, { label: 'Ma Paie' }]}
        icon={<Wallet size={22} />}
        iconBg="gradient-primary"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Ce mois"
          value={thisMonthSalary ? formatCurrency(thisMonthSalary.netAmount) : '—'}
          icon={<Calendar size={20} />}
          gradient="gradient-primary"
        />
        <KpiCard
          title="Total reçu"
          value={formatCurrency(totalConfirmed)}
          icon={<CheckCircle size={20} />}
          gradient="gradient-success"
        />
        <KpiCard
          title="En attente"
          value={String(pendingCount)}
          icon={<Clock size={20} />}
          gradient="gradient-warning"
        />
        <KpiCard
          title="Total payé"
          value={formatCurrency(totalPaid)}
          icon={<TrendingUp size={20} />}
          gradient="gradient-purple"
        />
      </div>

      {/* Current month highlight */}
      {thisMonthSalary && (
        <div className={`rounded-2xl border p-5 ${thisMonthSalary.paid ? 'bg-green-50/50 border-green-200' : 'bg-amber-50/50 border-amber-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold ${thisMonthSalary.paid ? 'bg-green-500' : 'bg-amber-500'}`}>
                {getInitials(`${user?.firstName || ''} ${user?.lastName || ''}`)}
              </div>
              <div>
                <p className="text-xs text-gray-500">Bulletin du mois en cours</p>
                <p className="text-lg font-bold text-gray-800">{MONTH_NAMES[currentMonth]} {currentYear}</p>
                <p className="text-sm text-gray-600">Salaire net: <span className="font-bold text-green-600">{formatCurrency(thisMonthSalary.netAmount)}</span></p>
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatus(thisMonthSalary).color}`}>
                {thisMonthSalary.confirmed ? <CheckCircle size={13} /> : thisMonthSalary.paid ? <Banknote size={13} /> : <Clock size={13} />}
                {getStatus(thisMonthSalary).label}
              </div>
              {!thisMonthSalary.paid && (
                <p className="text-[10px] text-amber-600 mt-1">L'administration n'a pas encore effectué le paiement</p>
              )}
              {thisMonthSalary.paid && !thisMonthSalary.confirmed && (
                <button
                  onClick={() => handleConfirm(thisMonthSalary.id)}
                  disabled={confirming === thisMonthSalary.id}
                  className="mt-2 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle size={13} />
                  {confirming === thisMonthSalary.id ? 'Confirmation...' : 'Confirmer la réception'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!thisMonthSalary && !loading && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
          <AlertTriangle size={32} className="mx-auto text-amber-400 mb-3" />
          <p className="text-sm font-medium text-gray-600">Aucun bulletin pour ce mois</p>
          <p className="text-xs text-gray-400 mt-1">Votre bulletin de salaire n'a pas encore été généré pour {MONTH_NAMES[currentMonth]} {currentYear}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
          <option value="all">Tous les mois</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{MONTH_NAMES[m]}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
          <option value="all">Toutes les années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-xs text-gray-400">{totalItems} bulletin(s)</span>
      </div>

      {/* Salary table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                {['Mois', 'Salaire de base', 'Primes', 'Retenues', 'Net à payer', 'Statut', 'Date paiement', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 uppercase px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-xs">Chargement...</td></tr>
              ) : paginatedItems.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-xs">Aucun bulletin de salaire trouvé</td></tr>
              ) : paginatedItems.map(s => {
                const st = getStatus(s)
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{MONTH_NAMES[s.month]} {s.year}</p>
                        <p className="text-[10px] text-gray-400">{s.employee?.firstName} {s.employee?.lastName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-700">{formatCurrency(s.baseAmount)}</td>
                    <td className="px-5 py-3.5 text-xs text-green-600">+{formatCurrency(s.bonuses)}</td>
                    <td className="px-5 py-3.5 text-xs text-red-500">-{formatCurrency(s.deductions)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(s.netAmount)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${st.color}`}>
                        {s.confirmed ? <CheckCircle size={10} /> : s.paid ? <Banknote size={10} /> : <Clock size={10} />}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {s.paidAt ? formatDate(s.paidAt) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.paid && !s.confirmed && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConfirm(s.id) }}
                          disabled={confirming === s.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle size={10} />
                          {confirming === s.id ? '...' : 'Reçu'}
                        </button>
                      )}
                      {s.confirmed && (
                        <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle size={10} /> Confirmé
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <Wallet size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{MONTH_NAMES[selected.month]} {selected.year}</h3>
                  <p className="text-[10px] text-gray-400">Détail du bulletin de salaire</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Salaire de base</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(selected.baseAmount)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-[10px] text-green-600 uppercase font-medium">Primes / Bonus</p>
                  <p className="text-sm font-bold text-green-700 mt-0.5">+{formatCurrency(selected.bonuses)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] text-red-500 uppercase font-medium">Retenues</p>
                  <p className="text-sm font-bold text-red-600 mt-0.5">-{formatCurrency(selected.deductions)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] text-blue-600 uppercase font-medium">Net à payer</p>
                  <p className="text-sm font-bold text-blue-700 mt-0.5">{formatCurrency(selected.netAmount)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Statut du paiement</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${getStatus(selected).color}`}>
                    {getStatus(selected).label}
                  </span>
                </div>
                {selected.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Date de paiement</span>
                    <span className="text-xs font-medium text-gray-700">{formatDate(selected.paidAt)}</span>
                  </div>
                )}
                {selected.confirmedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Date de confirmation</span>
                    <span className="text-xs font-medium text-green-600">{formatDate(selected.confirmedAt)}</span>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 uppercase font-medium mb-1">Notes</p>
                  <p className="text-xs text-amber-700">{selected.notes}</p>
                </div>
              )}

              {selected.paid && !selected.confirmed && (
                <button
                  onClick={() => handleConfirm(selected.id)}
                  disabled={confirming === selected.id}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle size={15} />
                  {confirming === selected.id ? 'Confirmation en cours...' : 'Confirmer la réception de mon salaire'}
                </button>
              )}

              {selected.confirmed && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-600 bg-green-50 rounded-xl">
                  <CheckCircle size={15} />
                  Réception confirmée
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
