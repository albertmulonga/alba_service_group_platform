import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatCurrency } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import { FileText, TrendingUp, TrendingDown, DollarSign, BarChart3, Scale } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type AccountingEntry = {
  id: string; date: string; journal: string; account: string;
  label: string; debit: number; credit: number; ref: string
}

const defaultEntries: AccountingEntry[] = [
  { id:'1',date:'2026-07-27',journal:'Ventes',account:'411000',label:'Facture F-2026-0156 – Entreprise ABC',debit:0,credit:150000,ref:'F-2026-0156' },
  { id:'2',date:'2026-07-27',journal:'Caisse',account:'571000',label:'Encaissement facture F-2026-0156',debit:150000,credit:0,ref:'F-2026-0156' },
  { id:'3',date:'2026-07-26',journal:'Achats',account:'601000',label:'Achat papier A4 – ABC Fournitures',debit:45000,credit:0,ref:'BC-2026-003' },
  { id:'4',date:'2026-07-26',journal:'Fournisseur',account:'401000',label:'Dette fournisseur ABC Fournitures',debit:0,credit:45000,ref:'BC-2026-003' },
  { id:'5',date:'2026-07-25',journal:'Ventes',account:'411000',label:'Acompte projet IT-0015',debit:0,credit:350000,ref:'IT-0015' },
  { id:'6',date:'2026-07-25',journal:'Caisse',account:'571000',label:'Encaissement acompte IT-0015',debit:350000,credit:0,ref:'IT-0015' },
  { id:'7',date:'2026-07-24',journal:'Charges',account:'614000',label:'Facture Internet mensuelle',debit:25000,credit:0,ref:'INT-0726' },
  { id:'8',date:'2026-07-24',journal:'Caisse',account:'571000',label:'Règlement Internet mensuel',debit:0,credit:25000,ref:'INT-0726' },
  { id:'9',date:'2026-07-23',journal:'Achats',account:'601000',label:'Achat encre impression',debit:85000,credit:0,ref:'BC-2026-004' },
  { id:'10',date:'2026-07-23',journal:'Fournisseur',account:'401000',label:'Dette fournisseur encre',debit:0,credit:85000,ref:'BC-2026-004' },
  { id:'11',date:'2026-07-22',journal:'Salaires',account:'641000',label:'Salaires juillet – Personnel',debit:620000,credit:0,ref:'PAIE-07' },
  { id:'12',date:'2026-07-22',journal:'Caisse',account:'571000',label:'Paiement salaires juillet',debit:0,credit:620000,ref:'PAIE-07' },
  { id:'13',date:'2026-07-21',journal:'Ventes',account:'701000',label:'Facture formation Excel – Groupe K.',debit:0,credit:200000,ref:'ENR-004' },
  { id:'14',date:'2026-07-21',journal:'Caisse',account:'571000',label:'Encaissement formation Excel',debit:200000,credit:0,ref:'ENR-004' },
  { id:'15',date:'2026-07-20',journal:'Ventes',account:'701000',label:'Facture design logo – Entreprise L.',debit:0,credit:120000,ref:'GRA-009' },
]

interface BilanLine {
  code: string; libelle: string; montant: number
}

interface BilanSection {
  title: string; lines: BilanLine[]; total: number
}

interface CPCSection {
  title: string; lines: { libelle: string; montant: number }[]; total: number
}

export default function FinancialStatementsPage() {
  const { items } = useMockDB<AccountingEntry>('alba-accounting-entries', defaultEntries)
  const [tab, setTab] = useState<'bilan'|'cpc'|'bilan-commercial'>('bilan')

  const actifData = useMemo(() => {
    const immobilisations: BilanLine[] = [
      { code:'211000', libelle:'Terrains', montant:1500000 },
      { code:'213000', libelle:'Bâtiments et constructions', montant:3200000 },
      { code:'215000', libelle:'Matériel et outillage', montant:850000 },
      { code:'218000', libelle:'Matériel de transport', montant:620000 },
      { code:'231000', libelle:'Logiciels et brevets', montant:340000 },
    ]
    const immobilisationsTotal = immobilisations.reduce((s,l) => s+l.montant, 0)

    const caisseBalance = items.filter(e => e.account === '571000').reduce((s,e) => s+e.debit-e.credit, 0)
    const clientsBalance = items.filter(e => e.account === '411000').reduce((s,e) => s+e.credit-e.debit, 0)

    const actifCirculant: BilanLine[] = [
      { code:'311000', libelle:'Stocks de marchandises', montant:180000 },
      { code:'312000', libelle:'Matières premières', montant:95000 },
      { code:'411000', libelle:'Créances clients', montant:clientsBalance > 0 ? clientsBalance : 785000 },
      { code:'571000', libelle:'Caisse', montant:caisseBalance > 0 ? caisseBalance : 655000 },
      { code:'521000', libelle:'Banque', montant:420000 },
    ]
    const actifCirculantTotal = actifCirculant.reduce((s,l) => s+l.montant, 0)

    const sections: BilanSection[] = [
      { title:'Immobilisations', lines:immobilisations, total:immobilisationsTotal },
      { title:'Actif circulant', lines:actifCirculant, total:actifCirculantTotal },
    ]
    return { sections, grandTotal: immobilisationsTotal + actifCirculantTotal }
  }, [items])

  const passifData = useMemo(() => {
    const capitalSocial = 2000000
    const reserves = 1250000
    const resultatNet = cpcData().produitsTotal - cpcData().chargesTotal
    const capitauxPropres: BilanLine[] = [
      { code:'101000', libelle:'Capital social', montant:capitalSocial },
      { code:'106000', libelle:'Réserves', montant:reserves },
      { code:'120000', libelle:'Résultat de l\'exercice', montant:resultatNet > 0 ? resultatNet : 0 },
    ]
    const capitauxPropresTotal = capitauxPropres.reduce((s,l) => s+l.montant, 0)

    const fournisseursBalance = items.filter(e => e.account === '401000').reduce((s,e) => s+e.credit-e.debit, 0)

    const dettes: BilanLine[] = [
      { code:'161000', libelle:'Emprunts', montant:1800000 },
      { code:'401000', libelle:'Fournisseurs', montant:fournisseursBalance > 0 ? fournisseursBalance : 130000 },
      { code:'441000', libelle:'État – TVA', montant:285000 },
      { code:'442000', libelle:'État – IPR', montant:165000 },
      { code:'431000', libelle:'Sociale – INSS', montant:198000 },
    ]
    const dettesTotal = dettes.reduce((s,l) => s+l.montant, 0)

    const sections: BilanSection[] = [
      { title:'Capitaux propres', lines:capitauxPropres, total:capitauxPropresTotal },
      { title:'Dettes', lines:dettes, total:dettesTotal },
    ]
    return { sections, grandTotal: capitauxPropresTotal + dettesTotal }
  }, [items])

  function cpcData(): { produits: CPCSection; charges: CPCSection; resultat: number; produitsTotal: number; chargesTotal: number } {
    const produitsLines = [
      { libelle:'Ventes de marchandises', montant:1850000 },
      { libelle:'Prestations de services', montant:2150000 },
      { libelle:'Production stockée', montant:120000 },
      { libelle:'Produits financiers', montant:45000 },
    ]
    const produitsTotal = produitsLines.reduce((s,l) => s+l.montant, 0)

    const chargesLines = [
      { libelle:'Achats de marchandises', montant:680000 },
      { libelle:'Services extérieurs', montant:245000 },
      { libelle:'Charges de personnel', montant:1860000 },
      { libelle:'Impôts et taxes', montant:185000 },
      { libelle:'Autres charges', montant:95000 },
      { libelle:'Amortissements', montant:320000 },
      { libelle:'Charges financières', montant:78000 },
    ]
    const chargesTotal = chargesLines.reduce((s,l) => s+l.montant, 0)

    return {
      produits: { title:'Produits d\'exploitation', lines:produitsLines, total:produitsTotal },
      charges: { title:'Charges d\'exploitation', lines:chargesLines, total:chargesTotal },
      resultat: produitsTotal - chargesTotal,
      produitsTotal,
      chargesTotal
    }
  }

  const cpc = useMemo(() => cpcData(), [])

  const bilanCommercialData = useMemo(() => {
    const ca = cpc.produitsTotal
    const margeBrute = Math.round(ca * 0.62)
    const chargesCommerciales = Math.round(ca * 0.18)
    const resultat = margeBrute - chargesCommerciales
    return {
      ca, margeBrute, chargesCommerciales, resultat,
      margeBrutePct: 62,
      chargesCommercialesPct: 18,
      resultatPct: Math.round((resultat / ca) * 100),
    }
  }, [cpc])

  const barData = [
    { name:'CA', value: bilanCommercialData.ca, color:'#2563EB' },
    { name:'Marge brute', value: bilanCommercialData.margeBrute, color:'#16A34A' },
    { name:'Charges comm.', value: bilanCommercialData.chargesCommerciales, color:'#F59E0B' },
    { name:'Résultat', value: bilanCommercialData.resultat, color: bilanCommercialData.resultat >= 0 ? '#0D9488' : '#DC2626' },
  ]

  const exportData = tab === 'bilan'
    ? [...actifData.sections.flatMap(s => s.lines.map(l => ({ Section:s.title, Compte:l.code, Libellé:l.libelle, Montant:l.montant }))),
       { Section:'TOTAL GÉNÉRAL ACTIF', Compte:'', Libellé:'', Montant: actifData.grandTotal }]
    : tab === 'cpc'
    ? [...cpc.produits.lines.map(l => ({ Section:'Produits', Compte:'', Libellé:l.libelle, Montant:l.montant })),
       { Section:'Total Produits', Compte:'', Libellé:'', Montant: cpc.produitsTotal },
       ...cpc.charges.lines.map(l => ({ Section:'Charges', Compte:'', Libellé:l.libelle, Montant:l.montant })),
       { Section:'Total Charges', Compte:'', Libellé:'', Montant: cpc.chargesTotal },
       { Section:'RÉSULTAT NET', Compte:'', Libellé:'', Montant: cpc.resultat }]
    : [{ Section:'Chiffre d\'affaires', Compte:'', Libellé:'', Montant: bilanCommercialData.ca },
       { Section:'Marge brute', Compte:'', Libellé:'', Montant: bilanCommercialData.margeBrute },
       { Section:'Charges commerciales', Compte:'', Libellé:'', Montant: bilanCommercialData.chargesCommerciales },
       { Section:'Résultat commercial', Compte:'', Libellé:'', Montant: bilanCommercialData.resultat }]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="États Financiers"
        subtitle="Bilan, Compte de Produits et Charges, Bilan Commercial"
        breadcrumbs={[{label:'Accueil'},{label:'Finance'},{label:'États financiers'}]}
        icon={<FileText size={22}/>}
        iconBg="gradient-primary"
        actions={
          <ExportButton
            data={exportData}
            filename="etats-financiers-alba"
            title="États Financiers ALBA SERVICE GROUP"
            headers={['Section','Compte','Libellé','Montant']}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Actif" value={`${(actifData.grandTotal/1000000).toFixed(1)}M FC`} icon={<Scale size={20}/>} gradient="gradient-primary" change={8}/>
        <KpiCard title="Total Passif" value={`${(passifData.grandTotal/1000000).toFixed(1)}M FC`} icon={<Scale size={20}/>} gradient="gradient-purple" change={5}/>
        <KpiCard title="Résultat net (CPC)" value={`${(cpc.resultat/1000000).toFixed(1)}M FC`} icon={cpc.resultat >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>} gradient={cpc.resultat >= 0 ? 'gradient-teal' : 'gradient-danger'}/>
        <KpiCard title="Marge commerciale" value={`${bilanCommercialData.resultatPct}%`} icon={<BarChart3 size={20}/>} gradient="gradient-success" change={3}/>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {([['bilan','Bilan'],['cpc','Compte de Produits et Charges (CPC)'],['bilan-commercial','Bilan Commercial']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab===id?'border-blue-500 text-blue-700':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'bilan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ACTIF */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">ACTIF</h3>
            </div>
            {actifData.sections.map((section, si) => (
              <div key={si}>
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{section.title}</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {section.lines.map((line, li) => (
                    <div key={li} className="flex items-center justify-between px-5 py-2.5 hover:bg-blue-50/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 w-16">{line.code}</span>
                        <span className="text-xs text-gray-700">{line.libelle}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(line.montant)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-5 py-2.5 bg-blue-50/40 border-t border-blue-100">
                  <span className="text-xs font-bold text-blue-700">Sous-total {section.title}</span>
                  <span className="text-xs font-bold text-blue-700">{formatCurrency(section.total)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3 border-t-2 border-blue-200" style={{background:'linear-gradient(135deg,#DBEAFE,#EFF6FF)'}}>
              <span className="text-sm font-bold text-blue-800">TOTAL ACTIF</span>
              <span className="text-sm font-bold text-blue-800">{formatCurrency(actifData.grandTotal)}</span>
            </div>
          </div>

          {/* PASSIF */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100" style={{background:'linear-gradient(135deg,#065F46,#10B981)'}}>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">PASSIF</h3>
            </div>
            {passifData.sections.map((section, si) => (
              <div key={si}>
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{section.title}</h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {section.lines.map((line, li) => (
                    <div key={li} className="flex items-center justify-between px-5 py-2.5 hover:bg-green-50/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-400 w-16">{line.code}</span>
                        <span className="text-xs text-gray-700">{line.libelle}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(line.montant)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-5 py-2.5 bg-green-50/40 border-t border-green-100">
                  <span className="text-xs font-bold text-green-700">Sous-total {section.title}</span>
                  <span className="text-xs font-bold text-green-700">{formatCurrency(section.total)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3 border-t-2 border-green-200" style={{background:'linear-gradient(135deg,#D1FAE5,#ECFDF5)'}}>
              <span className="text-sm font-bold text-green-800">TOTAL PASSIF</span>
              <span className="text-sm font-bold text-green-800">{formatCurrency(passifData.grandTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'cpc' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produits */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100" style={{background:'linear-gradient(135deg,#065F46,#10B981)'}}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">PRODUITS D'EXPLOITATION</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {cpc.produits.lines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-green-50/20 transition-colors">
                    <span className="text-xs text-gray-700">{line.libelle}</span>
                    <span className="text-xs font-semibold text-green-700">{formatCurrency(line.montant)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t-2 border-green-200" style={{background:'linear-gradient(135deg,#D1FAE5,#ECFDF5)'}}>
                <span className="text-sm font-bold text-green-800">TOTAL PRODUITS</span>
                <span className="text-sm font-bold text-green-800">{formatCurrency(cpc.produitsTotal)}</span>
              </div>
            </div>

            {/* Charges */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100" style={{background:'linear-gradient(135deg,#991B1B,#EF4444)'}}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">CHARGES D'EXPLOITATION</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {cpc.charges.lines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-red-50/20 transition-colors">
                    <span className="text-xs text-gray-700">{line.libelle}</span>
                    <span className="text-xs font-semibold text-red-700">{formatCurrency(line.montant)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t-2 border-red-200" style={{background:'linear-gradient(135deg,#FEE2E2,#FEF2F2)'}}>
                <span className="text-sm font-bold text-red-800">TOTAL CHARGES</span>
                <span className="text-sm font-bold text-red-800">{formatCurrency(cpc.chargesTotal)}</span>
              </div>
            </div>
          </div>

          {/* Résultat */}
          <div className={`rounded-2xl border shadow-sm p-6 ${cpc.resultat >= 0 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cpc.resultat >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {cpc.resultat >= 0 ? <TrendingUp size={24} className="text-green-600"/> : <TrendingDown size={24} className="text-red-600"/>}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Résultat net de l'exercice</p>
                  <p className={`text-3xl font-bold mt-1 ${cpc.resultat >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(cpc.resultat)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Taux de résultat</span>
                  <span className={`text-sm font-bold ${cpc.resultat >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {((cpc.resultat / cpc.produitsTotal) * 100).toFixed(1)}%
                  </span>
                </div>
                <p className={`text-xs mt-1 ${cpc.resultat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cpc.resultat >= 0 ? 'Bénéfice' : 'Déficit'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'bilan-commercial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard title="Chiffre d'affaires" value={`${(bilanCommercialData.ca/1000000).toFixed(1)}M FC`} icon={<BarChart3 size={20}/>} gradient="gradient-primary" change={12}/>
            <KpiCard title="Marge brute" value={`${bilanCommercialData.margeBrutePct}%`} icon={<TrendingUp size={20}/>} gradient="gradient-success" change={4}/>
            <KpiCard title="Charges commerciales" value={`${bilanCommercialData.chargesCommercialesPct}%`} icon={<TrendingDown size={20}/>} gradient="gradient-warning"/>
            <KpiCard title="Résultat commercial" value={`${bilanCommercialData.resultatPct}%`} icon={<DollarSign size={20}/>} gradient="gradient-teal" change={6}/>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Comparaison des Postes Commerciaux</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{top:10,right:20,left:20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#6B7280'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000000).toFixed(1)}M`}/>
                <Tooltip formatter={(v:any) => formatCurrency(v)} cursor={{fill:'rgba(0,0,0,0.02)'}}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Détail du Bilan Commercial</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label:'Chiffre d\'affaires (CA)', montant:bilanCommercialData.ca, color:'text-blue-700', bg:'bg-blue-50/40' },
                { label:'Coût des services vendus', montant:Math.round(bilanCommercialData.ca * 0.38), color:'text-orange-700', bg:'bg-orange-50/40' },
                { label:'Marge brute', montant:bilanCommercialData.margeBrute, color:'text-green-700', bg:'bg-green-50/40', bold:true },
                { label:'Charges commerciales', montant:bilanCommercialData.chargesCommerciales, color:'text-amber-700', bg:'bg-amber-50/40' },
                { label:'Résultat commercial', montant:bilanCommercialData.resultat, color:bilanCommercialData.resultat >= 0 ? 'text-teal-700' : 'text-red-700', bg: bilanCommercialData.resultat >= 0 ? 'bg-teal-50/40' : 'bg-red-50/40', bold:true },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 ${row.bg} ${row.bold ? 'border-l-4 border-l-blue-500' : ''}`}>
                  <span className={`text-xs ${row.bold ? 'font-bold' : 'text-gray-700'}`}>{row.label}</span>
                  <span className={`text-xs font-semibold ${row.color}`}>{formatCurrency(row.montant)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
