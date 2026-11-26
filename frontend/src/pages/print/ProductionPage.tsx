import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ExportButton from '@/components/ui/ExportButton'
import { formatDate } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Printer, Plus, Eye, Edit, CheckCircle, AlertTriangle,
  Clock, Zap, X, Save, ChevronRight, Activity
} from 'lucide-react'

interface ProductionJob {
  id: string
  ref: string
  client: string
  type: string
  machine: string
  operator: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  progress: number
  status: 'preparation' | 'impression' | 'finition' | 'controle' | 'livraison' | 'termine'
  startDate: string
  dueDate: string
  quantity: number
  notes: string
}

const STEPS = ['Préparation', 'Impression', 'Finition', 'Contrôle', 'Livraison']
const STATUS_KEYS = ['preparation', 'impression', 'finition', 'controle', 'livraison', 'termine']

const INITIAL_JOBS: ProductionJob[] = [
  { id: '1', ref: 'PROD-001', client: 'Mairie de Kindu', type: 'Flyers A5', machine: 'HP LaserJet Pro', operator: 'Jean Mukadi', priority: 'urgent', progress: 75, status: 'finition', startDate: '2026-07-23', dueDate: '2026-07-25', quantity: 1000, notes: 'Couleur recto-verso' },
  { id: '2', ref: 'PROD-002', client: 'Université de Kindu', type: 'Mémoires reliés', machine: 'Relieuse spirale', operator: 'Alice Mwamba', priority: 'high', progress: 40, status: 'impression', startDate: '2026-07-22', dueDate: '2026-07-26', quantity: 15, notes: '15 exemplaires' },
  { id: '3', ref: 'PROD-003', client: 'Hôpital Général', type: 'Cartes de visite', machine: 'Epson Couleur', operator: 'Paul Kasongo', priority: 'normal', progress: 90, status: 'controle', startDate: '2026-07-23', dueDate: '2026-07-24', quantity: 500, notes: 'Plastification recto' },
  { id: '4', ref: 'PROD-004', client: 'ONG Espoir Congo', type: 'Affiches A3', machine: 'HP LaserJet Pro', operator: 'Jean Mukadi', priority: 'normal', progress: 20, status: 'preparation', startDate: '2026-07-24', dueDate: '2026-07-28', quantity: 200, notes: '' },
  { id: '5', ref: 'PROD-005', client: 'Entreprise ABC', type: 'Rapport annuel', machine: 'Epson Couleur', operator: 'Alice Mwamba', priority: 'high', progress: 60, status: 'finition', startDate: '2026-07-21', dueDate: '2026-07-23', quantity: 10, notes: 'Reliure thermique' },
  { id: '6', ref: 'PROD-006', client: 'École BERUNDA', type: 'Bulletins scolaires', machine: 'HP LaserJet Pro', operator: 'Paul Kasongo', priority: 'urgent', progress: 100, status: 'termine', startDate: '2026-07-20', dueDate: '2026-07-22', quantity: 800, notes: 'Terminé à temps' },
  { id: '7', ref: 'PROD-007', client: 'Cabinet Dr. Pierre', type: 'Ordonnances imprimées', machine: 'HP LaserJet Pro', operator: 'Jean Mukadi', priority: 'low', progress: 0, status: 'preparation', startDate: '2026-07-25', dueDate: '2026-07-30', quantity: 2000, notes: '' },
  { id: '8', ref: 'PROD-008', client: 'Gouvernorat Maniema', type: 'Formulaires officiels', machine: 'Epson Couleur', operator: 'Alice Mwamba', priority: 'urgent', progress: 55, status: 'impression', startDate: '2026-07-22', dueDate: '2026-07-24', quantity: 500, notes: 'En retard' },
]

const priorityConfig: Record<string, { label: string; color: string; type: any }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50', type: 'danger' },
  high: { label: 'Élevé', color: 'text-orange-600 bg-orange-50', type: 'warning' },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-50', type: 'info' },
  low: { label: 'Bas', color: 'text-gray-500 bg-gray-100', type: 'secondary' },
}

const statusConfig: Record<string, { label: string; type: any; step: number }> = {
  preparation: { label: 'Préparation', type: 'secondary', step: 0 },
  impression: { label: 'Impression', type: 'primary', step: 1 },
  finition: { label: 'Finition', type: 'warning', step: 2 },
  controle: { label: 'Contrôle', type: 'info', step: 3 },
  livraison: { label: 'Livraison', type: 'purple', step: 4 },
  termine: { label: 'Terminé', type: 'success', step: 5 },
}

interface Toast { message: string; type: 'success' | 'error' }

export default function ProductionPage() {
  const { items: jobs, add, update, remove } = useMockDB<ProductionJob>('alba-production', INITIAL_JOBS)
  const {
    currentPage, setCurrentPage, pageSize, setPageSize,
    totalPages, paginatedItems, totalItems
  } = usePagination(jobs)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<ProductionJob | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<ProductionJob, 'id'>>({
    ref: '', client: '', type: '', machine: 'HP LaserJet Pro', operator: '', priority: 'normal',
    progress: 0, status: 'preparation', startDate: '', dueDate: '', quantity: 1, notes: ''
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const openCreate = () => {
    setEditingJob(null)
    const nextRef = `PROD-${String(jobs.length + 1).padStart(3, '0')}`
    setForm({ ref: nextRef, client: '', type: '', machine: 'HP LaserJet Pro', operator: '', priority: 'normal', progress: 0, status: 'preparation', startDate: new Date().toISOString().split('T')[0], dueDate: '', quantity: 1, notes: '' })
    setModalOpen(true)
  }

  const openEdit = (job: ProductionJob) => {
    setEditingJob(job)
    const { id, ...rest } = job
    setForm(rest)
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!form.client.trim() || !form.type.trim()) {
      showToast('Client et type de travail requis', 'error')
      return
    }
    if (editingJob) {
      update(editingJob.id, form)
      showToast(`Travail ${form.ref} modifié`)
    } else {
      add({ id: Date.now().toString(), ...form })
      showToast(`Travail ${form.ref} créé`)
    }
    setModalOpen(false)
  }

  const advanceStatus = (id: string) => {
    const job = jobs.find(j => j.id === id)
    if (!job) return
    const idx = STATUS_KEYS.indexOf(job.status)
    if (idx >= STATUS_KEYS.length - 1) return
    const newStatus = STATUS_KEYS[idx + 1] as ProductionJob['status']
    const newProgress = Math.min(100, (idx + 2) * 20)
    update(id, { status: newStatus, progress: newStatus === 'termine' ? 100 : newProgress })
    showToast('Statut mis à jour')
  }

  const inProduction = jobs.filter(j => j.status !== 'termine').length
  const doneToday = jobs.filter(j => j.status === 'termine').length
  const late = jobs.filter(j => j.status !== 'termine' && new Date(j.dueDate) < new Date()).length
  const occupancy = Math.round((inProduction / 3) * 100)

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in ${toast.type === 'success' ? 'gradient-success' : 'gradient-danger'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {toast.message}
        </div>
      )}

      <PageHeader
        title="Planning de Production"
        subtitle="Suivi des travaux en cours – Imprimerie ALBA"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Imprimerie' }, { label: 'Production' }]}
        icon={<Printer size={22} />}
        iconBg="gradient-warning"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm" style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
            <Plus size={15} /> Nouveau travail
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="En production" value={inProduction.toString()} icon={<Activity size={20} />} gradient="gradient-warning" change={5} />
        <KpiCard title="Terminés aujourd'hui" value={doneToday.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="En retard" value={late.toString()} icon={<AlertTriangle size={20} />} gradient="gradient-danger" />
        <KpiCard title="Taux occupation" value={`${occupancy}%`} icon={<Zap size={20} />} gradient="gradient-primary" />
      </div>

      {/* Workflow Steps Legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">ÉTAPES DE PRODUCTION</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{step}</span>
              {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
            </React.Fragment>
          ))}
          <ChevronRight size={14} className="text-gray-300" />
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Terminé</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Travaux en cours</h2>
          <ExportButton
            data={jobs}
            filename="production-alba"
            title="Suivi de Production"
            headers={{ ref: 'Référence', client: 'Client', type: 'Type travail', machine: 'Machine', operator: 'Opérateur', priority: 'Priorité', progress: 'Avancement (%)', status: 'Statut', startDate: 'Date début', dueDate: 'Date livraison', quantity: 'Quantité', notes: 'Notes' }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Réf.', 'Client', 'Type travail', 'Machine', 'Opérateur', 'Priorité', 'Avancement', 'Statut', 'Livraison', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(job => {
                const sc = statusConfig[job.status]
                const pc = priorityConfig[job.priority]
                const isLate = job.status !== 'termine' && new Date(job.dueDate) < new Date()
                return (
                  <tr key={job.id} className={`hover:bg-amber-50/20 transition-colors group ${isLate ? 'bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-bold text-amber-700">{job.ref}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-gray-800 max-w-28 truncate">{job.client}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{job.type}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{job.machine}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700">{job.operator}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pc.color}`}>{pc.label}</span>
                    </td>
                    <td className="px-4 py-3.5 min-w-28">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${job.progress === 100 ? 'bg-green-500' : job.progress >= 60 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-600 w-8 text-right">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge label={sc.label} type={sc.type} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs ${isLate ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {isLate ? '⚠ ' : ''}{job.dueDate ? formatDate(job.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.status !== 'termine' && (
                          <button onClick={() => advanceStatus(job.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Avancer étape">
                            <ChevronRight size={13} />
                          </button>
                        )}
                        <button onClick={() => openEdit(job)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={13} /></button>
                        <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Eye size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{jobs.length} travaux • {inProduction} en cours • {doneToday} terminés</p>
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

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingJob ? 'Modifier le travail' : 'Nouveau travail de production'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Référence</label>
                  <input value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none">
                    <option value="urgent">Urgent</option>
                    <option value="high">Élevé</option>
                    <option value="normal">Normal</option>
                    <option value="low">Bas</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Client *</label>
                <input value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Nom du client" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Type de travail *</label>
                <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20" placeholder="Ex: Flyers A5, Mémoires reliés..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Machine</label>
                  <select value={form.machine} onChange={e => setForm(f => ({ ...f, machine: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none">
                    {['HP LaserJet Pro', 'Epson Couleur', 'Relieuse spirale', 'Machine plastification', 'Massicot', 'Scanner'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Opérateur</label>
                  <input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" placeholder="Prénom Nom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Quantité</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none">
                    {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Date début</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Date livraison</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Avancement ({form.progress}%)</label>
                <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) }))}
                  className="w-full accent-amber-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Annuler</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 text-sm text-white rounded-xl hover:opacity-90" style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}>
                <Save size={14} /> {editingJob ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
