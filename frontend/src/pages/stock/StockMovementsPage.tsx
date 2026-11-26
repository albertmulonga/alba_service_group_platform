import React, { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  ArrowRightLeft, Plus, Search, X, TrendingUp, TrendingDown,
  RefreshCw, RotateCcw, Package, DollarSign, Filter
} from 'lucide-react'

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

interface MovementType {
  id: string
  date: string
  productId: string
  productName: string
  type: 'Entrée' | 'Sortie' | 'Transfert' | 'Ajustement'
  quantity: number
  motif: string
  reference: string
  operator: string
}

const DEFAULT_PRODUCTS: ProductType[] = [
  { id: 'prd-1', code: 'PRD-001', name: 'Papier A4 80g', category: 'Papier', unit: 'ramette', purchasePrice: 8500, salePrice: 12000, currentStock: 120, minStock: 50, supplier: 'Agence Congo Papier', location: 'Entrepôt A - Rayon 1' },
  { id: 'prd-2', code: 'PRD-002', name: 'Carton ondulé 1m', category: 'Carton', unit: 'feuille', purchasePrice: 2500, salePrice: 4000, currentStock: 35, minStock: 40, supplier: 'PackPlus SARL', location: 'Entrepôt A - Rayon 3' },
  { id: 'prd-3', code: 'PRD-003', name: 'Encre noire HP', category: 'Encre', unit: 'cartouche', purchasePrice: 15000, salePrice: 22000, currentStock: 18, minStock: 20, supplier: 'TechSupply Kinshasa', location: 'Entrepôt B - Étagère 2' },
  { id: 'prd-4', code: 'PRD-004', name: 'Ruban adhésif 48mm', category: 'Finition', unit: 'rouleau', purchasePrice: 3000, salePrice: 5000, currentStock: 80, minStock: 30, supplier: 'Fournitures Plus', location: 'Entrepôt A - Rayon 5' },
  { id: 'prd-5', code: 'PRD-005', name: 'Ciseaux professionnels', category: 'Finition', unit: 'pièce', purchasePrice: 7500, salePrice: 12000, currentStock: 12, minStock: 10, supplier: 'OutiPro Congo', location: 'Entrepôt B - Étagère 1' },
  { id: 'prd-6', code: 'PRD-006', name: 'Stylos bille (lot 50)', category: 'Papier', unit: 'lot', purchasePrice: 12000, salePrice: 18000, currentStock: 25, minStock: 15, supplier: 'Agence Congo Papier', location: 'Entrepôt A - Rayon 2' },
  { id: 'prd-7', code: 'PRD-007', name: 'Film plastique 30cm', category: 'Finition', unit: 'rouleau', purchasePrice: 4500, salePrice: 7000, currentStock: 5, minStock: 10, supplier: 'PackPlus SARL', location: 'Entrepôt A - Rayon 4' },
  { id: 'prd-8', code: 'PRD-008', name: 'Colle bâton (lot 12)', category: 'Finition', unit: 'lot', purchasePrice: 9000, salePrice: 14000, currentStock: 30, minStock: 20, supplier: 'Fournitures Plus', location: 'Entrepôt B - Étagère 3' },
]

const DEFAULT_MOVEMENTS: MovementType[] = [
  { id: 'mov-001', date: '2026-08-18T09:15:00', productId: 'prd-1', productName: 'Papier A4 80g', type: 'Entrée', quantity: 50, motif: 'Réapprovisionnement fournisseur', reference: 'BL-2026-0412', operator: 'Jean Mukendi' },
  { id: 'mov-002', date: '2026-08-18T11:30:00', productId: 'prd-3', productName: 'Encre noire HP', type: 'Sortie', quantity: 3, motif: 'Commande client CMD-2089', reference: 'BC-2026-0891', operator: 'Marie Tshala' },
  { id: 'mov-003', date: '2026-08-17T14:45:00', productId: 'prd-4', productName: 'Ruban adhésif 48mm', type: 'Sortie', quantity: 10, motif: 'Utilisation atelier impression', reference: 'BC-2026-0890', operator: 'Pierre Luyeye' },
  { id: 'mov-004', date: '2026-08-17T08:00:00', productId: 'prd-2', productName: 'Carton ondulé 1m', type: 'Entrée', quantity: 30, motif: 'Commande fournisseur PackPlus', reference: 'BL-2026-0411', operator: 'Jean Mukendi' },
  { id: 'mov-005', date: '2026-08-16T16:20:00', productId: 'prd-5', productName: 'Ciseaux professionnels', type: 'Transfert', quantity: 2, motif: 'Transfert Entrepôt B vers Entropôt A', reference: 'TR-2026-0034', operator: 'Luc Kasongo' },
  { id: 'mov-006', date: '2026-08-16T10:10:00', productId: 'prd-6', productName: 'Stylos bille (lot 50)', type: 'Sortie', quantity: 5, motif: 'Fourniture bureau secrétariat', reference: 'BC-2026-0888', operator: 'Marie Tshala' },
  { id: 'mov-007', date: '2026-08-15T15:30:00', productId: 'prd-1', productName: 'Papier A4 80g', type: 'Sortie', quantity: 20, motif: 'Commande client CMD-2085', reference: 'BC-2026-0887', operator: 'Jean Mukendi' },
  { id: 'mov-008', date: '2026-08-15T09:45:00', productId: 'prd-7', productName: 'Film plastique 30cm', type: 'Ajustement', quantity: -3, motif: 'Inventaire physique - écart constaté', reference: 'AJ-2026-0012', operator: 'Pierre Luyeye' },
  { id: 'mov-009', date: '2026-08-14T13:00:00', productId: 'prd-8', productName: 'Colle bâton (lot 12)', type: 'Entrée', quantity: 15, motif: 'Réapprovisionnement Fournitures Plus', reference: 'BL-2026-0410', operator: 'Luc Kasongo' },
  { id: 'mov-010', date: '2026-08-14T11:20:00', productId: 'prd-4', productName: 'Ruban adhésif 48mm', type: 'Sortie', quantity: 8, motif: 'Commande client CMD-2083', reference: 'BC-2026-0885', operator: 'Marie Tshala' },
  { id: 'mov-011', date: '2026-08-13T14:15:00', productId: 'prd-3', productName: 'Encre noire HP', type: 'Entrée', quantity: 10, motif: 'Commande TechSupply Kinshasa', reference: 'BL-2026-0409', operator: 'Jean Mukendi' },
  { id: 'mov-012', date: '2026-08-13T09:00:00', productId: 'prd-1', productName: 'Papier A4 80g', type: 'Sortie', quantity: 15, motif: 'Commande client CMD-2080', reference: 'BC-2026-0883', operator: 'Pierre Luyeye' },
  { id: 'mov-013', date: '2026-08-12T16:45:00', productId: 'prd-6', productName: 'Stylos bille (lot 50)', type: 'Transfert', quantity: 3, motif: 'Transfert vers agence Lubumbashi', reference: 'TR-2026-0033', operator: 'Luc Kasongo' },
  { id: 'mov-014', date: '2026-08-12T10:30:00', productId: 'prd-2', productName: 'Carton ondulé 1m', type: 'Sortie', quantity: 12, motif: 'Emballage commandes export', reference: 'BC-2026-0881', operator: 'Marie Tshala' },
  { id: 'mov-015', date: '2026-08-11T08:15:00', productId: 'prd-5', productName: 'Ciseaux professionnels', type: 'Sortie', quantity: 1, motif: 'Remplacement matériel usé', reference: 'BC-2026-0879', operator: 'Jean Mukendi' },
  { id: 'mov-016', date: '2026-08-11T14:00:00', productId: 'prd-4', productName: 'Ruban adhésif 48mm', type: 'Entrée', quantity: 25, motif: 'Réapprovisionnement mensuel', reference: 'BL-2026-0408', operator: 'Pierre Luyeye' },
  { id: 'mov-017', date: '2026-08-10T11:00:00', productId: 'prd-8', productName: 'Colle bâton (lot 12)', type: 'Sortie', quantity: 5, motif: 'Commande client CMD-2076', reference: 'BC-2026-0877', operator: 'Luc Kasongo' },
  { id: 'mov-018', date: '2026-08-10T09:30:00', productId: 'prd-1', productName: 'Papier A4 80g', type: 'Ajustement', quantity: 5, motif: 'Correction inventaire - stock oublié', reference: 'AJ-2026-0011', operator: 'Marie Tshala' },
  { id: 'mov-019', date: '2026-08-09T15:00:00', productId: 'prd-7', productName: 'Film plastique 30cm', type: 'Entrée', quantity: 12, motif: 'Commande fournisseur PackPlus', reference: 'BL-2026-0407', operator: 'Jean Mukendi' },
  { id: 'mov-020', date: '2026-08-09T10:45:00', productId: 'prd-3', productName: 'Encre noire HP', type: 'Sortie', quantity: 4, motif: 'Commande client CMD-2074', reference: 'BC-2026-0875', operator: 'Pierre Luyeye' },
  { id: 'mov-021', date: '2026-08-08T14:30:00', productId: 'prd-2', productName: 'Carton ondulé 1m', type: 'Entrée', quantity: 20, motif: 'Réapprovisionnement urgent', reference: 'BL-2026-0406', operator: 'Luc Kasongo' },
  { id: 'mov-022', date: '2026-08-08T08:00:00', productId: 'prd-6', productName: 'Stylos bille (lot 50)', type: 'Sortie', quantity: 2, motif: 'Fourniture nouveau employé', reference: 'BC-2026-0873', operator: 'Marie Tshala' },
  { id: 'mov-023', date: '2026-08-07T16:00:00', productId: 'prd-5', productName: 'Ciseaux professionnels', type: 'Ajustement', quantity: -1, motif: 'Inventaire - pièce endommagée', reference: 'AJ-2026-0010', operator: 'Jean Mukendi' },
  { id: 'mov-024', date: '2026-08-07T11:15:00', productId: 'prd-4', productName: 'Ruban adhésif 48mm', type: 'Transfert', quantity: 5, motif: 'Transfert Entrepôt A vers atelier', reference: 'TR-2026-0032', operator: 'Pierre Luyeye' },
  { id: 'mov-025', date: '2026-08-06T09:00:00', productId: 'prd-1', productName: 'Papier A4 80g', type: 'Sortie', quantity: 25, motif: 'Gros commandes cumulées', reference: 'BC-2026-0871', operator: 'Luc Kasongo' },
]

const MOVEMENT_TYPES = ['Entrée', 'Sortie', 'Transfert', 'Ajustement'] as const
const OPERATORS = ['Jean Mukendi', 'Marie Tshala', 'Pierre Luyeye', 'Luc Kasongo']

const TYPE_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'Entrée': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Sortie': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Transfert': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Ajustement': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
}

function generateMovCode(items: MovementType[]): string {
  const nums = items.map(m => parseInt(m.id.replace('mov-', ''), 10)).filter(n => !isNaN(n))
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
  return `mov-${String(next).padStart(3, '0')}`
}

export default function StockMovementsPage() {
  const { items: movements, add: addMovement, loading, error, refresh } = useApiDB<MovementType>('/stock/stock-movements', [], (raw: any) => ({ ...raw }))
  const { items: stockProducts, update: updateStock, refresh: refreshStock } = useApiDB<ProductType>('/stock/products', [], (raw: any) => ({ ...raw }))

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    type: 'Entrée' as MovementType['type'],
    productId: '',
    quantity: '',
    motif: '',
    reference: '',
    operator: OPERATORS[0],
  })

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const ms = `${m.productName} ${m.reference} ${m.motif} ${m.operator}`.toLowerCase().includes(search.toLowerCase())
      const mt = typeFilter === 'all' || m.type === typeFilter
      const mp = productFilter === 'all' || m.productId === productFilter
      const mDate = m.date.slice(0, 10)
      const mdf = !dateFrom || mDate >= dateFrom
      const mdt = !dateTo || mDate <= dateTo
      return ms && mt && mp && mdf && mdt
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [movements, search, typeFilter, productFilter, dateFrom, dateTo])

  const pagination = usePagination(filtered)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const movementsThisMonth = movements.filter(m => {
    const d = new Date(m.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const entriesQty = movementsThisMonth.filter(m => m.type === 'Entrée').reduce((s, m) => s + m.quantity, 0)
  const exitsQty = movementsThisMonth.filter(m => m.type === 'Sortie').reduce((s, m) => s + m.quantity, 0)

  const exitsValue = movementsThisMonth
    .filter(m => m.type === 'Sortie')
    .reduce((s, m) => {
      const product = stockProducts.find(p => p.id === m.productId)
      return s + m.quantity * (product?.salePrice || 0)
    }, 0)

  const activeFilters = [typeFilter !== 'all', productFilter !== 'all', !!dateFrom, !!dateTo].filter(Boolean).length

  function handleCreateMovement() {
    if (!form.productId || !form.quantity || !form.motif.trim()) return
    const qty = parseInt(form.quantity, 10)
    if (isNaN(qty) || qty <= 0) return

    const product = stockProducts.find(p => p.id === form.productId)
    if (!product) return

    const now = new Date().toISOString()
    const movement = addMovement({
      date: now,
      productId: form.productId,
      productName: product.name,
      type: form.type,
      quantity: form.type === 'Sortie' || form.type === 'Ajustement' ? -Math.abs(qty) : qty,
      motif: form.motif,
      reference: form.reference,
      operator: form.operator,
    })

    const delta = form.type === 'Sortie' ? -qty
      : form.type === 'Ajustement' ? -qty
      : qty
    const newStock = Math.max(0, product.currentStock + delta)
    updateStock(product.id, { currentStock: newStock })

    setShowModal(false)
    resetForm()
  }

  function resetForm() {
    setForm({
      type: 'Entrée',
      productId: '',
      quantity: '',
      motif: '',
      reference: '',
      operator: OPERATORS[0],
    })
  }

  function clearFilters() {
    setTypeFilter('all')
    setProductFilter('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }

  const selectedProduct = stockProducts.find(p => p.id === form.productId)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mouvements de Stock"
        subtitle="Historique et suivi des entrées, sorties et transferts"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Stock' }, { label: 'Mouvements' }]}
        icon={<ArrowRightLeft size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map(m => ({
                date: formatDate(m.date),
                produit: m.productName,
                type: m.type,
                quantite: m.quantity,
                motif: m.motif,
                reference: m.reference,
                operateur: m.operator,
              }))}
              filename="mouvements-stock"
              title="Mouvements de Stock - ALBA SERVICE GROUP"
              headers={{ date: 'Date', produit: 'Produit', type: 'Type', quantite: 'Quantité', motif: 'Motif', reference: 'Référence', operateur: 'Opérateur' }}
            />
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouveau mouvement
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Mouvements ce mois" value={movementsThisMonth.length.toString()} icon={<ArrowRightLeft size={20} />} gradient="gradient-primary" />
        <KpiCard title="Entrées totales" value={`${entriesQty} u.`} icon={<TrendingUp size={20} />} gradient="gradient-success" />
        <KpiCard title="Sorties totales" value={`${exitsQty} u.`} icon={<TrendingDown size={20} />} gradient="gradient-danger" />
        <KpiCard title="Valeur des sorties" value={`${(exitsValue / 1000000).toFixed(1)}M FC`} icon={<DollarSign size={20} />} gradient="gradient-warning" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Produit, référence, motif, opérateur..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
              <option value="all">Tous les types</option>
              {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
              <option value="all">Tous les produits</option>
              {stockProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-xl transition-colors ${
                showFilters || activeFilters > 0
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}>
              <Filter size={14} />
              Dates
              {activeFilters > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
              )}
            </button>
            {activeFilters > 0 && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors">
                <X size={13} /> Effacer
              </button>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Date début</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Date fin</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Date', 'Produit', 'Type', 'Quantité', 'Motif', 'Référence', 'Opérateur'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pagination.paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                        <ArrowRightLeft size={24} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Aucun mouvement trouvé</p>
                        <p className="text-xs text-gray-400 mt-0.5">Modifiez vos filtres ou créez un nouveau mouvement</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {pagination.paginatedItems.map(mov => {
                const tc = TYPE_CONFIG[mov.type] || TYPE_CONFIG['Entrée']
                const isNegative = mov.quantity < 0
                return (
                  <tr key={mov.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600">{formatDate(mov.date)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-800">{mov.productName}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${tc.bg} ${tc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                        {mov.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
                        {isNegative ? '' : '+'}{mov.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600 max-w-[200px] truncate block" title={mov.motif}>{mov.motif}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{mov.reference}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{mov.operator}</span>
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

      {/* New movement modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ArrowRightLeft size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Nouveau mouvement</h3>
                  <p className="text-xs text-gray-400">Enregistrer une entrée, sortie ou transfert</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Type de mouvement *</label>
                <div className="grid grid-cols-4 gap-2">
                  {MOVEMENT_TYPES.map(t => {
                    const tc = TYPE_CONFIG[t]
                    const selected = form.type === t
                    return (
                      <button key={t} onClick={() => setForm({ ...form, type: t })}
                        className={`px-3 py-2.5 text-xs font-semibold rounded-xl border-2 transition-all text-center ${
                          selected
                            ? `${tc.bg} ${tc.text} border-current shadow-sm`
                            : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                        }`}>
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Product selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Produit *</label>
                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Sélectionner un produit</option>
                  {stockProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code}) — Stock: {p.currentStock} {p.unit}</option>
                  ))}
                </select>
              </div>

              {/* Selected product info */}
              {selectedProduct && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{selectedProduct.name}</p>
                      <p className="text-[10px] text-gray-400">{selectedProduct.category} · {selectedProduct.supplier}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{selectedProduct.currentStock} {selectedProduct.unit}</p>
                      <p className="text-[10px] text-gray-400">Stock actuel</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantité *</label>
                <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Quantité du mouvement" />
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motif / Raison *</label>
                <input type="text" value={form.motif} onChange={e => setForm({ ...form, motif: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Raison du mouvement" />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
                <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="BC-XXX, BL-XXX, TR-XXX, AJ-XXX..." />
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Opérateur</label>
                <select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none">
                  {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Preview */}
              {form.productId && form.quantity && parseInt(form.quantity, 10) > 0 && selectedProduct && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider mb-1">Aperçu</p>
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">{selectedProduct.name}</span> — Stock{' '}
                    {selectedProduct.currentStock} → {' '}
                    <span className="font-bold">
                      {form.type === 'Sortie' || form.type === 'Ajustement'
                        ? Math.max(0, selectedProduct.currentStock - parseInt(form.quantity, 10))
                        : selectedProduct.currentStock + parseInt(form.quantity, 10)
                      } {selectedProduct.unit}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreateMovement}
                disabled={!form.productId || !form.quantity || parseInt(form.quantity, 10) <= 0 || !form.motif.trim()}
                className="px-5 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm disabled:opacity-40 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                <Plus size={14} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
