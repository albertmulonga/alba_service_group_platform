import React, { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatDate, getInitials } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { CheckSquare, Plus, Search, X, Clock, CheckCircle, AlertCircle, Layers, Trash2, ChevronRight } from 'lucide-react'

type Task = {
  id:string; title:string; project:string; projectRef:string; assignee:string
  status:string; priority:string; estimated:number; elapsed:number
  dueDate:string; createdAt:string; description:string; tags:string[]
}

const mockTasks: Task[] = [
  { id:'1', title:'Conception base de données patients', project:'ERP Hôpital Général', projectRef:'IT-0015', assignee:'Paul I.', status:'done', priority:'high', estimated:16, elapsed:18, dueDate:'2026-07-15', createdAt:'2026-07-01', description:'Modélisation et migration du schéma PostgreSQL pour les entités patients, consultations et dossiers médicaux', tags:['PostgreSQL','Modélisation'] },
  { id:'2', title:'Développement API patients (REST)', project:'ERP Hôpital Général', projectRef:'IT-0015', assignee:'Paul I.', status:'in_progress', priority:'high', estimated:24, elapsed:12, dueDate:'2026-07-30', createdAt:'2026-07-16', description:'Endpoints CRUD patients : authentification JWT, validation, pagination', tags:['Laravel','REST API'] },
  { id:'3', title:'Interface liste patients (React)', project:'ERP Hôpital Général', projectRef:'IT-0015', assignee:'Albert M.', status:'in_progress', priority:'medium', estimated:16, elapsed:8, dueDate:'2026-08-05', createdAt:'2026-07-20', description:'Tableau de bord patients avec filtres, recherche et pagination', tags:['React','TypeScript'] },
  { id:'4', title:'Analyse besoins – App Pharmacie', project:'App Mobile Pharmacie', projectRef:'IT-0014', assignee:'Albert M.', status:'done', priority:'high', estimated:8, elapsed:6, dueDate:'2026-07-20', createdAt:'2026-07-15', description:'Réunion client, collecte des besoins, rédaction du cahier des charges', tags:['Analyse'] },
  { id:'5', title:'Maquettes UI Flutter', project:'App Mobile Pharmacie', projectRef:'IT-0014', assignee:'Albert M.', status:'to_do', priority:'medium', estimated:20, elapsed:0, dueDate:'2026-08-15', createdAt:'2026-07-25', description:'Design des écrans principaux : accueil, stock, scan ordonnance', tags:['Flutter','UI/UX'] },
  { id:'6', title:'Maintenance correctrice v1.2', project:'Logiciel Gestion Commerciale', projectRef:'IT-0012', assignee:'Paul I.', status:'in_progress', priority:'urgent', estimated:8, elapsed:3, dueDate:'2026-07-28', createdAt:'2026-07-26', description:'Bug critique : calcul incorrect des remises cumulées – correctif urgent', tags:['Python','Bug'] },
  { id:'7', title:'Module authentification Laravel', project:'Portail Intranet Mairie', projectRef:'IT-0011', assignee:'Paul I.', status:'to_do', priority:'medium', estimated:12, elapsed:0, dueDate:'2026-09-01', createdAt:'2026-07-25', description:'Implémentation JWT + Spatie Permissions pour le portail mairie', tags:['Laravel','Auth'] },
]

const statusConfig: Record<string, {label:string;type:any}> = {
  to_do:       {label:'À faire',    type:'secondary'},
  in_progress: {label:'En cours',   type:'primary'},
  review:      {label:'En révision',type:'info'},
  done:        {label:'Terminée',   type:'success'},
  blocked:     {label:'Bloquée',    type:'danger'},
}

const priorityConfig: Record<string, {label:string;cls:string}> = {
  low:    {label:'Faible',   cls:'bg-gray-100 text-gray-500'},
  medium: {label:'Normale',  cls:'bg-blue-50 text-blue-600'},
  high:   {label:'Haute',    cls:'bg-orange-50 text-orange-700'},
  urgent: {label:'Urgente',  cls:'bg-red-50 text-red-700'},
}

const tagColors = ['bg-blue-50 text-blue-700','bg-purple-50 text-purple-700','bg-green-50 text-green-700','bg-amber-50 text-amber-700','bg-pink-50 text-pink-700']

const emptyForm = {
  title:'', project:'', projectRef:'', assignee:'',
  status:'to_do', priority:'medium', estimated:0, elapsed:0,
  dueDate:'', description:'', tags:[] as string[],
}

const assigneeOptions = ['Paul I.','Albert M.','Serge K.','Marie L.']

export default function ITTasksPage() {
  const { items: tasks, add, update, remove } = useMockDB<Task>('alba-it-tasks', mockTasks)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState<'list'|'kanban'>('kanban')
  const [selected, setSelected] = useState<Task | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tagInput, setTagInput] = useState('')

  const [toast, setToast] = useState<string|null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openCreateModal = () => {
    setEditingTask(null)
    setForm(emptyForm)
    setTagInput('')
    setShowModal(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title, project: task.project, projectRef: task.projectRef,
      assignee: task.assignee, status: task.status, priority: task.priority,
      estimated: task.estimated, elapsed: task.elapsed, dueDate: task.dueDate,
      description: task.description, tags: [...task.tags],
    })
    setTagInput('')
    setSelected(null)
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (editingTask) {
      update(editingTask.id, { ...form })
      showToast('Tâche modifiée avec succès')
    } else {
      add({
        ...form,
        createdAt: new Date().toISOString().slice(0, 10),
      })
      showToast('Nouvelle tâche créée avec succès')
    }
    setShowModal(false)
    setEditingTask(null)
    setForm(emptyForm)
  }

  const handleDelete = (id: string) => {
    remove(id)
    setSelected(null)
    showToast('Tâche supprimée')
  }

  const handleStatusChange = (taskId: string, newStatus: string) => {
    update(taskId, { status: newStatus })
    showToast(`Statut mis à jour : ${statusConfig[newStatus].label}`)
    setSelected(prev => prev && prev.id === taskId ? { ...prev, status: newStatus } : prev)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const setField = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const filtered = useMemo(() => tasks.filter(t => {
    const ms = `${t.title} ${t.project} ${t.assignee}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || t.status === statusFilter
    return ms && mf
  }), [tasks, search, statusFilter])

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered, 10)

  const todo = tasks.filter(t => t.status === 'to_do').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const done = tasks.filter(t => t.status === 'done').length
  const totalHours = tasks.reduce((s, t) => s + t.elapsed, 0)

  const kanbanCols = ['to_do','in_progress','review','done','blocked']

  const nextStatusMap: Record<string, string|null> = {
    to_do: 'in_progress',
    in_progress: 'review',
    review: 'done',
    done: null,
    blocked: 'to_do',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in gradient-success">
          <CheckCircle size={18} /> {toast}
        </div>
      )}

      <PageHeader
        title="Tâches de Développement"
        subtitle="Suivi des tâches par projet et développeur"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Informatique' }, { label: 'Tâches' }]}
        icon={<CheckSquare size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {([['list','≡'],['kanban','⊞']] as const).map(([v, i]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${view === v ? 'bg-white shadow-sm' : 'text-gray-400'}`}>{i}</button>
              ))}
            </div>
            <button onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouvelle tâche
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="À faire" value={todo.toString()} icon={<Layers size={20} />} gradient="gradient-warning" />
        <KpiCard title="En cours" value={inProgress.toString()} icon={<Clock size={20} />} gradient="gradient-primary" />
        <KpiCard title="Terminées" value={done.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="Heures log." value={`${totalHours}h`} icon={<Clock size={20} />} gradient="gradient-teal" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[['all','Toutes'],['to_do','À faire'],['in_progress','En cours'],['done','Terminées'],['blocked','Bloquées']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tâche, projet, développeur..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <ExportButton
            data={filtered}
            filename="taches-it-alba"
            title="Tâches Informatiques"
            headers={{
              title: 'Tâche', project: 'Projet', projectRef: 'Réf. Projet',
              assignee: 'Assigné à', priority: 'Priorité', status: 'Statut',
              estimated: 'Estimé (h)', elapsed: 'Écoulé (h)',
              dueDate: 'Échéance', description: 'Description', tags: 'Tags',
            }}
          />
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {kanbanCols.map(col => {
            const colTasks = filtered.filter(t => t.status === col)
            const st = statusConfig[col]
            return (
              <div key={col} className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge label={st.label} type={st.type} dot={false} />
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 w-5 h-5 rounded-full flex items-center justify-center">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(t => (
                    <div key={t.id} onClick={() => setSelected(t)}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{t.title}</p>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 ${priorityConfig[t.priority].cls}`}>
                          {priorityConfig[t.priority].label}
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-600 font-mono mb-2">{t.projectRef}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {t.tags.slice(0,2).map((tag, i) => (
                          <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full ${tagColors[i % tagColors.length]}`}>{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
                          {getInitials(t.assignee)}
                        </div>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={9} />{t.elapsed}h/{t.estimated}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Tâche','Projet','Assigné','Priorité','Statut','Temps','Échéance',''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedItems.map(t => {
                  const st = statusConfig[t.status]
                  const pr = priorityConfig[t.priority]
                  return (
                    <tr key={t.id} onClick={() => setSelected(t)} className="hover:bg-blue-50/20 cursor-pointer group transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800">{t.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {t.tags.map((tag, i) => (
                            <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full ${tagColors[i % tagColors.length]}`}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] text-blue-600 font-mono font-bold">{t.projectRef}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{t.project}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
                            {getInitials(t.assignee)}
                          </div>
                          <span className="text-xs text-gray-600">{t.assignee}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge label={st.label} type={st.type} /></td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((t.elapsed/t.estimated)*100,100)}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5">{t.elapsed}h / {t.estimated}h</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.dueDate)}</td>
                      <td className="px-4 py-3">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'list' && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-[460px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #0F2460, #1E3A8A)' }}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-blue-300 text-xs">{selected.projectRef} · {selected.project}</p>
                  <h3 className="text-lg font-bold mt-1">{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2">
                <StatusBadge label={statusConfig[selected.status].label} type={statusConfig[selected.status].type} />
                <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[selected.priority].cls}`}>{priorityConfig[selected.priority].label}</span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Technologies</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag, i) => (
                    <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${tagColors[i % tagColors.length]}`}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Assigné à</p>
                  <p className="text-sm font-semibold text-gray-800">{selected.assignee}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Échéance</p>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(selected.dueDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Temps de travail</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Temps écoulé</span>
                    <span className="font-bold text-blue-600">{selected.elapsed}h</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((selected.elapsed/selected.estimated)*100,100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0h</span>
                    <span>{selected.estimated}h estimées</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Transition de statut</p>
                <div className="flex flex-wrap gap-2">
                  {kanbanCols.map(col => {
                    const isActive = selected.status === col
                    const next = nextStatusMap[selected.status]
                    const isNext = col === next
                    if (isActive) return (
                      <span key={col} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
                        → {statusConfig[col].label}
                      </span>
                    )
                    return (
                      <button key={col} onClick={() => handleStatusChange(selected.id, col)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all hover:shadow-sm
                          ${isNext ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                        {isNext && <ChevronRight size={12} className="inline -ml-0.5 mr-0.5" />}{statusConfig[col].label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditModal(selected)}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  Modifier la tâche
                </button>
                <button onClick={() => handleDelete(selected.id)}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Titre *</label>
                <input type="text" value={form.title} onChange={e => setField('title', e.target.value)}
                  placeholder="Titre de la tâche"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Projet</label>
                  <input type="text" value={form.project} onChange={e => setField('project', e.target.value)}
                    placeholder="Nom du projet"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Réf. Projet</label>
                  <input type="text" value={form.projectRef} onChange={e => setField('projectRef', e.target.value)}
                    placeholder="IT-XXXX"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Assigné à</label>
                  <select value={form.assignee} onChange={e => setField('assignee', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Sélectionner...</option>
                    {assigneeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Priorité</label>
                  <select value={form.priority} onChange={e => setField('priority', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Statut</label>
                  <select value={form.status} onChange={e => setField('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Estimé (h)</label>
                  <input type="number" min={0} value={form.estimated} onChange={e => setField('estimated', Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Échéance</label>
                  <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                  placeholder="Description de la tâche..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tags</label>
                <div className="flex gap-2">
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Ajouter un tag..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <button type="button" onClick={addTag}
                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                    +
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full font-medium ${tagColors[i % tagColors.length]} flex items-center gap-1`}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-gray-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={!form.title.trim()}
                className="px-5 py-2 text-sm font-medium text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                {editingTask ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
