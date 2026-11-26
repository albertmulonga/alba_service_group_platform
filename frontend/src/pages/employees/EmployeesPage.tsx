import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import AvatarCircle from '@/components/ui/AvatarCircle'
import PhotoUploader from '@/components/ui/PhotoUploader'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  UserCheck, Plus, Search, Filter, Download,
  Eye, Edit, Archive, Phone, Mail, Calendar,
  TrendingUp, Clock, Users, Award, X, Save
} from 'lucide-react'

type EmployeeType = {
  id: string
  matricule: string
  firstName: string
  lastName: string
  function: string
  department: string
  agency: string
  phone: string
  email: string
  contractType: string
  hireDate: string
  status: 'active' | 'leave' | 'inactive'
  salary: number
  photo: string | null
}

const deptColors: Record<string, string> = {
  'Imprimerie': 'bg-orange-50 text-orange-700',
  'Graphisme': 'bg-purple-50 text-purple-700',
  'Informatique': 'bg-blue-50 text-blue-700',
  'Secrétariat': 'bg-pink-50 text-pink-700',
  'Finance': 'bg-green-50 text-green-700',
  'Formation': 'bg-teal-50 text-teal-700',
}

const contractColors: Record<string, string> = {
  CDI: 'bg-green-50 text-green-700',
  CDD: 'bg-yellow-50 text-yellow-700',
  Stage: 'bg-gray-100 text-gray-600',
  Freelance: 'bg-blue-50 text-blue-600',
}

const emptyForm: { firstName: string; lastName: string; function: string; department: string; agency: string; phone: string; email: string; contractType: string; hireDate: string; status: 'active' | 'leave' | 'inactive'; salary: number; photo: string | null } = {
  firstName: '', lastName: '', function: '', department: 'Imprimerie',
  agency: 'Kindu', phone: '', email: '', contractType: 'CDI',
  hireDate: '', status: 'active', salary: 0, photo: null
}

function mapEmployee(raw: any): EmployeeType {
  return {
    id: raw.id,
    matricule: raw.code || raw.matricule || raw.id.slice(-8).toUpperCase(),
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    function: raw.position || raw.function || '',
    department: typeof raw.department === 'object' ? raw.department?.name || '' : raw.department || '',
    agency: typeof raw.branch === 'object' ? raw.branch?.name || '' : raw.branch || raw.agency || '',
    phone: raw.phone || '',
    email: raw.email || '',
    contractType: raw.contracts?.[0]?.type || raw.contractType || 'CDI',
    hireDate: raw.createdAt || raw.hireDate || '',
    status: raw.status === 'INACTIVE' ? 'inactive' : raw.status === 'ACTIVE' || raw.status === 'active' ? 'active' : (raw.status || 'active') as any,
    salary: raw.contracts?.[0]?.baseSalary || raw.salary || 0,
    photo: raw.photo || null,
  }
}

export default function EmployeesPage() {
  const { items: employees, add, update, remove, loading, error } = useApiDB<EmployeeType>('/users', [], mapEmployee)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [selected, setSelected] = useState<EmployeeType | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const totalActive = employees.filter(e => e.status === 'active').length
  const totalLeave = employees.filter(e => e.status === 'leave').length
  const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0)

  const filtered = employees.filter(e => {
    const ms = `${e.firstName} ${e.lastName} ${e.matricule} ${e.function} ${e.department}`.toLowerCase()
    const ms2 = search.toLowerCase()
    const matchSearch = ms.includes(ms2)
    const matchDept = deptFilter === 'all' || e.department === deptFilter
    return matchSearch && matchDept
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const departments = [...new Set(employees.map(e => e.department))]

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEditModal = (emp: EmployeeType) => {
    setEditingId(emp.id)
    setForm({
      firstName: emp.firstName, lastName: emp.lastName, function: emp.function,
      department: emp.department, agency: emp.agency, phone: emp.phone,
      email: emp.email, contractType: emp.contractType, hireDate: emp.hireDate,
      status: emp.status, salary: emp.salary, photo: emp.photo ?? null,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert('Prénom et nom requis')
      return
    }
    if (editingId) {
      await update(editingId, { ...form, photo: form.photo })
    } else {
      const nextNum = employees.length + 1
      const newEmp = await add({
        matricule: `EMP-${String(nextNum).padStart(3, '0')}`,
        firstName: form.firstName, lastName: form.lastName,
        function: form.function || 'Non défini',
        department: form.department, agency: form.agency,
        phone: form.phone, email: form.email,
        contractType: form.contractType,
        hireDate: form.hireDate || new Date().toISOString().slice(0, 10),
        status: 'active', salary: form.salary, photo: form.photo ?? null,
      })
      setSelected(newEmp)
    }
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmer la suppression de cet employé ?')) return
    await remove(id)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Employés"
        subtitle={`${employees.length} employés enregistrés`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Employés' }]}
        icon={<UserCheck size={22} />}
        iconBg="gradient-success"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={employees.map(e => ({
                Matricule: e.matricule, Prénom: e.firstName, Nom: e.lastName,
                Fonction: e.function, Département: e.department,
                Téléphone: e.phone, Email: e.email,
                Contrat: e.contractType, Statut: e.status,
              }))}
              filename="employes-alba"
              title="Liste des Employés — ALBA SERVICE GROUP"
            />
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
              <Plus size={15} /> Nouvel employé
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="ml-3 text-sm text-gray-500">Chargement des données...</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          ⚠ {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Effectif total" value={String(employees.length)} icon={<Users size={20} />} gradient="gradient-primary" change={5} />
        <KpiCard title="Employés actifs" value={String(totalActive)} icon={<UserCheck size={20} />} gradient="gradient-success" />
        <KpiCard title="En congé" value={String(totalLeave)} icon={<Calendar size={20} />} gradient="gradient-warning" />
        <KpiCard title="Masse salariale" value={`${(totalSalary / 1_000_000).toFixed(1)}M FC`} icon={<TrendingUp size={20} />} gradient="gradient-purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, matricule, fonction, département..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les départements</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100">
            <Filter size={15} /> Filtres
          </button>
          <ExportButton
            data={filtered}
            filename="employes-alba"
            title="Liste des Employés"
            headers={{ id: 'ID', firstName: 'Prénom', lastName: 'Nom', email: 'Email', phone: 'Téléphone', department: 'Département', position: 'Poste', salary: 'Salaire', status: 'Statut', hireDate: 'Date embauche' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Employé', 'Fonction', 'Département', 'Contact', 'Contrat', 'Embauche', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(emp => (
                <tr key={emp.id} className="hover:bg-green-50/20 transition-colors cursor-pointer group"
                  onClick={() => setSelected(emp)}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarCircle photo={emp.photo} name={`${emp.firstName} ${emp.lastName}`} size={36} />
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{emp.firstName} {emp.lastName}</p>
                        <p className="text-gray-400 text-[10px] font-mono">{emp.matricule}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-600">{emp.function}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${deptColors[emp.department] || 'bg-gray-100 text-gray-600'}`}>
                      {emp.department}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1"><Phone size={10} className="text-gray-400" /><span className="text-xs text-gray-600">{emp.phone}</span></div>
                      <div className="flex items-center gap-1"><Mail size={10} className="text-gray-400" /><span className="text-xs text-gray-400">{emp.email}</span></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${contractColors[emp.contractType] || 'bg-gray-100 text-gray-600'}`}>
                      {emp.contractType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500">{formatDate(emp.hireDate)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={emp.status === 'active' ? 'Actif' : emp.status === 'leave' ? 'Congé' : 'Inactif'}
                      type={emp.status === 'active' ? 'success' : emp.status === 'leave' ? 'warning' : 'danger'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); setSelected(emp) }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); openEditModal(emp) }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><Edit size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(emp.id) }} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Archive size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      {/* Employee detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div className="w-96 h-full bg-white shadow-2xl overflow-y-auto animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #064E3B, #16A34A)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <AvatarCircle photo={selected.photo} name={`${selected.firstName} ${selected.lastName}`} size={56} className="border-2 border-white/30" />
                  <div>
                    <h3 className="text-white font-bold">{selected.firstName} {selected.lastName}</h3>
                    <p className="text-green-200 text-xs">{selected.matricule}</p>
                    <p className="text-green-100 text-xs mt-0.5">{selected.function}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-xl">×</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Département', value: selected.department, color: 'text-purple-600' },
                  { label: 'Contrat', value: selected.contractType, color: 'text-blue-600' },
                  { label: 'Salaire base', value: formatCurrency(selected.salary), color: 'text-green-600' },
                  { label: 'Agence', value: selected.agency, color: 'text-gray-800' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Coordonnées</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600"><Phone size={13} className="text-gray-400" />{selected.phone}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-600"><Mail size={13} className="text-gray-400" />{selected.email}</div>
                  <div className="flex items-center gap-3 text-sm text-gray-600"><Calendar size={13} className="text-gray-400" />Embauche : {formatDate(selected.hireDate)}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => openEditModal(selected)} className="w-full py-2.5 text-sm text-white rounded-xl font-medium"
                  style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
                  Modifier cet employé
                </button>
                <button onClick={() => handleDelete(selected.id)} className="w-full py-2.5 text-sm text-orange-700 bg-orange-50 rounded-xl font-medium hover:bg-orange-100 transition-colors">
                  Archiver / Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Modal (create / edit) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                  <UserCheck size={18} className="text-white"/>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{editingId ? 'Modifier l\'employé' : 'Nouvel employé'}</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP · Kindu, Maniema</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16}/>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Identity */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations personnelles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom *</label>
                    <input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder="Prénom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom *</label>
                    <input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder="Nom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone *</label>
                    <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+243 8X XXX XXXX"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email professionnel</label>
                    <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="prenom@alba.cd" type="email"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                </div>
              </div>

              {/* Professional */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations professionnelles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fonction / Poste *</label>
                    <input value={form.function} onChange={e=>setForm({...form,function:e.target.value})} placeholder="Ex: Graphiste Senior"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Département *</label>
                    <select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                      {['Imprimerie','Graphisme','Informatique','Secrétariat','Finance','Formation','Commercial','Logistique','Direction'].map(d=>(
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type de contrat</label>
                    <select value={form.contractType} onChange={e=>setForm({...form,contractType:e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20">
                      {['CDI','CDD','Stage','Freelance'].map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date d'embauche</label>
                    <input type="date" value={form.hireDate} onChange={e=>setForm({...form,hireDate:e.target.value})}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Salaire de base (FC)</label>
                    <input type="number" min={0} value={form.salary||''} onChange={e=>setForm({...form,salary:Number(e.target.value)})} placeholder="0"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20"/>
                  </div>
                </div>
              </div>

              {/* Photo */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Photo</p>
                <PhotoUploader
                  value={form.photo}
                  onChange={photo => setForm({ ...form, photo })}
                  size={80}
                  name={`${form.firstName} ${form.lastName}`.trim() || 'Employé'}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{background:'linear-gradient(135deg,#16A34A,#22C55E)'}}>
                <Save size={13}/> {editingId ? 'Mettre à jour' : 'Enregistrer l\'employé'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
