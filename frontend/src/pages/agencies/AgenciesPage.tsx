import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Building2, Plus, Search, Phone, Mail, MapPin, Users,
  Edit, Trash2, X, Map
} from 'lucide-react'

type AgencyType = {
  id: string
  name: string
  address: string
  city: string
  province: string
  phone: string
  email: string
  manager: string
  employeesCount: number
  status: 'ACTIVE' | 'INACTIVE'
  type: 'SIEGE' | 'FILIALE'
  createdAt: string
}

const defaultAgencies: AgencyType[] = [
  {
    id: 'ag-1', name: 'Agence Kindu', address: '25, Av. Lumumba, Quartier Centre',
    city: 'Kindu', province: 'Maniema', phone: '+243 81 234 0001', email: 'kindu@alba-service.cd',
    manager: 'Patrick LUKUSA', employeesCount: 45, status: 'ACTIVE', type: 'SIEGE',
    createdAt: '2022-01-15',
  },
  {
    id: 'ag-2', name: 'Agence Bukavu', address: '12, Av. Kasavubu, Centre-ville',
    city: 'Bukavu', province: 'Sud-Kivu', phone: '+243 82 345 0002', email: 'bukavu@alba-service.cd',
    manager: 'Marie KABILA', employeesCount: 28, status: 'ACTIVE', type: 'FILIALE',
    createdAt: '2023-03-20',
  },
  {
    id: 'ag-3', name: 'Agence Goma', address: '8, Av. du Lac, Nyiragongo',
    city: 'Goma', province: 'Nord-Kivu', phone: '+243 99 456 0003', email: 'goma@alba-service.cd',
    manager: 'Emmanuel TSHISEKEDI', employeesCount: 22, status: 'ACTIVE', type: 'FILIALE',
    createdAt: '2023-09-10',
  },
]

const emptyForm = {
  name: '',
  address: '',
  city: '',
  province: 'Maniema',
  phone: '',
  email: '',
  manager: '',
  employeesCount: 0,
  type: 'FILIALE' as 'SIEGE' | 'FILIALE',
}

export default function AgenciesPage() {
  const { items, add, update, remove } = useMockDB<AgencyType>('alba-agencies', defaultAgencies)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [editingAgency, setEditingAgency] = useState<AgencyType | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filteredItems = useMemo(() => {
    return items.filter(a => {
      const matchesSearch = !search ||
        `${a.name} ${a.address} ${a.city} ${a.email} ${a.phone} ${a.manager}`.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' ? a.status === 'ACTIVE' : a.status === 'INACTIVE')
      return matchesSearch && matchesStatus
    })
  }, [items, search, statusFilter])

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filteredItems, 9)

  const totalEmployees = items.reduce((s, a) => s + a.employeesCount, 0)
  const activeAgencies = items.filter(a => a.status === 'ACTIVE').length

  const handleNew = () => {
    setEditingAgency(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const handleEdit = (agency: AgencyType) => {
    setEditingAgency(agency)
    setForm({
      name: agency.name,
      address: agency.address,
      city: agency.city,
      province: agency.province,
      phone: agency.phone,
      email: agency.email,
      manager: agency.manager,
      employeesCount: agency.employeesCount,
      type: agency.type,
    })
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingAgency) {
      update(editingAgency.id, { ...form, status: editingAgency.status })
    } else {
      add({
        ...form,
        status: 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0],
      })
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette agence ? Cette action est irréversible.')) return
    remove(id)
  }

  const setField = (key: string, value: string | number) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Agences"
        subtitle="Administration des agences et succursales ALBA SERVICE GROUP"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Agences' }]}
        icon={<Building2 size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filteredItems}
              filename="agences-alba"
              title="Liste des Agences"
              headers={{ id: 'ID', name: 'Nom', city: 'Ville', province: 'Province', phone: 'Téléphone', email: 'Email', manager: 'Directeur', employeesCount: 'Employés', status: 'Statut', type: 'Type', createdAt: 'Créé le' }}
            />
            <button onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouvelle agence
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total agences" value={items.length.toString()} icon={<Building2 size={20} />} gradient="gradient-primary" />
        <KpiCard title="Agences actives" value={activeAgencies.toString()} icon={<Building2 size={20} />} gradient="gradient-success" change={100} changeLabel="actives" />
        <KpiCard title="Employés total" value={totalEmployees.toString()} icon={<Users size={20} />} gradient="gradient-teal" />
        <KpiCard title="Agences inactives" value={(items.length - activeAgencies).toString()} icon={<Building2 size={20} />} gradient="gradient-warning" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {s === 'all' ? 'Toutes' : s === 'active' ? 'Actives' : 'Inactives'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, ville, directeur, email..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              <Building2 size={13} /> Agences
            </button>
            <button onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
              <Map size={13} /> Carte
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Map size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Carte à venir</h3>
            <p className="text-sm text-gray-400 max-w-md">
              La vue cartographique des agences sera bientôt disponible. Elle affichera la localisation de chaque agence sur une carte interactive.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedItems.map(agency => (
              <div key={agency.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: agency.type === 'SIEGE' ? 'linear-gradient(135deg, #1E3A8A, #2563EB)' : 'linear-gradient(135deg, #059669, #10B981)' }}>
                      {agency.name.split(' ').slice(-1)[0]?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm">{agency.name}</h3>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {agency.type === 'SIEGE' ? 'Siège' : 'Filiale'}
                      </span>
                    </div>
                  </div>
                  <StatusBadge label={agency.status === 'ACTIVE' ? 'Actif' : 'Inactif'} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{agency.address}, {agency.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{agency.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={12} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{agency.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{agency.manager}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Users size={12} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{agency.employeesCount} employés</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(agency)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(agency.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {paginatedItems.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Aucune agence trouvée</p>
            </div>
          )}

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
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingAgency ? 'Modifier l\'agence' : 'Nouvelle agence'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nom de l'agence *</label>
                  <input required value={form.name} onChange={e => setField('name', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ex: Agence Kananga" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adresse *</label>
                  <input required value={form.address} onChange={e => setField('address', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="25, Av. Lumumba" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ville *</label>
                  <input required value={form.city} onChange={e => setField('city', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Kindu" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Province</label>
                  <select value={form.province} onChange={e => setField('province', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    {['Maniema', 'Sud-Kivu', 'Nord-Kivu', 'Kinshasa', 'Haut-Katanga', 'Kasaï', 'Kongo Central'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select value={form.type} onChange={e => setField('type', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="SIEGE">Siège</option>
                    <option value="FILIALE">Filiale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone *</label>
                  <input required value={form.phone} onChange={e => setField('phone', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="+243 81 234 0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="agence@alba-service.cd" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Directeur *</label>
                  <input required value={form.manager} onChange={e => setField('manager', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Nom du directeur" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre d'employés</label>
                  <input type="number" min={0} value={form.employeesCount} onChange={e => setField('employeesCount', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="px-5 py-2.5 text-sm text-white rounded-xl hover:opacity-90 shadow-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  {editingAgency ? 'Enregistrer' : 'Créer l\'agence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
