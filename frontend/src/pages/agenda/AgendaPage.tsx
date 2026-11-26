import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { useApiDB } from '@/hooks/useApiDB'
import { Calendar, Plus, X, Clock, Users, MapPin, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'

type Event = {id:string;title:string;type:string;date:string;time:string;duration:string;location:string;participants:string[];description:string}

const MOCK_EVENTS: Event[] = [
  {id:'1',title:'Formation Excel Avancé — Groupe 2',       type:'formation',   date:'2026-07-27',time:'09:00',duration:'3h',  location:'Salle Formation A',    participants:['Grace T.','12 apprenants'],  description:'Module calculs avancés, tableaux croisés dynamiques'},
  {id:'2',title:'Livraison commande ALB-0045',             type:'livraison',   date:'2026-07-27',time:'14:30',duration:'1h',  location:'Chez client',          participants:['Jean M.'],                  description:'Livraison flyers A5 Entreprise ABC'},
  {id:'3',title:'Réunion direction mensuelle',             type:'reunion',     date:'2026-07-28',time:'10:00',duration:'2h',  location:'Bureau Direction',     participants:['Albert M.','Pierre M.','Sophie B.'],description:'Bilan mensuel et objectifs'},
  {id:'4',title:'RDV Client – Site Web Pharmacie',         type:'rdv',         date:'2026-07-28',time:'15:00',duration:'1h30',location:'Pharmacie Central',    participants:['Albert M.'],               description:'Présentation maquettes site web'},
  {id:'5',title:'Maintenance imprimante HP Color',         type:'maintenance', date:'2026-07-29',time:'08:00',duration:'2h',  location:'Atelier Imprimerie',   participants:['Jean M.','Technicien ext.'],description:'Maintenance préventive trimestrielle'},
  {id:'6',title:'Formation Flutter Mobile — Démarrage',   type:'formation',   date:'2026-10-01',time:'18:00',duration:'2h',  location:'Salle Informatique',   participants:['Albert M.','6 apprenants'],description:'Module 1 : Introduction Dart & Flutter'},
  {id:'7',title:'Remise projet ERP Hôpital (v1)',          type:'livraison',   date:'2026-09-15',time:'10:00',duration:'3h',  location:'Hôpital Général',      participants:['Albert M.','Paul I.'],     description:'Démonstration version 1 ERP hospitalier'},
]

const typeConfig: Record<string,{label:string;color:string;bg:string;dot:string}> = {
  formation:  {label:'Formation',  color:'text-green-700',  bg:'bg-green-50',  dot:'bg-green-500'},
  livraison:  {label:'Livraison',  color:'text-blue-700',   bg:'bg-blue-50',   dot:'bg-blue-500'},
  reunion:    {label:'Réunion',    color:'text-purple-700', bg:'bg-purple-50', dot:'bg-purple-500'},
  rdv:        {label:'Rendez-vous',color:'text-orange-700', bg:'bg-orange-50', dot:'bg-orange-500'},
  maintenance:{label:'Maintenance',color:'text-red-700',    bg:'bg-red-50',    dot:'bg-red-500'},
  conge:      {label:'Congé',      color:'text-teal-700',   bg:'bg-teal-50',   dot:'bg-teal-500'},
}

const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  let d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function AgendaPage() {
  const { items: events, add, remove, loading, error, refresh } = useApiDB<Event>('/agenda/events', [], (raw: any) => ({ ...raw }))
  const [view, setView] = useState<'month'|'week'|'list'>('month')
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(6)
  const [selected, setSelected] = useState<Event|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<string|null>(null)

  const [form, setForm] = useState({
    title:'', type:'formation', date:'', time:'', duration:'1h', location:'', description:''
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!showModal) return
    setForm({ title:'', type:'formation', date:'', time:'', duration:'1h', location:'', description:'' })
  }, [showModal])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => e.date === dateStr)
  }

  const today = new Date()
  const isToday = (day: number) => today.getFullYear()===year && today.getMonth()===month && today.getDate()===day

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).slice(0,5)

  const handleCreate = () => {
    if (!form.title.trim()) return alert('Le titre est obligatoire.')
    if (!form.date) return alert('La date est obligatoire.')
    add({
      title: form.title,
      type: form.type,
      date: form.date,
      time: form.time || '09:00',
      duration: form.duration,
      location: form.location || 'Non défini',
      participants: [],
      description: form.description,
    })
    setShowModal(false)
    showToast(`Événement "${form.title}" créé`)
  }

  const handleDelete = (ev: Event) => {
    if (!confirm(`Supprimer "${ev.title}" ?`)) return
    remove(ev.id)
    setSelected(null)
    showToast(`"${ev.title}" supprimé`)
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Agenda & Planification"
        subtitle="Rendez-vous, formations, livraisons et événements"
        breadcrumbs={[{label:'Accueil'},{label:'Agenda'}]}
        icon={<Calendar size={22}/>}
        iconBg="gradient-teal"
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {([['month','Mois'],['week','Semaine'],['list','Liste']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${view===v?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{l}</button>
              ))}
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
              <Plus size={15}/> Événement
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Événements du mois" value={events.filter(e=>e.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length.toString()} icon={<Calendar size={20}/>} gradient="gradient-teal"/>
        <KpiCard title="Formations planifiées" value={events.filter(e=>e.type==='formation').length.toString()} icon={<Clock size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Rendez-vous clients" value={events.filter(e=>e.type==='rdv').length.toString()} icon={<Users size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Livraisons prévues" value={events.filter(e=>e.type==='livraison').length.toString()} icon={<MapPin size={20}/>} gradient="gradient-warning"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
            <div className="flex gap-1">
              <button onClick={() => { if(month===0){setMonth(11);setYear(y=>y-1)}else{setMonth(m=>m-1)} }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={() => { if(month===11){setMonth(0);setYear(y=>y+1)}else{setMonth(m=>m+1)} }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight size={16}/></button>
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2 text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({length: totalCells}).map((_, i) => {
              const dayNum = i - firstDay + 1
              const isValid = dayNum >= 1 && dayNum <= daysInMonth
              const dayEvents = isValid ? getEventsForDay(dayNum) : []
              return (
                <div key={i} className={`min-h-[80px] p-1.5 border-r border-b border-gray-50 ${!isValid?'bg-gray-50/50':isToday(dayNum)?'bg-teal-50/30':''}`}>
                  {isValid && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday(dayNum)?'bg-teal-500 text-white':'text-gray-600'}`}>
                        {dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0,3).map(ev => {
                          const tc = typeConfig[ev.type]
                          return (
                            <div key={ev.id} onClick={() => setSelected(ev)}
                              className={`text-[9px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${tc.bg} ${tc.color}`}>
                              {ev.time} {ev.title}
                            </div>
                          )
                        })}
                        {dayEvents.length>3 && <div className="text-[9px] text-gray-400 pl-1">+{dayEvents.length-3}</div>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Prochains événements</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {upcoming.map(ev => {
                const tc = typeConfig[ev.type]
                return (
                  <div key={ev.id} onClick={() => setSelected(ev)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${tc.dot}`}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9}/>{ev.date} à {ev.time} · {ev.duration}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1">
                        <MapPin size={9}/>{ev.location}
                      </p>
                    </div>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${tc.bg} ${tc.color}`}>{tc.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 text-sm mb-3">Légende</h3>
            <div className="space-y-2">
              {Object.entries(typeConfig).map(([k,v]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${v.dot}`}/>
                  <span className="text-xs text-gray-600">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="p-5 text-white" style={{background:'linear-gradient(135deg,#0D6B63,#0D9488)'}}>
              <div className="flex justify-between mb-2">
                <div>
                  <p className="text-teal-200 text-xs">{typeConfig[selected.type]?.label}</p>
                  <h3 className="font-bold text-lg">{selected.title}</h3>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {icon:<Calendar size={14}/>,label:'Date', value:selected.date},
                  {icon:<Clock size={14}/>, label:'Heure', value:`${selected.time} (${selected.duration})`},
                  {icon:<MapPin size={14}/>, label:'Lieu', value:selected.location},
                  {icon:<Users size={14}/>, label:'Participants', value:selected.participants.join(', ')},
                ].map((s,i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 mt-0.5 flex-shrink-0">{s.icon}</span>
                    <div>
                      <p className="text-[10px] text-gray-400">{s.label}</p>
                      <p className="text-xs font-medium text-gray-800">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selected.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-700">{selected.description}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleDelete(selected)}
                  className="flex-1 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Supprimer</button>
                <button onClick={() => setSelected(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Nouvel événement</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
                <input value={form.title} onChange={e => updateField('title', e.target.value)}
                  placeholder="Titre de l'événement" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => updateField('type', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {Object.entries(typeConfig).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => updateField('date', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Heure</label>
                  <input type="time" value={form.time} onChange={e => updateField('time', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Durée</label>
                  <input value={form.duration} onChange={e => updateField('duration', e.target.value)}
                    placeholder="1h, 2h30..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lieu</label>
                  <input value={form.location} onChange={e => updateField('location', e.target.value)}
                    placeholder="Bureau, salle, externe..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => updateField('description', e.target.value)}
                  placeholder="Détails de l'événement..." className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"/>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleCreate}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl" style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
