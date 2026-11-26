import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import {
  GraduationCap, Plus, Search, Users, BookOpen, Award,
  TrendingUp, Calendar, Star, Clock, X, Save, UserPlus,
  CheckCircle, CreditCard, Trash2, Pencil
} from 'lucide-react'

/* ─── Types ────────────────────────────────────────────── */
type Course = {
  id:string; code:string; name:string; category:string; level:string
  trainer:string; sessions:number; enrolled:number; capacity:number
  price:number; status:string; startDate:string; endDate:string; duration:string
}
type Student = {
  id:string; name:string; course:string; phone:string; email:string
  enrolled:string; paid:number; totalPrice:number; status:string; grade:number|null
}

/* ─── Mock data ─────────────────────────────────────────── */
const COURSES: Course[] = [
  { id:'1', code:'FRM-001', name:'Développement Web Full Stack', category:'Informatique', level:'Débutant → Avancé', trainer:'Albert M.', sessions:48, enrolled:18, capacity:20, price:150000, status:'active', startDate:'2026-08-01', endDate:'2027-02-28', duration:'6 mois' },
  { id:'2', code:'FRM-002', name:'Microsoft Office Professionnel', category:'Bureautique', level:'Débutant', trainer:'Grace T.', sessions:24, enrolled:25, capacity:25, price:60000, status:'active', startDate:'2026-07-15', endDate:'2026-09-15', duration:'2 mois' },
  { id:'3', code:'FRM-003', name:'Adobe Photoshop & Illustrator', category:'Design', level:'Intermédiaire', trainer:'Marie K.', sessions:32, enrolled:12, capacity:15, price:100000, status:'active', startDate:'2026-08-10', endDate:'2026-11-10', duration:'3 mois' },
  { id:'4', code:'FRM-004', name:'Cybersécurité Fondamentaux', category:'Informatique', level:'Intermédiaire', trainer:'Paul I.', sessions:16, enrolled:8, capacity:15, price:80000, status:'upcoming', startDate:'2026-09-01', endDate:'2026-10-31', duration:'2 mois' },
  { id:'5', code:'FRM-005', name:'Maintenance Informatique', category:'Technique', level:'Débutant', trainer:'Jean M.', sessions:20, enrolled:10, capacity:12, price:75000, status:'completed', startDate:'2026-05-01', endDate:'2026-07-15', duration:'2.5 mois' },
  { id:'6', code:'FRM-006', name:'Flutter & Développement Mobile', category:'Informatique', level:'Avancé', trainer:'Albert M.', sessions:40, enrolled:6, capacity:10, price:200000, status:'upcoming', startDate:'2026-10-01', endDate:'2027-03-31', duration:'6 mois' },
]

const INIT_STUDENTS: Student[] = [
  { id:'1', name:'Jean Mukoka',   course:'FRM-001', phone:'+243 81 001 0001', email:'jean@email.cd',    enrolled:'2026-07-25', paid:150000, totalPrice:150000, status:'active',    grade:null },
  { id:'2', name:'Marie Tshiala', course:'FRM-002', phone:'+243 81 002 0002', email:'marie@email.cd',   enrolled:'2026-07-15', paid:60000,  totalPrice:60000,  status:'active',    grade:null },
  { id:'3', name:'Paul Kabila',   course:'FRM-001', phone:'+243 81 003 0003', email:'paul@email.cd',    enrolled:'2026-07-25', paid:75000,  totalPrice:150000, status:'partial',   grade:null },
  { id:'4', name:'Sophie Ngoy',   course:'FRM-003', phone:'+243 81 004 0004', email:'sophie@email.cd',  enrolled:'2026-08-05', paid:100000, totalPrice:100000, status:'active',    grade:null },
  { id:'5', name:'André Mbuyi',   course:'FRM-005', phone:'+243 81 005 0005', email:'andre@email.cd',   enrolled:'2026-05-02', paid:75000,  totalPrice:75000,  status:'completed', grade:82 },
  { id:'6', name:'Claire Mutombo',course:'FRM-005', phone:'+243 81 006 0006', email:'claire@email.cd',  enrolled:'2026-05-02', paid:75000,  totalPrice:75000,  status:'completed', grade:91 },
]

const statusConfig: Record<string, {label:string;type:any}> = {
  active:    {label:'En cours',  type:'success'},
  upcoming:  {label:'À venir',   type:'info'},
  completed: {label:'Terminée', type:'secondary'},
  cancelled: {label:'Annulée',  type:'danger'},
}

const categoryColors: Record<string, string> = {
  'Informatique': 'bg-blue-50 text-blue-700',
  'Bureautique':  'bg-green-50 text-green-700',
  'Design':       'bg-purple-50 text-purple-700',
  'Technique':    'bg-orange-50 text-orange-700',
}

const payMethods = ['Espèces','Mobile Money (Airtel)','Mobile Money (Orange)','Virement bancaire']

/* ─── Main component ─────────────────────────────────── */
export default function TrainingPage() {
  const { items: courses, add: addCourse, update: updateCourse, remove: removeCourse } = useApiDB<Course>('/training/courses', [], (raw: any) => ({ ...raw }))
  const { items: students, add: addStudent, update: updateStudent, remove: removeStudent } = useApiDB<Student>('/training/students', [], (raw: any) => ({ ...raw }))

  const {
    currentPage: studentsPage, setCurrentPage: setStudentsPage,
    pageSize: studentsPageSize, setPageSize: setStudentsPageSize,
    totalPages: studentsTotalPages, paginatedItems: paginatedStudents, totalItems: studentsTotalItems
  } = usePagination(students)

  const [tab, setTab]           = useState<'courses'|'students'|'certificates'>('courses')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [toast, setToast]       = useState<string | null>(null)

  /* Course creation modal */
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [courseForm, setCourseForm] = useState({
    name:'', category:'Informatique', level:'Débutant', trainer:'',
    price:'', duration:'', capacity:'20', startDate:'', endDate:'',
  })

  /* Course edit modal */
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Course | null>(null)

  /* Enrollment modal */
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [enrollCourseId, setEnrollCourseId]   = useState('')
  const [enrollForm, setEnrollForm] = useState({
    name:'', phone:'', email:'', paid:'', payMethod:'Espèces'
  })

  /* Toast auto-dismiss */
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Filtered courses ── */
  const filtered = courses.filter(c => {
    const ms = `${c.code} ${c.name} ${c.category} ${c.trainer}`.toLowerCase().includes(search.toLowerCase())
    const mf = statusFilter === 'all' || c.status === statusFilter
    return ms && mf
  })

  /* ── KPIs ── */
  const active       = courses.filter(c => c.status === 'active').length
  const totalEnrolled = students.length
  const totalRevenue  = students.reduce((s, st) => s + st.paid, 0)
  const certificates  = students.filter(s => s.status === 'completed').length

  /* ── Save new course ── */
  const saveCourse = () => {
    if (!courseForm.name.trim() || !courseForm.trainer.trim()) return alert('Nom et formateur requis.')
    const newCourse: Omit<Course, 'id'> & { id?: string } = {
      code: `FRM-${String(courses.length+1).padStart(3,'0')}`,
      name: courseForm.name,
      category: courseForm.category,
      level: courseForm.level,
      trainer: courseForm.trainer,
      sessions: 0,
      enrolled: 0,
      capacity: Number(courseForm.capacity) || 20,
      price: Number(courseForm.price) || 0,
      status: 'upcoming',
      startDate: courseForm.startDate || new Date().toISOString().slice(0,10),
      endDate: courseForm.endDate || '',
      duration: courseForm.duration || '—',
    }
    addCourse(newCourse)
    setShowCourseModal(false)
    setCourseForm({name:'',category:'Informatique',level:'Débutant',trainer:'',price:'',duration:'',capacity:'20',startDate:'',endDate:''})
    setToast('Formation créée avec succès')
  }

  /* ── Edit course ── */
  const openEditCourse = (course: Course) => {
    setEditForm({ ...course })
    setShowEditModal(true)
    setSelectedCourse(null)
  }

  const saveEditCourse = () => {
    if (!editForm) return
    if (!editForm.name.trim() || !editForm.trainer.trim()) return alert('Nom et formateur requis.')
    updateCourse(editForm.id, {
      name: editForm.name,
      category: editForm.category,
      level: editForm.level,
      trainer: editForm.trainer,
      price: editForm.price,
      capacity: editForm.capacity,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
      duration: editForm.duration,
      status: editForm.status,
    })
    setShowEditModal(false)
    setEditForm(null)
    setToast('Formation mise à jour')
  }

  /* ── Delete course ── */
  const deleteCourse = (id: string) => {
    if (!confirm('Supprimer cette formation ?')) return
    removeCourse(id)
    setToast('Formation supprimée')
  }

  /* ── Open enrollment for specific course ── */
  const openEnroll = (courseId: string) => {
    setEnrollCourseId(courseId)
    setEnrollForm({name:'',phone:'',email:'',paid:'',payMethod:'Espèces'})
    setShowEnrollModal(true)
    setSelectedCourse(null)
  }

  /* ── Save enrollment ── */
  const saveEnrollment = () => {
    if (!enrollForm.name.trim() || !enrollForm.phone.trim()) return alert('Nom et téléphone requis.')
    const course = courses.find(c => c.id === enrollCourseId)
    if (!course) return
    if (course.enrolled >= course.capacity) return alert('Cette formation est complète.')

    const paid = Number(enrollForm.paid) || 0
    const newStudent: Omit<Student, 'id'> = {
      name: enrollForm.name,
      course: course.code,
      phone: enrollForm.phone,
      email: enrollForm.email,
      enrolled: new Date().toISOString().slice(0,10),
      paid,
      totalPrice: course.price,
      status: paid >= course.price ? 'active' : paid > 0 ? 'partial' : 'active',
      grade: null,
    }
    addStudent(newStudent)
    updateCourse(course.id, { enrolled: course.enrolled + 1 })
    setShowEnrollModal(false)
    setToast('Apprenant inscrit avec succès')
  }

  /* ── Delete student ── */
  const deleteStudent = (id: string) => {
    if (!confirm('Supprimer cet apprenant ?')) return
    removeStudent(id)
    setToast('Apprenant supprimé')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="ALBA Digital Academy — Formations"
        subtitle="Gestion des formations, apprenants et certifications"
        breadcrumbs={[{label:'Accueil'},{label:'Formation'}]}
        icon={<GraduationCap size={22}/>}
        iconBg="gradient-success"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowEnrollModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
              style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
              <UserPlus size={15}/> Inscrire un apprenant
            </button>
            <button onClick={() => setShowCourseModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
              style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
              <Plus size={15}/> Nouvelle formation
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Formations actives" value={active.toString()} icon={<BookOpen size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Apprenants inscrits" value={totalEnrolled.toString()} icon={<Users size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Certifiés" value={certificates.toString()} icon={<Award size={20}/>} gradient="gradient-warning"/>
        <KpiCard title="Revenus formations" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={20}/>} gradient="gradient-teal" change={12}/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['courses','Catalogue formations'],['students','Apprenants'],['certificates','Certifications']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab===id?'border-green-500 text-green-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
            {id === 'students' && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{students.length}</span>}
          </button>
        ))}
      </div>

      {/* ── COURSES tab ── */}
      {tab === 'courses' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {[['all','Toutes'],['active','En cours'],['upcoming','À venir'],['completed','Terminées']].map(([v,l]) => (
                  <button key={v} onClick={() => setStatusFilter(v)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${statusFilter===v?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>{l}</button>
                ))}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Code, nom, formateur..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => {
              const st = statusConfig[c.status]
              const fillPct = Math.round((c.enrolled/c.capacity)*100)
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-green-600">{c.code}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[c.category]||'bg-gray-100 text-gray-600'}`}>{c.category}</span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{c.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{c.level} · {c.duration}</p>
                    </div>
                    <StatusBadge label={st.label} type={st.type} dot={false}/>
                  </div>
                  {/* Fill rate */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Places</span>
                      <span className="font-semibold text-gray-700">{c.enrolled}/{c.capacity}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${fillPct}%`,background:fillPct>=100?'#EF4444':'linear-gradient(90deg,#16A34A,#22C55E)'}}/>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                        {getInitials(c.trainer)}
                      </div>
                      <span className="text-xs text-gray-600">{c.trainer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-700">{formatCurrency(c.price)}</span>
                      <button
                        onClick={() => openEnroll(c.id)}
                        disabled={c.enrolled >= c.capacity || c.status === 'completed'}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                        style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
                        <UserPlus size={11}/> Inscrire
                      </button>
                      <button
                        onClick={() => openEditCourse(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier">
                        <Pencil size={13}/>
                      </button>
                      <button
                        onClick={() => deleteCourse(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── STUDENTS tab ── */}
      {tab === 'students' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Liste des apprenants ({students.length})</h3>
            <div className="flex items-center gap-2">
              <ExportButton
                data={students}
                filename="etudiants-alba"
                title="Liste des Etudiants"
                headers={{ name: 'Apprenant', course: 'Formation', phone: 'Téléphone', email: 'Email', enrolled: 'Date inscription', paid: 'Montant payé (FC)', totalPrice: 'Prix total (FC)', status: 'Statut', grade: 'Note' }}
              />
              <button onClick={() => setShowEnrollModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
                <UserPlus size={13}/> Inscrire
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Apprenant','Formation','Téléphone','Date inscription','Paiement','Solde','Statut','Note','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedStudents.map(s => {
                  const course = courses.find(c => c.code === s.course)
                  const balance = s.totalPrice - s.paid
                  return (
                    <tr key={s.id} className="hover:bg-green-50/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                            {getInitials(s.name)}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800">{s.name}</span>
                            <p className="text-[10px] text-gray-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="font-mono text-xs text-green-600 font-bold">{s.course}</span></td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">{s.phone}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(s.enrolled)}</td>
                      <td className="px-4 py-3.5"><span className="text-xs font-semibold text-green-700">{formatCurrency(s.paid)}</span></td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance > 0 ? formatCurrency(balance) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          label={s.status==='active'?'Inscrit':s.status==='partial'?'Acompte':s.status==='completed'?'Certifié':'Inactif'}
                          type={s.status==='active'?'success':s.status==='partial'?'warning':s.status==='completed'?'info':'danger'}/>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.grade ? (
                          <div className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-500 fill-yellow-500"/>
                            <span className="text-xs font-bold text-gray-700">{s.grade}/100</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => deleteStudent(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer">
                          <Trash2 size={13}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={studentsPage}
            totalPages={studentsTotalPages}
            totalItems={studentsTotalItems}
            pageSize={studentsPageSize}
            onPageChange={setStudentsPage}
            onPageSizeChange={setStudentsPageSize}
          />
        </div>
      )}

      {/* ── CERTIFICATES tab ── */}
      {tab === 'certificates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.filter(s => s.status === 'completed').map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                  {getInitials(s.name)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.course}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500"/>
                    <span className="text-sm font-bold text-gray-700">{s.grade}/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">✓ Certifié</span>
                  <p className="text-[10px] text-gray-400 mt-1">ALBA-{s.course}-2026-00{s.id}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button className="flex-1 py-2 text-xs font-medium text-white rounded-xl" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                  Télécharger PDF
                </button>
                <button className="flex-1 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-xl">
                  Vérifier QR Code
                </button>
              </div>
            </div>
          ))}
          {students.filter(s => s.status === 'completed').length === 0 && (
            <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100">
              <Award size={48} className="mx-auto text-gray-300 mb-3"/>
              <p className="text-gray-500 text-sm">Aucun certificat délivré pour le moment</p>
            </div>
          )}
        </div>
      )}

      {/* ── ENROLLMENT MODAL ─────────────────────────────── */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEnrollModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
                  <UserPlus size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Inscrire un apprenant</h3>
                  <p className="text-[10px] text-gray-400">ALBA Digital Academy · Kindu, Maniema</p>
                </div>
              </div>
              <button onClick={() => setShowEnrollModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16}/>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Select formation */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formation *</label>
                <select value={enrollCourseId} onChange={e => setEnrollCourseId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                  <option value="">— Sélectionner une formation —</option>
                  {courses.filter(c => c.status !== 'completed' && c.enrolled < c.capacity).map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} — {formatCurrency(c.price)} — {c.enrolled}/{c.capacity} places
                    </option>
                  ))}
                </select>
              </div>

              {/* Show selected course info */}
              {enrollCourseId && (() => {
                const course = courses.find(c => c.id === enrollCourseId)
                if (!course) return null
                return (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-teal-800">{course.name}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-teal-600">Formateur : {course.trainer}</span>
                      <span className="text-xs text-teal-600">Prix : {formatCurrency(course.price)}</span>
                      <span className="text-xs text-teal-600">Places restantes : {course.capacity - course.enrolled}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Apprenant info */}
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations de l'apprenant</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet *</label>
                  <input value={enrollForm.name} onChange={e=>setEnrollForm({...enrollForm,name:e.target.value})}
                    placeholder="Prénom et Nom"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone *</label>
                  <input value={enrollForm.phone} onChange={e=>setEnrollForm({...enrollForm,phone:e.target.value})}
                    placeholder="+243 8X XXX XXXX"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input value={enrollForm.email} onChange={e=>setEnrollForm({...enrollForm,email:e.target.value})}
                    placeholder="email@exemple.cd" type="email"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
                </div>
              </div>

              {/* Payment */}
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paiement</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant payé (FC)</label>
                  <input type="number" min={0} value={enrollForm.paid} onChange={e=>setEnrollForm({...enrollForm,paid:e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mode de paiement</label>
                  <select value={enrollForm.payMethod} onChange={e=>setEnrollForm({...enrollForm,payMethod:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    {payMethods.map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Summary */}
              {enrollCourseId && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  {(() => {
                    const course = courses.find(c => c.id === enrollCourseId)
                    if (!course) return null
                    const paid = Number(enrollForm.paid) || 0
                    const balance = course.price - paid
                    return (
                      <>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Frais de formation</span><span className="font-medium">{formatCurrency(course.price)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-green-600">
                          <span>Montant payé</span><span className="font-medium">- {formatCurrency(paid)}</span>
                        </div>
                        <div className={`flex justify-between text-xs font-bold border-t border-gray-200 pt-1 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span>Solde restant</span><span>{formatCurrency(balance)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={saveEnrollment}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
                <CheckCircle size={13}/> Confirmer l'inscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW COURSE MODAL ───────────────────────────────── */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCourseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                  <BookOpen size={18} className="text-white"/>
                </div>
                <h3 className="text-sm font-bold text-gray-800">Nouvelle formation</h3>
              </div>
              <button onClick={() => setShowCourseModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16}/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom de la formation *</label>
                <input value={courseForm.name} onChange={e=>setCourseForm({...courseForm,name:e.target.value})}
                  placeholder="Ex: Développement Web Full Stack"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
                  <select value={courseForm.category} onChange={e=>setCourseForm({...courseForm,category:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    {['Informatique','Bureautique','Design','Technique','Commerce','Langue'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Niveau</label>
                  <select value={courseForm.level} onChange={e=>setCourseForm({...courseForm,level:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    {['Débutant','Intermédiaire','Avancé','Débutant → Avancé','Tous niveaux'].map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formateur *</label>
                  <input value={courseForm.trainer} onChange={e=>setCourseForm({...courseForm,trainer:e.target.value})}
                    placeholder="Nom du formateur"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prix par apprenant (FC)</label>
                  <input type="number" min={0} value={courseForm.price} onChange={e=>setCourseForm({...courseForm,price:e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Durée</label>
                  <input value={courseForm.duration} onChange={e=>setCourseForm({...courseForm,duration:e.target.value})}
                    placeholder="Ex: 3 mois"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacité max</label>
                  <input type="number" min={1} value={courseForm.capacity} onChange={e=>setCourseForm({...courseForm,capacity:e.target.value})}
                    placeholder="20"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début</label>
                  <input type="date" value={courseForm.startDate} onChange={e=>setCourseForm({...courseForm,startDate:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin</label>
                  <input type="date" value={courseForm.endDate} onChange={e=>setCourseForm({...courseForm,endDate:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none"/>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={saveCourse}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                <Save size={13}/> Créer la formation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT COURSE MODAL ─────────────────────────────── */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowEditModal(false); setEditForm(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                  <Pencil size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Modifier la formation</h3>
                  <p className="text-[10px] text-gray-400">{editForm.code}</p>
                </div>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditForm(null) }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16}/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom de la formation *</label>
                <input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Catégorie</label>
                  <select value={editForm.category} onChange={e=>setEditForm({...editForm,category:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    {['Informatique','Bureautique','Design','Technique','Commerce','Langue'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Niveau</label>
                  <select value={editForm.level} onChange={e=>setEditForm({...editForm,level:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    {['Débutant','Intermédiaire','Avancé','Débutant → Avancé','Tous niveaux'].map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formateur *</label>
                  <input value={editForm.trainer} onChange={e=>setEditForm({...editForm,trainer:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prix par apprenant (FC)</label>
                  <input type="number" min={0} value={editForm.price} onChange={e=>setEditForm({...editForm,price:Number(e.target.value)})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Durée</label>
                  <input value={editForm.duration} onChange={e=>setEditForm({...editForm,duration:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Capacité max</label>
                  <input type="number" min={1} value={editForm.capacity} onChange={e=>setEditForm({...editForm,capacity:Number(e.target.value)})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                  <select value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                    {['active','upcoming','completed','cancelled'].map(s=><option key={s} value={s}>{statusConfig[s]?.label||s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début</label>
                  <input type="date" value={editForm.startDate} onChange={e=>setEditForm({...editForm,startDate:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin</label>
                  <input type="date" value={editForm.endDate} onChange={e=>setEditForm({...editForm,endDate:e.target.value})}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none"/>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => { setShowEditModal(false); setEditForm(null) }}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={saveEditCourse}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                <Save size={13}/> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in gradient-success">
          <CheckCircle size={16}/> {toast}
        </div>
      )}
    </div>
  )
}
