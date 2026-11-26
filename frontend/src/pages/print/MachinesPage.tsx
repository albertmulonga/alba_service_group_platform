import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ExportButton from '@/components/ui/ExportButton'
import { formatDate } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Settings, Plus, Edit, Trash2, X, Save, AlertTriangle,
  CheckCircle, Wrench, Zap, Clock, Activity, Calendar
} from 'lucide-react'

interface Machine {
  id: string
  name: string
  type: string
  brand: string
  serial: string
  status: 'service' | 'maintenance' | 'panne'
  lastMaintenance: string
  nextMaintenance: string
  operator: string
  notes: string
  purchaseYear: number
}

interface Intervention {
  id: string
  machineId: string
  date: string
  type: string
  technicien: string
  description: string
  duration: string
  cost: number
}

const INITIAL_MACHINES: Machine[] = [
  { id: '1', name: 'HP LaserJet Pro M428', type: 'Imprimante laser', brand: 'HP', serial: 'HP-LJ-001', status: 'service', lastMaintenance: '2026-06-15', nextMaintenance: '2026-09-15', operator: 'Jean Mukadi', notes: 'Imprimante principale A4/A3', purchaseYear: 2023 },
  { id: '2', name: 'Epson EcoTank Pro', type: 'Imprimante couleur', brand: 'Epson', serial: 'EP-ET-002', status: 'service', lastMaintenance: '2026-06-20', nextMaintenance: '2026-09-20', operator: 'Alice Mwamba', notes: 'Impression couleur haute qualité', purchaseYear: 2022 },
  { id: '3', name: 'Machine Plastification A3', type: 'Plastifieuse', brand: 'GBC', serial: 'GBC-PL-003', status: 'maintenance', lastMaintenance: '2026-07-10', nextMaintenance: '2026-10-10', operator: 'Paul Kasongo', notes: 'En cours de maintenance préventive', purchaseYear: 2021 },
  { id: '4', name: 'Massicot Électrique', type: 'Massicot', brand: 'Ideal', serial: 'ID-MS-004', status: 'service', lastMaintenance: '2026-05-01', nextMaintenance: '2026-08-01', operator: 'Jean Mukadi', notes: 'Coupe papier jusqu\'à 50cm', purchaseYear: 2020 },
  { id: '5', name: 'Relieuse Spirale GBC', type: 'Relieuse', brand: 'GBC', serial: 'GBC-RL-005', status: 'service', lastMaintenance: '2026-06-01', nextMaintenance: '2026-09-01', operator: 'Alice Mwamba', notes: 'Reliure spirale métallique et plastique', purchaseYear: 2022 },
  { id: '6', name: 'Scanner Canon DR-C230', type: 'Scanner', brand: 'Canon', serial: 'CN-SC-006', status: 'panne', lastMaintenance: '2026-04-10', nextMaintenance: '2026-07-25', operator: '—', notes: 'Panne capteur – pièce commandée', purchaseYear: 2021 },
]

const INITIAL_INTERVENTIONS: Intervention[] = [
  { id: '1', machineId: '3', date: '2026-07-10', type: 'Maintenance préventive', technicien: 'David Kasongo', description: 'Nettoyage rouleaux, calibration température', duration: '3h', cost: 15000 },
  { id: '2', machineId: '6', date: '2026-07-08', type: 'Diagnostic panne', technicien: 'David Kasongo', description: 'Capteur défectueux identifié – commande pièce en cours', duration: '2h', cost: 8000 },
  { id: '3', machineId: '1', date: '2026-06-15', type: 'Maintenance préventive', technicien: 'David Kasongo', description: 'Remplacement cartouche, nettoyage têtes impression', duration: '1h', cost: 25000 },
  { id: '4', machineId: '4', date: '2026-05-01', type: 'Réglage lame', technicien: 'David Kasongo', description: 'Affûtage lame, réglage butée arrière', duration: '2h', cost: 12000 },
]

const EMPTY_MACHINE: Omit<Machine, 'id'> = {
  name: '', type: '', brand: '', serial: '', status: 'service',
  lastMaintenance: '', nextMaintenance: '', operator: '', notes: '', purchaseYear: new Date().getFullYear()
}

const statusConfig: Record<string, { label: string; type: any; color: string; icon: React.ReactNode }> = {
  service: { label: 'En service', type: 'success', color: 'border-green-200 bg-green-50/30', icon: <CheckCircle size={14} className="text-green-500" /> },
  maintenance: { label: 'Maintenance', type: 'warning', color: 'border-amber-200 bg-amber-50/30', icon: <Wrench size={14} className="text-amber-500" /> },
  panne: { label: 'En panne', type: 'danger', color: 'border-red-200 bg-red-50/30', icon: <AlertTriangle size={14} className="text-red-500" /> },
}

interface Toast { message: string; type: 'success' | 'error' }

export default function MachinesPage() {
  const { items: machines, add, update, remove } = useMockDB<Machine>('alba-machines', INITIAL_MACHINES)
  const {
    currentPage, setCurrentPage, pageSize, setPageSize,
    totalPages, paginatedItems, totalItems
  } = usePagination(machines)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [form, setForm] = useState<Omit<Machine, 'id'>>(EMPTY_MACHINE)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const openCreate = () => { setEditingMachine(null); setForm(EMPTY_MACHINE); setModalOpen(true) }
  const openEdit = (m: Machine) => { setEditingMachine(m); const { id, ...rest } = m; setForm(rest); setModalOpen(true) }

  const handleSave = () => {
    if (!form.name.trim()) { showToast('Nom de la machine requis', 'error'); return }
    if (editingMachine) {
      update(editingMachine.id, form)
      showToast(`Machine "${form.name}" modifiée`)
    } else {
      add(form)
      showToast(`Machine "${form.name}" ajoutée`)
    }
    setModalOpen(false)
  }

  const handleDelete = (id: string) => {
    const m = machines.find(x => x.id === id)
    remove(id)
    setDeleteConfirm(null)
    showToast(`Machine "${m?.name}" supprimée`, 'error')
  }

  const inService = machines.filter(m => m.status === 'service').length
  const inMaintenance = machines.filter(m => m.status === 'maintenance').length
  const inPanne = machines.filter(m => m.status === 'panne').length
  const availability = machines.length > 0 ? Math.round((inService / machines.length) * 100) : 0

  const getMachineIntervention = (id: string) => INITIAL_INTERVENTIONS.filter(i => i.machineId === id)

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'gradient-success' : 'gradient-danger'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Machines & Équipements"
        subtitle="Parc machines de l'imprimerie ALBA"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Imprimerie' }, { label: 'Machines' }]}
        icon={<Settings size={22} />}
        iconBg="gradient-teal"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={machines}
              filename="machines-alba"
              title="Machines"
              headers={{ name: 'Nom', type: 'Type', brand: 'Marque', serial: 'N° Série', status: 'Statut', lastMaintenance: 'Dernière maintenance', nextMaintenance: 'Prochaine maintenance', operator: 'Opérateur', notes: 'Notes', purchaseYear: "Année d'achat" }}
            />
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm gradient-teal">
              <Plus size={15} /> Ajouter machine
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total machines" value={machines.length.toString()} icon={<Settings size={20} />} gradient="gradient-teal" />
        <KpiCard title="En service" value={inService.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="En maintenance" value={(inMaintenance + inPanne).toString()} icon={<Wrench size={20} />} gradient="gradient-warning" />
        <KpiCard title="Disponibilité" value={`${availability}%`} icon={<Activity size={20} />} gradient="gradient-primary" />
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedItems.map(machine => {
          const sc = statusConfig[machine.status]
          const interventions = getMachineIntervention(machine.id)
          return (
            <div key={machine.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${sc.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
                    <Settings size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{machine.name}</p>
                    <p className="text-xs text-gray-500">{machine.type} • {machine.brand}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {sc.icon}
                </div>
              </div>

              <div className="mb-3">
                <StatusBadge label={sc.label} type={sc.type} />
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Clock size={11} /> Dernière maintenance</span>
                  <span className="font-medium text-gray-700">{machine.lastMaintenance ? formatDate(machine.lastMaintenance) : '—'}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Calendar size={11} /> Prochaine maintenance</span>
                  <span className="font-medium text-gray-700">{machine.nextMaintenance ? formatDate(machine.nextMaintenance) : '—'}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Zap size={11} /> Opérateur</span>
                  <span className="font-medium text-gray-700">{machine.operator || '—'}</span>
                </p>
              </div>

              {machine.notes && (
                <p className="text-[11px] text-gray-400 italic mb-3 truncate">{machine.notes}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">S/N: {machine.serial}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(machine)} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg"><Edit size={13} /></button>
                  <button onClick={() => setDeleteConfirm(machine.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Recent Interventions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Wrench size={16} className="text-teal-600" />
          <h2 className="text-base font-semibold text-gray-800">Interventions récentes</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {INITIAL_INTERVENTIONS.map(inter => {
            const machine = machines.find(m => m.id === inter.machineId)
            return (
              <div key={inter.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-teal-50/20 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Wrench size={14} className="text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-800">{machine?.name || '—'}</p>
                    <span className="text-[10px] text-gray-400">{formatDate(inter.date)}</span>
                  </div>
                  <p className="text-xs text-gray-500">{inter.type} • {inter.technicien}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{inter.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700">{inter.cost.toLocaleString('fr-CD')} FC</p>
                  <p className="text-[10px] text-gray-400">{inter.duration}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingMachine ? 'Modifier la machine' : 'Ajouter une machine'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom de la machine *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20" placeholder="Ex: HP LaserJet Pro M428" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Type</label>
                  <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" placeholder="Ex: Imprimante laser" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Marque</label>
                  <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" placeholder="Ex: HP, Epson..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">N° Série</label>
                  <input value={form.serial} onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none">
                    <option value="service">En service</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="panne">En panne</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Dernière maintenance</label>
                  <input type="date" value={form.lastMaintenance} onChange={e => setForm(f => ({ ...f, lastMaintenance: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Prochaine maintenance</label>
                  <input type="date" value={form.nextMaintenance} onChange={e => setForm(f => ({ ...f, nextMaintenance: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Opérateur</label>
                <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" placeholder="Prénom Nom" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Annuler</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 text-sm text-white rounded-xl gradient-teal hover:opacity-90">
                <Save size={14} /> {editingMachine ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">Supprimer cette machine ?</p>
                <p className="text-xs text-gray-500">Cette action est irréversible</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 text-sm text-white gradient-danger rounded-xl hover:opacity-90">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
