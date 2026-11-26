import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { Truck, Plus, Search, Eye, Edit, X, Package, Building2, ShoppingCart, Trash2, RefreshCw, AlertCircle } from 'lucide-react'

type OrderItem = { name: string; qty: number; price: number }

type OrderType = {
  id: string
  orderNumber: string
  supplier: { name: string; phone: string }
  items: OrderItem[]
  total: number
  status: 'brouillon' | 'envoyée' | 'confirmée' | 'reçue' | 'annulée'
  createdAt: string
  expectedDate: string
}

type SupplierType = {
  id: string
  code: string
  name: string
  contact: string
  phone: string
  email: string
  address: string
  products: string[]
  totalPurchases: number
  status: 'active' | 'inactive'
}

const mockOrders: OrderType[] = [
  { id: '1', orderNumber: 'BC-2026-001', supplier: { name: 'ABC Fournitures', phone: '+243 812 345 678' }, items: [{ name: 'Papier A4 80g', qty: 20, price: 8000 }, { name: 'Papier A3 80g', qty: 10, price: 14000 }], total: 300000, status: 'reçue', createdAt: '2026-07-01', expectedDate: '2026-07-10' },
  { id: '2', orderNumber: 'BC-2026-002', supplier: { name: 'Tech Store', phone: '+243 823 456 789' }, items: [{ name: 'Toner HP LaserJet', qty: 5, price: 85000 }, { name: 'Encre Epson', qty: 12, price: 25000 }], total: 725000, status: 'confirmée', createdAt: '2026-07-03', expectedDate: '2026-07-15' },
  { id: '3', orderNumber: 'BC-2026-003', supplier: { name: 'Bureau Plus', phone: '+243 834 567 890' }, items: [{ name: 'Spirales reliure', qty: 30, price: 5000 }, { name: 'Film plastification', qty: 50, price: 2000 }], total: 250000, status: 'brouillon', createdAt: '2026-07-05', expectedDate: '2026-07-20' },
  { id: '4', orderNumber: 'BC-2026-004', supplier: { name: 'ABC Fournitures', phone: '+243 812 345 678' }, items: [{ name: 'Papier photo brillant', qty: 100, price: 500 }], total: 50000, status: 'reçue', createdAt: '2026-06-20', expectedDate: '2026-06-28' },
  { id: '5', orderNumber: 'BC-2026-005', supplier: { name: 'Plastique Plus', phone: '+243 845 678 901' }, items: [{ name: 'Films plastification A4', qty: 100, price: 2000 }, { name: 'Pochettes plastiques', qty: 200, price: 500 }], total: 300000, status: 'confirmée', createdAt: '2026-07-08', expectedDate: '2026-07-18' },
  { id: '6', orderNumber: 'BC-2026-006', supplier: { name: 'Tech Store', phone: '+243 823 456 789' }, items: [{ name: 'Câble réseau Cat6', qty: 100, price: 800 }], total: 80000, status: 'annulée', createdAt: '2026-06-15', expectedDate: '2026-06-25' },
  { id: '7', orderNumber: 'BC-2026-007', supplier: { name: 'Bureau Plus', phone: '+243 834 567 890' }, items: [{ name: 'Stylos bille', qty: 50, price: 300 }, { name: 'Cahiers A5', qty: 100, price: 1500 }], total: 165000, status: 'envoyée', createdAt: '2026-07-10', expectedDate: '2026-07-22' },
  { id: '8', orderNumber: 'BC-2026-008', supplier: { name: 'Impression Pro', phone: '+243 856 789 012' }, items: [{ name: 'Encres offset', qty: 8, price: 120000 }, { name: 'Papier offset', qty: 20, price: 15000 }], total: 1260000, status: 'confirmée', createdAt: '2026-07-12', expectedDate: '2026-07-25' },
]

const mockSuppliers: SupplierType[] = [
  { id: '1', code: 'FRN-001', name: 'ABC Fournitures', contact: 'Jean Mukendi', phone: '+243 812 345 678', email: 'contact@abcfournitures.cd', address: '', products: ['Papier', 'Papeterie'], totalPurchases: 350000, status: 'active' },
  { id: '2', code: 'FRN-002', name: 'Tech Store', contact: 'Marie Kabila', phone: '+243 823 456 789', email: 'info@techstore.cd', address: '', products: ['Informatique', 'Électronique'], totalPurchases: 805000, status: 'active' },
  { id: '3', code: 'FRN-003', name: 'Bureau Plus', contact: 'Patrick Tshisekedi', phone: '+243 834 567 890', email: 'ventes@bureauplus.cd', address: '', products: ['Finition', 'Reliure'], totalPurchases: 415000, status: 'active' },
  { id: '4', code: 'FRN-004', name: 'Plastique Plus', contact: 'Sarah Ngalula', phone: '+243 845 678 901', email: 'contact@plastiqueplus.cd', address: '', products: ['Plastique', 'Emballage'], totalPurchases: 300000, status: 'active' },
  { id: '5', code: 'FRN-005', name: 'Impression Pro', contact: 'David Mumba', phone: '+243 856 789 012', email: 'pro@impressionpro.cd', address: '', products: ['Encre', 'Papier offset'], totalPurchases: 1260000, status: 'active' },
  { id: '6', code: 'FRN-006', name: 'Fournitures Gén.', contact: 'Alice Kalonji', phone: '+243 867 890 123', email: 'info@fournituresgen.cd', address: '', products: ['Bureau', 'Divers'], totalPurchases: 0, status: 'inactive' },
]

const statusConfig: Record<string, { label: string; type: any }> = {
  brouillon: { label: 'Brouillon', type: 'secondary' },
  envoyée: { label: 'Envoyée', type: 'info' },
  confirmée: { label: 'Confirmée', type: 'warning' },
  reçue: { label: 'Reçue', type: 'success' },
  annulée: { label: 'Annulée', type: 'danger' },
}

function getNextOrderNumber(orders: OrderType[]): string {
  const nums = orders.map(o => parseInt(o.orderNumber.split('-')[2] || '0', 10))
  const next = (Math.max(0, ...nums) + 1).toString().padStart(3, '0')
  return `BC-2026-${next}`
}

function getNextSupplierCode(suppliers: SupplierType[]): string {
  const nums = suppliers.map(s => parseInt(s.code.split('-')[1] || '0', 10))
  const next = (Math.max(0, ...nums) + 1).toString().padStart(3, '0')
  return `FRN-${next}`
}

function mapPurchaseOrder(raw: any): OrderType {
  return {
    id:           raw.id,
    orderNumber:  raw.reference || `BC-${raw.id?.slice(-6)}`,
    supplier: {
      name:  raw.supplier?.name  || 'Fournisseur',
      phone: raw.supplier?.phone || '',
    },
    items: raw.items?.map((i: any) => ({
      name:  i.product?.name || i.name || '',
      qty:   i.quantity      || i.qty  || 1,
      price: Number(i.unitPrice ?? i.price ?? 0),
    })) || [],
    total:        Number(raw.total        ?? 0),
    status:       (raw.status || 'DRAFT').toLowerCase() as OrderType['status'],
    createdAt:    raw.orderDate  || raw.createdAt || '',
    expectedDate: raw.expectedDate || '',
  }
}

function mapSupplier(raw: any): SupplierType {
  return {
    id:             raw.id,
    code:           raw.code          || `FRN-${raw.id?.slice(-3)}`,
    name:           raw.name          || '',
    contact:        raw.contactName   || '',
    phone:          raw.phone         || '',
    email:          raw.email         || '',
    address:        raw.address       || '',
    products:       [],
    totalPurchases: 0,
    status:         raw.isActive ? 'active' : 'inactive',
  }
}

export default function PurchasesPage() {
  const { items: orders,    add: addOrder,    update: updateOrder,    remove: removeOrder    } = useApiDB<OrderType>  ('/stock/suppliers', [], mapPurchaseOrder)
  const { items: suppliers, add: addSupplier, update: updateSupplier, remove: removeSupplier } = useApiDB<SupplierType>('/stock/suppliers', [], mapSupplier)

  const [tab, setTab] = useState<'orders' | 'suppliers'>('orders')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType | null>(null)

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderType | null>(null)

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierType | null>(null)

  const [orderFormSupplier, setOrderFormSupplier] = useState('')
  const [orderFormCreatedAt, setOrderFormCreatedAt] = useState('')
  const [orderFormExpectedDate, setOrderFormExpectedDate] = useState('')
  const [orderFormItems, setOrderFormItems] = useState<OrderItem[]>([{ name: '', qty: 1, price: 0 }])
  const [orderFormStatus, setOrderFormStatus] = useState<OrderType['status']>('brouillon')

  const [supplierFormName, setSupplierFormName] = useState('')
  const [supplierFormContact, setSupplierFormContact] = useState('')
  const [supplierFormPhone, setSupplierFormPhone] = useState('')
  const [supplierFormEmail, setSupplierFormEmail] = useState('')
  const [supplierFormAddress, setSupplierFormAddress] = useState('')
  const [supplierFormProducts, setSupplierFormProducts] = useState('')
  const [supplierFormStatus, setSupplierFormStatus] = useState<'active' | 'inactive'>('active')

  const filteredOrders = orders.filter(o => {
    const ms = `${o.orderNumber} ${o.supplier.name}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || o.status === statusFilter
    return ms && mf
  })

  const filteredSuppliers = suppliers.filter(s =>
    `${s.code} ${s.name} ${s.contact}`.toLowerCase().includes(search.toLowerCase())
  )

  const ordersPagination = usePagination(filteredOrders)
  const suppliersPagination = usePagination(filteredSuppliers)

  const totalPurchases = orders.filter(o => o.status === 'reçue').reduce((s, o) => s + o.total, 0)
  const pending = orders.filter(o => ['envoyée', 'confirmée'].includes(o.status)).length
  const received = orders.filter(o => o.status === 'reçue').length

  function openNewOrderModal() {
    setEditingOrder(null)
    setOrderFormSupplier('')
    setOrderFormCreatedAt(new Date().toISOString().split('T')[0])
    setOrderFormExpectedDate('')
    setOrderFormItems([{ name: '', qty: 1, price: 0 }])
    setOrderFormStatus('brouillon')
    setShowOrderModal(true)
  }

  function openEditOrderModal(order: OrderType) {
    setEditingOrder(order)
    setOrderFormSupplier(order.supplier.name)
    setOrderFormCreatedAt(order.createdAt)
    setOrderFormExpectedDate(order.expectedDate)
    setOrderFormItems(order.items.map(i => ({ ...i })))
    setOrderFormStatus(order.status)
    setShowOrderModal(true)
  }

  function handleSaveOrder() {
    const supplierObj = suppliers.find(s => s.name === orderFormSupplier) || { name: orderFormSupplier, phone: '' }
    const total = orderFormItems.reduce((s, i) => s + i.qty * i.price, 0)
    const data = {
      orderNumber: editingOrder ? editingOrder.orderNumber : getNextOrderNumber(orders),
      supplier: { name: supplierObj.name, phone: (supplierObj as any).phone || '' },
      items: orderFormItems.filter(i => i.name.trim()),
      total,
      status: orderFormStatus,
      createdAt: orderFormCreatedAt || new Date().toISOString().split('T')[0],
      expectedDate: orderFormExpectedDate,
    }
    if (editingOrder) {
      updateOrder(editingOrder.id, data)
    } else {
      addOrder(data)
    }
    setShowOrderModal(false)
  }

  function handleDeleteOrder(id: string) {
    if (window.confirm('Supprimer ce bon de commande ?')) {
      removeOrder(id)
      if (selectedOrder?.id === id) setSelectedOrder(null)
    }
  }

  function openNewSupplierModal() {
    setEditingSupplier(null)
    setSupplierFormName('')
    setSupplierFormContact('')
    setSupplierFormPhone('')
    setSupplierFormEmail('')
    setSupplierFormAddress('')
    setSupplierFormProducts('')
    setSupplierFormStatus('active')
    setShowSupplierModal(true)
  }

  function openEditSupplierModal(supplier: SupplierType) {
    setEditingSupplier(supplier)
    setSupplierFormName(supplier.name)
    setSupplierFormContact(supplier.contact)
    setSupplierFormPhone(supplier.phone)
    setSupplierFormEmail(supplier.email)
    setSupplierFormAddress(supplier.address)
    setSupplierFormProducts(supplier.products.join(', '))
    setSupplierFormStatus(supplier.status)
    setShowSupplierModal(true)
  }

  function handleSaveSupplier() {
    const data = {
      code: editingSupplier ? editingSupplier.code : getNextSupplierCode(suppliers),
      name: supplierFormName,
      contact: supplierFormContact,
      phone: supplierFormPhone,
      email: supplierFormEmail,
      address: supplierFormAddress,
      products: supplierFormProducts.split(',').map(p => p.trim()).filter(Boolean),
      totalPurchases: editingSupplier ? editingSupplier.totalPurchases : 0,
      status: supplierFormStatus,
    }
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, data)
    } else {
      addSupplier(data)
    }
    setShowSupplierModal(false)
  }

  function handleDeleteSupplier(id: string) {
    if (window.confirm('Supprimer ce fournisseur ?')) {
      removeSupplier(id)
      if (selectedSupplier?.id === id) setSelectedSupplier(null)
    }
  }

  function addOrderItem() {
    setOrderFormItems(prev => [...prev, { name: '', qty: 1, price: 0 }])
  }

  function removeOrderItem(index: number) {
    setOrderFormItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateOrderItem(index: number, field: keyof OrderItem, value: string | number) {
    setOrderFormItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Achats & Fournisseurs"
        subtitle="Gestion des bons de commande, réceptions et fournisseurs"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Achats' }]}
        icon={<Truck size={22} />}
        iconBg="gradient-warning"
        actions={
          <button onClick={tab === 'orders' ? openNewOrderModal : openNewSupplierModal}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
            <Plus size={15} /> {tab === 'orders' ? 'Bon de commande' : 'Fournisseur'}
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Achats réceptionnés" value={formatCurrency(totalPurchases)} icon={<Package size={20} />} gradient="gradient-success" />
        <KpiCard title="Commandes en attente" value={pending.toString()} icon={<ShoppingCart size={20} />} gradient="gradient-warning" />
        <KpiCard title="Réceptions du mois" value={received.toString()} icon={<Truck size={20} />} gradient="gradient-primary" />
        <KpiCard title="Fournisseurs actifs" value={suppliers.filter(s => s.status === 'active').length.toString()} icon={<Building2 size={20} />} gradient="gradient-teal" />
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[['orders', 'Bons de commande'], ['suppliers', 'Fournisseurs']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id as any); setSearch(''); setStatusFilter('all') }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === id ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {tab === 'orders' && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {[['all', 'Tous'], ['confirmée', 'Confirmées'], ['envoyée', 'Envoyées'], ['reçue', 'Reçues']].map(([v, l]) => (
                <button key={v} onClick={() => setStatusFilter(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
              ))}
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'orders' ? 'N° BC, fournisseur...' : 'Code, nom, contact...'}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
          </div>
          {tab === 'orders' ? (
            <ExportButton
              data={filteredOrders.map(o => ({ orderNumber: o.orderNumber, supplier: o.supplier.name, articles: o.items.map(i => `${i.qty}× ${i.name}`).join(', '), total: o.total, status: statusConfig[o.status]?.label || o.status, createdAt: o.createdAt, expectedDate: o.expectedDate }))}
              filename="achats-alba"
              title="Bons de Commande"
              headers={{ orderNumber: 'N° BC', supplier: 'Fournisseur', articles: 'Articles', total: 'Total', status: 'Statut', createdAt: 'Date commande', expectedDate: 'Livraison prévue' }}
            />
          ) : (
            <ExportButton
              data={filteredSuppliers}
              filename="fournisseurs-alba"
              title="Fournisseurs"
              headers={{ code: 'Code', name: 'Nom', contact: 'Contact', phone: 'Téléphone', email: 'Email', status: 'Statut' }}
            />
          )}
        </div>
      </div>

      {tab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['N° BC', 'Fournisseur', 'Articles', 'Total', 'Statut', 'Date commande', 'Livraison prévue', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordersPagination.paginatedItems.map(o => {
                  const st = statusConfig[o.status]
                  return (
                    <tr key={o.id} onClick={() => setSelectedOrder(o)}
                      className="hover:bg-amber-50/20 cursor-pointer group transition-colors">
                      <td className="px-4 py-3.5"><span className="font-mono text-xs font-bold text-amber-600">{o.orderNumber}</span></td>
                      <td className="px-4 py-3.5 text-xs font-medium text-gray-700">{o.supplier.name}</td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {o.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-gray-500">{item.qty}× {item.name}</p>
                          ))}
                          {o.items.length > 2 && <p className="text-[10px] text-gray-400">+{o.items.length - 2} autres</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-gray-800">{formatCurrency(o.total)}</td>
                      <td className="px-4 py-3.5"><StatusBadge label={st.label} type={st.type} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(o.expectedDate)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); openEditOrderModal(o) }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={13} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(o.id) }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Pagination
            currentPage={ordersPagination.currentPage}
            totalPages={ordersPagination.totalPages}
            totalItems={ordersPagination.totalItems}
            pageSize={ordersPagination.pageSize}
            onPageChange={ordersPagination.setCurrentPage}
            onPageSizeChange={ordersPagination.setPageSize}
          />
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliersPagination.paginatedItems.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-amber-600">{s.code}</span>
                    <StatusBadge label={s.status === 'active' ? 'Actif' : 'Inactif'} type={s.status === 'active' ? 'success' : 'danger'} dot={false} />
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.contact}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Building2 size={18} className="text-amber-600" />
                </div>
              </div>
              <div className="space-y-1.5 mb-3">
                <p className="text-xs text-gray-600 flex items-center gap-1.5">📞 {s.phone}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5">✉️ {s.email}</p>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {s.products.map((p, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{p}</span>
                ))}
              </div>
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Achats totaux</p>
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(s.totalPurchases)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditSupplierModal(s)}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={13} /></button>
                  <button onClick={() => handleDeleteSupplier(s.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Pagination
            currentPage={suppliersPagination.currentPage}
            totalPages={suppliersPagination.totalPages}
            totalItems={suppliersPagination.totalItems}
            pageSize={suppliersPagination.pageSize}
            onPageChange={suppliersPagination.setCurrentPage}
            onPageSizeChange={suppliersPagination.setPageSize}
          />
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelectedOrder(null)}>
          <div className="w-[460px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg,#92400E,#D97706)' }}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-amber-200 text-xs">Bon de commande</p>
                  <h3 className="text-xl font-bold">{selectedOrder.orderNumber}</h3>
                  <p className="text-amber-100 text-sm">{selectedOrder.supplier.name}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <StatusBadge label={statusConfig[selectedOrder.status].label} type={statusConfig[selectedOrder.status].type} />
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Articles commandés</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.qty} unités × {formatCurrency(item.price)}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(item.qty * item.price)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3 mt-2">
                  <p className="text-sm font-bold text-amber-800">Total</p>
                  <p className="text-lg font-bold text-amber-700">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Date commande', value: formatDate(selectedOrder.createdAt) },
                  { label: 'Livraison prévue', value: formatDate(selectedOrder.expectedDate) },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {selectedOrder.status !== 'reçue' && (
                  <button onClick={() => { updateOrder(selectedOrder.id, { status: 'reçue' }); setSelectedOrder({ ...selectedOrder, status: 'reçue' }) }}
                    className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                    ✓ Confirmer réception
                  </button>
                )}
                <button onClick={() => { openEditOrderModal(selectedOrder); setSelectedOrder(null) }}
                  className="flex-1 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOrderModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowOrderModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingOrder ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}</h3>
              <button onClick={() => setShowOrderModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur *</label>
                <select value={orderFormSupplier} onChange={e => setOrderFormSupplier(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                  <option value="">Choisir un fournisseur...</option>
                  {suppliers.filter(s => s.status === 'active').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date commande</label>
                  <input type="date" value={orderFormCreatedAt} onChange={e => setOrderFormCreatedAt(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date livraison souhaitée</label>
                  <input type="date" value={orderFormExpectedDate} onChange={e => setOrderFormExpectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select value={orderFormStatus} onChange={e => setOrderFormStatus(e.target.value as OrderType['status'])}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                  {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Articles</label>
                <div className="border border-gray-200 rounded-xl p-3 space-y-2">
                  {orderFormItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2">
                      <div className="col-span-2">
                        <input value={item.name} onChange={e => updateOrderItem(i, 'name', e.target.value)}
                          placeholder="Désignation" className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      </div>
                      <input type="number" value={item.qty} min={1}
                        onChange={e => updateOrderItem(i, 'qty', parseInt(e.target.value, 10) || 1)}
                        placeholder="Qté" className="px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <input type="number" value={item.price} min={0}
                        onChange={e => updateOrderItem(i, 'price', parseInt(e.target.value, 10) || 0)}
                        placeholder="Prix unit." className="px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{formatCurrency(item.qty * item.price)}</span>
                        {orderFormItems.length > 1 && (
                          <button onClick={() => removeOrderItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addOrderItem}
                    className="w-full py-2 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                    + Ajouter un article
                  </button>
                </div>
                <p className="text-right text-xs font-bold text-amber-700 mt-2">
                  Total : {formatCurrency(orderFormItems.reduce((s, i) => s + i.qty * i.price, 0))}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowOrderModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSaveOrder} disabled={!orderFormSupplier}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
                  {editingOrder ? 'Enregistrer' : 'Créer le BC'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSupplierModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h3>
              <button onClick={() => setShowSupplierModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                <input value={supplierFormName} onChange={e => setSupplierFormName(e.target.value)}
                  placeholder="Nom du fournisseur" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                <input value={supplierFormContact} onChange={e => setSupplierFormContact(e.target.value)}
                  placeholder="Nom du contact" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={supplierFormPhone} onChange={e => setSupplierFormPhone(e.target.value)}
                    placeholder="+243 ..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input value={supplierFormEmail} onChange={e => setSupplierFormEmail(e.target.value)}
                    placeholder="email@..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
                <input value={supplierFormAddress} onChange={e => setSupplierFormAddress(e.target.value)}
                  placeholder="Adresse" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Produits (séparés par virgule)</label>
                <input value={supplierFormProducts} onChange={e => setSupplierFormProducts(e.target.value)}
                  placeholder="Papier, Papeterie, ..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                <select value={supplierFormStatus} onChange={e => setSupplierFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSaveSupplier} disabled={!supplierFormName}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#D97706,#F59E0B)' }}>
                  {editingSupplier ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
