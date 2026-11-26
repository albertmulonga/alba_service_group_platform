import { useState, useEffect } from 'react'
import { useApiDB } from '@/hooks/useApiDB'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import {
  Wrench, Plus, Search, Eye, Edit, X, Save, CheckCircle,
  AlertTriangle, Clock, Activity, Calendar, Trash2
} from 'lucide-react'

type Intervention = {
  id:string; ref:string; subject:string; equipment:string; technicien:string
  status:string; priority:string; createdAt:string; scheduledAt:string
  description:string; resolution:string
}

const INIT: Intervention[] = [
  { id:'1', ref:'INT-001', subject:'Imprimante HP LaserJet en panne',   equipment:'HP LaserJet Pro M428',     technicien:'David Kasongo', status:'OPEN',        priority:'HIGH',   createdAt:'2026-07-26', scheduledAt:'2026-07-28', description:'Bourrage papier récurrent, rouleaux à remplacer', resolution:'' },
  { id:'2', ref:'INT-002', subject:'Maintenance préventive plastifieuse',equipment:'Machine Plastification A3', technicien:'David Kasongo', status:'IN_PROGRESS',  priority:'MEDIUM', createdAt:'2026-07-25', scheduledAt:'2026-07-27', description:'Maintenance préventive trimestrielle', resolution:'' },
  { id:'3', ref:'INT-003', subject:'Scanner Canon défectueux',           equipment:'Scanner Canon DR-C230',    technicien:'Jean M.',       status:'OPEN',        priority:'HIGH',   createdAt:'2026-07-24', scheduledAt:'2026-07-29', description:'Capteur défectueux – pièce commandée', resolution:'' },
  { id:'4', ref:'INT-004', subject:'Nettoyage têtes impression Epson',   equipment:'Epson EcoTank Pro',        technicien:'David Kasongo', status:'RESOLVED',    priority:'LOW',    createdAt:'2026-07-20', scheduledAt:'2026-07-21', description:'Nettoyage périodique têtes impression', resolution:'Nettoyage effectué, qualité rétablie' },
  { id:'5', ref:'INT-005', subject:'Calibration massicot électrique',    equipment:'Massicot Électrique Ideal', technicien:'Jean M.',       status:'RESOLVED',    priority:'MEDIUM', createdAt:'2026-07-18', scheduledAt:'2026-07-19', description:'Réglage lame + calibration butée arrière', resolution:'Lame affûtée, butée recalibrée' },
]

const STATUS: Record<string,{label:string;type:any}> = {
  OPEN:        {label:'Ouvert',        type:'warning'},
  IN_PROGRESS: {label:'En cours',      type:'primary'},
  RESOLVED:    {label:'Résolu',        type:'success'},
  CLOSED:      {label:'Fermé',         type:'secondary'},
}

const PRIORITY: Record<string,{label:string;cls:string;dot:string}> = {
  LOW:    {label:'Basse',   cls:'bg-gray-100 text-gray-500',    dot:'bg-gray-400'},
  MEDIUM: {label:'Moyenne', cls:'bg-blue-50 text-blue-600',     dot:'bg-blue-500'},
  HIGH:   {label:'Haute',   cls:'bg-orange-50 text-orange-700', dot:'bg-orange-500'},
}

const EQUIPMENTS = ['HP LaserJet Pro M428','Epson EcoTank Pro','Machine Plastification A3','Massicot Électrique Ideal','Relieuse Spirale GBC','Scanner Canon DR-C230','Photocopieur Ricoh','Ordinateur Bureau 1','Serveur Principal']
const TECHNICIANS = ['David Kasongo','Jean Mukendi','Paul Kasongo','Technicien externe']

export default function MaintenancePage() {
  const { items, add, update, remove, loading, error, refresh } = useApiDB<Intervention>('/maintenance/interventions', [], (raw: any) => ({ ...raw }))
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Intervention|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<Intervention|null>(null)
  const [toast, setToast]       = useState<string|null>(null)
  const [form, setForm] = useState({
    subject:'', equipment:EQUIPMENTS[0], technicien:TECHNICIANS[0],
    priority:'MEDIUM', scheduledAt:'', description:''
  })

  useEffect(() => {
    if (selected) {
      const updated = items.find(i => i.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [items, selected?.id])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = items.filter(i => {
    const ms = `${i.ref} ${i.subject} ${i.equipment} ${i.technicien}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || i.status === statusFilter
    return ms && mf
  })

  const openCount    = items.filter(i => i.status === 'OPEN').length
  const inProgCount  = items.filter(i => i.status === 'IN_PROGRESS').length
  const resolvedCount= items.filter(i => i.status === 'RESOLVED').length
  const highCount    = items.filter(i => i.priority === 'HIGH' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length

  const openNew = () => {
    setEditing(null)
    setForm({subject:'',equipment:EQUIPMENTS[0],technicien:TECHNICIANS[0],priority:'MEDIUM',scheduledAt:'',description:''})
    setShowModal(true)
  }

  const openEdit = (item: Intervention) => {
    setEditing(item)
    setForm({subject:item.subject,equipment:item.equipment,technicien:item.technicien,priority:item.priority,scheduledAt:item.scheduledAt,description:item.description})
    setShowModal(true)
  }

  const save = () => {
    if (!form.subject.trim()) return alert('Sujet requis.')
    if (editing) {
      update(editing.id, form)
      showToast(`Intervention ${editing.ref} mise à jour`)
    } else {
      const ref = `INT-${String(items.length+1).padStart(3,'0')}`
      add({
        ref,
        subject: form.subject, equipment: form.equipment,
        technicien: form.technicien, status: 'OPEN',
        priority: form.priority,
        createdAt: new Date().toISOString().slice(0,10),
        scheduledAt: form.scheduledAt,
        description: form.description, resolution: ''
      })
      showToast('Intervention créée')
    }
    setShowModal(false)
  }

  const changeStatus = (id:string, newStatus:string) => {
    update(id, { status: newStatus } as Partial<Intervention>)
    const item = items.find(i => i.id === id)
    if (item) {
      const label = STATUS[newStatus]?.label || newStatus
      showToast(`"${item.ref}" → ${label}`)
    }
  }

  const handleDelete = (item: Intervention) => {
    if (!confirm(`Supprimer l'intervention ${item.ref} "${item.subject}" ?`)) return
    remove(item.id)
    if (selected?.id === item.id) setSelected(null)
    showToast(`Intervention ${item.ref} supprimée`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Maintenance & Interventions"
        subtitle="Suivi des interventions techniques et maintenance des équipements"
        breadcrumbs={[{label:'Accueil'},{label:'Maintenance'}]}
        icon={<Wrench size={22}/>}
        iconBg="gradient-warning"
        actions={
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
            style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
            <Plus size={15}/> Nouvelle intervention
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Tickets ouverts"  value={openCount.toString()}    icon={<AlertTriangle size={20}/>} gradient="gradient-warning"/>
        <KpiCard title="En cours"         value={inProgCount.toString()}   icon={<Clock size={20}/>}        gradient="gradient-primary"/>
        <KpiCard title="Résolus ce mois"  value={resolvedCount.toString()} icon={<CheckCircle size={20}/>}  gradient="gradient-success"/>
        <KpiCard title="Urgents"          value={highCount.toString()}     icon={<Activity size={20}/>}     gradient="gradient-danger"/>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {[['all','Tous'],['OPEN','Ouverts'],['IN_PROGRESS','En cours'],['RESOLVED','Résolus']].map(([v,l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter===v?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Réf, sujet, équipement, technicien..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Réf','Sujet','Équipement','Technicien','Priorité','Statut','Planifiée','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(item => {
                const st = STATUS[item.status]
                const pr = PRIORITY[item.priority]
                return (
                  <tr key={item.id} onClick={() => setSelected(item)}
                    className="hover:bg-amber-50/20 cursor-pointer group transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-amber-600">{item.ref}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pr.dot}`}/>
                        <span className="text-xs font-medium text-gray-800 max-w-[180px] truncate">{item.subject}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600 max-w-[140px] truncate block">{item.equipment}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{item.technicien}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge label={st.label} type={st.type}/></td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{item.scheduledAt ? formatDate(item.scheduledAt) : '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e=>{e.stopPropagation();openEdit(item)}} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit size={13}/></button>
                        {item.status === 'OPEN' && (
                          <button onClick={e=>{e.stopPropagation();changeStatus(item.id,'IN_PROGRESS')}} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Prendre en charge"><Activity size={13}/></button>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                          <button onClick={e=>{e.stopPropagation();changeStatus(item.id,'RESOLVED')}} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Marquer résolu"><CheckCircle size={13}/></button>
                        )}
                        <button onClick={e=>{e.stopPropagation();handleDelete(item)}} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">Aucune intervention trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} intervention(s)</p>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-[460px] h-full bg-white shadow-2xl overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="p-6 text-white" style={{background:'linear-gradient(135deg,#92400E,#D97706)'}}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-amber-200 text-xs">Intervention</p>
                  <h3 className="text-xl font-bold">{selected.ref}</h3>
                  <p className="text-amber-100 text-sm mt-0.5">{selected.subject}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2">
                <StatusBadge label={STATUS[selected.status].label} type={STATUS[selected.status].type}/>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY[selected.priority].cls}`}>{PRIORITY[selected.priority].label}</span>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {label:'Équipement',  value:selected.equipment,   color:'text-gray-800'},
                  {label:'Technicien',  value:selected.technicien,  color:'text-amber-600'},
                  {label:'Créée le',    value:formatDate(selected.createdAt), color:'text-gray-800'},
                  {label:'Planifiée',   value:selected.scheduledAt?formatDate(selected.scheduledAt):'—', color:'text-gray-800'},
                ].map((s,i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Description du problème</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{selected.description}</p>
                </div>
              )}
              {selected.resolution && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Résolution</p>
                  <p className="text-sm text-gray-700 bg-green-50 rounded-xl p-3">{selected.resolution}</p>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2">
                {selected.status === 'OPEN' && (
                  <button onClick={() => changeStatus(selected.id,'IN_PROGRESS')}
                    className="w-full py-2.5 text-sm font-medium text-white rounded-xl"
                    style={{background:'linear-gradient(135deg,#2563EB,#60A5FA)'}}>
                    ▶ Prendre en charge
                  </button>
                )}
                {selected.status === 'IN_PROGRESS' && (
                  <button onClick={() => changeStatus(selected.id,'RESOLVED')}
                    className="w-full py-2.5 text-sm font-medium text-white rounded-xl"
                    style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                    ✓ Marquer comme résolu
                  </button>
                )}
                <button onClick={() => openEdit(selected)}
                  className="w-full py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl">
                  Modifier l'intervention
                </button>
                <button onClick={() => handleDelete(selected)}
                  className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center gap-2">
                  <Trash2 size={14}/> Supprimer l'intervention
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
                  <Wrench size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{editing ? 'Modifier l\'intervention' : 'Nouvelle intervention'}</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP · Kindu, Maniema</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16}/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sujet / Titre *</label>
                <input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                  placeholder="Ex: Imprimante HP en panne"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Équipement</label>
                  <select value={form.equipment} onChange={e=>setForm({...form,equipment:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                    {EQUIPMENTS.map(eq=><option key={eq}>{eq}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Technicien</label>
                  <select value={form.technicien} onChange={e=>setForm({...form,technicien:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                    {TECHNICIANS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priorité</label>
                  <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date planifiée</label>
                  <input type="date" value={form.scheduledAt} onChange={e=>setForm({...form,scheduledAt:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description du problème</label>
                <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                  rows={3} placeholder="Décrivez le problème en détail..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={save}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#D97706,#F59E0B)'}}>
                <Save size={13}/> {editing ? 'Mettre à jour' : 'Créer l\'intervention'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
