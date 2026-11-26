import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { useMockDB } from '@/hooks/useMockDB'
import { formatDate, getInitials } from '@/lib/utils'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { Bug, Plus, Search, X, AlertCircle, Clock, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react'

type Ticket = {
  id:string; ref:string; title:string; project:string; projectRef:string
  reporter:string; assignee:string; type:string; status:string; priority:string
  createdAt:string; updatedAt:string; description:string; steps?:string; comments:number
}

const MOCK_TICKETS: Ticket[] = [
  { id:'1', ref:'TKT-0042', title:'Bug calcul remises cumulées', project:'Logiciel Gestion Commerciale', projectRef:'IT-0012', reporter:'Entreprise ABC', assignee:'Paul I.', type:'bug', status:'in_progress', priority:'critical', createdAt:'2026-07-26', updatedAt:'2026-07-27', description:'Le calcul des remises cumulées donne un résultat incorrect quand plusieurs remises sont appliquées en cascade sur une même facture', steps:'1. Créer une facture\n2. Appliquer 3 remises\n3. Observer le total', comments:3 },
  { id:'2', ref:'TKT-0041', title:'Erreur 500 sur /api/patients/search', project:'ERP Hôpital Général', projectRef:'IT-0015', reporter:'Hôpital Général', assignee:'Paul I.', type:'bug', status:'open', priority:'high', createdAt:'2026-07-25', updatedAt:'2026-07-25', description:'L\'endpoint de recherche patients retourne une erreur 500 quand le paramètre search contient des caractères spéciaux', steps:'GET /api/patients?search=jean+rémy → 500', comments:1 },
  { id:'3', ref:'TKT-0040', title:'Ajouter export Excel à la liste patients', project:'ERP Hôpital Général', projectRef:'IT-0015', reporter:'Hôpital Général', assignee:'Albert M.', type:'feature', status:'open', priority:'medium', createdAt:'2026-07-24', updatedAt:'2026-07-24', description:'Le médecin chef demande un export Excel de la liste des patients avec filtres appliqués', steps:'', comments:0 },
  { id:'4', ref:'TKT-0039', title:'Lenteur chargement module ventes', project:'Logiciel Gestion Commerciale', projectRef:'IT-0012', reporter:'Entreprise ABC', assignee:'Paul I.', type:'performance', status:'resolved', priority:'medium', createdAt:'2026-07-20', updatedAt:'2026-07-22', description:'Module ventes met 8-10 secondes à charger, requête non optimisée', steps:'', comments:2 },
  { id:'5', ref:'TKT-0038', title:'Mise à jour librairie sécurité', project:'Portail Intranet Mairie', projectRef:'IT-0011', reporter:'Albert M.', assignee:'Albert M.', type:'security', status:'resolved', priority:'high', createdAt:'2026-07-18', updatedAt:'2026-07-19', description:'Mise à jour de Laravel vers 11.x pour corriger une vulnérabilité CVE-2026-XXXX', steps:'', comments:1 },
  { id:'6', ref:'TKT-0037', title:'Impression rapport A4 tronquée', project:'Logiciel Gestion Commerciale', projectRef:'IT-0012', reporter:'Entreprise ABC', assignee:'', type:'bug', status:'open', priority:'low', createdAt:'2026-07-27', updatedAt:'2026-07-27', description:'L\'impression du rapport mensuel en A4 coupe les 2 dernières colonnes sur l\'imprimante HP', steps:'', comments:0 },
]

const statusConfig: Record<string, {label:string;type:any}> = {
  open:        {label:'Ouvert',     type:'warning'},
  in_progress: {label:'En traitement', type:'primary'},
  resolved:    {label:'Résolu',     type:'success'},
  closed:      {label:'Fermé',      type:'secondary'},
  rejected:    {label:'Rejeté',     type:'danger'},
}

const priorityConfig: Record<string, {label:string;cls:string;dotColor:string}> = {
  critical: {label:'Critique', cls:'bg-red-100 text-red-700',    dotColor:'bg-red-500'},
  high:     {label:'Haute',    cls:'bg-orange-50 text-orange-700', dotColor:'bg-orange-400'},
  medium:   {label:'Normale',  cls:'bg-blue-50 text-blue-600',   dotColor:'bg-blue-400'},
  low:      {label:'Faible',   cls:'bg-gray-100 text-gray-500',  dotColor:'bg-gray-300'},
}

const typeConfig: Record<string, {label:string;emoji:string;cls:string}> = {
  bug:         {label:'Bug',         emoji:'🐛', cls:'bg-red-50 text-red-700'},
  feature:     {label:'Fonctionnalité', emoji:'✨', cls:'bg-purple-50 text-purple-700'},
  performance: {label:'Performance', emoji:'⚡', cls:'bg-yellow-50 text-yellow-700'},
  security:    {label:'Sécurité',    emoji:'🔒', cls:'bg-gray-100 text-gray-700'},
  question:    {label:'Question',    emoji:'❓', cls:'bg-blue-50 text-blue-700'},
}

export default function ITTicketsPage() {
  const { items: tickets, add, update } = useMockDB<Ticket>('alba-it-tickets', MOCK_TICKETS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title:'', project:'', type:'bug', priority:'medium', description:'' })
  const [toast, setToast] = useState<string|null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = tickets.filter(t => {
    const ms = `${t.ref} ${t.title} ${t.project} ${t.assignee}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || t.status === statusFilter
    return ms && mf
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered, 10)

  const open = tickets.filter(t => t.status === 'open').length
  const inProgress = tickets.filter(t => t.status === 'in_progress').length
  const critical = tickets.filter(t => t.priority === 'critical').length
  const resolved = tickets.filter(t => t.status === 'resolved').length

  const nextTicketRef = `TKT-${String(Math.max(...tickets.map(t => parseInt(t.ref.split('-')[1])), 0) + 1).padStart(4, '0')}`

  const handleCreate = () => {
    if (!form.title.trim()) return alert('Le titre est requis.')
    if (!form.description.trim()) return alert('La description est requise.')
    const projectNames: Record<string, string> = {
      'IT-0015': 'ERP Hôpital Général',
      'IT-0014': 'Application Pharmacie',
      'IT-0012': 'Logiciel Gestion Commerciale',
      'IT-0011': 'Portail Intranet Mairie',
    }
    const newTicket = add({
      ref: nextTicketRef,
      title: form.title,
      project: projectNames[form.project] || form.project,
      projectRef: form.project,
      reporter: 'Utilisateur',
      assignee: '',
      type: form.type,
      status: 'open',
      priority: form.priority,
      createdAt: new Date().toISOString().slice(0,10),
      updatedAt: new Date().toISOString().slice(0,10),
      description: form.description,
      steps: '',
      comments: 0,
    })
    setForm({ title:'', project:'', type:'bug', priority:'medium', description:'' })
    setShowModal(false)
    showToast(`Ticket #${newTicket.ref} créé`)
  }

  const handleTakeInCharge = (ticket: Ticket) => {
    update(ticket.id, { status: 'in_progress', assignee: ticket.assignee || 'Utilisateur', updatedAt: new Date().toISOString().slice(0,10) })
    setSelected({ ...ticket, status: 'in_progress', updatedAt: new Date().toISOString().slice(0,10) })
    showToast(`Ticket #${ticket.ref} pris en charge`)
  }

  const handleMarkResolved = (ticket: Ticket) => {
    update(ticket.id, { status: 'resolved', updatedAt: new Date().toISOString().slice(0,10) })
    setSelected({ ...ticket, status: 'resolved', updatedAt: new Date().toISOString().slice(0,10) })
    showToast(`Ticket #${ticket.ref} marqué résolu`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Tickets & Support Technique"
        subtitle="Gestion des bugs, demandes d'évolution et incidents"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Informatique' }, { label: 'Tickets' }]}
        icon={<Bug size={22} />}
        iconBg="gradient-danger"
        actions={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
            <Plus size={15} /> Nouveau ticket
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Tickets ouverts" value={open.toString()} icon={<AlertCircle size={20} />} gradient="gradient-warning" />
        <KpiCard title="En traitement" value={inProgress.toString()} icon={<Clock size={20} />} gradient="gradient-primary" />
        <KpiCard title="Critiques" value={critical.toString()} icon={<AlertTriangle size={20} />} gradient="gradient-danger" />
        <KpiCard title="Résolus" value={resolved.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[['all','Tous'],['open','Ouverts'],['in_progress','En cours'],['resolved','Résolus']].map(([v,l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Réf, titre, projet..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
          </div>
          <ExportButton
            data={filtered}
            filename="tickets-it-alba"
            title="Tickets Support IT"
            headers={{
              ref: 'Référence', title: 'Titre', project: 'Projet',
              projectRef: 'Réf. Projet', reporter: 'Rapporté par', assignee: 'Assigné à',
              type: 'Type', status: 'Statut', priority: 'Priorité',
              createdAt: 'Date de création', updatedAt: 'Date de mise à jour',
              description: 'Description', comments: 'Commentaires',
            }}
          />
        </div>
      </div>

      {/* Tickets list */}
      <div className="space-y-3">
        {paginatedItems.map(t => {
          const st = statusConfig[t.status]
          const pr = priorityConfig[t.priority]
          const tp = typeConfig[t.type]
          return (
            <div key={t.id} onClick={() => setSelected(t)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md cursor-pointer transition-all flex items-start gap-4">
              {/* Left dot */}
              <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${pr.dotColor}`} />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-red-600">#{t.ref}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tp.cls}`}>{tp.emoji} {tp.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm">{t.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge label={st.label} type={st.type} />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-full">{t.projectRef}</span>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={9} />{formatDate(t.createdAt)}</span>
                  {t.assignee && (
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
                        {getInitials(t.assignee)}
                      </div>
                      <span className="text-[10px] text-gray-500">{t.assignee}</span>
                    </div>
                  )}
                  {t.comments > 0 && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1"><MessageSquare size={9} />{t.comments}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Bug size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun ticket trouvé</p>
          </div>
        )}
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
          <div className="w-[480px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #991B1B, #DC2626)' }}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-red-200 text-xs">{selected.projectRef} · {typeConfig[selected.type]?.emoji} {typeConfig[selected.type]?.label}</p>
                  <h3 className="text-lg font-bold mt-1">{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2">
                <StatusBadge label={statusConfig[selected.status].label} type={statusConfig[selected.status].type} />
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityConfig[selected.priority].cls}`}>{priorityConfig[selected.priority].label}</span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
              </div>
              {selected.steps && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Étapes de reproduction</p>
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap font-mono">{selected.steps}</pre>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Projet', value:selected.project, color:'text-gray-800' },
                  { label:'Rapporté par', value:selected.reporter, color:'text-gray-800' },
                  { label:'Assigné à', value:selected.assignee || 'Non assigné', color:selected.assignee ? 'text-blue-600' : 'text-gray-400' },
                  { label:'Mis à jour', value:formatDate(selected.updatedAt), color:'text-gray-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {selected.status !== 'in_progress' && selected.status !== 'resolved' && (
                  <button onClick={() => handleTakeInCharge(selected)}
                    className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
                    Prendre en charge
                  </button>
                )}
                {selected.status !== 'resolved' && (
                  <button onClick={() => handleMarkResolved(selected)}
                    className="flex-1 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-xl">
                    Marquer résolu
                  </button>
                )}
                {selected.status === 'resolved' && (
                  <div className="flex-1 py-2.5 text-sm font-medium text-green-700 bg-green-50 rounded-xl text-center">
                    ✓ Résolu
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Nouveau ticket</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="Description courte du problème"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priorité</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Projet</label>
                  <select value={form.project} onChange={e => setForm({...form, project: e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    <option value="">Choisir...</option>
                    <option value="IT-0015">IT-0015 – ERP Hôpital</option>
                    <option value="IT-0014">IT-0014 – App Pharmacie</option>
                    <option value="IT-0012">IT-0012 – Gestion Commerciale</option>
                    <option value="IT-0011">IT-0011 – Intranet Mairie</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4}
                  placeholder="Décrivez le problème en détail, les étapes de reproduction..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleCreate}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
                  Créer le ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
