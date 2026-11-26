import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Building2, Plus, Search, Users, Target, DollarSign,
  Edit, Trash2, X, Briefcase, MapPin
} from 'lucide-react'
import Pagination, { usePagination } from '@/components/ui/Pagination'

type DeptType = {
  id: string
  code: string
  name: string
  description: string
  head: string
  employees: number
  budget: number
  spent: number
  status: 'ACTIVE' | 'INACTIVE'
  location: string
  services: string[]
}

const mockDepartments: DeptType[] = [
  {
    id: 'dept-1',
    code: 'DEPT-001',
    name: 'Direction Générale',
    description: 'Stratégie, pilotage et coordination de l\'ensemble des activités du groupe.',
    head: 'Jean Mukendi',
    employees: 8,
    budget: 50000000,
    spent: 32000000,
    status: 'ACTIVE',
    location: 'Kinshasa - Siège',
    services: ['Stratégie', 'Gouvernance', 'Communication'],
  },
  {
    id: 'dept-2',
    code: 'DEPT-002',
    name: 'Ressources Humaines',
    description: 'Gestion du personnel, recrutement, formation et administration du personnel.',
    head: 'Marie Tshilombo',
    employees: 12,
    budget: 30000000,
    spent: 18500000,
    status: 'ACTIVE',
    location: 'Kinshasa - Siège',
    services: ['Recrutement', 'Formation', 'Paie', 'Administration'],
  },
  {
    id: 'dept-3',
    code: 'DEPT-003',
    name: 'Finance & Comptabilité',
    description: 'Contrôle financier, comptabilité, trésorerie et reporting.',
    head: 'Patrick Kabongo',
    employees: 15,
    budget: 35000000,
    spent: 21000000,
    status: 'ACTIVE',
    location: 'Kinshasa - Siège',
    services: ['Comptabilité', 'Trésorerie', 'Audit', 'Reporting'],
  },
  {
    id: 'dept-4',
    code: 'DEPT-004',
    name: 'Imprimerie & Production',
    description: 'Fabrication des supports imprimés, production graphique et impression numérique.',
    head: 'Joseph Kasongo',
    employees: 45,
    budget: 80000000,
    spent: 62000000,
    status: 'ACTIVE',
    location: 'Lubumbashi',
    services: ['Offset', 'Numérique', 'Reliure', 'Contrôle qualité'],
  },
  {
    id: 'dept-5',
    code: 'DEPT-005',
    name: 'Commercial & Ventes',
    description: 'Développement commercial, gestion des clients et force de vente.',
    head: 'Sandra Mbuyi',
    employees: 20,
    budget: 40000000,
    spent: 28000000,
    status: 'ACTIVE',
    location: 'Kinshasa & Lubumbashi',
    services: ['Ventes directes', 'Key accounts', 'Marketing'],
  },
  {
    id: 'dept-6',
    code: 'DEPT-006',
    name: 'Logistique & Transport',
    description: 'Gestion des stocks, approvisionnement et transport des marchandises.',
    head: 'Emmanuel Kalala',
    employees: 18,
    budget: 45000000,
    spent: 35000000,
    status: 'ACTIVE',
    location: 'Lubumbashi',
    services: ['Stock', 'Transport', 'Approvisionnement'],
  },
  {
    id: 'dept-7',
    code: 'DEPT-007',
    name: 'Informatique & Digital',
    description: 'Systèmes d\'information, développement logiciel et transformation digitale.',
    head: 'David Lukusa',
    employees: 10,
    budget: 25000000,
    spent: 15000000,
    status: 'ACTIVE',
    location: 'Kinshasa - Siège',
    services: ['Développement', 'Infrastructure', 'Support', 'Sécurité'],
  },
  {
    id: 'dept-8',
    code: 'DEPT-008',
    name: 'Juridique & Conformité',
    description: 'Affaires juridiques, contrats, conformité et contentieux.',
    head: 'Claire Ngalula',
    employees: 5,
    budget: 15000000,
    spent: 8000000,
    status: 'ACTIVE',
    location: 'Kinshasa - Siège',
    services: ['Contrats', 'Contentieux', 'Conformité'],
  },
  {
    id: 'dept-9',
    code: 'DEPT-009',
    name: 'Maintenance & Bâtiment',
    description: 'Entretien des équipements, maintenance des bâtiments et sûreté.',
    head: 'Robert Mwamba',
    employees: 22,
    budget: 20000000,
    spent: 16000000,
    status: 'INACTIVE',
    location: 'Lubumbashi',
    services: ['Maintenance', 'Sûreté', 'Bâtiment'],
  },
]

const emptyForm = {
  name: '',
  code: '',
  description: '',
  head: '',
  employees: 0,
  budget: 0,
  spent: 0,
  status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  location: '',
  services: [] as string[],
}

export default function DepartmentsPage() {
  const { items, add, update, remove, count } = useMockDB<DeptType>('alba-departments', mockDepartments)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<DeptType | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [serviceInput, setServiceInput] = useState('')

  const generateCode = () => {
    const nums = items.map(d => {
      const m = d.code.match(/DEPT-(\d+)/)
      return m ? parseInt(m[1], 10) : 0
    })
    const next = Math.max(0, ...nums) + 1
    return `DEPT-${String(next).padStart(3, '0')}`
  }

  const handleNew = () => {
    setEditingItem(null)
    setForm({ ...emptyForm, code: generateCode() })
    setServiceInput('')
    setShowModal(true)
  }

  const handleEdit = (item: DeptType) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      code: item.code,
      description: item.description,
      head: item.head,
      employees: item.employees,
      budget: item.budget,
      spent: item.spent,
      status: item.status,
      location: item.location,
      services: [...item.services],
    })
    setServiceInput('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingItem) {
      update(editingItem.id, { ...form })
    } else {
      add({ ...form })
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce département ? Cette action est irréversible.')) return
    remove(id)
    if (selectedDept === id) setSelectedDept(null)
  }

  const addService = () => {
    const val = serviceInput.trim()
    if (val && !form.services.includes(val)) {
      setForm({ ...form, services: [...form.services, val] })
    }
    setServiceInput('')
  }

  const removeService = (s: string) => {
    setForm({ ...form, services: form.services.filter(x => x !== s) })
  }

  const activeDepts = items.filter(d => d.status === 'ACTIVE').length
  const totalEmployees = items.reduce((s, d) => s + d.employees, 0)
  const totalBudget = items.reduce((s, d) => s + d.budget, 0)

  const filtered = items.filter(d => {
    const ms = `${d.name} ${d.code} ${d.description} ${d.head} ${d.location}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || d.status === statusFilter.toUpperCase()
    return ms && mf
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const selectedDeptData = items.find(d => d.id === selectedDept)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Départements & Organisation"
        subtitle="Structure organisationnelle du groupe"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Départements' }]}
        icon={<Building2 size={22} />}
        iconBg="gradient-purple"
        actions={
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            <Plus size={15} /> Nouveau département
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Départements" value={count.toString()} icon={<Building2 size={20} />} gradient="gradient-purple" />
        <KpiCard title="Actifs" value={activeDepts.toString()} icon={<Target size={20} />} gradient="gradient-success" />
        <KpiCard title="Total employés" value={totalEmployees.toString()} icon={<Users size={20} />} gradient="gradient-primary" />
        <KpiCard title="Budget total" value={`${(totalBudget / 1000000).toFixed(1)}M FC`} icon={<DollarSign size={20} />} gradient="gradient-teal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${selectedDept ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Inactifs'}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Nom, code, description, responsable..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedItems.map(dept => {
              const budgetPct = dept.budget > 0 ? Math.round((dept.spent / dept.budget) * 100) : 0
              return (
                <div key={dept.id}
                  className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-lg transition-all cursor-pointer ${selectedDept === dept.id ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-100'}`}
                  onClick={() => setSelectedDept(selectedDept === dept.id ? null : dept.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                        {getInitials(dept.name)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm">{dept.name}</h3>
                        <p className="text-xs text-gray-400 font-mono">{dept.code}</p>
                      </div>
                    </div>
                    <StatusBadge label={dept.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                      type={dept.status === 'ACTIVE' ? 'success' : 'danger'} />
                  </div>
                  {dept.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{dept.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-blue-500">Employés</p>
                      <p className="text-lg font-bold text-blue-700">{dept.employees}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-green-500">Budget</p>
                      <p className="text-sm font-bold text-green-700">{formatCurrency(dept.budget)}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Consommé</span>
                      <span className={`font-medium ${budgetPct > 90 ? 'text-red-600' : budgetPct > 70 ? 'text-amber-600' : 'text-green-600'}`}>
                        {budgetPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                  </div>
                  {dept.head && (
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <Briefcase size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600">{dept.head}</span>
                    </div>
                  )}
                  {dept.location && (
                    <div className="mt-2 flex items-center gap-2">
                      <MapPin size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">{dept.location}</span>
                    </div>
                  )}
                  <div className="mt-3 flex gap-1">
                    <button onClick={e => { e.stopPropagation(); handleEdit(dept) }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                      <Edit size={12} /> Modifier
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(dept.id) }}
                      className="flex items-center justify-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Aucun département trouvé</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        {/* Detail panel */}
        {selectedDeptData && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 h-fit sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Détails du département</h3>
              <button onClick={() => setSelectedDept(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                {getInitials(selectedDeptData.name)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{selectedDeptData.name}</p>
                <p className="text-xs text-gray-500 font-mono">{selectedDeptData.code}</p>
              </div>
            </div>
            {selectedDeptData.description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
                <p className="text-xs text-gray-700">{selectedDeptData.description}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Responsable</span>
                <span className="font-medium text-gray-800">{selectedDeptData.head || 'Non assigné'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Effectif</span>
                <span className="font-bold text-blue-600">{selectedDeptData.employees} employés</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Localisation</span>
                <span className="text-gray-700">{selectedDeptData.location || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Budget</span>
                <span className="font-bold text-green-600">{formatCurrency(selectedDeptData.budget)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Dépensé</span>
                <span className="font-bold text-amber-600">{formatCurrency(selectedDeptData.spent)}</span>
              </div>
              {selectedDeptData.budget > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Consommation</span>
                    <span className="font-medium text-gray-700">
                      {Math.round((selectedDeptData.spent / selectedDeptData.budget) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${Math.min(Math.round((selectedDeptData.spent / selectedDeptData.budget) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Statut</span>
                <StatusBadge label={selectedDeptData.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  type={selectedDeptData.status === 'ACTIVE' ? 'success' : 'danger'} />
              </div>
            </div>
            {selectedDeptData.services.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDeptData.services.map(s => (
                    <span key={s} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => handleEdit(selectedDeptData)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                <Edit size={12} /> Modifier
              </button>
              <button onClick={() => handleDelete(selectedDeptData.id)}
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">
                {editingItem ? 'Modifier le département' : 'Nouveau département'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    placeholder="Ex: Imprimerie"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required
                    placeholder="DEPT-XXX"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Description du département..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                  <input value={form.head} onChange={e => setForm({ ...form, head: e.target.value })}
                    placeholder="Nom du responsable"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Localisation</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="Ex: Kinshasa - Siège"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Budget annuel (FC)</label>
                  <input value={form.budget || ''} onChange={e => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })}
                    type="number" step="1000" min="0" placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white">
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Services</label>
                <div className="flex gap-2">
                  <input value={serviceInput} onChange={e => setServiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addService() } }}
                    placeholder="Ajouter un service..."
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  <button type="button" onClick={addService}
                    className="px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                {form.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.services.map(s => (
                      <span key={s} className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-lg">
                        {s}
                        <button type="button" onClick={() => removeService(s)} className="text-purple-400 hover:text-purple-700">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  {editingItem ? 'Mettre à jour' : 'Créer le département'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
