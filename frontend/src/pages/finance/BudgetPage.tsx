import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { formatCurrency } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import { Wallet, TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3, Plus, X, Trash2, Edit, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type BudgetLine = {
  id: string; category: string; allocated: number; spent: number; dept: string
}

const MOCK_BUDGET_LINES: BudgetLine[] = [
  {id:'1',category:'Ressources Humaines',allocated:3200000,spent:2800000,dept:'RH'},
  {id:'2',category:'Imprimerie & Production',allocated:2500000,spent:2100000,dept:'Imprimerie'},
  {id:'3',category:'Projets Informatiques',allocated:1800000,spent:1950000,dept:'Informatique'},
  {id:'4',category:'Marketing & Commercial',allocated:1500000,spent:1350000,dept:'Commercial'},
  {id:'5',category:'Maintenance',allocated:1000000,spent:1150000,dept:'Technique'},
  {id:'6',category:'Formations',allocated:800000,spent:620000,dept:'Formation'},
  {id:'7',category:'Fournitures Bureau',allocated:600000,spent:480000,dept:'Admin'},
  {id:'8',category:'Charges & Services',allocated:500000,spent:510000,dept:'Finance'},
]

const emptyForm = { category: '', dept: '', allocated: 0, spent: 0 }

export default function BudgetPage() {
  const { items: budgetLines, add, update, remove } = useMockDB<BudgetLine>('alba-budget', MOCK_BUDGET_LINES)

  const budgetPagination = usePagination(budgetLines)

  const [period, setPeriod] = useState('2026')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (b: BudgetLine) => { setEditingId(b.id); setForm({ category: b.category, dept: b.dept, allocated: b.allocated, spent: b.spent }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingId(null) }

  const handleSave = () => {
    if (!form.category.trim() || !form.dept.trim() || form.allocated <= 0) return
    if (editingId) {
      update(editingId, form)
      showToast(`"${form.category}" modifié`)
    } else {
      add(form)
      showToast(`"${form.category}" ajouté`)
    }
    closeModal()
  }

  const handleDelete = (id: string) => {
    const line = budgetLines.find(b => b.id === id)
    if (!window.confirm(`Supprimer la ligne "${line?.category}" ?`)) return
    remove(id)
    showToast(`"${line?.category}" supprimé`)
  }

  const totalAllocated = budgetLines.reduce((s,b) => s+b.allocated, 0)
  const totalSpent = budgetLines.reduce((s,b) => s+b.spent, 0)
  const remaining = totalAllocated - totalSpent
  const overBudget = budgetLines.filter(b => b.spent > b.allocated).length

  const chartData = budgetLines.map(b => ({
    name: b.category.split(' ')[0],
    alloué: b.allocated,
    consommé: b.spent,
    isOver: b.spent > b.allocated,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 bg-green-600 text-white text-sm font-medium rounded-2xl shadow-xl animate-fade-in">
          <CheckCircle size={16}/> {toast}
        </div>
      )}

      <PageHeader
        title="Gestion Budgétaire"
        subtitle="Suivi du budget annuel par département et catégorie"
        breadcrumbs={[{label:'Accueil'},{label:'Finance'},{label:'Budget'}]}
        icon={<Target size={22}/>}
        iconBg="gradient-teal"
        actions={
          <div className="flex gap-2">
            <ExportButton
              data={budgetLines}
              filename="budget-alba"
              title="Plan Budgetaire"
              headers={{ category: 'Catégorie', dept: 'Département', allocated: 'Budget alloué', spent: 'Consommé' }}
            />
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none">
              <option value="2026">Exercice 2026</option>
              <option value="2025">Exercice 2025</option>
            </select>
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
              <Plus size={15}/> Nouvelle ligne
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Budget total" value={`${(totalAllocated/1000000).toFixed(1)}M FC`} icon={<Target size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Consommé" value={`${(totalSpent/1000000).toFixed(1)}M FC`} icon={<TrendingDown size={20}/>} gradient="gradient-warning"/>
        <KpiCard title="Restant" value={`${(remaining/1000000).toFixed(1)}M FC`} icon={<Wallet size={20}/>} gradient={remaining>=0?'gradient-success':'gradient-danger'}/>
        <KpiCard title="Dépassements" value={overBudget.toString()} icon={<AlertTriangle size={20}/>} gradient={overBudget>0?'gradient-danger':'gradient-success'}/>
      </div>

      {/* Global progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-800">Consommation globale du budget {period}</h3>
            <p className="text-xs text-gray-500">{Math.round((totalSpent/totalAllocated)*100)}% consommé</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800">{Math.round((totalSpent/totalAllocated)*100)}%</p>
            <p className="text-xs text-gray-500">{formatCurrency(totalSpent)} / {formatCurrency(totalAllocated)}</p>
          </div>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{width:`${Math.min((totalSpent/totalAllocated)*100,100)}%`,background:totalSpent>totalAllocated?'linear-gradient(90deg,#DC2626,#EF4444)':'linear-gradient(90deg,#0D9488,#2DD4BF)'}}/>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Budget alloué vs Consommé par catégorie</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{top:5,right:10,left:-10,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
            <XAxis dataKey="name" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000000}M`}/>
            <Tooltip formatter={(v:any) => formatCurrency(v)}/>
            <Bar dataKey="alloué" name="Alloué" fill="#DBEAFE" radius={[4,4,0,0]}/>
            <Bar dataKey="consommé" name="Consommé" radius={[4,4,0,0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.isOver ? '#EF4444' : '#2563EB'}/>
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Budget lines table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">Détail par ligne budgétaire</h3>
          {overBudget > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-xl font-medium">
              <AlertTriangle size={12}/>{overBudget} dépassement(s) de budget
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Catégorie','Département','Budget alloué','Consommé','Restant','Taux','Statut','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {budgetPagination.paginatedItems.map(b => {
                const pct = Math.round((b.spent/b.allocated)*100)
                const rem = b.allocated - b.spent
                const isOver = b.spent > b.allocated
                return (
                  <tr key={b.id} className={`hover:bg-gray-50/50 transition-colors ${isOver?'bg-red-50/20':''}`}>
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-800">{b.category}</td>
                    <td className="px-4 py-3.5"><span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{b.dept}</span></td>
                    <td className="px-4 py-3.5 text-xs font-medium text-gray-700">{formatCurrency(b.allocated)}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-800">{formatCurrency(b.spent)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${isOver?'text-red-600':rem/b.allocated<0.2?'text-orange-600':'text-green-600'}`}>
                        {isOver?'-':''}{formatCurrency(Math.abs(rem))}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{width:`${Math.min(pct,100)}%`,background:isOver?'#EF4444':pct>80?'#F59E0B':'#22C55E'}}/>
                        </div>
                        <span className={`text-[11px] font-bold w-9 text-right ${isOver?'text-red-600':pct>80?'text-orange-600':'text-green-600'}`}>{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {isOver
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ Dépassé</span>
                        : pct > 80
                        ? <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">⚡ Critique</span>
                        : <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Normal</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                          <Edit size={14}/>
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <Pagination
          currentPage={budgetPagination.currentPage}
          totalPages={budgetPagination.totalPages}
          totalItems={budgetPagination.totalItems}
          pageSize={budgetPagination.pageSize}
          onPageChange={budgetPagination.setCurrentPage}
          onPageSizeChange={budgetPagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingId ? 'Modifier ligne budgétaire' : 'Nouvelle ligne budgétaire'}</h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie / Intitulé</label>
                <input type="text" placeholder="Ex: Maintenance véhicules" value={form.category}
                  onChange={e => setForm(prev => ({...prev, category: e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Département</label>
                <input type="text" placeholder="Ex: Logistique" value={form.dept}
                  onChange={e => setForm(prev => ({...prev, dept: e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Budget alloué (FC)</label>
                <input type="number" placeholder="0" value={form.allocated || ''}
                  onChange={e => setForm(prev => ({...prev, allocated: Number(e.target.value)}))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Montant consommé (FC)</label>
                <input type="number" placeholder="0" value={form.spent || ''}
                  onChange={e => setForm(prev => ({...prev, spent: Number(e.target.value)}))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"/>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSave}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl"
                  style={{background:'linear-gradient(135deg,#0D9488,#2DD4BF)'}}>
                  {editingId ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
