import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatDate, getInitials } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { api } from '@/services/api'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  Clock, Search, Filter,
  LogIn, LogOut, Users, AlertTriangle, CheckCircle,
  X, ChevronLeft, ChevronRight, Calendar, Edit3
} from 'lucide-react'

type AttendanceStatus = 'Present' | 'Absent' | 'En retard' | 'Conge'

type AttendanceRecord = {
  id: string
  employeeId: string
  employeeName: string
  department: string
  date: string
  clockIn: string
  clockOut: string
  duration: string
  status: AttendanceStatus
  notes: string
}

const employees: { id: string; name: string; dept: string }[] = []

const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

const mockAttendance: AttendanceRecord[] = [
  { id: '1', employeeId: '1', employeeName: 'Jean Mukendi', department: 'Imprimerie', date: today, clockIn: '07:55', clockOut: '', duration: '', status: 'Present', notes: '' },
  { id: '2', employeeId: '2', employeeName: 'Marie Kabange', department: 'Graphisme', date: today, clockIn: '08:12', clockOut: '', duration: '', status: 'En retard', notes: 'Transport en panne' },
  { id: '3', employeeId: '3', employeeName: 'Paul Ilunga', department: 'Informatique', date: today, clockIn: '07:48', clockOut: '', duration: '', status: 'Present', notes: '' },
  { id: '4', employeeId: '4', employeeName: 'Sophie Banza', department: 'Secr�tariat', date: today, clockIn: '', clockOut: '', duration: '', status: 'Conge', notes: 'En conge annuel' },
  { id: '5', employeeId: '5', employeeName: 'Pierre Mutombo', department: 'Finance', date: today, clockIn: '07:50', clockOut: '', duration: '', status: 'Present', notes: '' },
  { id: '6', employeeId: '6', employeeName: 'Grace Tshiamba', department: 'Formation', date: today, clockIn: '', clockOut: '', duration: '', status: 'Absent', notes: '' },
  { id: '7', employeeId: '1', employeeName: 'Jean Mukendi', department: 'Imprimerie', date: yesterday, clockIn: '07:52', clockOut: '16:30', duration: '8h38', status: 'Present', notes: '' },
  { id: '8', employeeId: '2', employeeName: 'Marie Kabange', department: 'Graphisme', date: yesterday, clockIn: '08:05', clockOut: '16:45', duration: '8h40', status: 'Present', notes: '' },
  { id: '9', employeeId: '3', employeeName: 'Paul Ilunga', department: 'Informatique', date: yesterday, clockIn: '07:58', clockOut: '17:00', duration: '9h02', status: 'Present', notes: 'Heures supplementaires' },
  { id: '10', employeeId: '4', employeeName: 'Sophie Banza', department: 'Secr�tariat', date: yesterday, clockIn: '', clockOut: '', duration: '', status: 'Conge', notes: 'En conge annuel' },
  { id: '11', employeeId: '5', employeeName: 'Pierre Mutombo', department: 'Finance', date: yesterday, clockIn: '08:20', clockOut: '16:30', duration: '8h10', status: 'En retard', notes: 'Rendez-vous medical' },
  { id: '12', employeeId: '6', employeeName: 'Grace Tshiamba', department: 'Formation', date: yesterday, clockIn: '08:00', clockOut: '16:30', duration: '8h30', status: 'Present', notes: '' },
]

const deptColors: Record<string, string> = {
  'Imprimerie': 'bg-orange-50 text-orange-700',
  'Graphisme': 'bg-purple-50 text-purple-700',
  'Informatique': 'bg-blue-50 text-blue-700',
  'Secr�tariat': 'bg-pink-50 text-pink-700',
  'Finance': 'bg-green-50 text-green-700',
  'Formation': 'bg-teal-50 text-teal-700',
}

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

export default function AttendancePage() {
  const { items: records, add, update, loading, error, refresh } = useApiDB<AttendanceRecord>('/hr/attendance', [], (raw: any) => ({ ...raw }))
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; dept: string }[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState(today)
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [showCalendar, setShowCalendar] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [showNoteModal, setShowNoteModal] = useState<AttendanceRecord | null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get('/users')
        const list = Array.isArray(data) ? data : data.data || data.items || []
        setEmployeeList(list.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          dept: typeof u.department === 'object' ? u.department?.name || '' : u.department || '',
        })))
      } catch { setEmployeeList([]) }
    }
    fetchEmployees()
  }, [])

  const todayRecords = records.filter(r => r.date === dateFilter)

  const filtered = todayRecords.filter(r => {
    const ms = `${r.employeeName} ${r.department} ${r.notes}`.toLowerCase()
    const matchSearch = ms.includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchEmp = employeeFilter === 'all' || r.employeeId === employeeFilter
    return matchSearch && matchStatus && matchEmp
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const presentCount = todayRecords.filter(r => r.status === 'Present').length
  const absentCount = todayRecords.filter(r => r.status === 'Absent').length
  const lateCount = todayRecords.filter(r => r.status === 'En retard').length
  const onLeaveCount = todayRecords.filter(r => r.status === 'Conge').length

  const calDays = generateCalendar(calYear, calMonth)

  const dayStatusColor = (status?: AttendanceStatus) => {
    switch (status) {
      case 'Present': return 'bg-green-500'
      case 'Absent': return 'bg-red-500'
      case 'En retard': return 'bg-amber-500'
      case 'Conge': return 'bg-blue-500'
      default: return 'bg-gray-200'
    }
  }

  const getRecordForDay = (empId: string, day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return records.find(r => r.employeeId === empId && r.date === dateStr)
  }

  const handleClockIn = (empId: string) => {
    const emp = employeeList.find(e => e.id === empId)
    if (!emp) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 0)
    const existing = records.find(r => r.employeeId === empId && r.date === dateFilter)
    if (existing) {
      update(existing.id, { clockIn: time, status: isLate ? 'En retard' : 'Present' })
    } else {
      add({
        employeeId: empId, employeeName: emp.name, department: emp.dept,
        date: dateFilter, clockIn: time, clockOut: '', duration: '',
        status: isLate ? 'En retard' : 'Present', notes: '',
      })
    }
  }

  const handleClockOut = (empId: string) => {
    const record = records.find(r => r.employeeId === empId && r.date === dateFilter)
    if (!record || !record.clockIn) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const [inH, inM] = record.clockIn.split(':').map(Number)
    const totalMin = (now.getHours() * 60 + now.getMinutes()) - (inH * 60 + inM)
    const hours = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    update(record.id, { clockOut: time, duration: `${hours}h${mins.toString().padStart(2, '0')}` })
  }

  const handleAddNote = () => {
    if (!showNoteModal) return
    update(showNoteModal.id, { notes: noteText })
    setShowNoteModal(null)
    setNoteText('')
  }

  const handleMarkAbsent = (empId: string) => {
    const emp = employeeList.find(e => e.id === empId)
    if (!emp) return
    const existing = records.find(r => r.employeeId === empId && r.date === dateFilter)
    if (existing) {
      update(existing.id, { status: 'Absent', clockIn: '', clockOut: '', duration: '' })
    } else {
      add({
        employeeId: empId, employeeName: emp.name, department: emp.dept,
        date: dateFilter, clockIn: '', clockOut: '', duration: '',
        status: 'Absent', notes: '',
      })
    }
  }

  const handleMarkLeave = (empId: string) => {
    const emp = employeeList.find(e => e.id === empId)
    if (!emp) return
    const existing = records.find(r => r.employeeId === empId && r.date === dateFilter)
    if (existing) {
      update(existing.id, { status: 'Conge', clockIn: '', clockOut: '', duration: '' })
    } else {
      add({
        employeeId: empId, employeeName: emp.name, department: emp.dept,
        date: dateFilter, clockIn: '', clockOut: '', duration: '',
        status: 'Conge', notes: 'Marque en conge',
      })
    }
  }

  const noRecordEmps = employeeList.filter(e => !todayRecords.some(r => r.employeeId === e.id))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Pointage & Presences"
        subtitle={`${formatDate(dateFilter)} -- ${todayRecords.length} enregistres`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'RH' }, { label: 'Pointage' }]}
        icon={<Clock size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered.map(r => ({
                Employe: r.employeeName, Departement: r.department, Date: r.date,
                Arrivee: r.clockIn || '--', Depart: r.clockOut || '--',
                Duree: r.duration || '--', Statut: r.status, Notes: r.notes,
              }))}
              filename={`pointage-${dateFilter}-alba`}
              title={`Pointage ${formatDate(dateFilter)} -- ALBA SERVICE GROUP`}
            />
            <button onClick={() => setShowCalendar(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-xl border transition-colors ${showCalendar ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}>
              <Calendar size={15} /> Calendrier
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Presents" value={String(presentCount)} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="Absents" value={String(absentCount)} icon={<AlertTriangle size={20} />} gradient="gradient-danger" />
        <KpiCard title="En retard" value={String(lateCount)} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="En conge" value={String(onLeaveCount)} icon={<Calendar size={20} />} gradient="gradient-primary" />
      </div>

      {noRecordEmps.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions rapides -- Employes sans pointage</p>
          <div className="flex flex-wrap gap-2">
            {noRecordEmps.map(e => (
              <div key={e.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                  {getInitials(e.name)}
                </div>
                <span className="text-xs font-medium text-gray-700">{e.name.split(' ')[0]}</span>
                <button onClick={() => handleClockIn(e.id)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg" title="Pointer l arrivee"><LogIn size={14} /></button>
                <button onClick={() => handleMarkAbsent(e.id)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg" title="Marquer absent"><AlertTriangle size={14} /></button>
                <button onClick={() => handleMarkLeave(e.id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg" title="Marquer en conge"><Calendar size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Retard</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Conge</span>
              </div>
              <button onClick={() => setShowCalendar(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="bg-gray-50 text-center text-[10px] font-semibold text-gray-500 py-2">{d}</div>
            ))}
            {calDays.map((day, i) => (
              <div key={i} className={`bg-white min-h-[90px] p-1.5 ${day ? '' : 'bg-gray-50/50'}`}>
                {day && (
                  <>
                    <span className="text-xs font-semibold text-gray-600">{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {employeeList.slice(0, 4).map(e => {
                        const rec = getRecordForDay(e.id, day)
                        if (!rec) return null
                        return (
                          <div key={e.id} className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dayStatusColor(rec.status)}`}></span>
                            <span className="text-[8px] text-gray-600 truncate">{e.name.split(' ')[0]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un employe, departement..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none" />
          <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les employes</option>
            {employeeList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="En retard">En retard</option>
            <option value="Conge">Conge</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employe', 'Departement', 'Heure arrivee', 'Heure depart', 'Duree', 'Statut', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(record => (
                <tr key={record.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                        {getInitials(record.employeeName)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{record.employeeName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${deptColors[record.department] || 'bg-gray-100 text-gray-600'}`}>
                      {record.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-mono font-bold ${record.clockIn ? 'text-gray-800' : 'text-gray-300'}`}>
                      {record.clockIn || '--:--'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-mono font-bold ${record.clockOut ? 'text-gray-800' : 'text-gray-300'}`}>
                      {record.clockOut || '--:--'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-bold ${record.duration ? 'text-blue-600' : 'text-gray-300'}`}>
                      {record.duration || '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={record.status === 'Present' ? 'Present' : record.status === 'Absent' ? 'Absent' : record.status === 'En retard' ? 'En retard' : 'Conge'}
                      type={record.status === 'Present' ? 'success' : record.status === 'Absent' ? 'danger' : record.status === 'En retard' ? 'warning' : 'info'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500 max-w-[120px] truncate block">{record.notes || '�'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      {record.clockIn && !record.clockOut && record.status !== 'Conge' && (
                        <button onClick={() => handleClockOut(record.employeeId)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Pointer le depart">
                          <LogOut size={13} />
                        </button>
                      )}
                      {!record.clockIn && record.status !== 'Present' && record.status !== 'En retard' && (
                        <button onClick={() => handleClockIn(record.employeeId)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Pointer l arrivee">
                          <LogIn size={13} />
                        </button>
                      )}
                      <button onClick={() => { setShowNoteModal(record); setNoteText(record.notes) }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ajouter une note">
                        <Edit3 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Aucun enregistrement pour cette date</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
            pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
        </div>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNoteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
                  <Edit3 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Note de pointage</h3>
                  <p className="text-[10px] text-gray-400">{showNoteModal.employeeName}</p>
                </div>
              </div>
              <button onClick={() => setShowNoteModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Commentaire</label>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="Observations, retards, absences..."
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowNoteModal(null)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleAddNote}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                <CheckCircle size={13} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
