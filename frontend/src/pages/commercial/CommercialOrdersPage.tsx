import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  ShoppingCart, Plus, Search, Eye, Edit,
  Package, Truck, X, ChevronDown, Trash2, RefreshCw, AlertCircle
} from 'lucide-react'

type OrderItem = { name: string; qty: number }

type OrderType = {
  id: string
  orderNumber: string
  client: { name: string; contact: string }
  items: OrderItem[]
  total: number
  status: string
  createdAt: string
  deliveryDate: string
}

const statusConfig: Record<string, { label: string; type: string; color: string }> = {
  pending: { label: 'En attente', type: 'secondary', color: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmée', type: 'info', color: 'bg-blue-50 text-blue-600' },
  processing: { label: 'En cours', type: 'warning', color: 'bg-amber-50 text-amber-600' },
  shipped: { label: 'Expédiée', type: 'info', color: 'bg-indigo-50 text-indigo-600' },
  delivered: { label: 'Livrée', type: 'success', color: 'bg-green-50 text-green-600' },
  cancelled: { label: 'Annulée', type: 'danger', color: 'bg-red-50 text-red-600' },
}

const statusTabs = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'processing', label: 'En cours' },
  { key: 'shipped', label: 'Expédiées' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'cancelled', label: 'Annulées' },
]

const statusTransitions: Record<string, { label: string; next: string }[]> = {
  pending: [
    { label: 'Confirmer', next: 'confirmed' },
    { label: 'Annuler', next: 'cancelled' },
  ],
  confirmed: [
    { label: 'Lancer', next: 'processing' },
    { label: 'Annuler', next: 'cancelled' },
  ],
  processing: [
    { label: 'Expédier', next: 'shipped' },
    { label: 'Annuler', next: 'cancelled' },
  ],
  shipped: [
    { label: 'Marquer livrée', next: 'delivered' },
  ],
}

const emptyForm = {
  clientName: '',
  clientContact: '',
  deliveryDate: '',
  items: [{ name: '', qty: 1 }] as OrderItem[],
  notes: '',
}

function mapOrder(raw: any): OrderType {
  return {
    id: raw.id,
    orderNumber: raw.reference || raw.orderNumber || `CC-${raw.id?.slice(-6)}`,
    client: {
      name: raw.customer?.firstName
        ? `${raw.customer.firstName} ${raw.customer.lastName || ''}`.trim()
        : (raw.customer?.companyName || raw.clientName || 'Client'),
      contact: raw.customer?.phone || raw.clientContact || '',
    },
    items: raw.items?.map((i: any) => ({ name: i.name || i.description, qty: i.quantity || i.qty || 1 })) || [],
    total: Number(raw.total ?? 0),
    status: (raw.status || 'DRAFT').toLowerCase().replace('draft', 'pending').replace('validated', 'confirmed').replace('paid', 'delivered'),
    createdAt: raw.orderDate || raw.createdAt || '',
    deliveryDate: raw.dueDate || raw.deliveryDate || '',
  }
}

export default function CommercialOrdersPage() {
  const { items: orders, add, update, remove, loading, error, refresh } = useApiDB<OrderType>('/commercial/orders', [], mapOrder)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderType | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = orders.filter(order => {
    const matchSearch = `${order.orderNumber} ${order.client.name} ${order.client.contact}`
      .toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || order.status === statusFilter
    return matchSearch && matchStatus
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const filteredExport = filtered.map(o => ({
    orderNumber: o.orderNumber,
    client: o.client.name,
    contact: o.client.contact,
    articles: o.items.map(i => i.name).join(', '),
    total: o.total,
    status: statusConfig[o.status]?.label || o.status,
    deliveryDate: o.deliveryDate,
  }))

  const exportHeaders = {
    orderNumber: 'Numéro',
    client: 'Client',
    contact: 'Contact',
    articles: 'Articles',
    total: 'Montant (FC)',
    status: 'Statut',
    deliveryDate: 'Date livraison',
  }

  const totalOrders = orders.length
  const inProgressCount = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length
  const deliveredCount = orders.filter(o => o.status === 'delivered').length
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

  const selectedOrder = selectedOrderId ? orders.find(o => o.id === selectedOrderId) ?? null : null

  function openNewModal() {
    setEditingOrder(null)
    setForm({ clientName: '', clientContact: '', deliveryDate: '', items: [{ name: '', qty: 1 }], notes: '' })
    setShowModal(true)
  }

  function openEditModal(order: OrderType) {
    setEditingOrder(order)
    setForm({
      clientName: order.client.name,
      clientContact: order.client.contact,
      deliveryDate: order.deliveryDate,
      items: order.items.map(i => ({ ...i })),
      notes: '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingOrder(null)
    setForm({ clientName: '', clientContact: '', deliveryDate: '', items: [{ name: '', qty: 1 }], notes: '' })
  }

  function handleSaveOrder() {
    const validItems = form.items.filter(i => i.name.trim() !== '')
    if (!form.clientName || validItems.length === 0) return

    const orderData = {
      client: { name: form.clientName, contact: form.clientContact },
      items: validItems,
      total: validItems.reduce((s, i) => s + i.qty * 1000, 0),
      deliveryDate: form.deliveryDate,
    }

    if (editingOrder) {
      update(editingOrder.id, orderData)
    } else {
      const nextNum = Math.max(...orders.map(o => parseInt(o.orderNumber.split('-').pop() || '0', 10)), 0) + 1
      add({
        orderNumber: `CC-2026-${String(nextNum).padStart(4, '0')}`,
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      })
    }
    closeModal()
  }

  function handleDelete(id: string) {
    if (window.confirm('Supprimer cette commande ?')) {
      remove(id)
      if (selectedOrderId === id) setSelectedOrderId(null)
    }
  }

  function handleStatusChange(id: string, newStatus: string) {
    update(id, { status: newStatus })
  }

  function handleAddItem() {
    setForm(f => ({ ...f, items: [...f.items, { name: '', qty: 1 }] }))
  }

  function handleRemoveItem(idx: number) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  function handleItemChange(idx: number, field: 'name' | 'qty', value: string | number) {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Commandes Commerciales"
        subtitle="Gestion des commandes et suivi des livraisons"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Commercial' }, { label: 'Commandes' }]}
        icon={<ShoppingCart size={22} />}
        iconBg="gradient-teal"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filteredExport}
              filename="commandes-alba"
              title="Commandes Commerciales"
              headers={exportHeaders}
            />
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}
            >
              <Plus size={15} /> Nouvelle commande
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total commandes" value={totalOrders.toString()} icon={<ShoppingCart size={20} />} gradient="gradient-primary" change={12} />
        <KpiCard title="En cours" value={inProgressCount.toString()} icon={<Package size={20} />} gradient="gradient-warning" />
        <KpiCard title="Livrées" value={deliveredCount.toString()} icon={<Truck size={20} />} gradient="gradient-success" />
        <KpiCard title="Revenus" value={`${(totalRevenue / 1000000).toFixed(2)}M FC`} icon={<ShoppingCart size={20} />} gradient="gradient-teal" change={24} />
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {statusTabs.map(tab => {
            const count = tab.key === 'all'
              ? orders.length
              : orders.filter(o => o.status === tab.key).length
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === tab.key
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  statusFilter === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Numéro de commande, client, contact..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Numéro', 'Client', 'Articles', 'Montant', 'Statut', 'Date livraison', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(order => {
                const sc = statusConfig[order.status]
                const transitions = statusTransitions[order.status] || []
                return (
                  <tr key={order.id} className="hover:bg-teal-50/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600">{order.orderNumber}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{order.createdAt}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="text-xs font-medium text-gray-700">{order.client.name}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{order.client.contact}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Package size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {order.items.length} article{order.items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge label={sc.label} type={sc.type as any} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Truck size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{order.deliveryDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setSelectedOrderId(order.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Voir"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => openEditModal(order)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Modifier"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                        {transitions.map(t => (
                          <button
                            key={t.next}
                            onClick={() => handleStatusChange(order.id, t.next)}
                            className="px-2 py-1 text-[10px] font-medium text-teal-600 hover:bg-teal-50 rounded-lg border border-teal-200"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} commande(s) affichée(s)</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">
              Total : <strong className="text-gray-800">{formatCurrency(filtered.reduce((s, o) => s + o.total, 0))}</strong>
            </span>
          </div>
        </div>
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
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50">
                  <ShoppingCart size={18} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{selectedOrder.orderNumber}</h3>
                  <p className="text-[10px] text-gray-400">Détails de la commande</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrderId(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Client</p>
                  <p className="text-sm font-medium text-gray-800 mt-1">{selectedOrder.client.name}</p>
                  <p className="text-xs text-gray-500">{selectedOrder.client.contact}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Statut</p>
                  <div className="mt-1">
                    <StatusBadge label={statusConfig[selectedOrder.status].label} type={statusConfig[selectedOrder.status].type as any} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date de commande</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.createdAt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date de livraison</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedOrder.deliveryDate}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Articles</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Package size={13} className="text-gray-400" />
                        <span className="text-xs text-gray-700">{item.name}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500">Qté: {item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Montant total</span>
                <span className="text-sm font-bold text-gray-800">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={() => setSelectedOrderId(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                onClick={() => { setSelectedOrderId(null); openEditModal(selectedOrder) }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}
              >
                <Edit size={13} /> Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-50">
                  <Plus size={18} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{editingOrder ? 'Modifier la Commande' : 'Nouvelle Commande'}</h3>
                  <p className="text-[10px] text-gray-400">{editingOrder ? 'Modifier les détails' : 'Créer une commande commerciale'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du client</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nom de l'entreprise ou organisation"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact</label>
                <input
                  type="text"
                  value={form.clientContact}
                  onChange={e => setForm(f => ({ ...f, clientContact: e.target.value }))}
                  placeholder="Nom du contact"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de livraison prévue</label>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Articles</label>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Désignation"
                        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="number"
                        value={item.qty}
                        onChange={e => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                        placeholder="Qté"
                        className="w-20 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {form.items.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddItem}
                  className="mt-2 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Plus size={13} /> Ajouter un article
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Instructions spéciales..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
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
                onClick={handleSaveOrder}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}
              >
                <ShoppingCart size={13} /> {editingOrder ? 'Enregistrer' : 'Créer la commande'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
