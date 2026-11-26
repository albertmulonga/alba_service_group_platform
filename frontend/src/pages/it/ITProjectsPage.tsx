import React, { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  Monitor, Plus, Search, Eye, Edit, X, TrendingUp, Users,
  Clock, CheckCircle, Code, Globe, Smartphone, Laptop, Database, Zap, Trash2
} from 'lucide-react'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Project = {
  id:string; ref:string; name:string; client:string; type:string; status:string
  lead:string; team:string[]; budget:number; spent:number; progress:number
  startDate:string; dueDate:string; technologies:string[]; description:string
}

const MOCK_PROJECTS: Project[] = [
  { id:'1', ref:'IT-0015', name:'ERP Hôpital Général', client:'Hôpital Général de Kindu', type:'ERP Web', status:'in_progress', lead:'Paul I.', team:['Paul I.','Albert M.'], budget:2500000, spent:1200000, progress:48, startDate:'2026-05-01', dueDate:'2026-12-31', technologies:['Laravel','React','PostgreSQL'], description:'Système de gestion hospitalière : patients, consultations, pharmacie, facturation' },
  { id:'2', ref:'IT-0014', name:'App Mobile Pharmacie', client:'Pharmacie Central', type:'Android/iOS', status:'planning', lead:'Albert M.', team:['Albert M.'], budget:1500000, spent:0, progress:5, startDate:'2026-08-01', dueDate:'2027-02-28', technologies:['Flutter','Dart','PostgreSQL'], description:'Application de gestion de stock pharmacie et ordonnances numériques' },
  { id:'3', ref:'IT-0013', name:'Site Vitrine École BERUNDA', client:'École BERUNDA', type:'Site Web', status:'delivered', lead:'Paul I.', team:['Paul I.','Marie K.'], budget:500000, spent:500000, progress:100, startDate:'2026-04-01', dueDate:'2026-06-30', technologies:['React','TailwindCSS'], description:'Site vitrine moderne avec galerie, actualités et formulaire de contact' },
  { id:'4', ref:'IT-0012', name:'Logiciel Gestion Commerciale', client:'Entreprise ABC SARL', type:'Desktop App', status:'maintenance', lead:'Albert M.', team:['Albert M.','Paul I.'], budget:3000000, spent:3000000, progress:100, startDate:'2026-01-01', dueDate:'2026-07-01', technologies:['Python','PyQt','PostgreSQL'], description:'Application desktop de gestion ventes, stocks et clients' },
  { id:'5', ref:'IT-0011', name:'Portail Intranet Mairie', client:'Mairie de Kindu', type:'Web App', status:'paused', lead:'Paul I.', team:['Paul I.'], budget:1800000, spent:600000, progress:33, startDate:'2026-03-01', dueDate:'2026-09-30', technologies:['Laravel','Vue.js','PostgreSQL'], description:'Portail intranet pour les agents municipaux – gestion documents et congés' },
]

const statusConfig: Record<string, {label:string;type:any;color:string}> = {
  planning:    {label:'Planification', type:'info',      color:'bg-sky-500'},
  in_progress: {label:'En cours',      type:'primary',   color:'bg-blue-500'},
  testing:     {label:'Tests',         type:'warning',   color:'bg-yellow-500'},
  delivered:   {label:'Livré',         type:'success',   color:'bg-green-500'},
  maintenance: {label:'Maintenance',   type:'secondary', color:'bg-gray-400'},
  paused:      {label:'En pause',      type:'warning',   color:'bg-orange-400'},
  cancelled:   {label:'Annulé',        type:'danger',    color:'bg-red-500'},
}

const typeIcons: Record<string, React.ReactNode> = {
  'ERP Web':    <Globe size={14} />,
  'Web App':    <Globe size={14} />,
  'Site Web':   <Globe size={14} />,
  'Android/iOS':<Smartphone size={14} />,
  'Desktop App':<Laptop size={14} />,
  default:      <Code size={14} />,
}

const emptyForm = { name:'', client:'', type:'Web App', description:'', lead:'', budget:'', dueDate:'' }

export default function ITProjectsPage() {
  const { items: projects, add, update, remove, loading, error, refresh } = useApiDB<Project>('/projects', [], (raw: any) => ({ ...raw }))

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Project | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => projects.filter(p => {
    const ms = `${p.ref} ${p.name} ${p.client} ${p.type}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || p.status === statusFilter
    return ms && mf
  }), [projects, search, statusFilter])

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered, 12)

  const active = projects.filter(p => p.status === 'in_progress').length
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0)
  const totalSpent  = projects.reduce((s, p) => s + p.spent, 0)
  const delivered   = projects.filter(p => p.status === 'delivered').length

  const budgetChart = useMemo(() => projects.map(p => ({
    name: p.ref, budget: p.budget, spent: p.spent,
  })), [projects])

  const genRef = () => {
    const maxNum = projects.reduce((max, p) => {
      const num = parseInt(p.ref.replace('IT-', ''), 10)
      return num > max ? num : max
    }, 0)
    return `IT-${String(maxNum + 1).padStart(4, '0')}`
  }

  const handleNew = () => {
    setEditingProject(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setForm({
      name: project.name,
      client: project.client,
      type: project.type,
      description: project.description,
      lead: project.lead,
      budget: project.budget.toString(),
      dueDate: project.dueDate,
    })
    setSelected(null)
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim() || !form.client.trim()) {
      showToast('Nom et client requis', )
      return
    }
    if (editingProject) {
      update(editingProject.id, {
        name: form.name,
        client: form.client,
        type: form.type,
        description: form.description,
        lead: form.lead,
        budget: Number(form.budget) || 0,
        dueDate: form.dueDate,
      })
      showToast(`Projet "${form.name}" modifié`)
    } else {
      add({
        ref: genRef(),
        name: form.name,
        client: form.client,
        type: form.type,
        status: 'planning',
        lead: form.lead || 'Non assigné',
        team: form.lead ? [form.lead] : [],
        budget: Number(form.budget) || 0,
        spent: 0,
        progress: 0,
        startDate: new Date().toISOString().split('T')[0],
        dueDate: form.dueDate || '',
        technologies: [],
        description: form.description,
      })
      showToast(`Projet "${form.name}" créé`)
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return
    const p = projects.find(pr => pr.id === id)
    remove(id)
    setSelected(null)
    showToast(`Projet "${p?.name}" supprimé`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Projets Informatiques"
        subtitle="Suivi du développement logiciel et des projets numériques"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Informatique' }, { label: 'Projets' }]}
        icon={<Monitor size={22} />}
        iconBg="gradient-primary"
        actions={
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
            <Plus size={15} /> Nouveau projet
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Projets actifs" value={active.toString()} icon={<Monitor size={20} />} gradient="gradient-primary" />
        <KpiCard title="Livrés" value={delivered.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="Budget total" value={`${(totalBudget / 1000000).toFixed(1)}M FC`} icon={<TrendingUp size={20} />} gradient="gradient-teal" />
        <KpiCard title="Consommé" value={`${(totalSpent / 1000000).toFixed(1)}M FC`} icon={<Zap size={20} />} gradient="gradient-warning" />
      </div>

      {/* Budget chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Budget vs Consommation par projet</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={budgetChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000000}M`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Bar dataKey="budget" name="Budget" fill="#DBEAFE" radius={[4,4,0,0]} />
            <Bar dataKey="spent" name="Consommé" fill="#2563EB" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl flex-wrap">
            {[['all','Tous'], ['in_progress','En cours'], ['planning','Planif.'], ['delivered','Livrés'], ['maintenance','Maintenance']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Réf, projet, client, type..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <ExportButton
            data={filtered}
            filename="projets-it-alba"
            title="Projets Informatiques"
            headers={{
              ref: 'Référence', name: 'Nom du projet', client: 'Client',
              type: 'Type de projet', status: 'Statut', lead: 'Chef de projet',
              budget: 'Budget', spent: 'Consommé', progress: 'Progression',
              startDate: 'Date de début', dueDate: 'Date de livraison', technologies: 'Technologies',
            }}
          />
        </div>
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedItems.map(p => {
          const st = statusConfig[p.status]
          const budgetPct = Math.round((p.spent / p.budget) * 100)
          return (
            <div key={p.id} onClick={() => setSelected(p)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600">#{p.ref}</span>
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                      {typeIcons[p.type] || typeIcons.default}{p.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{p.client}</p>
                </div>
                <StatusBadge label={st.label} type={st.type} dot={false} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.description}</p>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Progression</span>
                  <span className="text-xs font-bold text-gray-700">{p.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${p.progress}%`, background: p.progress === 100 ? '#22C55E' : 'linear-gradient(90deg,#1E3A8A,#2563EB)' }} />
                </div>
              </div>
              {/* Budget */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs">
                  <span className="text-gray-400">Budget: </span>
                  <span className="font-semibold text-gray-700">{formatCurrency(p.budget)}</span>
                </div>
                <div className="text-xs">
                  <span className="text-gray-400">Consommé: </span>
                  <span className={`font-semibold ${budgetPct > 80 ? 'text-red-600' : 'text-green-600'}`}>{budgetPct}%</span>
                </div>
              </div>
              {/* Team */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex -space-x-2">
                  {p.team.map((m, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', zIndex: 10 - i }}>
                      {getInitials(m)}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11} />{formatDate(p.dueDate)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-[500px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #0F2460, #1E3A8A)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-blue-300 text-xs">Projet #{selected.ref}</p>
                  <h3 className="text-xl font-bold">{selected.name}</h3>
                  <p className="text-blue-200 text-sm mt-0.5">{selected.client}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge label={statusConfig[selected.status].label} type={statusConfig[selected.status].type} />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-blue-100">{selected.type}</span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Budget', value:formatCurrency(selected.budget), color:'text-gray-800' },
                  { label:'Consommé', value:formatCurrency(selected.spent), color:'text-blue-600' },
                  { label:'Début', value:formatDate(selected.startDate), color:'text-gray-800' },
                  { label:'Livraison', value:formatDate(selected.dueDate), color:'text-gray-800' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Progression globale</p>
                  <span className="text-sm font-bold text-blue-600">{selected.progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${selected.progress}%`, background: 'linear-gradient(90deg,#1E3A8A,#2563EB)' }} />
                </div>
              </div>
              {/* Technologies */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Technologies</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.technologies.map((t, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{t}</span>
                  ))}
                </div>
              </div>
              {/* Team */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Équipe</p>
                <div className="flex flex-wrap gap-2">
                  {selected.team.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
                        {getInitials(m)}
                      </div>
                      <span className="text-xs text-gray-700">{m}</span>
                      {m === selected.lead && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded-full">lead</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(selected)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  <Edit size={14} /> Modifier
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingProject ? 'Modifier le projet' : 'Nouveau projet informatique'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom du projet *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex: ERP Pharmacie"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                  <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required placeholder="Nom du client"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {['Web App','ERP Web','Site Web','Android/iOS','Desktop App','API','Maintenance'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chef de projet</label>
                  <input value={form.lead} onChange={e => setForm({ ...form, lead: e.target.value })} placeholder="Responsable"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Budget (FC)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de livraison</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                    placeholder="Objectifs et description du projet..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSubmit}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  {editingProject ? 'Enregistrer les modifications' : 'Créer le projet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in gradient-success">
          <CheckCircle size={18} /> {toast}
        </div>
      )}
    </div>
  )
}
