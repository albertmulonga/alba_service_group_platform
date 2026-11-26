import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatCurrency } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import { Percent, Plus, TrendingUp, TrendingDown, DollarSign, FileText, X, Pencil, Trash2, Calculator } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

type TaxEntry = {
  id: string
  period: string
  montantHT: number
  tvaCollectee: number
  tvaDeductible: number
  tvaNette: number
}

type IPREntry = {
  id: string
  period: string
  masseSalariale: number
  taux: number
  montantIPR: number
}

const defaultTaxEntries: TaxEntry[] = [
  { id:'1', period:'Janvier 2026', montantHT:1850000, tvaCollectee:296000, tvaDeductible:85000, tvaNette:211000 },
  { id:'2', period:'Février 2026', montantHT:2100000, tvaCollectee:336000, tvaDeductible:92000, tvaNette:244000 },
  { id:'3', period:'Mars 2026', montantHT:2450000, tvaCollectee:392000, tvaDeductible:105000, tvaNette:287000 },
  { id:'4', period:'Avril 2026', montantHT:1980000, tvaCollectee:316800, tvaDeductible:88000, tvaNette:228800 },
  { id:'5', period:'Mai 2026', montantHT:2650000, tvaCollectee:424000, tvaDeductible:115000, tvaNette:309000 },
  { id:'6', period:'Juin 2026', montantHT:2800000, tvaCollectee:448000, tvaDeductible:120000, tvaNette:328000 },
  { id:'7', period:'Juillet 2026', montantHT:3100000, tvaCollectee:496000, tvaDeductible:130000, tvaNette:366000 },
]

const defaultIPREntries: IPREntry[] = [
  { id:'1', period:'Janvier 2026', masseSalariale:1200000, taux:5, montantIPR:60000 },
  { id:'2', period:'Février 2026', masseSalariale:1200000, taux:5, montantIPR:60000 },
  { id:'3', period:'Mars 2026', masseSalariale:1350000, taux:5, montantIPR:67500 },
  { id:'4', period:'Avril 2026', masseSalariale:1350000, taux:5, montantIPR:67500 },
  { id:'5', period:'Mai 2026', masseSalariale:1400000, taux:5, montantIPR:70000 },
  { id:'6', period:'Juin 2026', masseSalariale:1400000, taux:5, montantIPR:70000 },
  { id:'7', period:'Juillet 2026', masseSalariale:1500000, taux:5, montantIPR:75000 },
]

const emptyTaxForm: Omit<TaxEntry,'id'> = { period:'', montantHT:0, tvaCollectee:0, tvaDeductible:0, tvaNette:0 }
const emptyIPRForm: Omit<IPREntry,'id'> = { period:'', masseSalariale:0, taux:5, montantIPR:0 }

export default function TaxPage() {
  const { items: taxEntries, add: addTax, update: updateTax, remove: removeTax } = useMockDB<TaxEntry>('alba-tax-entries', defaultTaxEntries)
  const { items: iprEntries, add: addIPR, update: updateIPR, remove: removeIPR } = useMockDB<IPREntry>('alba-ipr-entries', defaultIPREntries)

  const [tab, setTab] = useState<'tva'|'ipr'>('tva')
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [showIPRModal, setShowIPRModal] = useState(false)
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null)
  const [editingIPRId, setEditingIPRId] = useState<string | null>(null)
  const [taxForm, setTaxForm] = useState<Omit<TaxEntry,'id'>>(emptyTaxForm)
  const [iprForm, setIPRForm] = useState<Omit<IPREntry,'id'>>(emptyIPRForm)

  const openNewTax = () => { setEditingTaxId(null); setTaxForm(emptyTaxForm); setShowTaxModal(true) }
  const openEditTax = (e: TaxEntry) => { setEditingTaxId(e.id); setTaxForm({period:e.period,montantHT:e.montantHT,tvaCollectee:e.tvaCollectee,tvaDeductible:e.tvaDeductible,tvaNette:e.tvaNette}); setShowTaxModal(true) }
  const closeTaxModal = () => { setShowTaxModal(false); setEditingTaxId(null) }

  const openNewIPR = () => { setEditingIPRId(null); setIPRForm(emptyIPRForm); setShowIPRModal(true) }
  const openEditIPR = (e: IPREntry) => { setEditingIPRId(e.id); setIPRForm({period:e.period,masseSalariale:e.masseSalariale,taux:e.taux,montantIPR:e.montantIPR}); setShowIPRModal(true) }
  const closeIPRModal = () => { setShowIPRModal(false); setEditingIPRId(null) }

  const setTaxField = <K extends keyof Omit<TaxEntry,'id'>>(key: K, value: Omit<TaxEntry,'id'>[K]) => setTaxForm(prev => ({...prev,[key]:value}))
  const setIPRField = <K extends keyof Omit<IPREntry,'id'>>(key: K, value: Omit<IPREntry,'id'>[K]) => setIPRForm(prev => ({...prev,[key]:value}))

  const handleSaveTax = () => {
    if (!taxForm.period || taxForm.montantHT <= 0) return
    const computed = { ...taxForm, tvaCollectee: Math.round(taxForm.montantHT * 0.16), tvaNette: Math.round(taxForm.montantHT * 0.16) - taxForm.tvaDeductible }
    if (editingTaxId) { updateTax(editingTaxId, computed) } else { addTax(computed) }
    closeTaxModal()
  }

  const handleSaveIPR = () => {
    if (!iprForm.period || iprForm.masseSalariale <= 0) return
    const computed = { ...iprForm, montantIPR: Math.round(iprForm.masseSalariale * iprForm.taux / 100) }
    if (editingIPRId) { updateIPR(editingIPRId, computed) } else { addIPR(computed) }
    closeIPRModal()
  }

  const handleDeleteTax = (id: string) => {
    if (window.confirm('Supprimer cette période TVA ?')) removeTax(id)
  }

  const handleDeleteIPR = (id: string) => {
    if (window.confirm('Supprimer cette période IPR ?')) removeIPR(id)
  }

  const totals = useMemo(() => {
    const totalHT = taxEntries.reduce((s,e) => s+e.montantHT, 0)
    const totalTVACollectee = taxEntries.reduce((s,e) => s+e.tvaCollectee, 0)
    const totalTVADeductible = taxEntries.reduce((s,e) => s+e.tvaDeductible, 0)
    const totalTVANette = taxEntries.reduce((s,e) => s+e.tvaNette, 0)
    const totalIPR = iprEntries.reduce((s,e) => s+e.montantIPR, 0)
    const totalImpots = totalTVANette + totalIPR
    return { totalHT, totalTVACollectee, totalTVADeductible, totalTVANette, totalIPR, totalImpots }
  }, [taxEntries, iprEntries])

  const tvaChartData = taxEntries.map(e => ({
    name: e.period.replace(' 2026', '').substring(0,3),
    collectee: e.tvaCollectee,
    deductible: e.tvaDeductible,
    nette: e.tvaNette,
  }))

  const pieData = [
    { name:'TVA Nette', value: totals.totalTVANette, color:'#2563EB' },
    { name:'IPR', value: totals.totalIPR, color:'#F59E0B' },
  ]

  const exportTVAData = taxEntries.map(e => ({
    'Période': e.period,
    'Montant HT': e.montantHT,
    'TVA Collectée (16%)': e.tvaCollectee,
    'TVA Déductible': e.tvaDeductible,
    'TVA Nette': e.tvaNette,
  }))

  const exportIPRData = iprEntries.map(e => ({
    'Période': e.period,
    'Masse Salariale': e.masseSalariale,
    'Taux (%)': e.taux,
    'Montant IPR': e.montantIPR,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Impôts & Taxes"
        subtitle="TVA, IPR – Suivi fiscal mensuel"
        breadcrumbs={[{label:'Accueil'},{label:'Finance'},{label:'Impôts/TVA'}]}
        icon={<Percent size={22}/>}
        iconBg="gradient-primary"
        actions={
          <div className="flex gap-2">
            {tab === 'tva' ? (
              <ExportButton data={exportTVAData} filename="tva-alba" title="Suivi TVA – ALBA SERVICE GROUP" headers={['Période','Montant HT','TVA Collectée (16%)','TVA Déductible','TVA Nette']}/>
            ) : (
              <ExportButton data={exportIPRData} filename="ipr-alba" title="Suivi IPR – ALBA SERVICE GROUP" headers={['Période','Masse Salariale','Taux (%)','Montant IPR']}/>
            )}
            <button onClick={tab === 'tva' ? openNewTax : openNewIPR}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
              <Plus size={15}/> Nouvelle période
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="TVA totale à payer" value={formatCurrency(totals.totalTVANette)} icon={<Percent size={20}/>} gradient="gradient-primary" change={7}/>
        <KpiCard title="IPR total" value={formatCurrency(totals.totalIPR)} icon={<Calculator size={20}/>} gradient="gradient-warning" change={3}/>
        <KpiCard title="Total impôts" value={formatCurrency(totals.totalImpots)} icon={<DollarSign size={20}/>} gradient="gradient-purple" change={5}/>
        <KpiCard title="CA soumis à TVA" value={`${(totals.totalHT/1000000).toFixed(1)}M FC`} icon={<TrendingUp size={20}/>} gradient="gradient-success" change={11}/>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {([['tva','TVA – Taxe sur Valeur Ajoutée'],['ipr','IPR – Impôt Professionnel sur les Rémunérations']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab===id?'border-blue-500 text-blue-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'tva' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution TVA Mensuelle</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tvaChartData} margin={{top:5,right:10,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:'#6B7280'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v:any) => formatCurrency(v)}/>
                  <Bar dataKey="collectee" name="TVA Collectée" fill="#2563EB" radius={[4,4,0,0]} barSize={16}/>
                  <Bar dataKey="deductible" name="TVA Déductible" fill="#F59E0B" radius={[4,4,0,0]} barSize={16}/>
                  <Bar dataKey="nette" name="TVA Nette" fill="#10B981" radius={[4,4,0,0]} barSize={16}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Répartition TVA</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color}/>
                    ))}
                  </Pie>
                  <Tooltip formatter={(v:any) => formatCurrency(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d,i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{background:d.color}}/>
                      <span className="text-xs text-gray-600">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Période','Montant HT','TVA Collectée (16%)','TVA Déductible','TVA Nette à payer','Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {taxEntries.map(e => (
                    <tr key={e.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{e.period}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(e.montantHT)}</td>
                      <td className="px-4 py-3 text-xs text-blue-700 font-semibold">{formatCurrency(e.tvaCollectee)}</td>
                      <td className="px-4 py-3 text-xs text-amber-700 font-semibold">{formatCurrency(e.tvaDeductible)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-green-700">{formatCurrency(e.tvaNette)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditTax(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => handleDeleteTax(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">TOTAUX</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{formatCurrency(totals.totalHT)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-700">{formatCurrency(totals.totalTVACollectee)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-amber-700">{formatCurrency(totals.totalTVADeductible)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-green-700">{formatCurrency(totals.totalTVANette)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'ipr' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Période','Masse Salariale','Taux','Montant IPR','Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {iprEntries.map(e => (
                    <tr key={e.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{e.period}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{formatCurrency(e.masseSalariale)}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{e.taux}%</span></td>
                      <td className="px-4 py-3 text-xs font-bold text-amber-700">{formatCurrency(e.montantIPR)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditIPR(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => handleDeleteIPR(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">TOTAUX</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-700">{formatCurrency(iprEntries.reduce((s,e) => s+e.masseSalariale, 0))}</td>
                    <td></td>
                    <td className="px-4 py-3 text-xs font-bold text-amber-700">{formatCurrency(totals.totalIPR)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">IPR par période</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={iprEntries.map(e => ({name:e.period.replace(' 2026','').substring(0,3),montant:e.montantIPR}))} margin={{top:5,right:10,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:'#6B7280'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v:any) => formatCurrency(v)}/>
                  <Bar dataKey="montant" name="IPR" fill="#F59E0B" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm p-5">
              <h3 className="font-semibold text-amber-800 mb-3 text-sm">Informations IPR</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="text-xs text-gray-600">Taux IPR applicable</span>
                  <span className="text-sm font-bold text-amber-700">5%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="text-xs text-gray-600">Base d'imposition</span>
                  <span className="text-sm font-bold text-amber-700">Masse salariale brute</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="text-xs text-gray-600">Périodicité</span>
                  <span className="text-sm font-bold text-amber-700">Mensuelle</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="text-xs text-gray-600">Échéance</span>
                  <span className="text-sm font-bold text-amber-700">15 du mois suivant</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                  <span className="text-xs text-gray-600">Total IPR (7 mois)</span>
                  <span className="text-sm font-bold text-amber-800">{formatCurrency(totals.totalIPR)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Percent size={18} className="text-blue-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">TVA totale à payer</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totals.totalTVANette)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{width:`${Math.min(100, (totals.totalTVANette / (totals.totalTVANette + totals.totalIPR)) * 100)}%`}}/>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{Math.round((totals.totalTVANette / (totals.totalTVANette + totals.totalIPR)) * 100)}% du total impôts</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calculator size={18} className="text-amber-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">IPR total</p>
              <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.totalIPR)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{width:`${Math.min(100, (totals.totalIPR / (totals.totalTVANette + totals.totalIPR)) * 100)}%`}}/>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{Math.round((totals.totalIPR / (totals.totalTVANette + totals.totalIPR)) * 100)}% du total impôts</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <DollarSign size={18} className="text-purple-600"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total impôts</p>
              <p className="text-lg font-bold text-purple-700">{formatCurrency(totals.totalImpots)}</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{width:'100%'}}/>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">TVA + IPR combinés</p>
        </div>
      </div>

      {/* Tax Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeTaxModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingTaxId ? 'Modifier la période TVA' : 'Nouvelle période TVA'}</h3>
              <button onClick={closeTaxModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Période *</label>
                <input placeholder="Ex: Août 2026" value={taxForm.period} onChange={e => setTaxField('period', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Montant HT (FC) *</label>
                <input type="number" placeholder="0" value={taxForm.montantHT || ''} onChange={e => setTaxField('montantHT', Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">TVA Collectée (16%) : <span className="font-bold text-blue-700">{formatCurrency(Math.round(taxForm.montantHT * 0.16))}</span></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">TVA Déductible (FC)</label>
                <input type="number" placeholder="0" value={taxForm.tvaDeductible || ''} onChange={e => setTaxField('tvaDeductible', Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">TVA Nette à payer : <span className="font-bold text-green-700">{formatCurrency(Math.round(taxForm.montantHT * 0.16) - taxForm.tvaDeductible)}</span></p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeTaxModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSaveTax} className="px-5 py-2 text-sm font-medium text-white rounded-xl" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                  {editingTaxId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IPR Modal */}
      {showIPRModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeIPRModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingIPRId ? 'Modifier la période IPR' : 'Nouvelle période IPR'}</h3>
              <button onClick={closeIPRModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Période *</label>
                <input placeholder="Ex: Août 2026" value={iprForm.period} onChange={e => setIPRField('period', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Masse Salariale brute (FC) *</label>
                <input type="number" placeholder="0" value={iprForm.masseSalariale || ''} onChange={e => setIPRField('masseSalariale', Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Taux (%)</label>
                <input type="number" placeholder="5" value={iprForm.taux || ''} onChange={e => setIPRField('taux', Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Montant IPR : <span className="font-bold text-amber-700">{formatCurrency(Math.round(iprForm.masseSalariale * iprForm.taux / 100))}</span></p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeIPRModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSaveIPR} className="px-5 py-2 text-sm font-medium text-white rounded-xl" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                  {editingIPRId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
