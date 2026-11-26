import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import PhotoUploader from '@/components/ui/PhotoUploader'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { useApiDB } from '@/hooks/useApiDB'
import { usersService } from '@/services/users.service'
import { getInitials, formatDate } from '@/lib/utils'
import { ROLE_PERMISSIONS, type Permission } from '@/lib/permissions'
import {
  Shield, Plus, Search, Filter, Eye, EyeOff, Edit, Trash2,
  Lock, Unlock, Key, X, Save, Users, UserCheck,
  UserX, ShieldCheck, Mail, Phone, Calendar, Check, AlertTriangle, RefreshCw
} from 'lucide-react'

type UserAccount = {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: string
  department: string
  agency: string
  status: 'active' | 'inactive' | 'locked'
  photo: string | null
  createdAt: string
  lastLogin: string
  phone: string
  roles?: Array<{ role?: { name: string }; name?: string }>
}

const ALL_ROLES = [
  { value: 'Super Administrateur', label: 'Super Admin', color: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  { value: 'Comptable', label: 'Comptable', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  { value: 'Resp. Imprimerie', label: 'Resp. Imprimerie', color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  { value: 'Graphiste', label: 'Graphiste', color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  { value: 'Secrétaire', label: 'Secrétaire', color: 'bg-pink-50 text-pink-700', dot: 'bg-pink-500' },
  { value: 'Développeur', label: 'Développeur', color: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500' },
  { value: 'Formateur', label: 'Formateur', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  { value: 'Technicien IT', label: 'Technicien IT', color: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500' },
  { value: 'Magasinier', label: 'Magasinier', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  { value: 'Employé', label: 'Employé', color: 'bg-gray-50 text-gray-700', dot: 'bg-gray-500' },
]

const DEPARTMENTS = [
  'Imprimerie', 'Graphisme', 'Informatique', 'Secrétariat',
  'Finance', 'Formation', 'Commercial', 'RH', 'Maintenance', 'Direction'
]

const AGENCIES = ['Kindu', 'Kinshasa', 'Bukavu', 'Lubumbashi', 'Goma']

const PERMISSION_MODULES: { module: string; label: string; permissions: Permission[] }[] = [
  { module: 'dashboard', label: 'Tableau de bord', permissions: ['dashboard.view'] },
  { module: 'clients', label: 'Clients / CRM', permissions: ['clients.view', 'clients.create', 'clients.edit', 'clients.delete'] },
  { module: 'employees', label: 'Employés / RH', permissions: ['employees.view', 'employees.create', 'employees.edit', 'employees.delete'] },
  { module: 'secretariat', label: 'Secrétariat', permissions: ['secretariat.view', 'secretariat.manage'] },
  { module: 'printing', label: 'Imprimerie', permissions: ['printing.view', 'printing.manage'] },
  { module: 'production', label: 'Production', permissions: ['production.view', 'production.manage'] },
  { module: 'machines', label: 'Machines', permissions: ['machines.view', 'machines.manage'] },
  { module: 'consumables', label: 'Consommables', permissions: ['consumables.view', 'consumables.manage'] },
  { module: 'it', label: 'Informatique', permissions: ['it.view', 'it.manage'] },
  { module: 'graphics', label: 'Graphisme', permissions: ['graphics.view', 'graphics.manage'] },
  { module: 'maintenance', label: 'Maintenance', permissions: ['maintenance.view', 'maintenance.manage'] },
  { module: 'training', label: 'Formation', permissions: ['training.view', 'training.manage'] },
  { module: 'commercial', label: 'Commercial', permissions: ['commercial.view', 'commercial.manage'] },
  { module: 'stock', label: 'Stock', permissions: ['stock.view', 'stock.manage'] },
  { module: 'purchases', label: 'Achats', permissions: ['purchases.view', 'purchases.manage'] },
  { module: 'finance', label: 'Finance', permissions: ['finance.view', 'finance.manage'] },
  { module: 'accounting', label: 'Comptabilité', permissions: ['accounting.view', 'accounting.manage'] },
  { module: 'budget', label: 'Budget', permissions: ['budget.view', 'budget.manage'] },
  { module: 'documents', label: 'Documents', permissions: ['documents.view', 'documents.manage'] },
  { module: 'agenda', label: 'Agenda', permissions: ['agenda.view', 'agenda.manage'] },
  { module: 'reports', label: 'Rapports', permissions: ['reports.view'] },
  { module: 'settings', label: 'Paramètres', permissions: ['settings.view', 'settings.manage'] },
  { module: 'admin', label: 'Administration', permissions: ['admin.users', 'admin.audit', 'admin.agencies'] },
]

const roleColorMap: Record<string, string> = {
  'Super Admin': 'bg-red-50 text-red-700',
  'Comptable': 'bg-green-50 text-green-700',
  'Imprimerie': 'bg-orange-50 text-orange-700',
  'Graphiste': 'bg-purple-50 text-purple-700',
  'Secrétaire': 'bg-pink-50 text-pink-700',
  'Développeur': 'bg-cyan-50 text-cyan-700',
  'Formateur': 'bg-teal-50 text-teal-700',
  'Technicien': 'bg-yellow-50 text-yellow-700',
  'Caissier': 'bg-amber-50 text-amber-700',
}

const roleLabelMap: Record<string, string> = {
  'Super Admin': 'Super Admin',
  'Comptable': 'Comptable',
  'Imprimerie': 'Imprimerie',
  'Graphiste': 'Graphiste',
  'Secrétaire': 'Secrétaire',
  'Développeur': 'Développeur',
  'Formateur': 'Formateur',
  'Technicien': 'Technicien',
  'Caissier': 'Caissier',
}

const avatarGradients: Record<string, string> = {
  'Super Admin': 'linear-gradient(135deg, #DC2626, #EF4444)',
  'Comptable': 'linear-gradient(135deg, #16A34A, #22C55E)',
  'Imprimerie': 'linear-gradient(135deg, #EA580C, #F97316)',
  'Graphiste': 'linear-gradient(135deg, #9333EA, #A855F7)',
  'Secrétaire': 'linear-gradient(135deg, #DB2777, #EC4899)',
  'Développeur': 'linear-gradient(135deg, #0891B2, #06B6D4)',
  'Formateur': 'linear-gradient(135deg, #0D9488, #14B8A6)',
  'Technicien': 'linear-gradient(135deg, #CA8A04, #EAB308)',
  'Caissier': 'linear-gradient(135deg, #D97706, #F59E0B)',
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Moyen', color: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Bon', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Fort', color: 'bg-green-500' }
  return { score, label: 'Très fort', color: 'bg-green-600' }
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'Comptable',
  department: 'Finance',
  agency: 'Kindu',
  status: 'active' as 'active' | 'inactive' | 'locked',
  photo: null as string | null,
}

function mapUser(raw: any): UserAccount {
  return {
    id: raw.id,
    email: raw.email || '',
    password: '', // never expose password from API
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    role: raw.roles?.[0]?.role?.name || raw.roles?.[0]?.name || 'Employé',
    department: typeof raw.department === 'object' ? raw.department?.name || '' : raw.department || '',
    agency: typeof raw.branch === 'object' ? raw.branch?.name || '' : raw.branch || '',
    status: raw.status === 'ACTIVE' ? 'active' : raw.status === 'BLOCKED' ? 'locked' : 'inactive',
    photo: raw.photo || null,
    createdAt: raw.createdAt || '',
    lastLogin: raw.lastLoginAt || '',
    phone: raw.phone || '',
    roles: raw.roles || [],
  }
}

export default function UsersPage() {
  const { items: users, add, update, remove, loading, error, refresh } = useApiDB<UserAccount>('/users', [], mapUser)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [showDetail, setShowDetail] = useState<UserAccount | null>(null)
  const [showPermissions, setShowPermissions] = useState<UserAccount | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserAccount | null>(null)
  const [confirmReset, setConfirmReset] = useState<UserAccount | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const totalActive   = users.filter(u => u.status === 'active').length
  const totalInactive = users.filter(u => u.status === 'inactive').length
  const totalLocked   = users.filter(u => u.status === 'locked').length
  const totalRoles    = new Set(users.map(u => u.role)).size

  const filtered = useMemo(() => users.filter(u => {
    const ms = `${u.firstName} ${u.lastName} ${u.email} ${u.role} ${u.department} ${u.agency}`.toLowerCase()
    return ms.includes(search.toLowerCase())
      && (roleFilter === 'all' || u.role === roleFilter)
      && (statusFilter === 'all' || u.status === statusFilter)
  }), [users, search, roleFilter, statusFilter])

  const { currentPage, setCurrentPage, pageSize, setPageSize, paginatedItems, totalItems, totalPages } = usePagination(filtered, 10)

  const openCreateModal = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }

  const openEditModal = (user: UserAccount) => {
    setEditingId(user.id)
    setForm({
      firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, password: user.password,
      role: user.role, department: user.department, agency: user.agency,
      status: user.status, photo: user.photo,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { showToast('Prénom et nom requis', 'error'); return }
    if (!form.email.trim()) { showToast('Email requis', 'error'); return }
    if (!editingId && !form.password.trim()) { showToast('Mot de passe requis pour un nouvel utilisateur', 'error'); return }

    if (editingId) {
      try {
        const body: any = {
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone,
          department: form.department, photo: form.photo,
          status: form.status === 'active' ? 'ACTIVE' : form.status === 'locked' ? 'BLOCKED' : 'INACTIVE',
        }
        // Reset password if provided
        if (form.password.trim()) {
          await usersService.resetPassword(editingId, form.password)
        }
        await update(editingId, body)
        showToast('Utilisateur modifié avec succès')
      } catch { showToast('Erreur lors de la modification', 'error') }
    } else {
      const emailExists = users.some(u => u.email === form.email)
      if (emailExists) { showToast('Cet email est déjà utilisé', 'error'); return }
      try {
        await add({
          email: form.email,
          password: form.password,
          firstName: form.firstName, lastName: form.lastName,
          phone: form.phone,
          department: form.department,
          photo: form.photo,
          status: 'active',
          createdAt: new Date().toISOString(), lastLogin: '',
          role: form.role, agency: form.agency,
        })
        showToast(`${form.firstName} ${form.lastName} créé avec succès`)
      } catch { showToast('Erreur lors de la création', 'error') }
    }
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = (user: UserAccount) => { setConfirmDelete(user) }

  const confirmDeleteUser = async () => {
    if (confirmDelete) {
      try {
        await remove(confirmDelete.id)
        showToast('Utilisateur supprimé')
        setShowDetail(null)
        setConfirmDelete(null)
      } catch { showToast('Erreur lors de la suppression', 'error') }
    }
  }

  const handleLockToggle = async (user: UserAccount) => {
    const newStatus = user.status === 'locked' ? 'active' : 'locked'
    try {
      await usersService.toggleStatus(user.id)
      await update(user.id, { status: newStatus })
      showToast(newStatus === 'locked'
        ? `${user.firstName} ${user.lastName} verrouillé`
        : `${user.firstName} ${user.lastName} déverrouillé`, 'info')
      if (showDetail?.id === user.id) setShowDetail({ ...showDetail, status: newStatus })
    } catch { showToast('Erreur lors du changement de statut', 'error') }
  }

  const confirmResetPassword = async () => {
    if (confirmReset) {
      const newPw = 'Reset' + Math.random().toString(36).slice(2, 8) + '!'
      try {
        await usersService.resetPassword(confirmReset.id, newPw)
        showToast(`Mot de passe réinitialisé : ${newPw}`, 'info')
        setConfirmReset(null)
      } catch { showToast('Erreur lors de la réinitialisation', 'error') }
    }
  }

  const getRolePermissions = (role: string): Permission[] => {
    const key = role.trim()
    if (ROLE_PERMISSIONS[key]) return ROLE_PERMISSIONS[key]
    const lower = key.toLowerCase()
    const foundKey = Object.keys(ROLE_PERMISSIONS).find(k => k.toLowerCase() === lower)
    return foundKey ? ROLE_PERMISSIONS[foundKey] : []
  }

  const getRoleInfo = (role: string) => {
    return ALL_ROLES.find(r => r.value === role) || { value: role, label: role, color: 'bg-gray-50 text-gray-700', dot: 'bg-gray-500' }
  }

  const strength = getPasswordStrength(form.password)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          }`}>
            {toast.type === 'success' ? <Check size={16} /> : toast.type === 'error' ? <AlertTriangle size={16} /> : <Shield size={16} />}
            {toast.message}
          </div>
        </div>
      )}

      <PageHeader
        title="Gestion des Utilisateurs"
        subtitle={`${users.length} comptes utilisateurs`}
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Administration' }, { label: 'Utilisateurs' }]}
        icon={<Shield size={22} />}
        iconBg="gradient-primary"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={users.map(u => ({
                Prénom: u.firstName, Nom: u.lastName, Email: u.email,
                Téléphone: u.phone, Rôle: roleLabelMap[u.role] || u.role,
                Département: u.department, Agence: u.agency,
                Statut: u.status === 'active' ? 'Actif' : u.status === 'locked' ? 'Verrouillé' : 'Inactif',
                'Créé le': formatDate(u.createdAt),
                'Dernière connexion': u.lastLogin ? formatDate(u.lastLogin) : 'Jamais',
              }))}
              filename="utilisateurs-alba"
              title="Liste des Utilisateurs — ALBA SERVICE GROUP"
            />
            <button onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
              <Plus size={15} /> Nouvel utilisateur
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total utilisateurs" value={String(users.length)} icon={<Users size={20} />} gradient="gradient-primary" />
        <KpiCard title="Actifs" value={String(totalActive)} icon={<UserCheck size={20} />} gradient="gradient-success" />
        <KpiCard title="Inactifs" value={String(totalInactive)} icon={<UserX size={20} />} gradient="gradient-warning" />
        <KpiCard title="Rôles distincts" value={String(totalRoles)} icon={<ShieldCheck size={20} />} gradient="gradient-purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, rôle, département..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les rôles</option>
            {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="locked">Verrouillé</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100">
            <Filter size={15} /> Filtres
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Utilisateur', 'Email', 'Rôle', 'Département', 'Agence', 'Statut', 'Dernière connexion', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(user => {
                const roleInfo = getRoleInfo(user.role)
                return (
                  <tr key={user.id} className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                    onClick={() => setShowDetail(user)}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden"
                          style={{ background: user.photo ? 'transparent' : (avatarGradients[user.role] || avatarGradients['Super Admin']) }}>
                          {user.photo
                            ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
                            : getInitials(`${user.firstName} ${user.lastName}`)
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{user.firstName} {user.lastName}</p>
                          <p className="text-gray-400 text-[10px]">{user.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600">{user.email}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${roleColorMap[user.role] || 'bg-gray-50 text-gray-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} />
                        {roleLabelMap[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-600">{user.department}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{user.agency}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        label={user.status === 'active' ? 'Actif' : user.status === 'locked' ? 'Verrouillé' : 'Inactif'}
                        type={user.status === 'active' ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{user.lastLogin ? formatDate(user.lastLogin) : 'Jamais'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); setShowDetail(user) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir détails">
                          <Eye size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEditModal(user) }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Modifier">
                          <Edit size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleLockToggle(user) }}
                          className={`p-1.5 rounded-lg transition-colors ${user.status === 'locked' ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                          title={user.status === 'locked' ? 'Déverrouiller' : 'Verrouiller'}>
                          {user.status === 'locked' ? <Unlock size={13} /> : <Lock size={13} />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(user) }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* User detail panel */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setShowDetail(null)}>
          <div className="w-[420px] h-full bg-white shadow-2xl overflow-y-auto animate-slide-in" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 text-white" style={{ background: avatarGradients[showDetail.role] || avatarGradients['Super Admin'] }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-lg font-bold overflow-hidden">
                    {showDetail.photo
                      ? <img src={showDetail.photo} alt="" className="w-full h-full object-cover" />
                      : getInitials(`${showDetail.firstName} ${showDetail.lastName}`)
                    }
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{showDetail.firstName} {showDetail.lastName}</h3>
                    <p className="text-white/70 text-xs">{getRoleInfo(showDetail.role).label}</p>
                    <p className="text-white/50 text-[10px] mt-0.5">{showDetail.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetail(null)} className="text-white/60 hover:text-white text-xl">×</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Département', value: showDetail.department, color: 'text-purple-600' },
                  { label: 'Agence', value: showDetail.agency, color: 'text-blue-600' },
                  { label: 'Téléphone', value: showDetail.phone, color: 'text-gray-800' },
                  { label: 'Statut', value: showDetail.status === 'active' ? 'Actif' : showDetail.status === 'locked' ? 'Verrouillé' : 'Inactif', color: showDetail.status === 'active' ? 'text-green-600' : showDetail.status === 'locked' ? 'text-red-600' : 'text-gray-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Créé le</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{formatDate(showDetail.createdAt)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">Dernière connexion</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{showDetail.lastLogin ? formatDate(showDetail.lastLogin) : 'Jamais'}</p>
                </div>
              </div>

              {/* Permissions summary */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules accessibles</h4>
                <div className="space-y-1.5">
                  {PERMISSION_MODULES.filter(pm =>
                    pm.permissions.some(p => getRolePermissions(showDetail.role).includes(p))
                  ).map(pm => (
                    <div key={pm.module} className="flex items-center gap-2 text-xs">
                      <Check size={12} className="text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{pm.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowDetail(null); setShowPermissions(showDetail) }}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  Voir toutes les permissions →
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => openEditModal(showDetail)}
                  className="w-full py-2.5 text-sm text-white rounded-xl font-medium"
                  style={{ background: avatarGradients[showDetail.role] || avatarGradients['Super Admin'] }}>
                  <Edit size={13} className="inline mr-2" />Modifier cet utilisateur
                </button>
                <button onClick={() => setConfirmReset(showDetail)}
                  className="w-full py-2.5 text-sm text-amber-700 bg-amber-50 rounded-xl font-medium hover:bg-amber-100 transition-colors">
                  <Key size={13} className="inline mr-2" />Réinitialiser le mot de passe
                </button>
                <button onClick={() => handleLockToggle(showDetail)}
                  className={`w-full py-2.5 text-sm rounded-xl font-medium transition-colors ${
                    showDetail.status === 'locked'
                      ? 'text-green-700 bg-green-50 hover:bg-green-100'
                      : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                  }`}>
                  {showDetail.status === 'locked'
                    ? <><Unlock size={13} className="inline mr-2" />Déverrouiller</>
                    : <><Lock size={13} className="inline mr-2" />Verrouiller</>
                  }
                </button>
                <button onClick={() => handleDelete(showDetail)}
                  className="w-full py-2.5 text-sm text-red-700 bg-red-50 rounded-xl font-medium hover:bg-red-100 transition-colors">
                  <Trash2 size={13} className="inline mr-2" />Supprimer cet utilisateur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions modal */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPermissions(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50">
                  <ShieldCheck size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Permissions — {showPermissions.firstName} {showPermissions.lastName}</h3>
                  <p className="text-[10px] text-gray-400">Rôle : {getRoleInfo(showPermissions.role).label}</p>
                </div>
              </div>
              <button onClick={() => setShowPermissions(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {PERMISSION_MODULES.map(pm => {
                const userPerms = getRolePermissions(showPermissions.role)
                const hasAny = pm.permissions.some(p => userPerms.includes(p))
                const hasAll = pm.permissions.every(p => userPerms.includes(p))
                return (
                  <div key={pm.module} className={`rounded-xl border p-3 ${hasAny ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">{pm.label}</span>
                      {hasAll
                        ? <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Accès complet</span>
                        : hasAny
                          ? <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Accès partiel</span>
                          : <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Aucun accès</span>
                      }
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pm.permissions.map(p => {
                        const has = userPerms.includes(p)
                        const action = p.split('.')[1]
                        return (
                          <span key={p} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${has ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                            {action === 'view' ? '👁 Voir' : action === 'create' ? '+ Créer' : action === 'edit' ? '✏ Modifier' : action === 'delete' ? '🗑 Supprimer' : '⚙ Gérer'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
                  <p className="text-[10px] text-gray-400">ALBA SERVICE GROUP · Administration</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Photo */}
              <div className="flex justify-center">
                <PhotoUploader
                  value={form.photo}
                  onChange={photo => setForm({ ...form, photo })}
                  name={`${form.firstName} ${form.lastName}`}
                  size={90}
                />
              </div>

              {/* Identity */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations personnelles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prénom *</label>
                    <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Prénom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom *</label>
                    <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Nom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="prenom@alba.cd" type="email"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+243 8X XXX XXXX"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sécurité</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Mot de passe {editingId ? '(laisser vide pour conserver)' : '*'}
                  </label>
                  <div className="relative">
                    <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••" type={showPassword ? 'text' : 'password'}
                      className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title={showPassword ? 'Masquer' : 'Afficher'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${strength.color}`}
                          style={{ width: `${(strength.score / 5) * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500">{strength.label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role & Department */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Affectation</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rôle *</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {ALL_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Département *</label>
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Agence *</label>
                    <select value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {AGENCIES.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="locked">Verrouillé</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Role permissions preview */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Permissions du rôle</p>
                <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {getRolePermissions(form.role).map(p => (
                      <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                <Save size={13} /> {editingId ? 'Mettre à jour' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-semibold">{confirmDelete.firstName} {confirmDelete.lastName}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">{confirmDelete.email}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button onClick={confirmDeleteUser}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password confirmation dialog */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmReset(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Key size={24} className="text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Réinitialiser le mot de passe ?</h3>
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-semibold">{confirmReset.firstName} {confirmReset.lastName}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">Un nouveau mot de passe temporaire sera généré et affiché.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button onClick={confirmResetPassword}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors">
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
