import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatCurrency } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Package, Plus, Search, AlertTriangle, RefreshCw, Edit, Eye, Trash2, CheckCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type Consumable = {
  id: string
  code: string
  name: string
  category: string
  unit: string
  stock: number
  minStock: number
  price: number
  supplier: string
  location: string
}

const MOCK_CONSUMABLES: Consumable[] = [
  { id: '1', code: 'CON-001', name: 'Encre noire HP', category: 'Encres', unit: 'Cartouche', stock: 25, minStock: 10, price: 25000, supplier: 'Tech Store', location: 'Magasin A' },
  { id: '2', code: 'CON-002', name: 'Encre couleur Epson', category: 'Encres', unit: 'Cartouche', stock: 18, minStock: 15, price: 32000, supplier: 'Tech Store', location: 'Magasin A' },
  { id: '3', code: 'CON-003', name: 'Toner HP LaserJet', category: 'Encres', unit: 'Cartouche', stock: 5, minStock: 8, price: 85000, supplier: 'Tech Store', location: 'Armoire Technique' },
  { id: '4', code: 'CON-004', name: 'Papier A4 80g', category: 'Papier', unit: 'Rame', stock: 200, minStock: 50, price: 8000, supplier: 'ABC Fournitures', location: 'Magasin Central' },
  { id: '5', code: 'CON-005', name: 'Papier A3 80g', category: 'Papier', unit: 'Rame', stock: 45, minStock: 30, price: 14000, supplier: 'ABC Fournitures', location: 'Magasin Central' },
  { id: '6', code: 'CON-006', name: 'Papier photo brillant', category: 'Papier', unit: 'Feuille', stock: 500, minStock: 200, price: 500, supplier: 'ABC Fournitures', location: 'Magasin Central' },
  { id: '7', code: 'CON-007', name: 'Spirales reliure', category: 'Finition', unit: 'Boîte', stock: 25, minStock: 30, price: 5000, supplier: 'Bureau Plus', location: 'Atelier' },
  { id: '8', code: 'CON-008', name: 'Films plastification A4', category: 'Finition', unit: 'Pièce', stock: 12, minStock: 50, price: 2000, supplier: 'Plastique Plus', location: 'Atelier' },
  { id: '9', code: 'CON-009', name: 'Agrafes 26/6', category: 'Finition', unit: 'Boîte', stock: 40, minStock: 15, price: 3000, supplier: 'Bureau Plus', location: 'Atelier' },
  { id: '10', code: 'CON-010', name: 'Colle universelle', category: 'Finition', unit: 'Tube', stock: 30, minStock: 10, price: 2000, supplier: 'Bureau Plus', location: 'Atelier' },
  { id: '11', code: 'CON-011', name: 'Câble réseau Cat6', category: 'Informatique', unit: 'Mètre', stock: 200, minStock: 50, price: 800, supplier: 'Tech Store', location: 'Salle Serveurs' },
  { id: '12', code: 'CON-012', name: 'Clavier USB', category: 'Informatique', unit: 'Pièce', stock: 8, minStock: 5, price: 12000, supplier: 'Tech Store', location: 'Magasin B' },
]

const consumptionData = [
  { month: 'Jan', encres: 12, papier: 45, finition: 15 },
  { month: 'Fév', encres: 15, papier: 52, finition: 18 },
  { month: 'Mar', encres: 10, papier: 48, finition: 12 },
  { month: 'Avr', encres: 18, papier: 65, finition: 22 },
  { month: 'Mai', encres: 20, papier: 70, finition: 25 },
  { month: 'Jun', encres: 16, papier: 58, finition: 20 },
  { month: 'Jul', encres: 14, papier: 55, finition: 17 },
]

const categories = ['Tout', 'Encres', 'Papier', 'Finition', 'Informatique']

const EMPTY_FORM = {
  code: '', name: '', category: 'Encres', unit: '', stock: 0, minStock: 0, price: 0, supplier: '', location: ''
}

interface Toast { message: string; type: 'success' | 'error' }

export default function ConsumablesPage() {
  const { items: consumables, add, update, remove } = useMockDB<Consumable>('alba-consumables', MOCK_CONSUMABLES)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tout')
  const [selected, setSelected] = useState<Consumable | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (item: Consumable) => {
    setEditingId(item.id)
    setForm({
      code: item.code, name: item.name, category: item.category, unit: item.unit,
      stock: item.stock, minStock: item.minStock, price: item.price, supplier: item.supplier, location: item.location
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) { showToast('Nom du produit requis', 'error'); return }
    if (editingId) {
      update(editingId, { ...form })
      showToast(`"${form.name}" modifié`)
    } else {
      add({
        code: form.code || `CON-${String(consumables.length + 1).padStart(3, '0')}`,
        ...form
      })
      showToast(`"${form.name}" ajouté`)
    }
    setShowModal(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = (id: string) => {
    const item = consumables.find(c => c.id === id)
    if (window.confirm(`Supprimer "${item?.name}" ?`)) {
      remove(id)
      showToast(`"${item?.name}" supprimé`, 'error')
    }
  }

  const setField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const filtered = consumables.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'Tout' || c.category === activeCategory
    return matchSearch && matchCategory
  })

  const {
    currentPage, setCurrentPage, pageSize, setPageSize,
    totalPages, paginatedItems, totalItems
  } = usePagination(filtered)

  const lowStock = consumables.filter(c => c.stock <= c.minStock).length
  const totalValue = consumables.reduce((s, c) => s + c.stock * c.price, 0)
  const catCount = new Set(consumables.map(c => c.category)).size

  const stockLevel = (stock: number, min: number) => {
    if (stock <= min) return { color: 'text-red-600 bg-red-50', bar: 'bg-red-500', label: 'Faible' }
    if (stock <= min * 1.5) return { color: 'text-amber-600 bg-amber-50', bar: 'bg-amber-500', label: 'Moyen' }
    return { color: 'text-green-600 bg-green-50', bar: 'bg-green-500', label: 'Bon' }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'gradient-success' : 'gradient-danger'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Consommables d'Impression"
        subtitle="Gestion des encres, papiers et fournitures de production"
        icon={<Package size={22} />}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white gradient-primary rounded-xl transition-opacity hover:opacity-90">
            <Plus size={16} /> Nouveau
          </button>
        }
      />

      {lowStock > 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-bold">{lowStock}</span> produit{lowStock > 1 ? 's' : ''} en stock faible — réapprovisionnement recommandé
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total produits" value={consumables.length} icon={<Package size={20} />} gradient="gradient-primary" />
        <KpiCard title="Stock faible" value={lowStock} icon={<AlertTriangle size={20} />} gradient="gradient-warning" />
        <KpiCard title="Valeur stock" value={formatCurrency(totalValue)} icon={<RefreshCw size={20} />} gradient="gradient-success" />
        <KpiCard title="Catégories" value={catCount} icon={<Package size={20} />} gradient="gradient-purple" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Consommation mensuelle</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={consumptionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
            <Bar dataKey="encres" fill="#2563EB" radius={[4, 4, 0, 0]} name="Encres" />
            <Bar dataKey="papier" fill="#22C55E" radius={[4, 4, 0, 0]} name="Papier" />
            <Bar dataKey="finition" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Finition" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">Inventaire</h3>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-48" />
            </div>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <ExportButton
              data={filtered}
              filename="consommables-alba"
              title="Consommables"
              headers={{ code: 'Code', name: 'Nom', category: 'Catégorie', unit: 'Unité', stock: 'Stock', minStock: 'Stock minimum', price: 'Prix (FC)', supplier: 'Fournisseur', location: 'Emplacement' }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Code</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Nom</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Catégorie</th>
                <th className="text-center px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-center px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Niveau</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Prix</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Fournisseur</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(item => {
                const level = stockLevel(item.stock, item.minStock)
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3"><span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{item.code}</span></td>
                    <td className="px-6 py-3 text-xs font-semibold text-gray-800">{item.name}</td>
                    <td className="px-6 py-3"><span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{item.category}</span></td>
                    <td className="px-6 py-3 text-center text-xs font-bold text-gray-800">{item.stock} {item.unit}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.color}`}>{level.label}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-xs text-gray-600">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-3 text-xs text-gray-500">{item.supplier}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={13} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Edit size={13} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl animate-slide-in overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Détails du produit</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-gray-800">{selected.name}</h4>
                <p className="text-xs text-gray-500">{selected.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Catégorie', value: selected.category },
                  { label: 'Unité', value: selected.unit },
                  { label: 'Stock actuel', value: `${selected.stock} ${selected.unit}` },
                  { label: 'Stock minimum', value: `${selected.minStock} ${selected.unit}` },
                  { label: 'Prix unitaire', value: formatCurrency(selected.price) },
                  { label: 'Fournisseur', value: selected.supplier },
                  { label: 'Emplacement', value: selected.location },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingId ? 'Modifier consommable' : 'Nouveau consommable'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input type="text" value={form.code} onChange={e => setField('code', e.target.value)} placeholder="CON-XXX"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Nom du produit"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                  <select value={form.category} onChange={e => setField('category', e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option>Encres</option><option>Papier</option><option>Finition</option><option>Informatique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unité</label>
                  <input type="text" value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="Unité"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock actuel</label>
                  <input type="number" value={form.stock || ''} onChange={e => setField('stock', Number(e.target.value))} placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock minimum</label>
                  <input type="number" value={form.minStock || ''} onChange={e => setField('minStock', Number(e.target.value))} placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prix unitaire (FC)</label>
                  <input type="number" value={form.price || ''} onChange={e => setField('price', Number(e.target.value))} placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fournisseur</label>
                  <input type="text" value={form.supplier} onChange={e => setField('supplier', e.target.value)} placeholder="Fournisseur"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Emplacement</label>
                <input type="text" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="Emplacement"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
              <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-white gradient-primary rounded-xl hover:opacity-90">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
