import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  FileText, Plus, Search, Eye, Edit, Clock, CheckCircle,
  X, Download, TrendingUp, Printer, Trash2, Save
} from 'lucide-react'

type ServiceType = {
  id: string; code: string; name: string; description: string
  category: string; unitPrice: number; unit: string
  totalOrders: number; revenue: number; status: string; avgTime: string
}

type OrderType = {
  id: string; client: string; service: string; qty: number
  total: number; date: string; status: string; agent: string
}

const mockServices: ServiceType[] = [
  { id: '1', code: 'SEC-001', name: 'Saisie informatique', description: 'Lettres, rapports, mémoires, thèses, contrats, PV', category: 'Traitement', unitPrice: 10000, unit: 'page', totalOrders: 142, revenue: 2130000, status: 'active', avgTime: '1h/page' },
  { id: '2', code: 'SEC-002', name: 'Mise en page professionnelle', description: 'Documents Word, PowerPoint, brochures, rapports', category: 'Design', unitPrice: 15000, unit: 'document', totalOrders: 98, revenue: 1960000, status: 'active', avgTime: '2h/doc' },
  { id: '3', code: 'SEC-003', name: 'Numérisation (Scan)', description: 'Scan PDF, image, conversion OCR', category: 'Traitement', unitPrice: 500, unit: 'page', totalOrders: 235, revenue: 705000, status: 'active', avgTime: '2min/page' },
  { id: '4', code: 'SEC-004', name: 'Rédaction de lettre', description: 'Lettres admin, demandes, correspondances officielles', category: 'Rédaction', unitPrice: 5000, unit: 'lettre', totalOrders: 187, revenue: 935000, status: 'active', avgTime: '30min' },
  { id: '5', code: 'SEC-005', name: 'Création de CV', description: 'CV moderne + lettre de motivation professionnelle', category: 'Design', unitPrice: 10000, unit: 'CV', totalOrders: 76, revenue: 760000, status: 'active', avgTime: '1h30' },
  { id: '6', code: 'SEC-006', name: 'Photocopie', description: 'Copies noir/blanc et couleur, A4 et A3', category: 'Impression', unitPrice: 200, unit: 'page', totalOrders: 310, revenue: 310000, status: 'active', avgTime: '1min/page' },
  { id: '7', code: 'SEC-007', name: 'Rapport professionnel', description: 'Rapports annuels, bilans, synthèses', category: 'Rédaction', unitPrice: 30000, unit: 'rapport', totalOrders: 54, revenue: 2430000, status: 'active', avgTime: '3h' },
  { id: '8', code: 'SEC-008', name: 'Traduction documentaire', description: 'Fr ↔ EN, Swahili, Lingala', category: 'Traduction', unitPrice: 5000, unit: 'page', totalOrders: 41, revenue: 615000, status: 'active', avgTime: '45min/page' },
  { id: '9', code: 'SEC-009', name: 'Archivage numérique', description: 'Organisation, classement et archivage de dossiers', category: 'Traitement', unitPrice: 0, unit: 'dossier', totalOrders: 29, revenue: 435000, status: 'active', avgTime: 'sur devis' },
]

const mockRecentOrders: OrderType[] = [
  { id: '1', client: 'Université de Kindu', service: 'Saisie informatique', qty: 120, total: 45000, date: '2026-07-25', status: 'in_progress', agent: 'Sophie B.' },
  { id: '2', client: 'Mairie de Kindu', service: 'Rapport professionnel', qty: 45, total: 85000, date: '2026-07-24', status: 'pending', agent: 'Non assigné' },
  { id: '3', client: 'Cabinet Dr. Pierre', service: 'Création de CV', qty: 1, total: 15000, date: '2026-07-22', status: 'done', agent: 'Sophie B.' },
  { id: '4', client: 'ONG Espoir Congo', service: 'Numérisation (Scan)', qty: 150, total: 30000, date: '2026-07-21', status: 'done', agent: 'Marie K.' },
  { id: '5', client: 'École BERUNDA', service: 'Photocopie', qty: 500, total: 20000, date: '2026-07-25', status: 'in_progress', agent: 'Sophie B.' },
  { id: '6', client: 'Particulier', service: 'Rédaction de lettre', qty: 1, total: 10000, date: '2026-07-25', status: 'pending', agent: 'Non assigné' },
  { id: '7', client: 'Entreprise ABC SARL', service: 'Mise en page professionnelle', qty: 28, total: 35000, date: '2026-07-24', status: 'review', agent: 'Marie K.' },
  { id: '8', client: 'Hôpital Général', service: 'Traduction documentaire', qty: 10, total: 50000, date: '2026-07-18', status: 'done', agent: 'Sophie B.' },
]

const serviceCategories = ['Traitement', 'Design', 'Rédaction', 'Traduction', 'Impression']
const serviceUnits = ['page', 'document', 'lettre', 'CV', 'rapport', 'dossier']
const orderStatuses: Record<string, { label: string; type: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'purple' | 'default' }> = {
  pending:     { label: 'En attente',    type: 'warning' },
  in_progress: { label: 'En cours',      type: 'primary' },
  review:      { label: 'Relecture',     type: 'info' },
  done:        { label: 'Terminé',       type: 'success' },
  delivered:   { label: 'Livré',         type: 'success' },
  cancelled:   { label: 'Annulé',        type: 'danger' },
}

const serviceStatuses: Record<string, { label: string; type: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'purple' | 'default' }> = {
  active:   { label: 'Actif',   type: 'success' },
  inactive: { label: 'Inactif', type: 'danger' },
}

type ServiceForm = Omit<ServiceType, 'id'>

const emptyServiceForm: ServiceForm = {
  code: '', name: '', description: '', category: 'Traitement',
  unitPrice: 0, unit: 'page', totalOrders: 0, revenue: 0,
  status: 'active', avgTime: '',
}

export default function SecretariatPage() {
  const { items: services, add, update, remove, loading, error, refresh } = useApiDB<ServiceType>('/secretariat/services', [], (raw: any) => ({ ...raw }))
  const { items: orders, count: orderCount } = useApiDB<OrderType>('/secretariat/orders', [], (raw: any) => ({ ...raw }))

  const [tab, setTab] = useState<'services' | 'orders'>('services')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceForm>(emptyServiceForm)

  const filteredServices = services.filter(s => {
    const matchSearch = `${s.code} ${s.name} ${s.description} ${s.category}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredOrders = orders.filter(o => {
    const matchSearch = `${o.client} ${o.service} ${o.agent}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeServices = services.filter(s => s.status === 'active').length
  const totalRevenue = services.reduce((s, svc) => s + svc.revenue, 0)
  const totalOrdersCount = services.reduce((s, svc) => s + svc.totalOrders, 0)
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0

  function openNew() {
    setEditingId(null)
    setForm(emptyServiceForm)
    setShowModal(true)
  }

  function openEdit(svc: ServiceType) {
    setEditingId(svc.id)
    setForm({
      code: svc.code, name: svc.name, description: svc.description,
      category: svc.category, unitPrice: svc.unitPrice, unit: svc.unit,
      totalOrders: svc.totalOrders, revenue: svc.revenue,
      status: svc.status, avgTime: svc.avgTime,
    })
    setShowModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editingId) {
      update(editingId, form)
    } else {
      add({ ...form, code: form.code || `SEC-${String(services.length + 1).padStart(3, '0')}` })
    }
    setShowModal(false)
  }

  function handleDelete(id: string) {
    if (window.confirm('Supprimer ce service définitivement ?')) {
      remove(id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Secrétariat & Services Administratifs"
        subtitle="Gestion des services et commandes"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Secrétariat' }]}
        icon={<FileText size={22} />}
        iconBg="gradient-teal"
        actions={
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
            <Plus size={15} /> Nouveau service
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Services actifs" value={activeServices.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="Total commandes" value={totalOrdersCount.toString()} icon={<FileText size={20} />} gradient="gradient-primary" />
        <KpiCard title="Panier moyen" value={formatCurrency(avgOrderValue)} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="Revenus total" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={20} />} gradient="gradient-teal" change={8} />
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[['services', 'Services'], ['orders', 'Commandes récentes']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === id ? 'border-teal-500 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
            {[['all', 'Toutes'], ['active', 'Actif'], ['inactive', 'Inactif'], ['pending', 'Attente'], ['in_progress', 'En cours'], ['done', 'Terminées']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'services' ? 'Code, nom, catégorie...' : 'Client, service, agent...'}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          </div>
        </div>
      </div>

      {tab === 'services' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Code', 'Service', 'Catégorie', 'Prix unitaire', 'Unité', 'Commandes', 'Revenus', 'Statut', 'Délai moyen', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredServices.map(svc => {
                  const st = serviceStatuses[svc.status] || serviceStatuses.active
                  return (
                    <tr key={svc.id} className="hover:bg-teal-50/20 transition-colors group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-teal-600">{svc.code}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{svc.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate">{svc.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{svc.category}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-700">{formatCurrency(svc.unitPrice)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{svc.unit}</td>
                      <td className="px-4 py-3.5 text-xs font-medium text-gray-700">{svc.totalOrders}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-teal-700">{formatCurrency(svc.revenue)}</td>
                      <td className="px-4 py-3.5"><StatusBadge label={st.label} type={st.type} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{svc.avgTime}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(svc)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Modifier">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => handleDelete(svc.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer">
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
        </div>
      )}

      {tab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Client', 'Service', 'Qté', 'Total', 'Date', 'Statut', 'Agent'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map(ord => {
                  const st = orderStatuses[ord.status] || orderStatuses.pending
                  return (
                    <tr key={ord.id} className="hover:bg-teal-50/20 transition-colors group">
                      <td className="px-4 py-3.5 text-xs font-medium text-gray-700">{ord.client}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{ord.service}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{ord.qty}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-700">{formatCurrency(ord.total)}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(ord.date)}</td>
                      <td className="px-4 py-3.5"><StatusBadge label={st.label} type={st.type} /></td>
                      <td className="px-4 py-3.5">
                        {ord.agent !== 'Non assigné' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-[9px] font-bold text-teal-700">
                              {getInitials(ord.agent)}
                            </div>
                            <span className="text-xs text-gray-600">{ord.agent}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Non assigné</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingId ? 'Modifier le service' : 'Nouveau service'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="SEC-XXX" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom du service" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Description du service..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {serviceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prix unitaire (FC)</label>
                  <input type="number" value={form.unitPrice || ''} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) })}
                    placeholder="0" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unité</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {serviceUnits.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Délai moyen</label>
                  <input value={form.avgTime} onChange={e => setForm({ ...form, avgTime: e.target.value })}
                    placeholder="ex: 1h/page" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
                  <Save size={14} /> {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
