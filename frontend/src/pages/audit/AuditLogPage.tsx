import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { useAuditLog, AuditEntry } from '@/hooks/useAuditLog'
import {
  History, Search, Filter, Download, Trash2, Eye, Plus,
  Pencil, LogOut, LogIn, FileText, Calendar
} from 'lucide-react'

const ACTION_LABELS: Record<AuditEntry['action'], string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  view: 'Consultation',
  export: 'Export',
  login: 'Connexion',
  logout: 'Déconnexion',
}

const ACTION_COLORS: Record<AuditEntry['action'], string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  view: 'bg-gray-100 text-gray-600',
  export: 'bg-orange-100 text-orange-700',
  login: 'bg-purple-100 text-purple-700',
  logout: 'bg-purple-100 text-purple-700',
}

const ACTION_ICONS: Record<AuditEntry['action'], React.ReactNode> = {
  create: <Plus size={13} />,
  update: <Pencil size={13} />,
  delete: <Trash2 size={13} />,
  view: <Eye size={13} />,
  export: <FileText size={13} />,
  login: <LogIn size={13} />,
  logout: <LogOut size={13} />,
}

const MODULE_OPTIONS = [
  'Tous les modules',
  'clients', 'invoices', 'employees', 'departments', 'stock',
  'payments', 'quotes', 'commercial-orders', 'documents', 'it-projects',
  'it-tickets', 'maintenance', 'budget', 'accounting', 'agenda',
  'settings', 'training', 'graphics', 'print', 'auth',
]

const MODULE_LABELS: Record<string, string> = {
  'Tous les modules': 'Tous',
  clients: 'Clients',
  invoices: 'Factures',
  employees: 'Employés',
  departments: 'Départements',
  stock: 'Stock',
  payments: 'Paiements',
  quotes: 'Devis',
  'commercial-orders': 'Commandes',
  documents: 'Documents',
  'it-projects': 'Projets IT',
  'it-tickets': 'Tickets IT',
  maintenance: 'Maintenance',
  budget: 'Budget',
  accounting: 'Comptabilité',
  agenda: 'Agenda',
  settings: 'Paramètres',
  training: 'Formation',
  graphics: 'Graphisme',
  print: 'Imprimerie',
  auth: 'Authentification',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function toCSVValue(v: string) {
  return `"${v.replace(/"/g, '""')}"`
}

export default function AuditLogPage() {
  const { entries, clearLog } = useAuditLog()

  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('Tous les modules')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (moduleFilter !== 'Tous les modules' && e.module !== moduleFilter) return false
      if (actionFilter !== 'all' && e.action !== actionFilter) return false
      if (dateFrom) {
        const entryDate = e.timestamp.slice(0, 10)
        if (entryDate < dateFrom) return false
      }
      if (dateTo) {
        const entryDate = e.timestamp.slice(0, 10)
        if (entryDate > dateTo) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return (
          e.description.toLowerCase().includes(q) ||
          e.userName.toLowerCase().includes(q) ||
          e.module.toLowerCase().includes(q) ||
          ACTION_LABELS[e.action].toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [entries, moduleFilter, actionFilter, dateFrom, dateTo, search])

  const pagination = usePagination(filtered, 10)

  const stats = useMemo(() => ({
    total: entries.length,
    creates: entries.filter(e => e.action === 'create').length,
    updates: entries.filter(e => e.action === 'update').length,
    deletes: entries.filter(e => e.action === 'delete').length,
  }), [entries])

  const exportCSV = () => {
    if (filtered.length === 0) { alert('Aucune donnée à exporter.'); return }
    const headers = ['Date', 'Heure', 'Utilisateur', 'Action', 'Module', 'Description']
    const rows = filtered.map(e => [
      toCSVValue(formatDate(e.timestamp)),
      toCSVValue(formatTime(e.timestamp)),
      toCSVValue(e.userName),
      toCSVValue(ACTION_LABELS[e.action]),
      toCSVValue(MODULE_LABELS[e.module] || e.module),
      toCSVValue(e.description),
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `journal_audit_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  const handleClear = () => {
    clearLog()
    setShowClearConfirm(false)
  }

  return (
    <div>
      <PageHeader
        title="Journal d'Audit"
        subtitle={`${entries.length} événements enregistrés`}
        icon={<History size={24} />}
        iconBg="gradient-primary"
        breadcrumbs={[{ label: 'Administration' }, { label: "Journal d'audit" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              Exporter CSV
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
            >
              <Trash2 size={15} />
              Effacer
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-800', bg: 'bg-gray-50' },
          { label: 'Créations', value: stats.creates, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Modifications', value: stats.updates, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Suppressions', value: stats.deletes, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-1 min-w-[240px]">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans le journal..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {MODULE_OPTIONS.map(m => (
              <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="all">Toutes les actions</option>
            <option value="create">Création</option>
            <option value="update">Modification</option>
            <option value="delete">Suppression</option>
            <option value="view">Consultation</option>
            <option value="export">Export</option>
            <option value="login">Connexion</option>
            <option value="logout">Déconnexion</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Du"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Au"
            />
          </div>
          {(search || moduleFilter !== 'Tous les modules' || actionFilter !== 'all' || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setModuleFilter('Tous les modules'); setActionFilter('all'); setDateFrom(''); setDateTo('') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Filter size={14} />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {pagination.paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <History size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-medium">Aucun événement trouvé</p>
            <p className="text-xs mt-1">
              {entries.length === 0
                ? "Le journal d'audit est vide. Les actions seront enregistrées automatiquement."
                : 'Aucun résultat ne correspond aux filtres sélectionnés.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Heure</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs whitespace-nowrap">{formatTime(entry.timestamp)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">
                            {entry.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-gray-700 font-medium whitespace-nowrap">{entry.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action]}`}>
                          {ACTION_ICONS[entry.action]}
                          {ACTION_LABELS[entry.action]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {MODULE_LABELS[entry.module] || entry.module}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{entry.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        )}
      </div>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Effacer le journal</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer les <strong>{entries.length} événements</strong> du journal d'audit ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
              >
                Effacer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
