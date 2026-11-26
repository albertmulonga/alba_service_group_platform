import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import AvatarCircle from '@/components/ui/AvatarCircle'
import { formatCurrency } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { useNotifications } from '@/contexts/NotificationContext'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import PhotoUploader from '@/components/ui/PhotoUploader'
import {
  Users, Plus, Search, Phone, Mail, MapPin, Building2,
  Eye, Edit, Trash2, X, RefreshCw, AlertCircle
} from 'lucide-react'

type ClientType = {
  id: string
  code: string
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  address: string
  city: string
  province: string
  country: string
  category: string
  status: string
  totalSpent: number
  ordersCount: number
  createdAt: string
  photo?: string | null
}

const emptyForm = {
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: 'Maniema',
  country: 'RDC',
  category: 'INDIVIDUAL',
  photo: null as string | null,
}

/* ── Données initiales ── */
function mapClient(raw: any): ClientType {
  return {
    id: raw.id,
    code: raw.code || '',
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    companyName: raw.companyName || '',
    email: raw.email || '',
    phone: raw.phone || '',
    address: raw.address || '',
    city: raw.city || '',
    province: raw.province || '',
    country: raw.country || 'RDC',
    category: raw.category || 'INDIVIDUAL',
    status: raw.status || 'ACTIVE',
    totalSpent: Number(raw.totalRevenue ?? raw.totalSpent ?? 0),
    ordersCount: raw.totalOrders ?? raw.ordersCount ?? 0,
    createdAt: raw.registeredAt || raw.createdAt || '',
    photo: raw.photo || null,
  }
}

export default function ClientsPage() {
  const { items, add, update, remove, loading, error, refresh } = useApiDB<ClientType>('/customers', [], mapClient)
  const { addNotification } = useNotifications()

  const [search,        setSearch]        = useState('')
  const [catFilter,     setCatFilter]     = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [selectedClient,setSelectedClient]= useState<string | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [editingClient, setEditingClient] = useState<ClientType | null>(null)
  const [form,          setForm]          = useState(emptyForm)

  /* ── Filtres ── */
  const filteredItems = useMemo(() => items.filter(c => {
    const matchSearch = !search ||
      `${c.firstName} ${c.lastName} ${c.companyName} ${c.email} ${c.phone}`
        .toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' ||
      (catFilter === 'Entreprise' ? c.category === 'COMPANY' : c.category === 'INDIVIDUAL')
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'actif' ? c.status === 'ACTIVE' : c.status === 'INACTIVE')
    return matchSearch && matchCat && matchStatus
  }), [items, search, catFilter, statusFilter])

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } =
    usePagination(filteredItems, 10)

  /* ── KPI ── */
  const activeClients = items.filter(c => c.status === 'ACTIVE').length
  const totalRevenue  = items.reduce((s, c) => s + (c.totalSpent || 0), 0)
  const avgRevenue    = items.length ? Math.round(totalRevenue / items.length) : 0
  const selectedClientData = items.find(c => c.id === selectedClient)

  /* ── Handlers ── */
  const handleNew = () => { setEditingClient(null); setForm(emptyForm); setShowModal(true) }

  const handleEdit = (client: ClientType) => {
    setEditingClient(client)
    setForm({
      firstName: client.firstName, lastName: client.lastName,
      companyName: client.companyName, email: client.email,
      phone: client.phone, address: client.address,
      city: client.city, province: client.province,
      country: client.country, category: client.category,
      photo: client.photo ?? null,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingClient) {
      await update(editingClient.id, { ...form, status: editingClient.status })
    } else {
      const created = await add({
        ...form,
        code: `CLT-${Date.now()}`,
        status: 'ACTIVE',
        totalSpent: 0,
        ordersCount: 0,
        createdAt: new Date().toISOString(),
      })
      if (created) {
        addNotification({
          title: 'Nouveau client ajouté',
          message: `${form.firstName} ${form.lastName} a été ajouté(e) avec succès`,
          type: 'success',
          module: 'Clients',
          link: '/clients',
        })
      }
    }
    setShowModal(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client définitivement ?')) return
    await remove(id)
    if (selectedClient === id) setSelectedClient(null)
  }

  /* ── Données export ── */
  const exportData = filteredItems.map(c => ({
    Code: c.code, Prénom: c.firstName, Nom: c.lastName,
    Entreprise: c.companyName || '—', Email: c.email || '—',
    Téléphone: c.phone, Ville: c.city, Province: c.province,
    Catégorie: c.category === 'COMPANY' ? 'Entreprise' : 'Individuel',
    'Total dépensé': c.totalSpent, Commandes: c.ordersCount,
    Statut: c.status === 'ACTIVE' ? 'Actif' : 'Inactif',
    'Créé le': c.createdAt,
  }))

  /* ════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-fade-in">

      <PageHeader
        title="Clients & CRM"
        subtitle="Gestion des clients, prospects et contacts"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Clients' }]}
        icon={<Users size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton data={exportData} filename="clients-alba" title="Liste des Clients — ALBA SERVICE GROUP" label="Exporter" />
            <button onClick={refresh} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Actualiser">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouveau client
            </button>
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={refresh} className="ml-auto text-xs font-semibold underline">Réessayer</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total clients"     value={items.length.toString()}           icon={<Users size={20} />}    gradient="gradient-primary" />
        <KpiCard title="Clients actifs"    value={activeClients.toString()}           icon={<Building2 size={20} />} gradient="gradient-success" change={5}  changeLabel="ce mois" />
        <KpiCard title="Chiffre d'affaires"value={`${(totalRevenue/1000000).toFixed(1)}M FC`} icon={<Building2 size={20} />} gradient="gradient-teal" change={12} changeLabel="vs mois dernier" />
        <KpiCard title="Panier moyen"      value={formatCurrency(avgRevenue)}         icon={<Building2 size={20} />} gradient="gradient-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Table + filtres ── */}
        <div className={`${selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>

          {/* Filtres */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {(['all', 'Entreprise', 'Individuel'] as const).map(c => (
                  <button key={c} onClick={() => setCatFilter(c)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${catFilter === c ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {c === 'all' ? 'Tous' : c}
                  </button>
                ))}
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
                <option value="all">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Nom, entreprise, email, téléphone..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <span className="text-xs text-gray-400 font-medium ml-auto">{filteredItems.length} résultat(s)</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Client', 'Contact', 'Localisation', 'Catégorie', 'Dépensé', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                            <Users size={24} className="text-gray-300" />
                          </div>
                          <p className="text-gray-400 text-sm font-medium">
                            {search || catFilter !== 'all' || statusFilter !== 'all'
                              ? 'Aucun client ne correspond à vos filtres'
                              : 'Aucun client enregistré'}
                          </p>
                          {!search && catFilter === 'all' && statusFilter === 'all' && (
                            <button onClick={handleNew}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
                              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                              <Plus size={14} /> Ajouter le premier client
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {paginatedItems.map(client => (
                    <tr key={client.id}
                      className={`hover:bg-blue-50/20 transition-colors group cursor-pointer ${selectedClient === client.id ? 'bg-blue-50/40' : ''}`}
                      onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <AvatarCircle photo={client.photo} name={`${client.firstName} ${client.lastName}`} size={48} />
                          <div>
                            <p className="font-semibold text-gray-800 text-xs">{client.firstName} {client.lastName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{client.code}</p>
                            {client.companyName && <p className="text-[10px] text-gray-400">{client.companyName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-gray-600"><Phone size={10}/> {client.phone}</div>
                          {client.email && <div className="flex items-center gap-1 text-[10px] text-gray-400"><Mail size={9}/> {client.email}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={10}/> {client.city}, {client.province}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${client.category === 'COMPANY' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                          {client.category === 'COMPANY' ? 'Entreprise' : 'Individuel'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-gray-800">{formatCurrency(client.totalSpent)}</span>
                        <p className="text-[10px] text-gray-400">{client.ordersCount} cmd</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge label={client.status === 'ACTIVE' ? 'Actif' : 'Inactif'} type={client.status === 'ACTIVE' ? 'success' : 'danger'} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir"
                            onClick={e => { e.stopPropagation(); setSelectedClient(client.id) }}>
                            <Eye size={13}/>
                          </button>
                          <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Modifier"
                            onClick={e => { e.stopPropagation(); handleEdit(client) }}>
                            <Edit size={13}/>
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"
                            onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                totalItems={totalItems} pageSize={pageSize}
                onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        </div>

        {/* ── Panneau détail ── */}
        {selectedClientData && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit sticky top-6">
            {/* Header du panneau */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-800 text-sm">Fiche client</h3>
              <button onClick={() => setSelectedClient(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={14}/>
              </button>
            </div>

            {/* Avatar + nom */}
            <div className="flex items-center gap-4 p-5 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1E3A8A08, #2563EB06)' }}>
              <AvatarCircle photo={selectedClientData.photo} name={`${selectedClientData.firstName} ${selectedClientData.lastName}`} size={72} />
              <div>
                <p className="font-bold text-gray-800">{selectedClientData.firstName} {selectedClientData.lastName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedClientData.companyName || 'Client individuel'}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedClientData.code}</p>
              </div>
            </div>

            {/* Infos */}
            <div className="p-5 space-y-2.5">
              {[
                { label: 'Téléphone', value: selectedClientData.phone },
                { label: 'Email', value: selectedClientData.email || '—' },
                { label: 'Adresse', value: `${selectedClientData.address || '—'}, ${selectedClientData.city}` },
                { label: 'Province', value: selectedClientData.province },
                { label: 'Catégorie', value: selectedClientData.category === 'COMPANY' ? 'Entreprise' : 'Individuel' },
                { label: 'Pays', value: selectedClientData.country },
                { label: 'Membre depuis', value: selectedClientData.createdAt ? new Date(selectedClientData.createdAt).toLocaleDateString('fr-FR') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs gap-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="font-medium text-gray-800 text-right">{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-400">Statut</span>
                <StatusBadge label={selectedClientData.status === 'ACTIVE' ? 'Actif' : 'Inactif'} type={selectedClientData.status === 'ACTIVE' ? 'success' : 'danger'} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 px-5 pb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-700">{selectedClientData.ordersCount}</p>
                <p className="text-[10px] text-blue-500 font-medium">Commandes</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-sm font-black text-green-700 leading-tight">{formatCurrency(selectedClientData.totalSpent)}</p>
                <p className="text-[10px] text-green-500 font-medium mt-0.5">Total dépensé</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => handleEdit(selectedClientData)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl transition-colors"
                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                <Edit size={12}/> Modifier
              </button>
              <button onClick={() => { update(selectedClientData.id, { status: selectedClientData.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }) }}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${selectedClientData.status === 'ACTIVE' ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                {selectedClientData.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => handleDelete(selectedClientData.id)}
                className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                <Trash2 size={12}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Création/Modification ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-in"
            onClick={e => e.stopPropagation()}>

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingClient ? 'Mettre à jour les informations' : 'Remplir les informations du client'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Photo */}
              <div className="flex justify-center">
                <PhotoUploader
                  value={form.photo}
                  onChange={photo => setForm({ ...form, photo })}
                  size={80}
                  name={`${form.firstName} ${form.lastName}`.trim() || 'Client'}
                  label="Photo du client"
                />
              </div>

              {/* Prénom + Nom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Prénom *</label>
                  <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                    required type="text" placeholder="Prénom"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nom *</label>
                  <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                    required type="text" placeholder="Nom de famille"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
                </div>
              </div>

              {/* Entreprise */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Entreprise / Organisation</label>
                <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                  type="text" placeholder="Nom de l'entreprise (optionnel)"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    type="email" placeholder="email@exemple.cd"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Téléphone *</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    required type="tel" placeholder="+243 8X XXX XXXX"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Adresse</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  type="text" placeholder="Avenue, numéro, quartier..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
              </div>

              {/* Ville + Province + Catégorie */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ville</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                    type="text" placeholder="Ville"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Province</label>
                  <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    {['Maniema','Kinshasa','Haut-Katanga','Sud-Kivu','Nord-Kivu','Lualaba','Tanganyika','Kasaï','Ituri'].map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Catégorie</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    <option value="COMPANY">Entreprise</option>
                    <option value="INDIVIDUAL">Individuel</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-colors shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  {editingClient ? '✓ Mettre à jour' : '+ Enregistrer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
