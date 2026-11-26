import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatDate, getInitials } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Users, Search, CheckCircle, AlertTriangle, Clock, X, ChevronLeft,
  ChevronRight, Calendar, Edit3, UserCheck, Save, TrendingUp
} from 'lucide-react'

/* ─── Types ────────────────────────────────────────────── */
type AttendanceRecord = {
  id: string
  studentName: string
  courseName: string
  date: string
  present: boolean
  late: boolean
  notes: string
}

/* ─── Mock data ─────────────────────────────────────────── */
const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: 'ATT-001', studentName: 'Jean Mukoka', courseName: 'Développement Web Full Stack', date: today, present: true, late: false, notes: '' },
  { id: 'ATT-002', studentName: 'Marie Tshiala', courseName: 'Microsoft Office Professionnel', date: today, present: true, late: true, notes: 'Transport en panne' },
  { id: 'ATT-003', studentName: 'Paul Kabila', courseName: 'Développement Web Full Stack', date: today, present: false, late: false, notes: '' },
  { id: 'ATT-004', studentName: 'Sophie Ngoy', courseName: 'Adobe Photoshop & Illustrator', date: today, present: true, late: false, notes: '' },
  { id: 'ATT-005', studentName: 'André Mbuyi', courseName: 'Maintenance Informatique', date: today, present: true, late: false, notes: '' },
  { id: 'ATT-006', studentName: 'Claire Mutombo', courseName: 'Maintenance Informatique', date: today, present: false, late: false, notes: 'Raison non précisée' },
  { id: 'ATT-007', studentName: 'Jean Mukoka', courseName: 'Développement Web Full Stack', date: yesterday, present: true, late: false, notes: '' },
  { id: 'ATT-008', studentName: 'Marie Tshiala', courseName: 'Microsoft Office Professionnel', date: yesterday, present: true, late: false, notes: '' },
  { id: 'ATT-009', studentName: 'Paul Kabila', courseName: 'Développement Web Full Stack', date: yesterday, present: true, late: true, notes: 'Retard 15min' },
  { id: 'ATT-010', studentName: 'Sophie Ngoy', courseName: 'Adobe Photoshop & Illustrator', date: yesterday, present: true, late: false, notes: '' },
  { id: 'ATT-011', studentName: 'André Mbuyi', courseName: 'Maintenance Informatique', date: yesterday, present: false, late: false, notes: 'Maladie' },
  { id: 'ATT-012', studentName: 'Claire Mutombo', courseName: 'Maintenance Informatique', date: yesterday, present: true, late: false, notes: '' },
  { id: 'ATT-013', studentName: 'Patricia Kasongo', courseName: 'Microsoft Office Professionnel', date: today, present: true, late: true, notes: '' },
  { id: 'ATT-014', studentName: 'Patricia Kasongo', courseName: 'Microsoft Office Professionnel', date: yesterday, present: true, late: false, notes: '' },
  { id: 'ATT-015', studentName: 'Samuel Lukusa', courseName: 'Cybersécurité Fondamentaux', date: twoDaysAgo, present: true, late: false, notes: '' },
  { id: 'ATT-016', studentName: 'Grâce Ilunga', courseName: 'Développement Web Full Stack', date: twoDaysAgo, present: true, late: false, notes: '' },
  { id: 'ATT-017', studentName: 'David Mwamba', courseName: 'Adobe Photoshop & Illustrator', date: twoDaysAgo, present: false, late: false, notes: '' },
  { id: 'ATT-018', studentName: 'Chantal Kabongo', courseName: 'Microsoft Office Professionnel', date: twoDaysAgo, present: true, late: true, notes: 'Retard pluie' },
  { id: 'ATT-019', studentName: 'Rodrigue Sendwe', courseName: 'Maintenance Informatique', date: twoDaysAgo, present: true, late: false, notes: '' },
  { id: 'ATT-020', studentName: 'Bénédicte Kasongo', courseName: 'Flutter & Développement Mobile', date: today, present: true, late: false, notes: '' },
]

const COURSES = [
  'Développement Web Full Stack',
  'Microsoft Office Professionnel',
  'Adobe Photoshop & Illustrator',
  'Cybersécurité Fondamentaux',
  'Maintenance Informatique',
  'Flutter & Développement Mobile',
]

/* ─── Calendar helper ─────────────────────────────────── */
function generateCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1)
  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/* ─── Main component ─────────────────────────────────── */
export default function TrainingAttendancePage() {
  const { items: records, add, update } = useMockDB<AttendanceRecord>('alba-training-attendance', MOCK_ATTENDANCE)

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(today)
  const [courseFilter, setCourseFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markForm, setMarkForm] = useState({ studentName: '', courseName: '', present: true, late: false, notes: '' })

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  /* ── Filtered records ── */
  const dateRecords = records.filter(r => r.date === dateFilter)
  const filtered = dateRecords.filter(r => {
    const matchSearch = `${r.studentName} ${r.courseName}`.toLowerCase().includes(search.toLowerCase())
    const matchCourse = courseFilter === 'all' || r.courseName === courseFilter
    return matchSearch && matchCourse
  })

  const {
    currentPage, setCurrentPage, pageSize, setPageSize,
    paginatedItems, totalItems, totalPages
  } = usePagination(filtered, 10)

  /* ── Session stats ── */
  const presentCount = dateRecords.filter(r => r.present && !r.late).length
  const absentCount = dateRecords.filter(r => !r.present).length
  const lateCount = dateRecords.filter(r => r.present && r.late).length
  const attendanceRate = dateRecords.length > 0 ? Math.round(((presentCount + lateCount) / dateRecords.length) * 100) : 0

  const calDays = generateCalendar(calYear, calMonth)

  const getDotsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayRecords = records.filter(r => r.date === dateStr)
    const hasPresent = dayRecords.some(r => r.present)
    const hasAbsent = dayRecords.some(r => !r.present)
    const hasLate = dayRecords.some(r => r.late)
    return { hasPresent, hasAbsent, hasLate }
  }

  const saveMark = () => {
    if (!markForm.studentName.trim() || !markForm.courseName) return
    const newRecord: Omit<AttendanceRecord, 'id'> = {
      studentName: markForm.studentName,
      courseName: markForm.courseName,
      date: dateFilter,
      present: markForm.present,
      late: markForm.present ? markForm.late : false,
      notes: markForm.notes,
    }
    add(newRecord)
    setShowMarkModal(false)
    setMarkForm({ studentName: '', courseName: '', present: true, late: false, notes: '' })
    setToast('Présence enregistrée avec succès')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Présences - Formation"
        subtitle={`${formatDate(dateFilter)} · ${dateRecords.length} enregistrements`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Formation' }, { label: 'Présences' }]}
        icon={<Users size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map(r => ({
                Date: r.date, Apprenant: r.studentName, Formation: r.courseName,
                Présent: r.present ? 'Oui' : 'Non', Retard: r.late ? 'Oui' : 'Non', Notes: r.notes,
              }))}
              filename={`presences-formation-${dateFilter}`}
              title={`Présences Formation ${formatDate(dateFilter)}`}
            />
            <button onClick={() => setShowCalendar(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${showCalendar ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}>
              <Calendar size={15} /> Calendrier
            </button>
            <button onClick={() => setShowMarkModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl shadow-sm hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
              <UserCheck size={15} /> Marquer présence
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Présents" value={presentCount.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="Absents" value={absentCount.toString()} icon={<AlertTriangle size={20} />} gradient="gradient-danger" />
        <KpiCard title="Retards" value={lateCount.toString()} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="Taux de présence" value={`${attendanceRate}%`} icon={<TrendingUp size={20} />} gradient="gradient-teal" />
      </div>

      {/* Calendar */}
      {showCalendar && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={16} /></button>
              <h3 className="text-sm font-bold text-gray-800 min-w-[160px] text-center">
                {new Date(calYear, calMonth).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Présent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Retard</span>
              </div>
              <button onClick={() => setShowCalendar(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="bg-gray-50 text-center text-[10px] font-semibold text-gray-500 py-2">{d}</div>
            ))}
            {calDays.map((day, i) => {
              const dots = day ? getDotsForDay(day) : null
              const dateStr = day ? `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
              return (
                <div key={i} className={`bg-white min-h-[70px] p-1.5 ${day ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}`}
                  onClick={() => { if (day) { setDateFilter(dateStr); setShowCalendar(false) } }}>
                  {day && (
                    <>
                      <span className={`text-xs font-semibold ${dateStr === dateFilter ? 'text-green-600' : 'text-gray-600'}`}>{day}</span>
                      <div className="flex gap-1 mt-1 justify-center">
                        {dots?.hasPresent && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        {dots?.hasAbsent && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        {dots?.hasLate && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un apprenant, formation..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none" />
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Toutes les formations</option>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Date', 'Apprenant', 'Formation', 'Présent', 'Retard', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(r => (
                <tr key={r.id} className="hover:bg-green-50/20 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(r.date)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                        {getInitials(r.studentName)}
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{r.studentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-gray-600 max-w-[180px] truncate block">{r.courseName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      label={r.present ? 'Présent' : 'Absent'}
                      type={r.present ? 'success' : 'danger'} />
                  </td>
                  <td className="px-4 py-3.5">
                    {r.late ? (
                      <StatusBadge label="Retard" type="warning" />
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500 max-w-[120px] truncate block">{r.notes || '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => update(r.id, { present: !r.present, late: r.present && !r.late ? false : r.late })}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier">
                      <Edit3 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun enregistrement pour cette date</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
            pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {/* Mark attendance modal */}
      {showMarkModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowMarkModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                  <UserCheck size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Marquer une présence</h3>
                  <p className="text-[10px] text-gray-400">{formatDate(dateFilter)}</p>
                </div>
              </div>
              <button onClick={() => setShowMarkModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom de l'apprenant *</label>
                <input value={markForm.studentName} onChange={e => setMarkForm({ ...markForm, studentName: e.target.value })}
                  placeholder="Prénom et Nom"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Formation *</label>
                <select value={markForm.courseName} onChange={e => setMarkForm({ ...markForm, courseName: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                  <option value="">— Sélectionner —</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={markForm.present} onChange={e => setMarkForm({ ...markForm, present: e.target.checked, late: e.target.checked ? markForm.late : false })}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm text-gray-700">Présent</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer ${!markForm.present ? 'opacity-40 pointer-events-none' : ''}`}>
                  <input type="checkbox" checked={markForm.late} onChange={e => setMarkForm({ ...markForm, late: e.target.checked })}
                    disabled={!markForm.present}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                  <span className="text-sm text-gray-700">En retard</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                <textarea value={markForm.notes} onChange={e => setMarkForm({ ...markForm, notes: e.target.value })}
                  placeholder="Observations optionnelles..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowMarkModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={saveMark}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                <Save size={13} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in gradient-success">
          <CheckCircle size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
