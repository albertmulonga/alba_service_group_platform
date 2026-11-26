import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import { BarChart3, Plus, Search, TrendingUp, TrendingDown, DollarSign, FileText, X, Pencil, Trash2 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const monthlyData = [
  {month:'Fév',revenue:1850000,expense:1120000},{month:'Mar',revenue:2200000,expense:1350000},
  {month:'Avr',revenue:1950000,expense:1480000},{month:'Mai',revenue:2500000,expense:1280000},
  {month:'Juin',revenue:2800000,expense:1650000},{month:'Juil',revenue:3100000,expense:1420000},
]

type EntryType = {id:string;date:string;journal:string;account:string;label:string;debit:number;credit:number;ref:string}

const defaultEntries: EntryType[] = [
  {id:'1',date:'2026-07-27',journal:'Ventes',    account:'411000',label:'Facture F-2026-0156 – Entreprise ABC',debit:0,      credit:150000,ref:'F-2026-0156'},
  {id:'2',date:'2026-07-27',journal:'Caisse',    account:'571000',label:'Encaissement facture F-2026-0156',   debit:150000, credit:0,     ref:'F-2026-0156'},
  {id:'3',date:'2026-07-26',journal:'Achats',    account:'601000',label:'Achat papier A4 – ABC Fournitures',  debit:45000,  credit:0,     ref:'BC-2026-003'},
  {id:'4',date:'2026-07-26',journal:'Fournisseur',account:'401000',label:'Dette fournisseur ABC Fournitures', debit:0,      credit:45000, ref:'BC-2026-003'},
  {id:'5',date:'2026-07-25',journal:'Ventes',    account:'411000',label:'Acompte projet IT-0015',             debit:0,      credit:350000,ref:'IT-0015'},
  {id:'6',date:'2026-07-25',journal:'Caisse',    account:'571000',label:'Encaissement acompte IT-0015',       debit:350000, credit:0,     ref:'IT-0015'},
  {id:'7',date:'2026-07-24',journal:'Charges',   account:'614000',label:'Facture Internet mensuelle',         debit:25000,  credit:0,     ref:'INT-0726'},
  {id:'8',date:'2026-07-24',journal:'Caisse',    account:'571000',label:'Règlement Internet mensuel',         debit:0,      credit:25000, ref:'INT-0726'},
]

const journals = ['Ventes','Achats','Caisse','Banque','Fournisseur','Charges','Salaires','Divers']

const revenueByService = [
  {name:'Imprimerie',value:3200000},{name:'Informatique',value:2100000},
  {name:'Formation',value:800000},{name:'Graphisme',value:500000},{name:'Secrétariat',value:400000},
]

const emptyForm: Omit<EntryType,'id'> = {date:'',journal:journals[0],account:'',label:'',debit:0,credit:0,ref:''}

export default function AccountingPage() {
  const { items, add, update, remove } = useMockDB<EntryType>('alba-accounting-entries', defaultEntries)

  const [tab, setTab] = useState<'journal'|'balance'|'chart'>('journal')
  const [search, setSearch] = useState('')
  const [journalFilter, setJournalFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<EntryType,'id'>>(emptyForm)

  const openNew = () => { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (e: EntryType) => { setEditingId(e.id); setForm({date:e.date,journal:e.journal,account:e.account,label:e.label,debit:e.debit,credit:e.credit,ref:e.ref}); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditingId(null) }

  const setField = <K extends keyof Omit<EntryType,'id'>>(key: K, value: Omit<EntryType,'id'>[K]) => setForm(prev => ({...prev,[key]:value}))

  const handleSave = () => {
    if (!form.date || !form.journal || !form.account || !form.label) return
    if (editingId) { update(editingId, form) } else { add(form) }
    closeModal()
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer cette écriture comptable ?')) remove(id)
  }

  const filtered = items.filter(e => {
    const ms = `${e.label} ${e.account} ${e.ref} ${e.journal}`.toLowerCase().includes(search.toLowerCase())
    const mf = journalFilter === 'all' || e.journal === journalFilter
    return ms && mf
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const totalRevenue = monthlyData.reduce((s,m) => s+m.revenue, 0)
  const totalExpense = monthlyData.reduce((s,m) => s+m.expense, 0)
  const netResult = totalRevenue - totalExpense
  const totalDebit  = items.reduce((s,e) => s+e.debit,  0)
  const totalCredit = items.reduce((s,e) => s+e.credit, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Comptabilité Générale"
        subtitle="Journal comptable, balance et état des comptes"
        breadcrumbs={[{label:'Accueil'},{label:'Finance'},{label:'Comptabilité'}]}
        icon={<BarChart3 size={22}/>}
        iconBg="gradient-primary"
        actions={
          <div className="flex gap-2">
            <ExportButton
              data={filtered}
              filename="comptabilite-alba"
              title="Plan Comptable"
              headers={['Date', 'Journal', 'Compte', 'Libellé', 'Débit', 'Crédit', 'Référence']}
            />
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
              <Plus size={15}/> Nouvelle écriture
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Revenus (6 mois)" value={`${(totalRevenue/1000000).toFixed(1)}M FC`} icon={<TrendingUp size={20}/>} gradient="gradient-success" change={14}/>
        <KpiCard title="Charges (6 mois)" value={`${(totalExpense/1000000).toFixed(1)}M FC`} icon={<TrendingDown size={20}/>} gradient="gradient-warning"/>
        <KpiCard title="Résultat net" value={`${(netResult/1000000).toFixed(1)}M FC`} icon={<DollarSign size={20}/>} gradient={netResult>=0?'gradient-teal':'gradient-danger'}/>
        <KpiCard title="Marge brute" value={`${Math.round((netResult/totalRevenue)*100)}%`} icon={<BarChart3 size={20}/>} gradient="gradient-purple"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['journal','Journal comptable'],['balance','Balance générale'],['chart','Analyses graphiques']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab===id?'border-blue-500 text-blue-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'journal' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={journalFilter} onChange={e => setJournalFilter(e.target.value)}
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none">
                <option value="all">Tous les journaux</option>
                {journals.map(j => <option key={j}>{j}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Libellé, compte, référence..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {['Date','Journal','Compte','Libellé','Débit','Crédit','Référence','Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedItems.map(e => (
                    <tr key={e.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{e.journal}</span></td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{e.account}</td>
                      <td className="px-4 py-3 text-xs text-gray-800 max-w-[200px] truncate">{e.label}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-blue-700">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-green-700">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{e.ref}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-700">TOTAUX</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-700">{formatCurrency(totalDebit)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-green-700">{formatCurrency(totalCredit)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </>
      )}

      {tab === 'balance' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Compte','Libellé','Type','Solde débit','Solde crédit','Solde net'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  {account:'411000',label:'Clients',type:'Actif',debit:785000,credit:500000},
                  {account:'401000',label:'Fournisseurs',type:'Passif',debit:0,credit:45000},
                  {account:'571000',label:'Caisse',type:'Actif',debit:785000,credit:270000},
                  {account:'701000',label:'Ventes de services',type:'Produit',debit:0,credit:3500000},
                  {account:'601000',label:'Achats consommables',type:'Charge',debit:680000,credit:0},
                  {account:'614000',label:'Charges externes',type:'Charge',debit:120000,credit:0},
                  {account:'641000',label:'Charges de personnel',type:'Charge',debit:620000,credit:0},
                ].map((row, i) => {
                  const net = row.debit - row.credit
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-600">{row.account}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{row.label}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.type==='Actif'?'bg-blue-50 text-blue-700':row.type==='Passif'?'bg-orange-50 text-orange-700':row.type==='Produit'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>{row.type}</span></td>
                      <td className="px-4 py-3 text-xs font-semibold text-blue-700">{row.debit>0?formatCurrency(row.debit):'—'}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-green-700">{row.credit>0?formatCurrency(row.credit):'—'}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{color:net>=0?'#16A34A':'#DC2626'}}>{formatCurrency(Math.abs(net))}{net>=0?' D':' C'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Revenus vs Charges (6 mois)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{top:5,right:5,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000000}M`}/>
                <Tooltip formatter={(v:any) => formatCurrency(v)}/>
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#2563EB" strokeWidth={2.5} fill="#DBEAFE" dot={false}/>
                <Area type="monotone" dataKey="expense" name="Charges" stroke="#EF4444" strokeWidth={2} fill="#FEE2E2" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Revenus par service</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByService} layout="vertical" margin={{top:5,right:20,left:20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis type="number" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000000}M`}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:11,fill:'#6B7280'}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip formatter={(v:any) => formatCurrency(v)}/>
                <Bar dataKey="value" name="Revenus" fill="#2563EB" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">{editingId ? 'Modifier l\'écriture' : 'Nouvelle écriture comptable'}</h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Journal *</label>
                  <select value={form.journal} onChange={e => setField('journal', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                    {journals.map(j=><option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.date} onChange={e => setField('date', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N° Compte *</label>
                  <input placeholder="Ex: 411000" value={form.account} onChange={e => setField('account', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Référence</label>
                  <input placeholder="Ex: F-2026-0156" value={form.ref} onChange={e => setField('ref', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Libellé *</label>
                <input placeholder="Description de l'écriture" value={form.label} onChange={e => setField('label', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Débit (FC)</label>
                  <input type="number" placeholder="0" value={form.debit || ''} onChange={e => setField('debit', Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Crédit (FC)</label>
                  <input type="number" placeholder="0" value={form.credit || ''} onChange={e => setField('credit', Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none"/>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Annuler</button>
                <button onClick={handleSave} className="px-5 py-2 text-sm font-medium text-white rounded-xl" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
