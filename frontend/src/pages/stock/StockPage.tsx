import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { formatCurrency } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { useAuth } from '@/hooks/useAuth'
import {
  Package, Plus, Search, AlertTriangle, TrendingDown,
  TrendingUp, BarChart2, RefreshCw, Edit, Eye, Trash2, X, Minus
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface ProductType {
  id: string
  code: string
  name: string
  category: string
  unit: string
  purchasePrice: number
  salePrice: number
  currentStock: number
  minStock: number
  supplier: string
  location: string
}

const CONSUMPTION_DATA = [
  { month: 'Jan', papier: 4200, consommables: 1800, finition: 1200 },
  { month: 'Fév', papier: 3800, consommables: 2100, finition: 1400 },
  { month: 'Mar', papier: 5100, consommables: 1900, finition: 1100 },
  { month: 'Avr', papier: 4600, consommables: 2400, finition: 1600 },
  { month: 'Mai', papier: 5500, consommables: 2200, finition: 1300 },
  { month: 'Jun', papier: 4900, consommables: 2600, finition: 1500 },
]

const CATEGORIES = ['Papier', 'Carton', 'Encre', 'Finition']

const EMPTY_FORM: Omit<ProductType, 'id'> = {
  code: '', name: '', category: 'Papier', unit: 'pièce',
  purchasePrice: 0, salePrice: 0, currentStock: 0, minStock: 0,
  supplier: '', location: ''
}

function generateCode(items: ProductType[]): string {
  const nums = items.map(p => parseInt(p.code.replace('PRD-', ''), 10)).filter(n => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `PRD-${String(next).padStart(3, '0')}`
}

function mapProduct(raw: any): ProductType {
  return {
    id: raw.id,
    code: raw.code || raw.sku || '',
    name: raw.name || '',
    category: typeof raw.category === 'object' ? raw.category?.name || '' : raw.category || '',
    unit: typeof raw.unit === 'object' ? raw.unit?.name || '' : raw.unit || 'pièce',
    purchasePrice: raw.purchasePrice || raw.costPrice || 0,
    salePrice: raw.sellingPrice || raw.price || 0,
    currentStock: raw.currentStock ?? raw.quantity ?? 0,
    minStock: raw.minStock || 0,
    supplier: typeof raw.supplier === 'object' ? raw.supplier?.name || '' : raw.supplier || '',
    location: raw.location || '',
  }
}

export default function StockPage() {
  const { user, can } = useAuth()
  const { items, add, update, remove, loading, error } = useApiDB<ProductType>('/stock/products', [], mapProduct)
  const canEdit = user?.role?.name === 'Super Admin' || user?.role?.name === 'Administrateur' || can('stock.manage')

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [tab, setTab] = useState<'all' | 'low' | 'ok'>('all')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<ProductType, 'id'>>(EMPTY_FORM)

  const [stockModal, setStockModal] = useState<'entry' | 'exit' | null>(null)
  const [stockTarget, setStockTarget] = useState<ProductType | null>(null)
  const [stockQty, setStockQty] = useState('')

  const alerts = items.filter(p => p.currentStock <= p.minStock)
  const categories = [...new Set(items.map(p => p.category))]
  const totalValue = items.reduce((s, p) => s + p.currentStock * p.purchasePrice, 0)

  const filtered = items.filter(p => {
    const ms = `${p.name} ${p.code} ${p.category} ${p.supplier}`.toLowerCase().includes(search.toLowerCase())
    const mc = catFilter === 'all' || p.category === catFilter
    const mt = tab === 'all' ? true : tab === 'low' ? p.currentStock <= p.minStock : p.currentStock > p.minStock
    return ms && mc && mt
  })

  const pagination = usePagination(filtered)

  function stockLevel(p: ProductType) {
    const ratio = p.currentStock / p.minStock
    if (ratio <= 0.3) return { color: 'bg-red-500', label: 'Critique', type: 'danger' as const }
    if (ratio <= 0.7) return { color: 'bg-orange-500', label: 'Faible', type: 'warning' as const }
    if (ratio <= 1) return { color: 'bg-yellow-500', label: 'Limite', type: 'warning' as const }
    return { color: 'bg-green-500', label: 'Normal', type: 'success' as const }
  }

  function openNew() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, code: generateCode(items) })
    setShowModal(true)
  }

  function openEdit(p: ProductType) {
    setEditingId(p.id)
    setForm({ code: p.code, name: p.name, category: p.category, unit: p.unit, purchasePrice: p.purchasePrice, salePrice: p.salePrice, currentStock: p.currentStock, minStock: p.minStock, supplier: p.supplier, location: p.location })
    setShowModal(true)
  }

  async function handleSaveProduct() {
    if (!form.name.trim() || !form.code.trim()) return
    if (editingId) {
      await update(editingId, form)
    } else {
      await add({ ...form, code: form.code || generateCode(items) })
    }
    setShowModal(false)
  }

  function openStockModal(type: 'entry' | 'exit', p: ProductType) {
    setStockTarget(p)
    setStockModal(type)
    setStockQty('')
  }

  async function handleStockAdjust() {
    if (!stockTarget) return
    const qty = parseInt(stockQty, 10)
    if (isNaN(qty) || qty <= 0) return
    const newStock = stockModal === 'entry'
      ? stockTarget.currentStock + qty
      : Math.max(0, stockTarget.currentStock - qty)
    await update(stockTarget.id, { currentStock: newStock })
    setStockModal(null)
    setStockTarget(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    await remove(id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Stocks"
        subtitle="Suivi en temps réel des produits et consommables"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Stock' }]}
        icon={<Package size={22} />}
        iconBg="gradient-warning"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered}
              filename="stock-alba"
              title="Gestion de Stock"
              headers={{ name: 'Produit', category: 'Catégorie', currentStock: 'Stock actuel', minStock: 'Stock min', purchasePrice: 'Prix achat', supplier: 'Fournisseur', location: 'Emplacement' }}
            />
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              <RefreshCw size={15} /> Inventaire
            </button>
            {canEdit && (
              <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                <Plus size={15} /> Nouveau produit
              </button>
            )}
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-sm text-gray-500">Chargement des données...</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          ⚠ {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total produits" value={items.length.toString()} icon={<Package size={20} />} gradient="gradient-primary" />
        <KpiCard title="Valeur du stock" value={`${(totalValue / 1000000).toFixed(1)}M FC`} icon={<TrendingUp size={20} />} gradient="gradient-success" />
        <KpiCard title="Alertes stock" value={alerts.length.toString()} icon={<AlertTriangle size={20} />} gradient="gradient-danger" />
        <KpiCard title="Catégories" value={categories.length.toString()} icon={<BarChart2 size={20} />} gradient="gradient-teal" />
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
            <h3 className="font-semibold text-red-800 text-sm">{alerts.length} produit(s) en alerte de stock</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {alerts.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-red-100">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-600">{p.currentStock} {p.unit}</p>
                  <p className="text-[10px] text-gray-400">min: {p.minStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Consommation mensuelle</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CONSUMPTION_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="papier" name="Papier" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consommables" name="Consommables" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="finition" name="Finition" fill="#22C55E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock by category */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Stock par catégorie</h3>
          <div className="space-y-3">
            {categories.map(cat => {
              const prods = items.filter(p => p.category === cat)
              const val = prods.reduce((s, p) => s + p.currentStock * p.purchasePrice, 0)
              const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{cat}</span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1E3A8A, #2563EB)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {([['all', 'Tous'], ['low', '⚠ Stock faible'], ['ok', '✓ Normal']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTab(v as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${tab === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Produit, code, fournisseur..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Toutes catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Produit', 'Catégorie', 'Stock actuel', 'Stock min', 'Niveau', 'Prix achat', 'Fournisseur', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagination.paginatedItems.map(product => {
                const level = stockLevel(product)
                const pct = Math.min((product.currentStock / product.minStock) * 100, 100)
                return (
                  <tr key={product.id} className="hover:bg-amber-50/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{product.name}</p>
                        <p className="text-gray-400 text-[10px] font-mono">{product.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600">{product.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${product.currentStock <= product.minStock ? 'text-red-600' : 'text-gray-700'}`}>
                        {product.currentStock} {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{product.minStock} {product.unit}</span>
                    </td>
                    <td className="px-4 py-3.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${level.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <StatusBadge label={level.label} type={level.type} dot={false} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-gray-700">{formatCurrency(product.purchasePrice)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{product.supplier}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {canEdit ? (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir/Modifier"><Eye size={13} /></button>
                          <button onClick={() => openEdit(product)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Éditer"><Edit size={13} /></button>
                          <button onClick={() => openStockModal('entry', product)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Entrée stock"><TrendingUp size={13} /></button>
                          <button onClick={() => openStockModal('exit', product)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Sortie stock"><TrendingDown size={13} /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={13} /></button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] text-gray-500 bg-gray-50">Lecture seule</span>
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
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>

      {/* Product modal (create / edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editingId ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Nom du produit" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="PRD-XXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unité</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="pièce, lot..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prix d'achat (FC)</label>
                  <input type="number" value={form.purchasePrice || ''} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Prix de vente (FC)</label>
                  <input type="number" value={form.salePrice || ''} onChange={e => setForm({ ...form, salePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stock actuel</label>
                  <input type="number" value={form.currentStock || ''} onChange={e => setForm({ ...form, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stock minimum</label>
                  <input type="number" value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fournisseur</label>
                <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Nom du fournisseur" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emplacement</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Entrepôt, rayon..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={handleSaveProduct}
                disabled={!form.name.trim() || !form.code.trim()}
                className="px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                {editingId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock adjustment modal (entry / exit) */}
      {stockModal && stockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {stockModal === 'entry' ? 'Entrée de stock' : 'Sortie de stock'}
              </h3>
              <button onClick={() => setStockModal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{stockTarget.name}</p>
                <p className="text-xs text-gray-400">Stock actuel : {stockTarget.currentStock} {stockTarget.unit}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantité</label>
                <input type="number" min="1" value={stockQty} onChange={e => setStockQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Quantité à ajouter" />
              </div>
              {stockQty && parseInt(stockQty, 10) > 0 && (
                <p className="text-xs text-gray-500">
                  Nouveau stock : <span className="font-bold text-gray-800">
                    {stockModal === 'entry'
                      ? stockTarget.currentStock + parseInt(stockQty, 10)
                      : Math.max(0, stockTarget.currentStock - parseInt(stockQty, 10))
                    } {stockTarget.unit}
                  </span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setStockModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={handleStockAdjust}
                disabled={!stockQty || parseInt(stockQty, 10) <= 0}
                className={`px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm disabled:opacity-40 ${stockModal === 'entry' ? 'bg-green-600' : 'bg-red-500'}`}>
                {stockModal === 'entry' ? <span className="flex items-center gap-1"><TrendingUp size={14} /> Enregistrer</span> : <span className="flex items-center gap-1"><Minus size={14} /> Enregistrer</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
