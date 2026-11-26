import React, { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatCurrency } from '@/lib/utils'
import { financeService } from '@/services/finance.service'
import { useAuth } from '@/hooks/useAuth'
import { Wallet, Plus, TrendingUp, TrendingDown, X, Search, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Pagination, { usePagination } from '@/components/ui/Pagination'

type TransactionType = {
  id: string
  date: string
  type: 'income' | 'expense'
  description: string
  amount: number
  method: string
  reference: string
  user: string
}

function mapTransaction(raw: any): TransactionType {
  return {
    id: raw.id,
    date: raw.date || raw.createdAt || '',
    type: raw.type === 'CREDIT' || raw.type === 'income' ? 'income' : 'expense',
    description: raw.description || raw.label || '',
    amount: Number(raw.amount ?? 0),
    method: raw.paymentMethod || raw.method || 'Espèces',
    reference: raw.reference || raw.ref || '',
    user: raw.createdBy || raw.user || '',
  }
}

const METHODS = ['Espèces', 'Mobile Money', 'Virement', 'Carté', 'Chéque']

function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function makeReference(type: 'income' | 'expense', count: number) {
  const prefix = type === 'income' ? 'ENR' : 'DEC'
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

export default function CashPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<TransactionType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cashFlowData, setCashFlowData] = useState<{ day: string; income: number; expense: number }[]>([])

  const loadData = async () => {
    setLoading(true); setError(null)
    try {
      const [revenues, expenses] = await Promise.all([
        financeService.getRevenues({ limit: 200 }),
        financeService.getExpenses({ limit: 200 }),
      ])
      const revList = Array.isArray(revenues) ? revenues : revenues?.data || revenues?.items || []
      const expList = Array.isArray(expenses) ? expenses : expenses?.data || expenses?.items || []
      const all: TransactionType[] = [
        ...revList.map((r: any) => mapTransaction({ ...r, type: 'income' })),
        ...expList.map((e: any) => mapTransaction({ ...e, type: 'expense' })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setItems(all)

      // Build 7-day cashflow
      const days: Record<string, { income: number; expense: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const key = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
        days[key] = { income: 0, expense: 0 }
      }
      all.forEach(t => {
        const d = new Date(t.date)
        const key = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
        if (days[key]) {
          if (t.type === 'income') days[key].income += t.amount
          else days[key].expense += t.amount
        }
      })
      setCashFlowData(Object.entries(days).map(([day, v]) => ({ day, ...v })))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors du chargement des données financières')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const count = items.length

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'income' | 'expense'>('income')
  const [form, setForm] = useState({ amount: '', description: '', method: 'Espèces', reference: '' })

  const filtered = items.filter(t => {
    const matchSearch = `${t.description} ${t.method} ${t.reference}`.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || t.type === typeFilter
    return matchSearch && matchType
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const totalIncome = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const todayPrefix = new Date().toISOString().slice(0, 10)
  const todayIncome = items.filter(t => t.type === 'income' && t.date.startsWith(todayPrefix)).reduce((s, t) => s + t.amount, 0)

  function openEncaissement() {
    setModalType('income')
    setForm({ amount: '', description: '', method: 'Espèces', reference: '' })
    setShowModal(true)
  }

  function openDecaissement() {
    setModalType('expense')
    setForm({ amount: '', description: '', method: 'Espèces', reference: '' })
    setShowModal(true)
  }

  async function handleSubmit() {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0 || !form.description.trim()) return
    const ref = form.reference.trim() || makeReference(modalType, count)
    try {
      if (modalType === 'income') {
        await financeService.createRevenue({
          amount: amt,
          description: form.description.trim(),
          reference: ref,
          paymentMethod: form.method,
          date: getTodayStr(),
        })
      } else {
        await financeService.createExpense({
          amount: amt,
          description: form.description.trim(),
          reference: ref,
          paymentMethod: form.method,
          date: getTodayStr(),
        })
      }
      await loadData()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de l\'enregistrement')
    }
    setShowModal(false)
  }

  async function handleDelete(id: string, desc: string) {
    if (!window.confirm(`Supprimer la transaction "${desc}" ?`)) return
    try {
      const t = items.find(x => x.id === id)
      if (t?.type === 'income') await financeService.deleteRevenue(id)
      else await financeService.deleteExpense(id)
      setItems(prev => prev.filter(x => x.id !== id))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion de la Caisse"
        subtitle="Mouvements financiers journaliers — encaissements et décaissements"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Finance' }, { label: 'Caisse' }]}
        icon={<Wallet size={22} />}
        iconBg="gradient-success"
        actions={
          <div className="flex gap-2">
            <ExportButton
              data={filtered}
              filename="caisse-alba"
              title="Transactions de Caisse"
              headers={['Date & Heure', 'Description', 'Type', 'Montant', 'Méthode', 'Référence', 'Opérateur']}
            />
            <button onClick={loadData} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl" title="Actualiser">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={openEncaissement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
              <Plus size={15} /> Encaissement
            </button>
            <button onClick={openDecaissement}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg,#DC2626,#EF4444)' }}>
              <Plus size={15} /> Décaissement
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={loadData} className="ml-auto text-xs font-semibold underline">Réessayer</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Solde caisse" value={formatCurrency(balance)} icon={<Wallet size={20} />} gradient={balance >= 0 ? 'gradient-success' : 'gradient-danger'} />
        <KpiCard title="Encaissements" value={formatCurrency(totalIncome)} icon={<TrendingUp size={20} />} gradient="gradient-primary" />
        <KpiCard title="Décaissements" value={formatCurrency(totalExpense)} icon={<TrendingDown size={20} />} gradient="gradient-warning" />
        <KpiCard title="Recettes aujourd'hui" value={formatCurrency(todayIncome)} icon={<TrendingUp size={20} />} gradient="gradient-teal" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Flux de trésorerie — 7 derniers jours</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Area type="monotone" dataKey="income" name="Entrées" stroke="#22C55E" strokeWidth={2} fill="url(#gInc)" dot={false} />
            <Area type="monotone" dataKey="expense" name="Sorties" stroke="#EF4444" strokeWidth={2} fill="url(#gExp)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {([['all', 'Tous'], ['income', 'Entrées ↑'], ['expense', 'Sorties ↓']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTypeFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${typeFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Description, méthode, référence..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Date & Heure', 'Description', 'Méthode', 'Référence', 'Type', 'Montant', 'Opérateur', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${t.type === 'expense' ? 'bg-red-50/10' : ''}`}>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 max-w-[180px] truncate">{t.description}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t.method}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-blue-600">{t.reference || '—'}</td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {t.type === 'income' ? 'Entrée' : 'Sortie'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.user}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id, t.description)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} opération(s)</p>
          <div className="flex items-center gap-6 text-xs">
            <span className="text-green-600">Entrées : <strong>{formatCurrency(filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}</strong></span>
            <span className="text-red-600">Sorties : <strong>{formatCurrency(filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}</strong></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">
                {modalType === 'income' ? 'Nouvel encaissement' : 'Nouveau décaissement'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Montant (FC) *</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objet de l'opération"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Méthode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => (
                    <button key={m} onClick={() => setForm({ ...form, method: m })}
                      className={`py-2 text-xs font-medium rounded-xl border-2 transition-all ${form.method === m
                        ? modalType === 'income'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Référence</label>
                <input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                  placeholder={modalType === 'income' ? 'ENR-XXX (auto)' : 'DEC-XXX (auto)'}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSubmit}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ background: modalType === 'income' ? 'linear-gradient(135deg,#16A34A,#22C55E)' : 'linear-gradient(135deg,#DC2626,#EF4444)' }}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
