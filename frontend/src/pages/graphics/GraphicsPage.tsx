import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  Palette, Plus, Search, Eye, Edit, X, Clock,
  CheckCircle, TrendingUp, RefreshCw, Star, Send,
  Image, Download, Layers, Target, Trash2
} from 'lucide-react'

type GProject = {
  id:string; ref:string; client:string; projectName:string; service:string
  designer:string; status:string; priority:string; budget:number
  deliveryDate:string; createdAt:string; revisions:number; description:string
}

const MOCK_PROJECTS: GProject[] = [
  { id:'1', ref:'GFX-0021', client:'Entreprise ABC SARL', projectName:'Identité visuelle complète', service:'Charte graphique + Logo', designer:'Marie K.', status:'in_progress', priority:'normal', budget:350000, deliveryDate:'2026-07-30', createdAt:'2026-07-20', revisions:2, description:'Création logo, palette couleurs, typographie, cartes de visite' },
  { id:'2', ref:'GFX-0020', client:'ONG Espoir Congo', projectName:'Affiche événement', service:'Affiche A3 grand format', designer:'Marie K.', status:'review', priority:'urgent', budget:75000, deliveryDate:'2026-07-26', createdAt:'2026-07-24', revisions:1, description:'Affiche pour gala de charité – impression 100 exemplaires' },
  { id:'3', ref:'GFX-0019', client:'Mairie de Kindu', projectName:'Kit de communication', service:'Flyers + Brochures', designer:'', status:'pending', priority:'normal', budget:200000, deliveryDate:'2026-08-05', createdAt:'2026-07-25', revisions:0, description:'Flyers A5 et brochure triptyque pour événement culturel' },
  { id:'4', ref:'GFX-0018', client:'Cabinet Dr. Pierre', projectName:'Cartes de visite médicales', service:'Carte de visite', designer:'Marie K.', status:'delivered', priority:'normal', budget:50000, deliveryDate:'2026-07-22', createdAt:'2026-07-20', revisions:1, description:'500 cartes de visite recto-verso, design premium' },
  { id:'5', ref:'GFX-0017', client:'École BERUNDA', projectName:'Nouveau logo école', service:'Création logo', designer:'Marie K.', status:'delivered', priority:'normal', budget:150000, deliveryDate:'2026-07-18', createdAt:'2026-07-12', revisions:3, description:'Logo, déclinaisons couleur/NB, tous fichiers vectoriels livrés' },
  { id:'6', ref:'GFX-0016', client:'Hôpital Général', projectName:'Signalétique hospitalière', service:'Panneaux & Enseignes', designer:'', status:'pending', priority:'urgent', budget:500000, deliveryDate:'2026-08-15', createdAt:'2026-07-26', revisions:0, description:'Création panneaux directionnels et signalétique intérieure' },
]

const statusConfig: Record<string, { label:string; type:any; step:number }> = {
  pending:     { label:'En attente',  type:'warning',   step:1 },
  in_progress: { label:'En création', type:'primary',   step:2 },
  review:      { label:'À valider',   type:'info',      step:3 },
  revision:    { label:'Révision',    type:'warning',   step:2 },
  approved:    { label:'Approuvé',    type:'success',   step:4 },
  delivered:   { label:'Livré',       type:'success',   step:5 },
  cancelled:   { label:'Annulé',      type:'danger',    step:0 },
}

const serviceTypes = ['Création logo', 'Charte graphique', 'Carte de visite', 'Flyer', 'Affiche', 'Brochure', 'Bannière web', 'Publication réseaux sociaux', 'Kakémono / Roll-up', 'Signalétique', 'Packaging', 'T-shirt / Objet']

const emptyForm = { client:'', projectName:'', service:'', description:'', designer:'', budget:'', deliveryDate:'', priority:'normal' }

export default function GraphicsPage() {
  const { items: projects, add, update, remove, loading, error, refresh } = useApiDB<GProject>('/graphics/projects', [], (raw: any) => ({ ...raw }))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<GProject | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid')
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const nextRef = `GFX-${String(Math.max(...projects.map(p => parseInt(p.ref.split('-')[1])), 0) + 1).padStart(4,'0')}`

  const filtered = projects.filter(p => {
    const ms = `${p.ref} ${p.client} ${p.projectName} ${p.service}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || p.status === statusFilter
    return ms && mf
  })

  const active = projects.filter(p => ['in_progress','review','revision'].includes(p.status)).length
  const delivered = projects.filter(p => p.status === 'delivered').length
  const totalRevenue = projects.filter(p => p.status === 'delivered').reduce((s, p) => s + p.budget, 0)
  const pending = projects.filter(p => p.status === 'pending').length

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (p: GProject) => {
    setEditingId(p.id)
    setForm({
      client: p.client, projectName: p.projectName, service: p.service,
      description: p.description, designer: p.designer, budget: String(p.budget),
      deliveryDate: p.deliveryDate, priority: p.priority,
    })
    setSelected(null)
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.client.trim() || !form.projectName.trim()) return alert('Client et nom du projet requis.')
    if (editingId) {
      update(editingId, {
        client: form.client, projectName: form.projectName,
        service: form.service || 'Création logo',
        designer: form.designer, budget: Number(form.budget) || 0,
        deliveryDate: form.deliveryDate || new Date(Date.now()+14*86400000).toISOString().slice(0,10),
        priority: form.priority,
        description: form.description,
      })
      showToast(`Projet ${nextRef} mis à jour`)
    } else {
      const newProj = add({
        ref: nextRef,
        client: form.client, projectName: form.projectName,
        service: form.service || 'Création logo',
        designer: form.designer, budget: Number(form.budget) || 0,
        deliveryDate: form.deliveryDate || new Date(Date.now()+14*86400000).toISOString().slice(0,10),
        createdAt: new Date().toISOString().slice(0,10),
        status: 'pending', priority: 'normal', revisions: 0,
        description: form.description,
      })
      showToast(`Projet graphisme créé`)
    }
    setForm(emptyForm)
    setEditingId(null)
    setShowModal(false)
  }

  const handleDelete = (p: GProject) => {
    if (!confirm(`Supprimer le projet "${p.projectName}" ? Cette action est irréversible.`)) return
    remove(p.id)
    setSelected(null)
    showToast(`Projet #${p.ref} supprimé`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Studio Graphisme & Création"
        subtitle="Gestion des projets graphiques, maquettes et validations"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Graphisme' }]}
        icon={<Palette size={22} />}
        iconBg="gradient-purple"
        actions={
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
            <Plus size={15} /> Nouveau projet
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="En attente" value={pending.toString()} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="En création" value={active.toString()} icon={<Layers size={20} />} gradient="gradient-purple" />
        <KpiCard title="Livrés" value={delivered.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="CA Studio" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={20} />} gradient="gradient-teal" change={15} />
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
            {[['all','Tous'], ['pending','Attente'], ['in_progress','En cours'], ['review','À valider'], ['delivered','Livrés']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Réf, client, projet, service..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {([['grid','⊞'], ['table','≡']] as const).map(([v, icon]) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === v ? 'bg-white shadow-sm' : 'text-gray-400'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const st = statusConfig[p.status]
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-purple-600">#{p.ref}</span>
                      {p.priority === 'urgent' && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">URGENT</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm truncate">{p.projectName}</h3>
                    <p className="text-xs text-gray-500 truncate">{p.client}</p>
                  </div>
                  <StatusBadge label={st.label} type={st.type} dot={false} />
                </div>
                {/* Service tag */}
                <div className="mb-3">
                  <span className="inline-block text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">{p.service}</span>
                </div>
                {/* Description */}
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {p.designer ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[9px] font-bold text-purple-700">
                          {getInitials(p.designer)}
                        </div>
                        <span className="text-xs text-gray-600">{p.designer}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400 italic">Non assigné</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><RefreshCw size={10} />{p.revisions}</span>
                    <span className="font-semibold text-gray-700">{formatCurrency(p.budget)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Réf', 'Projet', 'Client', 'Service', 'Designer', 'Révisions', 'Budget', 'Livraison', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const st = statusConfig[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-purple-50/20 group transition-colors">
                      <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-purple-600">#{p.ref}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800 max-w-[140px] truncate cursor-pointer" onClick={() => setSelected(p)}>{p.projectName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate cursor-pointer" onClick={() => setSelected(p)}>{p.client}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{p.service}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.designer || <span className="italic text-gray-400">Non assigné</span>}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{p.revisions}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatCurrency(p.budget)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(p.deliveryDate)}</td>
                      <td className="px-4 py-3"><StatusBadge label={st.label} type={st.type} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelected(p)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"><Eye size={13} /></button>
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={13} /></button>
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

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-[480px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #4C1D95, #7C3AED)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-purple-300 text-xs">Projet graphique</p>
                  <h3 className="text-xl font-bold">{selected.projectName}</h3>
                  <p className="text-purple-200 text-sm mt-0.5">{selected.client}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2">
                <StatusBadge label={statusConfig[selected.status].label} type={statusConfig[selected.status].type} />
                <span className="font-mono text-xs bg-white/20 px-2 py-1 rounded-full text-purple-100">#{selected.ref}</span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Service', value:selected.service, color:'text-purple-700' },
                  { label:'Budget', value:formatCurrency(selected.budget), color:'text-green-600' },
                  { label:'Designer', value:selected.designer || 'Non assigné', color:'text-gray-700' },
                  { label:'Révisions', value:`${selected.revisions} effectuées`, color:'text-gray-700' },
                  { label:'Livraison', value:formatDate(selected.deliveryDate), color:'text-gray-700' },
                  { label:'Créé le', value:formatDate(selected.createdAt), color:'text-gray-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description du brief</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Étapes de production</p>
                <div className="space-y-2">
                  {[['Réception du brief', 1], ['Conception maquette', 2], ['Présentation client', 3], ['Validation finale', 4], ['Livraison fichiers', 5]].map(([lbl, step]) => {
                    const curr = statusConfig[selected.status]?.step || 0
                    const s = step as number
                    const isDone = curr > s
                    const isCurr = curr === s
                    return (
                      <div key={lbl as string} className={`flex items-center gap-3 p-2 rounded-lg ${isCurr ? 'bg-purple-50' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDone ? 'bg-purple-500 text-white' : isCurr ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {isDone ? '✓' : s}
                        </div>
                        <span className={`text-xs ${isCurr ? 'text-purple-700 font-semibold' : isDone ? 'text-gray-400 line-through' : 'text-gray-400'}`}>{lbl as string}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  <span className="flex items-center justify-center gap-2"><Edit size={14} /> Mettre à jour</span>
                </button>
                <button onClick={() => handleDelete(selected)}
                  className="px-3 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditingId(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingId ? 'Modifier le projet' : 'Nouveau projet graphique'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                  <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required placeholder="Nom client"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom du projet *</label>
                  <input value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} required placeholder="Ex: Logo entreprise"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type de service *</label>
                  <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="">Choisir...</option>
                    {serviceTypes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Designer assigné</label>
                  <select value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="">Non assigné</option>
                    <option>Marie K.</option>
                    <option>Albert M.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Budget (FC)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de livraison</label>
                  <input type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brief / Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  placeholder="Brief créatif, couleurs souhaitées, style, contraintes..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowModal(false); setEditingId(null) }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSubmit}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                  {editingId ? 'Enregistrer les modifications' : 'Créer le projet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
