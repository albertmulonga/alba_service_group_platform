import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { Printer, Plus, Search, Eye, Edit, CheckCircle, Clock, Package, X, Save, RefreshCw, AlertCircle } from 'lucide-react'

const statusSteps = [
  'draft', 'quote_pending', 'quote_validated', 'payment_pending',
  'in_preparation', 'printing', 'finishing', 'quality_check', 'ready', 'delivered',
]

const statusLabels: Record<string, { label: string; color: string }> = {
  draft:            { label: 'Brouillon',           color: 'secondary' },
  quote_pending:    { label: 'Devis en attente',    color: 'warning' },
  quote_validated:  { label: 'Devis validé',         color: 'info' },
  payment_pending:  { label: 'Paiement en attente', color: 'warning' },
  in_preparation:   { label: 'En préparation',       color: 'primary' },
  printing:         { label: 'En impression',        color: 'primary' },
  finishing:        { label: 'Finition',             color: 'purple' },
  quality_check:    { label: 'Contrôle qualité',     color: 'warning' },
  ready:            { label: 'Prête à livrer',       color: 'success' },
  delivered:        { label: 'Livrée',               color: 'success' },
  closed:           { label: 'Clôturée',             color: 'success' },
  cancelled:        { label: 'Annulée',              color: 'danger' },
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  normal:     { label: 'Normale',      cls: 'bg-blue-50 text-blue-700' },
  urgent:     { label: 'Urgente',      cls: 'bg-orange-50 text-orange-700' },
  very_urgent:{ label: 'Très urgente', cls: 'bg-red-50 text-red-700' },
}

type PrintOrderUI = {
  id: string
  orderNumber: string
  client: string
  service: string
  priority: string
  status: string
  total: number
  paid: number
  dueDate: string
  createdAt: string
  description: string
}

function mapPrintOrder(raw: any): PrintOrderUI {
  return {
    id: raw.id,
    orderNumber: raw.reference || `ALB-${raw.id?.slice(-6)}`,
    client: raw.customer?.firstName
      ? `${raw.customer.firstName} ${raw.customer.lastName || ''}`.trim()
      : (raw.customer?.companyName || 'Client'),
    service: raw.service?.name || (raw.description || '').slice(0, 40) || 'Impression',
    priority: (raw.priority || 'NORMAL').toLowerCase(),
    status: (raw.status || 'PENDING').toLowerCase()
      .replace('pending',         'quote_pending')
      .replace('design',          'in_preparation')
      .replace('validation',      'quote_validated')
      .replace('production',      'printing')
      .replace('quality_control', 'quality_check')
      .replace('finished',        'ready')
      .replace('cancelled',       'cancelled'),
    total:       Number(raw.total      ?? 0),
    paid:        Number(raw.paidAmount ?? 0),
    dueDate:     raw.dueDate     || '',
    createdAt:   raw.orderedAt   || raw.createdAt || '',
    description: raw.description || '',
  }
}

function ProgressBar({ status }: { status: string }) {
  const idx = statusSteps.indexOf(status)
  const pct = idx < 0 ? 0 : Math.round(((idx + 1) / statusSteps.length) * 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">Progression</span>
        <span className="text-[10px] font-semibold text-gray-600">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? '#22C55E' : 'linear-gradient(90deg, #1E3A8A, #2563EB)' }} />
      </div>
    </div>
  )
}

export default function PrintOrdersPage() {
  const { items: rawOrders, add, update, loading, error, refresh } = useApiDB<PrintOrderUI>('/print/orders', [], mapPrintOrder)
  const [localOrders, setLocalOrders] = useState<PrintOrderUI[]>([])
  const orders = rawOrders.length > 0 ? rawOrders : localOrders

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected,     setSelected]     = useState<PrintOrderUI | null>(null)
  const [showModal,    setShowModal]     = useState(false)
  const [form,         setForm]         = useState({
    client: '', service: 'Impression flyers', priority: 'normal',
    dueDate: '', description: '', total: 0,
  })

  const filtered = orders.filter(o => {
    const matchSearch = `${o.orderNumber} ${o.client} ${o.service}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const advanceStatus = async (order: PrintOrderUI) => {
    const next = statusSteps[statusSteps.indexOf(order.status) + 1]
    if (!next) return
    // Try API first, fall back to local state
    try {
      await update(order.id, { status: next } as any)
    } catch {
      setLocalOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    }
    if (selected?.id === order.id) setSelected({ ...order, status: next })
  }

  const createLocal = () => {
    if (!form.client.trim()) { alert('Veuillez saisir le nom du client.'); return }
    const newOrder: PrintOrderUI = {
      id: `local-${Date.now()}`,
      orderNumber: `ALB-${String(orders.length + 1).padStart(4, '0')}`,
      client: form.client,
      service: form.service,
      priority: form.priority,
      status: 'draft',
      total: form.total,
      paid: 0,
      dueDate: form.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      description: form.description,
    }
    setLocalOrders(prev => [newOrder, ...prev])
    setShowModal(false)
    setForm({ client: '', service: 'Impression flyers', priority: 'normal', dueDate: '', description: '', total: 0 })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Commandes d'Impression"
        subtitle="Suivi de production en temps réel"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Imprimerie' }, { label: 'Commandes' }]}
        icon={<Printer size={22} />}
        iconBg="gradient-warning"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl" title="Actualiser">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouvelle commande
            </button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <AlertCircle size={15} /> {error} — Affichage en mode local
          <button onClick={refresh} className="ml-auto text-xs font-semibold underline">Réessayer</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total commandes"  value={String(orders.length)} icon={<Printer size={20} />} gradient="gradient-primary" />
        <KpiCard title="En production"    value={String(orders.filter(o => ['printing','in_preparation','finishing'].includes(o.status)).length)} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="Prêtes à livrer" value={String(orders.filter(o => o.status === 'ready').length)} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="CA Impression"   value={formatCurrency(orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))} icon={<Package size={20} />} gradient="gradient-teal" />
      </div>

      {/* Kanban overview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Vue d'ensemble production</h3>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {statusSteps.map(s => {
            const count = orders.filter(o => o.status === s).length
            const sl = statusLabels[s]
            return (
              <div key={s}
                className={`rounded-xl p-2 text-center cursor-pointer transition-all ${statusFilter === s ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}>
                <div className={`text-lg font-bold ${count > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{count}</div>
                <p className="text-[9px] text-gray-500 leading-tight mt-0.5">{sl.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Numéro commande, client, service..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none min-w-[160px]">
            <option value="all">Tous les statuts</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Référence','Client','Service','Priorité','Statut','Progression','Montant','Solde','Échéance','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Printer size={24} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">Aucune commande trouvée</p>
                      <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
                        style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                        <Plus size={14} /> Créer la première commande
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map(order => {
                const sl = statusLabels[order.status] || { label: order.status, color: 'secondary' }
                const pr = priorityConfig[order.priority] || priorityConfig.normal
                const balance = order.total - order.paid
                return (
                  <tr key={order.id} className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                    onClick={() => setSelected(order)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-blue-600">#{order.orderNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">{order.client}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{order.service}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge label={sl.label} type={sl.color as any} />
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <ProgressBar status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-700">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {balance > 0 ? `-${formatCurrency(balance)}` : 'Soldé'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(order.dueDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); setSelected(order) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Détails">
                          <Eye size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); advanceStatus(order) }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Avancer étape">
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-[480px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #0F2460, #1E3A8A)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-xs">Commande d'impression</p>
                  <h3 className="text-xl font-bold">#{selected.orderNumber}</h3>
                  <p className="text-blue-200 text-sm mt-0.5">{selected.client}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <StatusBadge label={(statusLabels[selected.status] || { label: selected.status }).label} type={(statusLabels[selected.status] || { color: 'secondary' }).color as any} />
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${(priorityConfig[selected.priority] || priorityConfig.normal).cls}`}>
                  {(priorityConfig[selected.priority] || priorityConfig.normal).label}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                <p className="text-sm text-gray-700">{selected.description || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total',    value: formatCurrency(selected.total),               color: 'text-gray-800' },
                  { label: 'Payé',     value: formatCurrency(selected.paid),                color: 'text-green-600' },
                  { label: 'Solde',    value: formatCurrency(selected.total - selected.paid), color: selected.total > selected.paid ? 'text-red-600' : 'text-green-600' },
                  { label: 'Échéance', value: formatDate(selected.dueDate),                  color: 'text-gray-800' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Étapes de production</p>
                <div className="space-y-2">
                  {statusSteps.map((s, i) => {
                    const currentIdx = statusSteps.indexOf(selected.status)
                    const isDone = i < currentIdx
                    const isCurrent = i === currentIdx
                    return (
                      <div key={s} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? 'bg-blue-50' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs ${isCurrent ? 'text-blue-700 font-semibold' : isDone ? 'text-gray-400 line-through' : 'text-gray-400'}`}>
                          {statusLabels[s]?.label || s}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => advanceStatus(selected)}
                  className="w-full py-2.5 text-sm text-white rounded-xl font-medium hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  ▶ Passer à l'étape suivante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New order modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Nouvelle commande d'impression</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client *</label>
                <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
                  placeholder="Nom du client ou organisation"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de service *</label>
                <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                  {['Impression flyers','Impression affiches A3','Cartes de visite','Mémoires reliés',
                    'Impression formulaires','Brochures','Calendriers','Badges','Certificats',
                    'Photocopie','Plastification','Reliure spirale'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Format, couleur, quantité, finition..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priorité</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    <option value="normal">Normale</option>
                    <option value="urgent">Urgente</option>
                    <option value="very_urgent">Très urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant (FC)</label>
                  <input type="number" min={0} value={form.total || ''} onChange={e => setForm({ ...form, total: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Livraison</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={createLocal}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                <Save size={13} /> Créer la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
