import React from 'react'
import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  CreditCard, Plus, Search, Check, ArrowUpRight,
  ArrowDownRight, X, Eye, RotateCcw, Pencil, Trash2, RefreshCw, AlertCircle
} from 'lucide-react'

interface PaymentType {
  id: string
  paymentNumber: string
  invoice: string
  client: { name: string; contact: string }
  amount: number
  method: 'Espèces' | 'Mobile Money' | 'Virement' | 'Carte' | 'Chèque'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  date: string
  reference: string
}

function mapPayment(raw: any): PaymentType {
  return {
    id: raw.id,
    paymentNumber: raw.reference || `PAY-${raw.id?.slice(-6)}`,
    invoice: raw.invoice?.number || raw.invoiceNumber || '',
    client: {
      name: raw.invoice?.customer?.firstName
        ? `${raw.invoice.customer.firstName} ${raw.invoice.customer.lastName || ''}`.trim()
        : (raw.invoice?.customer?.companyName || raw.clientName || 'Client'),
      contact: raw.invoice?.customer?.phone || '',
    },
    amount: Number(raw.amount ?? 0),
    method: (raw.method === 'cash' ? 'Espèces'
      : raw.method === 'bank_transfer' ? 'Virement'
      : raw.method === 'mobile_money' ? 'Mobile Money'
      : raw.method === 'check' ? 'Chèque'
      : raw.method || 'Espèces') as PaymentType['method'],
    status: 'completed',
    date: raw.paidAt || raw.createdAt || '',
    reference: raw.reference || '',
  }
}

const statusConfig: Record<string, { label: string; type: string; icon: React.ReactElement }> = {
  pending:   { label: 'En attente', type: 'warning',   icon: <ArrowUpRight size={13} /> },
  completed: { label: 'Complété',   type: 'success',   icon: <Check size={13} /> },
  failed:    { label: 'Échoué',     type: 'danger',    icon: <X size={13} /> },
  refunded:  { label: 'Remboursé',  type: 'secondary', icon: <RotateCcw size={13} /> },
}

const methodColors: Record<string, string> = {
  'Espèces': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Mobile Money': 'bg-violet-50 text-violet-700 border-violet-200',
  'Virement': 'bg-blue-50 text-blue-700 border-blue-200',
  'Carte': 'bg-amber-50 text-amber-700 border-amber-200',
  'Chèque': 'bg-slate-50 text-slate-700 border-slate-200',
}

const methodIcons: Record<string, React.ReactElement> = {
  'Espèces': <ArrowDownRight size={12} />,
  'Mobile Money': <ArrowUpRight size={12} />,
  'Virement': <ArrowUpRight size={12} />,
  'Carte': <CreditCard size={12} />,
  'Chèque': <CreditCard size={12} />,
}

export default function PaymentsPage() {
  const { items, add, update, remove, count, loading, error, refresh } = useApiDB<PaymentType>('/commercial/payments', [], mapPayment)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentType | null>(null)

  // Form state
  const [formInvoice, setFormInvoice] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState<string>('')
  const [formReference, setFormReference] = useState('')
  const [formDate, setFormDate] = useState('2026-08-19')

  const resetForm = () => {
    setFormInvoice('')
    setFormAmount('')
    setFormMethod('')
    setFormReference('')
    setFormDate('2026-08-19')
  }

  const openCreateModal = () => {
    setEditingPayment(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (payment: PaymentType) => {
    setEditingPayment(payment)
    setFormInvoice(payment.invoice)
    setFormAmount(String(payment.amount))
    setFormMethod(payment.method)
    setFormReference(payment.reference)
    setFormDate(payment.date)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPayment(null)
    resetForm()
  }

  const handleSave = () => {
    if (!formAmount || !formMethod || !formInvoice) return
    const amount = Number(formAmount)
    const clientForInvoice = { name: formInvoice, contact: '' }

    if (editingPayment) {
      update(editingPayment.id, {
        invoice: formInvoice,
        client: clientForInvoice,
        amount,
        method: formMethod as PaymentType['method'],
        reference: formReference,
        date: formDate,
      })
    } else {
      const num = String(items.length + 1).padStart(5, '0')
      add({
        paymentNumber: `PAY-${num}`,
        invoice: formInvoice,
        client: clientForInvoice,
        amount,
        method: formMethod as PaymentType['method'],
        status: 'completed',
        date: formDate,
        reference: formReference,
      })
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer ce paiement ?')) {
      remove(id)
      if (selectedPayment === id) setSelectedPayment(null)
    }
  }

  const handleConfirm = (id: string) => {
    update(id, { status: 'completed' })
  }

  const filtered = items.filter(p => {
    const matchSearch = `${p.paymentNumber} ${p.invoice} ${p.client.name} ${p.reference}`
      .toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchMethod = methodFilter === 'all' || p.method === methodFilter
    return matchSearch && matchStatus && matchMethod
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const totalCollected = items.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const pendingAmount = items.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const todayPayments = items.filter(p => p.date === '2026-08-19').length
  const monthPayments = items.filter(p => p.date.startsWith('2026-08')).reduce((s, p) => s + p.amount, 0)

  const selected = selectedPayment ? items.find(p => p.id === selectedPayment) : null

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Paiements"
        subtitle="Suivi des encaissements et modes de paiement"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Commercial' }, { label: 'Paiements' }]}
        icon={<CreditCard size={22} />}
        iconBg="gradient-teal"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered}
              filename="paiements-alba"
              title="Historique des Paiements"
              headers={['Numéro', 'Facture', 'Client', 'Montant', 'Mode', 'Date', 'Statut']}
            />
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}
            >
              <Plus size={15} /> Enregistrer un paiement
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total encaissé" value={`${(totalCollected / 1000000).toFixed(2)}M FC`} icon={<Check size={20} />} gradient="gradient-success" change={15} />
        <KpiCard title="En attente" value={formatCurrency(pendingAmount)} icon={<ArrowUpRight size={20} />} gradient="gradient-warning" />
        <KpiCard title="Aujourd'hui" value={todayPayments.toString()} icon={<CreditCard size={20} />} gradient="gradient-primary" />
        <KpiCard title="Ce mois" value={`${(monthPayments / 1000000).toFixed(2)}M FC`} icon={<ArrowDownRight size={20} />} gradient="gradient-teal" change={8} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Numéro, facture, client, référence..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none min-w-36"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none min-w-36"
          >
            <option value="all">Tous les modes</option>
            {Object.keys(methodColors).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Numéro', 'Facture', 'Client', 'Montant', 'Mode', 'Date', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(payment => {
                const sc = statusConfig[payment.status]
                const mc = methodColors[payment.method] || 'bg-gray-50 text-gray-600 border-gray-200'
                return (
                  <tr key={payment.id} className="hover:bg-teal-50/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600">{payment.paymentNumber}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{payment.reference}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-gray-600">{payment.invoice}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="text-xs font-medium text-gray-700">{payment.client.name}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{payment.client.contact}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(payment.amount)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border ${mc}`}>
                        {methodIcons[payment.method]}
                        {payment.method}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{payment.date}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
                        payment.status === 'completed' ? 'bg-green-50 text-green-700' :
                        payment.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                        payment.status === 'failed' ? 'bg-red-50 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {sc.icon}
                        {sc.label}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedPayment(payment.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Voir"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openEditModal(payment)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="Modifier"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} paiement(s) affiché(s)</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">
              Total : <strong className="text-gray-800">{formatCurrency(filtered.reduce((s, p) => s + p.amount, 0))}</strong>
            </span>
            <span className="text-gray-500">
              Encaissé : <strong className="text-green-600">
                {formatCurrency(filtered.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0))}
              </strong>
            </span>
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

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50">
                  <CreditCard size={18} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{selected.paymentNumber}</h3>
                  <p className="text-[10px] text-gray-400">Détails du paiement</p>
                </div>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Montant</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{formatCurrency(selected.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</p>
                  <div className="mt-1">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
                      selected.status === 'completed' ? 'bg-green-50 text-green-700' :
                      selected.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      selected.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {statusConfig[selected.status].icon}
                      {statusConfig[selected.status].label}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Facture</p>
                  <p className="text-sm font-mono font-medium text-blue-600 mt-1">{selected.invoice}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mode de paiement</p>
                  <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border ${methodColors[selected.method]}`}>
                    {methodIcons[selected.method]}
                    {selected.method}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">{selected.client.name}</p>
                  <p className="text-xs text-gray-500">{selected.client.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</p>
                  <p className="text-sm text-gray-700 mt-1">{selected.date}</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Référence</p>
                <p className="text-xs font-mono text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">{selected.reference}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Fermer
              </button>
              {selected.status === 'pending' && (
                <button
                  onClick={() => handleConfirm(selected.id)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}
                >
                  <Check size={13} /> Confirmer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50">
                  {editingPayment ? <Pencil size={18} className="text-teal-600" /> : <Plus size={18} className="text-teal-600" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{editingPayment ? 'Modifier le Paiement' : 'Enregistrer un Paiement'}</h3>
                  <p className="text-[10px] text-gray-400">{editingPayment ? 'Modification' : 'Nouveau paiement'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Facture associée</label>
                <select
                  value={formInvoice}
                  onChange={e => setFormInvoice(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Sélectionner ou saisir une référence de facture</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2.5 pr-12 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">FC</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(methodColors).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormMethod(m)}
                      className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all hover:shadow-sm ${formMethod === m ? 'ring-2 ring-offset-1 ring-teal-500 ' : ''}${methodColors[m]}`}
                    >
                      {methodIcons[m]} <span className="ml-1">{m}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Référence</label>
                <input
                  type="text"
                  placeholder="Numéro de transaction"
                  value={formReference}
                  onChange={e => setFormReference(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}
              >
                <CreditCard size={13} /> {editingPayment ? 'Enregistrer les modifications' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
