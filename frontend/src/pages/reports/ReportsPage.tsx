import { useState, useMemo, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToCSV, exportToPDF, exportToExcel } from '@/lib/exportUtils'
import { printReport } from '@/lib/reportPrinter'
import { api } from '@/services/api'
import {
  BarChart3, Download, TrendingUp, TrendingDown, Users, Package, Printer,
  FileText, DollarSign, ShoppingCart, AlertTriangle, UserCheck, Briefcase,
  CheckCircle, Wallet, Target, ClipboardList, Truck, Calendar, Clock,
  BookOpen, ChevronRight, Search, RefreshCw
} from 'lucide-react'

interface Invoice {
  id: string; number: string; client: string; service: string;
  items: { desc: string; qty: number; unit: number; total: number }[];
  total: number; paid: number; balance: number; status: string;
  dueDate: string; createdAt: string;
}
interface CommercialOrder {
  id: string; orderNumber: string;
  client: { name: string; contact: string };
  items: { name: string; qty: number }[];
  total: number; status: string; createdAt: string; deliveryDate: string;
}
interface Quote {
  id: string; quoteNumber: string;
  client: { name: string };
  service: string; total: number; status: string;
  validUntil: string; createdAt: string;
}
interface Transaction {
  id: string; date: string; type: 'income' | 'expense';
  description: string; amount: number; method: string; reference: string;
}
interface AccountingEntry {
  id: string; date: string; journal: string; account: string;
  label: string; debit: number; credit: number; ref: string;
}
interface BudgetLine {
  id: string; category: string; allocated: number; spent: number; dept: string;
}
interface StockProduct {
  id: string; code: string; name: string; category: string; unit: string;
  purchasePrice: number; salePrice: number; currentStock: number; minStock: number;
  supplier: string; location: string;
}
interface Consumable {
  id: string; code: string; name: string; category: string; unit: string;
  stock: number; minStock: number; price: number; supplier: string; location: string;
}
interface PurchaseOrder {
  id: string; orderNumber: string;
  supplier: { name: string; phone: string };
  items: { name: string; qty: number; price: number }[];
  total: number; status: string; createdAt: string; expectedDate: string;
}
interface Supplier {
  id: string; code: string; name: string; totalPurchases: number; status: string;
}
interface ProductionJob {
  id: string; ref: string; client: string; type: string; machine: string;
  operator: string; priority: 'urgent' | 'high' | 'normal' | 'low';
  progress: number; status: string; startDate: string; dueDate: string;
  quantity: number;
}
interface Machine {
  id: string; name: string; type: string; brand: string; status: 'service' | 'maintenance' | 'panne';
  operator: string;
}
interface Employee {
  id: string; matricule: string; firstName: string; lastName: string;
  function: string; department: string; agency: string;
  contractType: string; hireDate: string;
  status: 'active' | 'leave' | 'inactive'; salary: number;
}
interface Client {
  id: string; code: string; firstName: string; lastName: string;
  companyName: string; email: string; phone: string;
  category: string; status: string; city?: string;
  totalSpent: number; ordersCount: number; createdAt: string;
}

type TabId = 'overview' | 'commercial' | 'finance' | 'stock' | 'production' | 'rh' | 'clients' | 'daily'

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: <BarChart3 size={18}/>, color: 'from-blue-600 to-blue-500' },
  { id: 'commercial', label: 'Commercial', icon: <TrendingUp size={18}/>, color: 'from-blue-800 to-blue-600' },
  { id: 'finance', label: 'Finance', icon: <DollarSign size={18}/>, color: 'from-green-600 to-green-500' },
  { id: 'stock', label: 'Stock', icon: <Package size={18}/>, color: 'from-amber-600 to-amber-500' },
  { id: 'production', label: 'Production', icon: <Printer size={18}/>, color: 'from-purple-600 to-purple-500' },
  { id: 'rh', label: 'RH', icon: <Users size={18}/>, color: 'from-teal-600 to-teal-500' },
  { id: 'clients', label: 'Clients', icon: <Target size={18}/>, color: 'from-indigo-600 to-indigo-500' },
  { id: 'daily', label: 'Rapports Journaliers', icon: <BookOpen size={18}/>, color: 'from-indigo-600 to-violet-500' },
]

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Ce mois-ci' },
  { value: '3months', label: '3 derniers mois' },
  { value: 'year', label: 'Cette annee' },
  { value: 'all', label: 'Tout' },
]

const MONTHS_FR = ['Jan','Fev','Mar','Avr','Mai','Jun','Juil','Aou','Sep','Oct','Nov','Dec']

const PIE_COLORS = ['#2563EB','#7C3AED','#22C55E','#F59E0B','#EF4444','#0D9488','#EC4899','#6366F1','#14B8A6','#F97316']

function isDateInRange(dateStr: string, period: string): boolean {
  if (!dateStr || period === 'all') return true
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return true
  const now = new Date()
  if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  if (period === '3months') {
    const three = new Date(now); three.setMonth(three.getMonth() - 3)
    return d >= three
  }
  if (period === 'year') return d.getFullYear() === now.getFullYear()
  return true
}

function extractMonth(dateStr: string): number {
  try { return new Date(dateStr).getMonth() } catch { return 0 }
}

function handleExport(data: Record<string, unknown>[], filename: string, title: string, format: 'csv' | 'excel' | 'pdf', category?: string, subtitle?: string) {
  if (!data.length) return
  if (format === 'csv') exportToCSV(data, filename)
  else if (format === 'excel') exportToExcel(data, filename)
  else {
    printReport({
      title: title.toUpperCase(),
      subtitle,
      category,
      period: new Intl.DateTimeFormat('fr-FR', { month:'long', year:'numeric' }).format(new Date()),
      rows: data,
    })
  }
}

function SectionExport({ data, filename, title, category, subtitle }: {
  data: Record<string, unknown>[]; filename: string; title: string; category?: string; subtitle?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
        <Download size={13}/> Exporter
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[160px]">
            <button onClick={() => { handleExport(data, filename, title, 'pdf', category, subtitle); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium border-b border-gray-50 flex items-center gap-2">
              🖨️ Imprimer / PDF pro
            </button>
            <button onClick={() => { handleExport(data, filename, title, 'excel'); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              📊 Excel (.xlsx)
            </button>
            <button onClick={() => { handleExport(data, filename, title, 'csv'); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              📄 CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, subtitle, children, exportData, exportFilename, exportTitle, exportCategory, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode;
  exportData?: Record<string, unknown>[]; exportFilename?: string; exportTitle?: string; exportCategory?: string;
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {exportData && exportFilename && exportTitle && (
          <SectionExport data={exportData} filename={exportFilename} title={exportTitle}
            category={exportCategory} subtitle={subtitle}/>
        )}
      </div>
      {children}
    </div>
  )
}

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

/* ══════════════════════════════════════════════════════════
   SYSTÈME DE RAPPORTS JOURNALIERS
   Sauvegarde automatique des opérations par jour
══════════════════════════════════════════════════════════ */

const DAILY_REPORTS_KEY = 'alba-daily-reports'

interface ServiceSummary {
  name: string
  operations: number
  montant: number
  details: string[]
}

interface DailyReport {
  date: string          // 'YYYY-MM-DD'
  dateLabel: string     // 'Lundi 22 août 2026'
  generatedAt: string   // ISO
  ref: string
  services: ServiceSummary[]
  totalOperations: number
  totalMontant: number
  snapshot: {
    invoices: number; invoicesTotal: number
    orders: number; ordersTotal: number
    transactions: number; transactionsIncome: number; transactionsExpense: number
    quotes: number; quotesTotal: number
    productions: number
    purchases: number; purchasesTotal: number
    employees: number
    clients: number
  }
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function loadDailyReports(): DailyReport[] {
  try {
    const raw = localStorage.getItem(DAILY_REPORTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveDailyReports(reports: DailyReport[]) {
  try { localStorage.setItem(DAILY_REPORTS_KEY, JSON.stringify(reports)) } catch {}
}

function buildDailyReport(
  dateStr: string,
  invoices: Invoice[],
  orders: CommercialOrder[],
  quotes: Quote[],
  transactions: Transaction[],
  productionJobs: ProductionJob[],
  purchaseOrders: PurchaseOrder[],
  employees: Employee[],
  clients: Client[]
): DailyReport {
  const isToday = (d: string) => (d || '').startsWith(dateStr)

  const dayInvoices = invoices.filter(i => isToday(i.createdAt))
  const dayOrders   = orders.filter(o => isToday(o.createdAt))
  const dayQuotes   = quotes.filter(q => isToday(q.createdAt))
  const dayTxIn     = transactions.filter(t => isToday(t.date) && t.type === 'income')
  const dayTxOut    = transactions.filter(t => isToday(t.date) && t.type === 'expense')
  const dayProds    = productionJobs.filter(j => isToday(j.startDate) || isToday(j.dueDate))
  const dayPurchases= purchaseOrders.filter(o => isToday(o.createdAt))

  const invoicesTotal  = dayInvoices.reduce((s,i) => s+(i.total||0), 0)
  const ordersTotal    = dayOrders.reduce((s,o) => s+(o.total||0), 0)
  const quotesTotal    = dayQuotes.reduce((s,q) => s+(q.total||0), 0)
  const incomeTotal    = dayTxIn.reduce((s,t) => s+(t.amount||0), 0)
  const expenseTotal   = dayTxOut.reduce((s,t) => s+(t.amount||0), 0)
  const purchasesTotal = dayPurchases.reduce((s,o) => s+(o.total||0), 0)

  const services: ServiceSummary[] = []

  if (dayInvoices.length > 0) services.push({
    name: 'Commercial — Facturation',
    operations: dayInvoices.length,
    montant: invoicesTotal,
    details: dayInvoices.slice(0,5).map(i => `Facture ${i.number||i.id} · ${i.client} · ${formatCurrency(i.total)}`),
  })
  if (dayOrders.length > 0) services.push({
    name: 'Commercial — Commandes',
    operations: dayOrders.length,
    montant: ordersTotal,
    details: dayOrders.slice(0,5).map(o => `Cmd ${o.orderNumber||o.id} · ${typeof o.client==='object'?o.client.name:o.client} · ${formatCurrency(o.total)}`),
  })
  if (dayQuotes.length > 0) services.push({
    name: 'Commercial — Devis',
    operations: dayQuotes.length,
    montant: quotesTotal,
    details: dayQuotes.slice(0,5).map(q => `Devis ${q.quoteNumber||q.id} · ${typeof q.client==='object'?q.client.name:String(q.client)} · ${formatCurrency(q.total)}`),
  })
  if (dayTxIn.length > 0) services.push({
    name: 'Finance — Encaissements',
    operations: dayTxIn.length,
    montant: incomeTotal,
    details: dayTxIn.slice(0,5).map(t => `${t.description||'Transaction'} · ${formatCurrency(t.amount)}`),
  })
  if (dayTxOut.length > 0) services.push({
    name: 'Finance — Décaissements',
    operations: dayTxOut.length,
    montant: -expenseTotal,
    details: dayTxOut.slice(0,5).map(t => `${t.description||'Dépense'} · ${formatCurrency(t.amount)}`),
  })
  if (dayProds.length > 0) services.push({
    name: 'Production Imprimerie',
    operations: dayProds.length,
    montant: 0,
    details: dayProds.slice(0,5).map(j => `${j.ref||j.id} · ${j.client||'—'} · ${j.status}`),
  })
  if (dayPurchases.length > 0) services.push({
    name: 'Achats Fournisseurs',
    operations: dayPurchases.length,
    montant: purchasesTotal,
    details: dayPurchases.slice(0,5).map(o => `${o.orderNumber||o.id} · ${typeof o.supplier==='object'?o.supplier.name:String(o.supplier)} · ${formatCurrency(o.total)}`),
  })

  const totalMontant = invoicesTotal + ordersTotal + incomeTotal - expenseTotal
  const totalOps     = dayInvoices.length + dayOrders.length + dayQuotes.length +
                       dayTxIn.length + dayTxOut.length + dayProds.length + dayPurchases.length

  const now = new Date()
  const ref = `RPT-JOUR-${dateStr.replace(/-/g,'')}-${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`

  return {
    date: dateStr,
    dateLabel: new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
    generatedAt: now.toISOString(),
    ref,
    services,
    totalOperations: totalOps,
    totalMontant,
    snapshot: {
      invoices: dayInvoices.length, invoicesTotal,
      orders: dayOrders.length, ordersTotal,
      transactions: dayTxIn.length + dayTxOut.length, transactionsIncome: incomeTotal, transactionsExpense: expenseTotal,
      quotes: dayQuotes.length, quotesTotal,
      productions: dayProds.length,
      purchases: dayPurchases.length, purchasesTotal,
      employees: employees.filter(e=>e.status==='active').length,
      clients: clients.length,
    },
  }
}

/* ── Impression rapport journalier ── */
function printDailyReport(report: DailyReport) {
  const now = new Date()
  const genDate = new Date(report.generatedAt).toLocaleString('fr-FR')
  const esc = (s: unknown) => s===null||s===undefined?'—':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  const positiveTotal = report.totalMontant >= 0
  const totalLabel    = positiveTotal ? 'Solde net journalier' : 'Déficit journalier'

  const serviceRows = report.services.map((s,i) => `
    <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
      <td class="svc-num">${i+1}</td>
      <td><strong>${esc(s.name)}</strong>
        <div class="svc-details">${s.details.slice(0,3).map(d=>`<span>• ${esc(d)}</span>`).join('')}${s.details.length>3?`<span>... +${s.details.length-3} autre(s)</span>`:''}</div>
      </td>
      <td class="center">${s.operations}</td>
      <td class="${s.montant < 0 ? 'amount-neg' : 'amount-pos'}">${s.montant !== 0 ? formatCurrency(Math.abs(s.montant)) : '—'}</td>
      <td class="center badge-cell">
        ${s.montant < 0 ? '<span class="badge red">Dépense</span>' : s.montant > 0 ? '<span class="badge green">Entrée</span>' : '<span class="badge gray">Opération</span>'}
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>Rapport Journalier ${esc(report.date)} — ALBA</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F1F5F9;color:#1E293B;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:960px;margin:12px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10)}

  /* ── HEADER ── */
  .header{background:linear-gradient(135deg,#06103A 0%,#0F2460 35%,#1E3A8A 65%,#1D4ED8 100%);position:relative;overflow:hidden}
  .header::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.055) 1px,transparent 1px);background-size:22px 22px}
  .hrow{display:flex;align-items:stretch;position:relative;z-index:1}

  .h-logo{padding:20px;display:flex;align-items:center;gap:12px;border-right:1px solid rgba(255,255,255,.12);flex-shrink:0;min-width:195px}
  .logo-box{width:66px;height:66px;border-radius:12px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
  .logo-box img{width:52px;height:52px;object-fit:contain}
  .co-name{font-size:14px;font-weight:900;color:#fff;letter-spacing:.04em;line-height:1.2}
  .co-tag{font-size:8.5px;color:rgba(147,197,253,.8);font-style:italic;margin:2px 0 5px}
  .co-info span{display:block;font-size:8.5px;color:rgba(255,255,255,.6);line-height:1.75}

  .h-title{flex:1;padding:20px 26px;display:flex;flex-direction:column;justify-content:center}
  .day-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.22);border-radius:20px;padding:3px 10px;margin-bottom:7px;width:fit-content}
  .day-dot{width:6px;height:6px;border-radius:50%;background:#34D399}
  .day-label{font-size:8px;font-weight:800;color:rgba(255,255,255,.88);letter-spacing:.12em;text-transform:uppercase}
  .rpt-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:.04em;line-height:1.1}
  .rpt-date{font-size:13px;color:rgba(147,197,253,.85);margin-top:4px;font-weight:600}
  .meta-row{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}
  .meta-item{display:flex;align-items:baseline;gap:4px}
  .mk{font-size:8px;color:rgba(147,197,253,.62);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
  .mv{font-size:10px;color:#fff;font-weight:700}
  .mv.mono{font-family:monospace;color:#93C5FD}

  .h-flag{padding:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid rgba(255,255,255,.12);flex-shrink:0;gap:5px}
  .flag-frame{width:68px;height:46px;border-radius:5px;overflow:hidden;border:2.5px solid rgba(255,255,255,.3);box-shadow:0 3px 10px rgba(0,0,0,.3)}
  .flag-frame img{width:100%;height:100%;object-fit:cover}
  .flag-name{font-size:7.5px;color:rgba(255,255,255,.5);font-weight:700;letter-spacing:.1em;text-transform:uppercase;text-align:center}

  .accent-bar{height:4px;background:linear-gradient(90deg,#34D399 0%,#2563EB 40%,#F59E0B 75%,#EF4444 100%)}

  /* ── SUBHEADER ── */
  .sub{background:linear-gradient(90deg,#EFF6FF,#F0F4FF);padding:6px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #DBEAFE}
  .sub-left{display:flex;align-items:center;gap:14px}
  .sdot{width:7px;height:7px;border-radius:50%;background:#2563EB}
  .sname{font-size:9px;color:#1E40AF;font-weight:800}
  .sver{font-size:8.5px;color:#3B82F6}
  .conf{font-size:8px;color:#6B7280}

  /* ── KPI BAND ── */
  .kpi-band{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;padding:14px 22px;border-bottom:1px solid #E2E8F0;background:#FAFBFF}
  .kpi-c{border-radius:10px;padding:11px 13px;position:relative;overflow:hidden}
  .kpi-c::before{content:'';position:absolute;top:-8px;right:-8px;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.1)}
  .kpi-l{font-size:8px;color:rgba(255,255,255,.75);font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
  .kpi-v{font-size:18px;font-weight:900;color:#fff;line-height:1}
  .kpi-s{font-size:8px;color:rgba(255,255,255,.55);margin-top:2px}

  /* ── TABLE SECTION ── */
  .section{padding:16px 22px}
  .section-head{display:flex;align-items:center;gap:7px;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid #1E3A8A}
  .sec-marker{width:4px;height:14px;border-radius:2px;background:#1E3A8A;flex-shrink:0}
  .sec-title{font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.09em}
  .sec-count{font-size:9px;color:#9CA3AF;margin-left:auto}

  table{width:100%;border-collapse:collapse;font-size:10px}
  thead tr{background:linear-gradient(135deg,#06103A,#1E3A8A)}
  thead th{padding:8px 10px;font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;text-align:left}
  .center{text-align:center}
  .even{background:#F8FAFC}.odd{background:#fff}
  tbody td{padding:7px 10px;border-bottom:1px solid #E9EFF5;vertical-align:top}
  .svc-num{color:#C4CADA;font-size:8.5px;text-align:center;width:30px}
  .svc-details{margin-top:3px;display:flex;flex-direction:column;gap:1px}
  .svc-details span{font-size:8.5px;color:#9CA3AF}
  .amount-pos{text-align:right;font-weight:700;color:#059669}
  .amount-neg{text-align:right;font-weight:700;color:#DC2626}
  .badge-cell{text-align:center}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}
  .badge.green{background:#D1FAE5;color:#059669}
  .badge.red{background:#FEE2E2;color:#DC2626}
  .badge.gray{background:#F3F4F6;color:#6B7280}

  .no-ops{padding:20px;text-align:center;color:#9CA3AF;font-style:italic;font-size:10px}

  /* ── TOTAUX ── */
  .totals{margin:0 22px 16px;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0}
  .tot-head{background:linear-gradient(135deg,#0F2460,#1E3A8A);padding:10px 14px;display:flex;align-items:center;gap:6px}
  .tot-head-title{font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.09em}
  .tot-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
  .tot-row{padding:12px 14px;border-right:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0}
  .tot-row:last-child{border-right:none}
  .tot-label{font-size:9px;color:#64748B;font-weight:500;margin-bottom:3px;text-transform:uppercase;letter-spacing:.07em}
  .tot-value{font-size:16px;font-weight:900}
  .tot-value.positive{color:#059669}
  .tot-value.negative{color:#DC2626}
  .tot-value.neutral{color:#1E3A8A}
  .tot-sub{font-size:8px;color:#9CA3AF;margin-top:2px}

  /* ── GRAND TOTAL ── */
  .grand-total{margin:0 22px 16px;background:linear-gradient(135deg,#0F1F5C,#1E3A8A,#2563EB);border-radius:12px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
  .gt-label{font-size:12px;font-weight:700;color:rgba(255,255,255,.8)}
  .gt-value{font-size:28px;font-weight:900;color:#fff;letter-spacing:.04em}
  .gt-sub{font-size:9px;color:rgba(147,197,253,.7);margin-top:3px}

  /* ── FOOTER ── */
  .footer{background:linear-gradient(135deg,#06103A,#1E3A8A);padding:11px 24px;display:flex;align-items:center;justify-content:space-between;margin-top:4px;border-top:4px solid #2563EB}
  .footer-left{display:flex;align-items:flex-start;gap:8px}
  .footer-logo{width:18px;height:18px;object-fit:contain;opacity:.72;flex-shrink:0;margin-top:1px}
  .footer-text{font-size:7.5px;color:rgba(147,197,253,.65);line-height:1.7}
  .footer-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
  .page-info{font-size:8px;color:rgba(255,255,255,.3);font-family:monospace}
  .footer-flag{width:26px;height:17px;object-fit:cover;border-radius:2px;border:1px solid rgba(255,255,255,.2);opacity:.72}

  @page{size:A4 portrait;margin:10mm 8mm}
  @media print{body{background:#fff!important}.page{box-shadow:none!important;margin:0!important;border-radius:0!important}}
</style>
</head>
<body>
<div class="page">

<!-- HEADER -->
<div class="header">
  <div class="hrow">
    <div class="h-logo">
      <div class="logo-box"><img src="/alba-logo.png" alt="ALBA"/></div>
      <div>
        <div class="co-name">ALBA SERVICE GROUP</div>
        <div class="co-tag">L'excellence au service de vos projets</div>
        <div class="co-info">
          <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
          <span>📞 +243 XXX XXX XXX</span>
          <span>✉ contact@alba-service.com</span>
        </div>
      </div>
    </div>
    <div class="h-title">
      <div class="day-badge"><div class="day-dot"></div><span class="day-label">Rapport Journalier Officiel</span></div>
      <div class="rpt-title">RAPPORT JOURNALIER</div>
      <div class="rpt-date">${esc(report.dateLabel)}</div>
      <div class="meta-row">
        <div class="meta-item"><span class="mk">Date :</span><span class="mv">${esc(report.date)}</span></div>
        <div class="meta-item"><span class="mk">Généré le :</span><span class="mv">${esc(genDate)}</span></div>
        <div class="meta-item"><span class="mk">Référence :</span><span class="mv mono">${esc(report.ref)}</span></div>
        <div class="meta-item"><span class="mk">Opérations :</span><span class="mv">${report.totalOperations}</span></div>
      </div>
    </div>
    <div class="h-flag">
      <div class="flag-frame"><img src="/rdc-flag.jpg" alt="RDC"/></div>
      <span class="flag-name">R.D. Congo</span>
    </div>
  </div>
  <div class="accent-bar"></div>
</div>

<!-- SUBHEADER -->
<div class="sub">
  <div class="sub-left">
    <div style="display:flex;align-items:center;gap:5px"><div class="sdot"></div><span class="sname">ALBA SERVICE GROUP PLATFORM</span></div>
    <span style="color:#60A5FA;font-size:9px">|</span>
    <span class="sver">Rapport Journalier Automatique — v1.0.0</span>
  </div>
  <span class="conf">🔒 Confidentiel · Usage interne uniquement</span>
</div>

<!-- KPI BAND -->
<div class="kpi-band">
  <div class="kpi-c" style="background:linear-gradient(135deg,#059669,#10B981)">
    <div class="kpi-l">CA Journalier</div>
    <div class="kpi-v">${esc(formatCurrency(report.snapshot.invoicesTotal))}</div>
    <div class="kpi-s">${report.snapshot.invoices} facture(s)</div>
  </div>
  <div class="kpi-c" style="background:linear-gradient(135deg,#0D9488,#14B8A6)">
    <div class="kpi-l">Encaissements</div>
    <div class="kpi-v">${esc(formatCurrency(report.snapshot.transactionsIncome))}</div>
    <div class="kpi-s">${report.snapshot.transactions} transaction(s)</div>
  </div>
  <div class="kpi-c" style="background:linear-gradient(135deg,#DC2626,#EF4444)">
    <div class="kpi-l">Décaissements</div>
    <div class="kpi-v">${esc(formatCurrency(report.snapshot.transactionsExpense))}</div>
    <div class="kpi-s">Dépenses du jour</div>
  </div>
  <div class="kpi-c" style="background:linear-gradient(135deg,#2563EB,#1D4ED8)">
    <div class="kpi-l">Commandes</div>
    <div class="kpi-v">${report.snapshot.orders}</div>
    <div class="kpi-s">${esc(formatCurrency(report.snapshot.ordersTotal))}</div>
  </div>
  <div class="kpi-c" style="background:linear-gradient(135deg,#7C3AED,#8B5CF6)">
    <div class="kpi-l">Productions</div>
    <div class="kpi-v">${report.snapshot.productions}</div>
    <div class="kpi-s">Travaux du jour</div>
  </div>
  <div class="kpi-c" style="background:linear-gradient(135deg,#D97706,#F59E0B)">
    <div class="kpi-l">Total Opérations</div>
    <div class="kpi-v">${report.totalOperations}</div>
    <div class="kpi-s">${report.services.length} service(s)</div>
  </div>
</div>

<!-- DÉTAIL PAR SERVICE -->
<div class="section">
  <div class="section-head">
    <div class="sec-marker"></div>
    <span class="sec-title">Détail des opérations par service</span>
    <span class="sec-count">${report.services.length} service(s) actif(s) ce jour</span>
  </div>
  ${report.services.length === 0 ? `<div class="no-ops">Aucune opération enregistrée pour cette journée</div>` : `
  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>Service / Module</th>
        <th class="center">Nb Opérations</th>
        <th class="center">Montant (FC)</th>
        <th class="center">Type</th>
      </tr>
    </thead>
    <tbody>${serviceRows}</tbody>
  </table>`}
</div>

<!-- TOTAUX PAR CATÉGORIE -->
<div class="totals">
  <div class="tot-head">
    <div class="sec-marker" style="background:#60A5FA"></div>
    <span class="tot-head-title">Récapitulatif financier journalier</span>
  </div>
  <div class="tot-rows">
    <div class="tot-row">
      <div class="tot-label">Chiffre d'affaires</div>
      <div class="tot-value positive">${esc(formatCurrency(report.snapshot.invoicesTotal))}</div>
      <div class="tot-sub">${report.snapshot.invoices} facture(s) émise(s)</div>
    </div>
    <div class="tot-row">
      <div class="tot-label">Total encaissé (caisse)</div>
      <div class="tot-value positive">${esc(formatCurrency(report.snapshot.transactionsIncome))}</div>
      <div class="tot-sub">Entrées de trésorerie</div>
    </div>
    <div class="tot-row">
      <div class="tot-label">Total décaissé</div>
      <div class="tot-value negative">${esc(formatCurrency(report.snapshot.transactionsExpense))}</div>
      <div class="tot-sub">Sorties de trésorerie</div>
    </div>
    <div class="tot-row">
      <div class="tot-label">Commandes reçues</div>
      <div class="tot-value neutral">${esc(formatCurrency(report.snapshot.ordersTotal))}</div>
      <div class="tot-sub">${report.snapshot.orders} commande(s)</div>
    </div>
    <div class="tot-row">
      <div class="tot-label">Devis émis</div>
      <div class="tot-value neutral">${esc(formatCurrency(report.snapshot.quotesTotal))}</div>
      <div class="tot-sub">${report.snapshot.quotes} devis</div>
    </div>
    <div class="tot-row">
      <div class="tot-label">Achats fournisseurs</div>
      <div class="tot-value negative">${esc(formatCurrency(report.snapshot.purchasesTotal))}</div>
      <div class="tot-sub">${report.snapshot.purchases} bon(s) d'achat</div>
    </div>
  </div>
</div>

<!-- GRAND TOTAL -->
<div class="grand-total">
  <div>
    <div class="gt-label">SOLDE NET JOURNALIER</div>
    <div class="gt-value">${esc(formatCurrency(Math.abs(report.totalMontant)))}</div>
    <div class="gt-sub">${report.totalMontant >= 0 ? '✅ Journée bénéficiaire' : '⚠️ Journée déficitaire'} · ${report.totalOperations} opération(s) au total</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:9px;color:rgba(147,197,253,.7)">Rapport officiel du jour</div>
    <div style="font-size:11px;font-weight:700;color:#fff;margin-top:3px">${esc(report.dateLabel)}</div>
    <div style="font-family:monospace;font-size:9px;color:#60A5FA;margin-top:2px">${esc(report.ref)}</div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-left">
    <img class="footer-logo" src="/alba-logo.png" alt="ALBA"/>
    <div class="footer-text">
      © ${now.getFullYear()} <strong style="color:rgba(255,255,255,.55)">ALBA SERVICE GROUP</strong> · Kindu, Province du Maniema, République Démocratique du Congo<br/>
      📍 Avenue Lumumba, Kindu — 📞 +243 XXX XXX XXX — ✉ contact@alba-service.com<br/>
      Rapport journalier généré automatiquement le ${esc(genDate)} · Tous droits réservés
    </div>
  </div>
  <div class="footer-right">
    <span class="page-info">${esc(report.ref)}</span>
    <img class="footer-flag" src="/rdc-flag.jpg" alt="RDC"/>
  </div>
</div>

</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},900)})</script>
</body></html>`

  const win = window.open('', '_blank', 'width=1000,height=800')
  if (!win) { alert('Autorisez les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
}

/* ── Composant Onglet Rapports Journaliers ── */
function DailyReportsTab({
  invoices, orders, quotes, transactions, productionJobs,
  purchaseOrders, employees, clients
}: {
  invoices: Invoice[]; orders: CommercialOrder[]; quotes: Quote[]
  transactions: Transaction[]; productionJobs: ProductionJob[]
  purchaseOrders: PurchaseOrder[]; employees: Employee[]; clients: Client[]
}) {
  const [reports, setReports]   = useState<DailyReport[]>(() => loadDailyReports())
  const [searchDate, setSearchDate] = useState('')
  const [generating, setGenerating] = useState(false)

  const today = getTodayStr()

  /* Auto-save today's report every time the component mounts / data changes */
  useEffect(() => {
    const todayReport = buildDailyReport(today, invoices, orders, quotes, transactions, productionJobs, purchaseOrders, employees, clients)
    const existing = reports.filter(r => r.date !== today)
    const updated  = [todayReport, ...existing].sort((a,b) => b.date.localeCompare(a.date))
    setReports(updated)
    saveDailyReports(updated)
  }, [invoices.length, orders.length, quotes.length, transactions.length])

  const handleGenerateToday = () => {
    setGenerating(true)
    const r = buildDailyReport(today, invoices, orders, quotes, transactions, productionJobs, purchaseOrders, employees, clients)
    const updated = [r, ...reports.filter(x => x.date !== today)].sort((a,b) => b.date.localeCompare(a.date))
    setReports(updated)
    saveDailyReports(updated)
    setTimeout(() => setGenerating(false), 600)
  }

  const filtered = searchDate
    ? reports.filter(r => r.date.includes(searchDate))
    : reports

  const todayReport = reports.find(r => r.date === today)

  return (
    <div className="space-y-5">

      {/* ── Header zone ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-indigo-200"/>
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Journal des rapports</span>
            </div>
            <h2 className="text-xl font-black">Rapports Journaliers Automatiques</h2>
            <p className="text-indigo-200 text-xs mt-1">
              Chaque journée est automatiquement archivée. Recherchez par date et téléchargez le rapport complet.
            </p>
          </div>
          <button onClick={handleGenerateToday} disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-50 active:scale-95 transition-all shadow flex-shrink-0">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''}/>
            {generating ? 'Mise à jour...' : 'Actualiser aujourd\'hui'}
          </button>
        </div>

        {/* Today summary */}
        {todayReport && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "CA aujourd'hui",   value: formatCurrency(todayReport.snapshot.invoicesTotal), icon: '💰' },
              { label: 'Encaissements',    value: formatCurrency(todayReport.snapshot.transactionsIncome), icon: '✅' },
              { label: 'Opérations',       value: String(todayReport.totalOperations), icon: '📊' },
              { label: 'Solde net',        value: formatCurrency(Math.abs(todayReport.totalMontant)), icon: todayReport.totalMontant >= 0 ? '📈' : '📉' },
            ].map((s,i) => (
              <div key={i} className="bg-white/15 backdrop-blur rounded-xl p-3">
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="text-xs text-indigo-200 font-medium">{s.label}</div>
                <div className="text-sm font-black text-white mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400"/>
            <span className="text-xs font-semibold text-gray-700">Rechercher par date :</span>
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <input type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
          </div>
          {searchDate && (
            <button onClick={() => setSearchDate('')}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium">
              Effacer
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} rapport(s) archivé(s)</span>
        </div>
      </div>

      {/* ── List of reports ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Calendar size={40} className="mx-auto text-gray-200 mb-3"/>
          <p className="text-gray-400 font-medium">Aucun rapport trouvé pour cette date</p>
          <p className="text-gray-300 text-xs mt-1">Essayez une autre date ou effacez la recherche</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const isToday2 = report.date === today
            const isPos    = report.totalMontant >= 0
            return (
              <div key={report.date}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isToday2 ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100'}`}>
                <div className={`flex items-center justify-between px-5 py-3.5 ${isToday2 ? 'bg-indigo-50/50' : 'bg-gray-50/50'} border-b border-gray-100`}>
                  <div className="flex items-center gap-3">
                    {isToday2 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Aujourd'hui</span>
                    )}
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{report.dateLabel}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{report.ref}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm font-black ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                        {isPos ? '+' : '-'}{formatCurrency(Math.abs(report.totalMontant))}
                      </p>
                      <p className="text-[10px] text-gray-400">{report.totalOperations} opération(s)</p>
                    </div>
                    <button onClick={() => printDailyReport(report)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-xl hover:opacity-90 active:scale-95 transition-all shadow"
                      style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                      <Printer size={13}/>
                      Imprimer
                    </button>
                  </div>
                </div>

                {/* Services grid */}
                <div className="px-5 py-3">
                  {report.services.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Aucune opération enregistrée ce jour</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {report.services.map((svc, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"/>
                            <span className="text-gray-600 truncate">{svc.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-gray-500">{svc.operations} op.</span>
                            {svc.montant !== 0 && (
                              <span className={`font-bold ${svc.montant < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {svc.montant < 0 ? '-' : '+'}{formatCurrency(Math.abs(svc.montant))}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Total row */}
                  <div className={`mt-3 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${isPos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span className="flex items-center gap-1.5">
                      {isPos ? <CheckCircle size={13}/> : <AlertTriangle size={13}/>}
                      Solde net de la journée {isPos ? '(bénéficiaire)' : '(déficitaire)'}
                    </span>
                    <span className="text-sm font-black">
                      {isPos ? '+' : '-'}{formatCurrency(Math.abs(report.totalMontant))}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function generateGlobalReport(
  invoices: Invoice[],
  orders: CommercialOrder[],
  quotes: Quote[],
  transactions: Transaction[],
  stockProducts: StockProduct[],
  consumables: Consumable[],
  purchaseOrders: PurchaseOrder[],
  suppliers: Supplier[],
  productionJobs: ProductionJob[],
  employees: Employee[],
  clients: Client[],
  period: string
) {
  const now     = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const ref     = `RPT-GEN-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString(36).toUpperCase().slice(-6)}`
  const periodLabel = { month:'Ce mois-ci', '3months':'3 derniers mois', year:'Cette année', all:'Toutes périodes' }[period] || 'Toutes périodes'

  const esc = (s: unknown) => s === null || s === undefined ? '—'
    : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

  /* ── Calculs globaux ── */
  const totalCA        = invoices.reduce((s,i) => s + (i.total||0), 0)
  const totalPaid      = invoices.reduce((s,i) => s + (i.paid||0), 0)
  const totalUnpaid    = invoices.reduce((s,i) => s + (i.balance||0), 0)
  const totalIncome    = transactions.filter(t => t.type==='income').reduce((s,t) => s+(t.amount||0), 0)
  const totalExpense   = transactions.filter(t => t.type==='expense').reduce((s,t) => s+(t.amount||0), 0)
  const netProfit      = totalIncome - totalExpense
  const totalPurchases = purchaseOrders.reduce((s,o) => s+(o.total||0), 0)
  const stockValue     = stockProducts.reduce((s,p) => s+(p.currentStock||0)*(p.purchasePrice||0), 0)
  const lowStockCount  = [...stockProducts.filter(p=>p.currentStock<=p.minStock), ...consumables.filter(c=>c.stock<=c.minStock)].length
  const activeEmployees= employees.filter(e=>e.status==='active').length
  const activeClients  = clients.filter(c=>c.status==='ACTIVE' || c.status==='active').length
  const jobsDone       = productionJobs.filter(j=>j.status==='termine').length
  const jobsActive     = productionJobs.filter(j=>j.status!=='termine').length

  /* ── Section renderer ── */
  const section = (icon: string, color: string, title: string, count: string, headers: string[], rows: string[][]) => `
    <div class="section">
      <div class="section-header" style="background:${color}18;border-left:4px solid ${color}">
        <div class="section-icon" style="background:${color}">${icon}</div>
        <div class="section-title">${esc(title)}</div>
        <div class="section-count" style="background:${color}22;color:${color}">${esc(count)}</div>
      </div>
      ${rows.length === 0 ? `<div class="no-data">Aucune donnée disponible pour cette période</div>` : `
      <table>
        <thead><tr>${['#', ...headers].map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.slice(0,20).map((row,i) => `<tr>${[String(i+1),...row].map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
          ${rows.length > 20 ? `<tr class="more-row"><td colspan="${headers.length+1}">... et ${rows.length-20} autre(s) enregistrement(s)</td></tr>` : ''}
        </tbody>
      </table>`}
    </div>`

  /* ── Construire les sections ── */
  const sections = [
    section('💰', '#059669', 'FACTURES ET REVENUS', `${invoices.length} facture(s)`,
      ['N° Facture','Client','Service','Total','Payé','Solde','Statut','Date'],
      invoices.map(i => [i.number||i.id, i.client, i.service||'—',
        formatCurrency(i.total), formatCurrency(i.paid), formatCurrency(i.balance),
        i.status, i.createdAt?new Date(i.createdAt).toLocaleDateString('fr-FR'):'—'])
    ),
    section('🛒', '#2563EB', 'COMMANDES COMMERCIALES', `${orders.length} commande(s)`,
      ['Référence','Client','Montant','Statut','Date commande','Date livraison'],
      orders.map(o => [o.orderNumber||o.id,
        typeof o.client==='object'?o.client.name:String(o.client||'—'),
        formatCurrency(o.total), o.status,
        o.createdAt?new Date(o.createdAt).toLocaleDateString('fr-FR'):'—',
        o.deliveryDate?new Date(o.deliveryDate).toLocaleDateString('fr-FR'):'—'])
    ),
    section('📋', '#7C3AED', 'DEVIS', `${quotes.length} devis`,
      ['N° Devis','Client','Service','Montant','Statut','Validité'],
      quotes.map(q => [q.quoteNumber||q.id,
        typeof q.client==='object'?q.client.name:String(q.client||'—'),
        q.service||'—', formatCurrency(q.total), q.status,
        q.validUntil?new Date(q.validUntil).toLocaleDateString('fr-FR'):'—'])
    ),
    section('💳', '#0D9488', 'TRANSACTIONS FINANCIÈRES', `${transactions.length} transaction(s)`,
      ['Date','Type','Description','Montant','Méthode','Référence'],
      transactions.map(t => [t.date, t.type==='income'?'✅ Entrée':'🔴 Sortie',
        t.description||'—', formatCurrency(t.amount), t.method||'—', t.reference||'—'])
    ),
    section('📦', '#D97706', 'STOCK PRODUITS', `${stockProducts.length} produit(s)`,
      ['Code','Produit','Catégorie','Stock actuel','Stock min','Valeur stock','Fournisseur'],
      stockProducts.map(p => [p.code, p.name, p.category||'—',
        `${p.currentStock} ${p.unit}`, `${p.minStock} ${p.unit}`,
        formatCurrency((p.currentStock||0)*(p.purchasePrice||0)), p.supplier||'—'])
    ),
    section('🔧', '#EF4444', 'ACHATS FOURNISSEURS', `${purchaseOrders.length} bon(s) d'achat`,
      ['N° Bon','Fournisseur','Montant','Statut','Date commande','Livraison prévue'],
      purchaseOrders.map(o => [o.orderNumber||o.id,
        typeof o.supplier==='object'?o.supplier.name:String(o.supplier||'—'),
        formatCurrency(o.total), o.status,
        o.createdAt?new Date(o.createdAt).toLocaleDateString('fr-FR'):'—',
        o.expectedDate?new Date(o.expectedDate).toLocaleDateString('fr-FR'):'—'])
    ),
    section('🖨️', '#7C3AED', 'PRODUCTION IMPRIMERIE', `${productionJobs.length} travail(x)`,
      ['Référence','Client','Type','Machine','Opérateur','Priorité','Statut','Progression'],
      productionJobs.map(j => [j.ref||j.id, j.client||'—', j.type||'—',
        j.machine||'—', j.operator||'—', j.priority||'—', j.status||'—',
        `${j.progress||0}%`])
    ),
    section('👥', '#0D9488', 'EMPLOYÉS', `${employees.length} employé(s)`,
      ['Matricule','Prénom','Nom','Fonction','Département','Contrat','Statut'],
      employees.map(e => [e.matricule||'—', e.firstName, e.lastName,
        e.function||'—', e.department||'—', e.contractType||'—',
        e.status==='active'?'✅ Actif':e.status==='leave'?'🟡 Congé':'🔴 Inactif'])
    ),
    section('🤝', '#4F46E5', 'CLIENTS', `${clients.length} client(s)`,
      ['Code','Prénom','Nom','Entreprise','Ville','Catégorie','Total dépensé','Commandes'],
      clients.map(c => [c.code, c.firstName, c.lastName,
        c.companyName||'—', c.city||'—',
        c.category==='COMPANY'?'Entreprise':'Individuel',
        formatCurrency(c.totalSpent), String(c.ordersCount||0)])
    ),
    section('🏭', '#F59E0B', 'FOURNISSEURS', `${suppliers.length} fournisseur(s)`,
      ['Code','Nom','Total achats','Statut'],
      suppliers.map(s => [s.code||'—', s.name, formatCurrency(s.totalPurchases||0), s.status||'—'])
    ),
  ]

  /* ═══════════════════════════════
     HTML COMPLET DU RAPPORT
  ═══════════════════════════════ */
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Rapport Général — ALBA SERVICE GROUP</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#F1F5F9;color:#1E293B;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:1050px;margin:14px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}

    /* ── EN-TÊTE ── */
    .header{background:linear-gradient(135deg,#06103A 0%,#0F2460 30%,#1E3A8A 60%,#1D4ED8 100%);position:relative;overflow:hidden}
    .header::before{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,0.055) 1px,transparent 1px);background-size:22px 22px}
    .header-row{display:flex;align-items:stretch;position:relative;z-index:1}

    /* Logo */
    .h-logo{padding:22px 22px;display:flex;align-items:center;gap:14px;border-right:1px solid rgba(255,255,255,0.13);flex-shrink:0;min-width:220px}
    .logo-box{width:74px;height:74px;border-radius:14px;background:rgba(255,255,255,0.14);border:2px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}
    .logo-box img{width:60px;height:60px;object-fit:contain}
    .co-name{font-size:15px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.2}
    .co-tag{font-size:8.5px;color:rgba(147,197,253,0.8);font-style:italic;margin:3px 0 7px}
    .co-info span{display:block;font-size:8.5px;color:rgba(255,255,255,0.62);line-height:1.8}

    /* Titre central */
    .h-title{flex:1;padding:22px 28px;display:flex;flex-direction:column;justify-content:center}
    .gen-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.24);border-radius:20px;padding:4px 12px;margin-bottom:9px;width:fit-content}
    .gen-dot{width:6px;height:6px;border-radius:50%;background:#34D399}
    .gen-label{font-size:9px;font-weight:800;color:rgba(255,255,255,0.9);letter-spacing:0.12em;text-transform:uppercase}
    .rpt-main-title{font-size:26px;font-weight:900;color:#fff;letter-spacing:0.04em;line-height:1.1}
    .rpt-main-sub{font-size:12px;color:rgba(147,197,253,0.88);margin-top:5px;font-weight:500}
    .meta-grid{display:flex;flex-wrap:wrap;gap:16px;margin-top:11px}
    .meta-item{display:flex;align-items:baseline;gap:5px}
    .meta-key{font-size:8px;color:rgba(147,197,253,0.62);font-weight:700;text-transform:uppercase;letter-spacing:0.09em;white-space:nowrap}
    .meta-val{font-size:10px;color:#fff;font-weight:700}
    .meta-val.mono{font-family:monospace;color:#93C5FD}

    /* Drapeau */
    .h-flag{padding:22px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-left:1px solid rgba(255,255,255,0.13);flex-shrink:0;gap:6px}
    .flag-frame{width:74px;height:50px;border-radius:6px;overflow:hidden;border:2.5px solid rgba(255,255,255,0.32);box-shadow:0 3px 12px rgba(0,0,0,0.35)}
    .flag-frame img{width:100%;height:100%;object-fit:cover}
    .flag-name{font-size:7.5px;color:rgba(255,255,255,0.52);font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-align:center}

    .accent-bar{height:5px;background:linear-gradient(90deg,#34D399 0%,#059669 20%,#2563EB 45%,#7C3AED 65%,#F59E0B 82%,#EF4444 100%)}

    /* ── SOUS-EN-TÊTE ── */
    .subheader{background:linear-gradient(90deg,#EFF6FF,#F0F4FF);padding:7px 26px;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #DBEAFE}
    .sys-left{display:flex;align-items:center;gap:14px}
    .sys-dot{width:7px;height:7px;border-radius:50%;background:#2563EB;flex-shrink:0}
    .sys-name{font-size:9px;color:#1E40AF;font-weight:800}
    .sys-ver{font-size:8.5px;color:#3B82F6}
    .confidential{font-size:8px;color:#6B7280}

    /* ── KPI GLOBAUX ── */
    .kpi-section{padding:18px 24px;border-bottom:1px solid #E2E8F0;background:#FAFBFF}
    .kpi-title{font-size:10px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:12px;display:flex;align-items:center;gap:7px}
    .kpi-title::before{content:'';display:inline-block;width:4px;height:14px;border-radius:2px;background:#1E3A8A;flex-shrink:0}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    .kpi-card{border-radius:12px;padding:14px 16px;border:1px solid transparent;position:relative;overflow:hidden}
    .kpi-card::before{content:'';position:absolute;top:-10px;right:-10px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.1)}
    .kpi-label{font-size:8.5px;color:rgba(255,255,255,0.8);font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px}
    .kpi-value{font-size:20px;font-weight:900;color:#fff;line-height:1}
    .kpi-sub{font-size:8px;color:rgba(255,255,255,0.65);margin-top:3px}

    /* ── SECTIONS ── */
    .section{margin:0 24px 20px}
    .section-header{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;margin-bottom:8px}
    .section-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;color:#fff;font-style:normal}
    .section-title{flex:1;font-size:11px;font-weight:800;color:#1E293B;letter-spacing:0.04em;text-transform:uppercase}
    .section-count{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px}
    .no-data{padding:14px 16px;text-align:center;color:#9CA3AF;font-size:10px;font-style:italic;background:#F9FAFB;border-radius:8px;border:1px dashed #E2E8F0}

    /* ── TABLEAU ── */
    table{width:100%;border-collapse:collapse;font-size:9.5px}
    thead tr{background:linear-gradient(135deg,#06103A,#1E3A8A)}
    thead th{padding:7px 9px;font-size:8px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fff;text-align:left;white-space:nowrap}
    tbody tr:nth-child(even){background:#F8FAFC}
    tbody tr:nth-child(odd){background:#fff}
    tbody td{padding:6px 9px;color:#374151;border-bottom:1px solid #EDF2F7;vertical-align:middle;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis}
    tbody td:first-child{color:#9CA3AF;font-size:8px;width:26px;text-align:center}
    .more-row td{text-align:center;color:#6B7280;font-style:italic;font-size:9px;background:#F1F5F9!important;padding:8px}

    /* ── SÉPARATEUR DE SECTION ── */
    .section-sep{height:1px;background:linear-gradient(90deg,transparent,#E2E8F0,transparent);margin:4px 24px 20px}

    /* ── PIED DE PAGE ── */
    .footer{background:linear-gradient(135deg,#06103A,#1E3A8A);padding:14px 26px;margin-top:20px;display:flex;align-items:center;justify-content:space-between;border-top:5px solid #2563EB}
    .footer-left{display:flex;align-items:flex-start;gap:10px}
    .footer-logo{width:22px;height:22px;object-fit:contain;opacity:0.72;flex-shrink:0;margin-top:1px}
    .footer-text{font-size:7.5px;color:rgba(147,197,253,0.65);line-height:1.8}
    .footer-right{display:flex;align-items:center;gap:14px;flex-shrink:0}
    .page-info{font-size:8px;color:rgba(255,255,255,0.32);font-family:monospace}
    .footer-flag{width:30px;height:20px;object-fit:cover;border-radius:3px;border:1px solid rgba(255,255,255,0.22);opacity:0.72}

    /* ── IMPRESSION ── */
    @page{size:A4 landscape;margin:9mm 7mm}
    @media print{
      body{background:#fff!important}
      .page{box-shadow:none!important;margin:0!important;border-radius:0!important}
      .section{page-break-inside:avoid}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- EN-TÊTE -->
  <div class="header">
    <div class="header-row">
      <div class="h-logo">
        <div class="logo-box"><img src="/alba-logo.png" alt="ALBA"/></div>
        <div>
          <div class="co-name">ALBA SERVICE GROUP</div>
          <div class="co-tag">L'excellence au service de vos projets</div>
          <div class="co-info">
            <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
            <span>📞 +243 XXX XXX XXX</span>
            <span>✉ contact@alba-service.com</span>
            <span>🌐 www.alba-service.com</span>
          </div>
        </div>
      </div>

      <div class="h-title">
        <div class="gen-badge">
          <div class="gen-dot"></div>
          <span class="gen-label">Rapport Général Consolidé</span>
        </div>
        <div class="rpt-main-title">RAPPORT GÉNÉRAL D'ENTREPRISE</div>
        <div class="rpt-main-sub">Toutes opérations consolidées — ${esc(periodLabel)}</div>
        <div class="meta-grid">
          <div class="meta-item"><span class="meta-key">Période :</span><span class="meta-val">${esc(periodLabel)}</span></div>
          <div class="meta-item"><span class="meta-key">Date :</span><span class="meta-val">${esc(dateStr)}</span></div>
          <div class="meta-item"><span class="meta-key">Heure :</span><span class="meta-val">${esc(timeStr)}</span></div>
          <div class="meta-item"><span class="meta-key">Référence :</span><span class="meta-val mono">${esc(ref)}</span></div>
        </div>
      </div>

      <div class="h-flag">
        <div class="flag-frame"><img src="/rdc-flag.jpg" alt="Drapeau RDC"/></div>
        <span class="flag-name">R.D. Congo</span>
      </div>
    </div>
    <div class="accent-bar"></div>
  </div>

  <!-- SOUS-EN-TÊTE -->
  <div class="subheader">
    <div class="sys-left">
      <div style="display:flex;align-items:center;gap:5px"><div class="sys-dot"></div><span class="sys-name">ALBA SERVICE GROUP PLATFORM</span></div>
      <span style="color:#93C5FD">|</span>
      <span class="sys-ver">Système de Gestion Intégré — v1.0.0</span>
    </div>
    <span class="confidential">🔒 Document confidentiel — Usage interne uniquement</span>
  </div>

  <!-- KPI GLOBAUX -->
  <div class="kpi-section">
    <div class="kpi-title">Indicateurs Financiers & Opérationnels Globaux</div>
    <div class="kpi-grid">
      <div class="kpi-card" style="background:linear-gradient(135deg,#059669,#10B981)">
        <div class="kpi-label">Chiffre d'Affaires</div>
        <div class="kpi-value">${esc(formatCurrency(totalCA))}</div>
        <div class="kpi-sub">${esc(invoices.length)} facture(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#16A34A,#22C55E)">
        <div class="kpi-label">Montant Encaissé</div>
        <div class="kpi-value">${esc(formatCurrency(totalPaid))}</div>
        <div class="kpi-sub">Paiements reçus</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#DC2626,#EF4444)">
        <div class="kpi-label">Solde Impayé</div>
        <div class="kpi-value">${esc(formatCurrency(totalUnpaid))}</div>
        <div class="kpi-sub">À recouvrer</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#0D9488,#14B8A6)">
        <div class="kpi-label">Revenus Caisse</div>
        <div class="kpi-value">${esc(formatCurrency(totalIncome))}</div>
        <div class="kpi-sub">${esc(transactions.filter(t=>t.type==='income').length)} transaction(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#D97706,#F59E0B)">
        <div class="kpi-label">Dépenses Totales</div>
        <div class="kpi-value">${esc(formatCurrency(totalExpense))}</div>
        <div class="kpi-sub">${esc(transactions.filter(t=>t.type==='expense').length)} transaction(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,${netProfit>=0?'#059669,#10B981':'#DC2626,#EF4444'})">
        <div class="kpi-label">Bénéfice Net</div>
        <div class="kpi-value">${esc(formatCurrency(Math.abs(netProfit)))}</div>
        <div class="kpi-sub">${netProfit>=0?'Bénéfice':'Déficit'}</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#D97706,#EA580C)">
        <div class="kpi-label">Total Achats</div>
        <div class="kpi-value">${esc(formatCurrency(totalPurchases))}</div>
        <div class="kpi-sub">${esc(purchaseOrders.length)} bon(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#4F46E5,#6366F1)">
        <div class="kpi-label">Valeur Stock</div>
        <div class="kpi-value">${esc(formatCurrency(stockValue))}</div>
        <div class="kpi-sub">${esc(stockProducts.length)} produit(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#7C3AED,#8B5CF6)">
        <div class="kpi-label">Productions</div>
        <div class="kpi-value">${esc(productionJobs.length)}</div>
        <div class="kpi-sub">${esc(jobsDone)} terminé(s), ${esc(jobsActive)} actif(s)</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#0284C7,#0EA5E9)">
        <div class="kpi-label">Clients Actifs</div>
        <div class="kpi-value">${esc(activeClients)}</div>
        <div class="kpi-sub">/ ${esc(clients.length)} total</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#0D9488,#0F766E)">
        <div class="kpi-label">Employés Actifs</div>
        <div class="kpi-value">${esc(activeEmployees)}</div>
        <div class="kpi-sub">/ ${esc(employees.length)} total</div>
      </div>
      <div class="kpi-card" style="background:linear-gradient(135deg,#BE185D,#EC4899)">
        <div class="kpi-label">Alertes Stock</div>
        <div class="kpi-value">${esc(lowStockCount)}</div>
        <div class="kpi-sub">Article(s) en rupture</div>
      </div>
    </div>
  </div>

  <!-- SECTIONS DÉTAILLÉES -->
  ${sections.map((s,i) => `${s}${i < sections.length-1 ? '<div class="section-sep"></div>' : ''}`).join('')}

  <!-- PIED DE PAGE -->
  <div class="footer">
    <div class="footer-left">
      <img class="footer-logo" src="/alba-logo.png" alt="ALBA"/>
      <div class="footer-text">
        © ${now.getFullYear()} <strong style="color:rgba(255,255,255,0.6)">ALBA SERVICE GROUP</strong> · Kindu, Province du Maniema, République Démocratique du Congo<br/>
        📍 Avenue Lumumba, Kindu — 📞 +243 XXX XXX XXX — ✉ contact@alba-service.com<br/>
        Rapport général consolidé généré le ${esc(dateStr)} à ${esc(timeStr)} · Réf : ${esc(ref)} · Tous droits réservés
      </div>
    </div>
    <div class="footer-right">
      <span class="page-info">Rapport Général · ${esc(ref)}</span>
      <img class="footer-flag" src="/rdc-flag.jpg" alt="RDC"/>
    </div>
  </div>

</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},1000)})</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=860')
  if (!win) { alert('Veuillez autoriser les popups pour générer le rapport.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [period, setPeriod] = useState('all')

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<CommercialOrder[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      setFetching(true)
      try {
        const [invRes, ordRes, quotRes, txRes, purRes, empRes, cliRes, stkRes, supRes] = await Promise.allSettled([
          api.get('/commercial/invoices'),
          api.get('/commercial/orders'),
          api.get('/commercial/quotes'),
          api.get('/finance/revenues?limit=200'),
          api.get('/stock/suppliers'),
          api.get('/users'),
          api.get('/customers'),
          api.get('/stock/products'),
          api.get('/stock/suppliers'),
        ])

        const extract = (r: PromiseSettledResult<any>) =>
          r.status === 'fulfilled' ? (Array.isArray(r.value.data) ? r.value.data : r.value.data?.data || r.value.data?.items || []) : []

        // Map backend data to frontend types
        const rawInvoices = extract(invRes)
        setInvoices(rawInvoices.map((i: any) => {
          const paid = i.paid || (i.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
          return {
            id: i.id, number: i.invoiceNumber || i.number || i.id, client: i.customer?.companyName || i.customer?.firstName || '—',
            service: i.service || '', items: i.items || [], total: i.total || 0,
            paid, balance: (i.total || 0) - paid,
            status: i.status || 'DRAFT', dueDate: i.dueDate || '', createdAt: i.createdAt || '',
          }
        }))

        const rawOrders = extract(ordRes)
        setOrders(rawOrders.map((o: any) => ({
          id: o.id, orderNumber: o.orderNumber || o.id,
          client: { name: o.customer?.companyName || o.customer?.firstName || '—', contact: '' },
          items: o.items || [], total: o.total || 0,
          status: o.status || 'PENDING', createdAt: o.createdAt || '', deliveryDate: o.deliveryDate || '',
        })))

        const rawQuotes = extract(quotRes)
        setQuotes(rawQuotes.map((q: any) => ({
          id: q.id, quoteNumber: q.quoteNumber || q.id,
          client: { name: q.customer?.companyName || q.customer?.firstName || '—' },
          service: q.service || '', total: q.total || 0,
          status: q.status || 'DRAFT', validUntil: q.validUntil || '', createdAt: q.createdAt || '',
        })))

        const rawTx = extract(txRes)
        setTransactions(rawTx.map((t: any) => ({
          id: t.id, date: (t.createdAt || t.date || '').split(' ')[0] || '', type: t.type === 'INCOME' || t.type === 'income' ? 'income' as const : 'expense' as const,
          description: t.description || t.reference || '', amount: t.amount || 0,
          method: t.paymentMethod || t.method || '', reference: t.reference || '',
        })))

        setPurchaseOrders(extract(purRes).map((o: any) => ({
          id: o.id, orderNumber: o.orderNumber || o.reference || o.id,
          supplier: { name: o.supplier?.name || '—', phone: o.supplier?.phone || '' },
          items: o.items || [], total: o.total || 0,
          status: (o.status || 'PENDING').toLowerCase(), createdAt: o.createdAt || o.orderDate || '', expectedDate: o.expectedDate || '',
        })))

        setEmployees(extract(empRes).map((e: any) => ({
          id: e.id, matricule: e.id.slice(-8).toUpperCase(),
          firstName: e.firstName || '', lastName: e.lastName || '',
          function: e.position || '', department: typeof e.department === 'object' ? e.department?.name || '' : e.department || '',
          agency: typeof e.branch === 'object' ? e.branch?.name || '' : e.branch || '',
          contractType: e.contractType || 'CDI',
          hireDate: e.createdAt || e.hireDate || '',
          status: (e.status === 'INACTIVE') ? 'inactive' as const : 'active' as const,
          salary: e.salary || 0,
        })))

        setClients(extract(cliRes).map((c: any) => ({
          id: c.id, code: c.code || '', firstName: c.firstName || '', lastName: c.lastName || '',
          companyName: c.companyName || '', email: c.email || '', phone: c.phone || '',
          category: c.category || 'INDIVIDUAL', status: c.status || 'ACTIVE',
          totalSpent: c.totalRevenue || c.totalSpent || 0, ordersCount: c.totalOrders || c.ordersCount || 0, createdAt: c.createdAt || '',
        })))

        setStockProducts(extract(stkRes).map((p: any) => ({
          id: p.id, code: p.code || p.sku || '', name: p.name || '', category: p.category?.name || '',
          unit: p.unit?.name || p.unit || 'unité', purchasePrice: p.purchasePrice || p.costPrice || 0, salePrice: p.sellingPrice || p.price || 0,
          currentStock: p.currentStock || p.quantity || 0, minStock: p.minStock || 0,
          supplier: p.supplier?.name || '', location: '',
        })))

        setSuppliers(extract(supRes).map((s: any) => ({
          id: s.id, code: s.code || '', name: s.name || '', contactName: s.contactName || '',
          phone: s.phone || '', email: s.email || '', address: s.address || '',
          totalPurchases: s.totalPurchases || 0, status: s.isActive !== false ? 'active' : 'inactive',
        })))
      } catch (err) {
        console.error('Reports fetch error:', err)
      } finally {
        setFetching(false)
      }
    }
    fetchAll()
  }, [])

  const fInvoices = useMemo(() => invoices.filter(i => isDateInRange(i.createdAt, period)), [invoices, period])
  const fOrders = useMemo(() => orders.filter(o => isDateInRange(o.createdAt, period)), [orders, period])
  const fQuotes = useMemo(() => quotes.filter(q => isDateInRange(q.createdAt, period)), [quotes, period])
  const fTransactions = useMemo(() => transactions.filter(t => isDateInRange(t.date.split(' ')[0] || t.date, period)), [transactions, period])
  const fJobs = useMemo(() => productionJobs.filter(j => isDateInRange(j.startDate, period)), [productionJobs, period])
  const fPurchases = useMemo(() => purchaseOrders.filter(o => isDateInRange(o.createdAt, period)), [purchaseOrders, period])

  return (
    <div className="space-y-6 animate-fade-in">
      {fetching && (
        <div className="flex items-center justify-center py-4 bg-indigo-50 rounded-xl mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-2"></div>
          <span className="text-xs text-indigo-600 font-medium">Chargement des données...</span>
        </div>
      )}
      <PageHeader
        title="Rapports & Statistiques"
        subtitle="Analyses et rapports de gestion - donnees en temps reel"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Rapports' }]}
        icon={<BarChart3 size={22}/>}
        iconBg="gradient-primary"
        actions={
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {PERIOD_OPTIONS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    period === p.value ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>{p.label}</button>
              ))}
            </div>
            {/* ─── Bouton Rapport Général ─── */}
            <button
              onClick={() => generateGlobalReport(
                fInvoices, fOrders, fQuotes, fTransactions,
                stockProducts, consumables, fPurchases, suppliers,
                fJobs, employees, clients, period
              )}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
              title="Générer le rapport général consolidé de toutes les opérations">
              <Printer size={15}/>
              Rapport Général
            </button>
          </div>
        }
      />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-6">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r text-white shadow-md ' + tab.color
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'overview' && <OverviewTab invoices={fInvoices} orders={fOrders} quotes={fQuotes} transactions={fTransactions} clients={clients} jobs={fJobs} employees={employees} stockProducts={stockProducts}/>}
          {activeTab === 'commercial' && <CommercialTab invoices={fInvoices} orders={fOrders} quotes={fQuotes}/>}
          {activeTab === 'finance' && <FinanceTab transactions={fTransactions} budgetLines={budgetLines} invoices={fInvoices}/>}
          {activeTab === 'stock' && <StockTab stockProducts={stockProducts} consumables={consumables} purchaseOrders={fPurchases} suppliers={suppliers}/>}
          {activeTab === 'production' && <ProductionTab jobs={fJobs} machines={machines}/>}
          {activeTab === 'rh' && <RHTab employees={employees}/>}
          {activeTab === 'clients' && <ClientsTab clients={clients} invoices={fInvoices} orders={fOrders}/>}
          {activeTab === 'daily' && <DailyReportsTab invoices={fInvoices} orders={fOrders} quotes={fQuotes} transactions={fTransactions} productionJobs={fJobs} purchaseOrders={fPurchases} employees={employees} clients={clients}/>}
        </div>
      </div>
    </div>
  )
}

function RHTab({ employees }: { employees: Employee[] }) {
  const byDept = useMemo(() => {
    const map: Record<string, number> = {}
    employees.forEach(e => { map[e.department] = (map[e.department] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [employees])

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    employees.forEach(e => { map[e.status] = (map[e.status] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [employees])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={<Users size={20}/>} title="Total employés" value={employees.length} gradient="gradient-primary" />
        <KpiCard icon={<UserCheck size={20}/>} title="Actifs" value={employees.filter(e => e.status === 'active').length} gradient="gradient-success" />
        <KpiCard icon={<Briefcase size={20}/>} title="Départements" value={byDept.length} gradient="gradient-purple" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Employés par département" subtitle="Répartition" exportData={byDept} exportFilename="rh-departement" exportTitle="RH par département">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byDept} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Bar dataKey="count" name="Employés" radius={[6, 6, 0, 0]}>
                {byDept.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Statut des employés" subtitle="Répartition" exportData={byStatus} exportFilename="rh-statut" exportTitle="RH statut">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ClientsTab({ clients, invoices, orders }: { clients: Client[]; invoices: Invoice[]; orders: CommercialOrder[] }) {
  const clientRevenue = useMemo(() => {
    const map: Record<string, number> = {}
    invoices.forEach(inv => { map[inv.client] = (map[inv.client] || 0) + inv.total })
    return clients.map(c => ({ name: c.firstName + ' ' + c.lastName, revenue: map[c.firstName + ' ' + c.lastName] || map[c.companyName] || 0 })).filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
  }, [clients, invoices])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    clients.forEach(c => { map[c.category] = (map[c.category] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [clients])

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    clients.forEach(c => { map[c.status] = (map[c.status] || 0) + 1 })
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [clients])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={<Users size={20}/>} title="Total clients" value={clients.length} gradient="gradient-primary" />
        <KpiCard icon={<TrendingUp size={20}/>} title="CA total" value={formatCurrency(clients.reduce((s, c) => s + c.totalSpent, 0))} gradient="gradient-success" />
        <KpiCard icon={<ShoppingCart size={20}/>} title="Commandes" value={orders.length} gradient="gradient-warning" />
        <KpiCard icon={<UserCheck size={20}/>} title="Actifs" value={clients.filter(c => c.status === 'active').length} gradient="gradient-teal" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top clients par CA" subtitle="Classement" exportData={clientRevenue} exportFilename="clients-top" exportTitle="Top clients">
          <div className="space-y-3">
            {clientRevenue.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="text-gray-700 font-medium">{c.name}</span>
                </div>
                <span className="text-gray-900 font-bold">{formatCurrency(c.revenue)}</span>
              </div>
            ))}
            {clientRevenue.length === 0 && <div className="text-center text-gray-400 text-sm py-4">Aucune donnée</div>}
          </div>
        </ChartCard>
        <ChartCard title="Clients par catégorie" subtitle="Répartition" exportData={byCategory} exportFilename="clients-categorie" exportTitle="Clients par catégorie">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function OverviewTab({ invoices, orders, quotes, transactions, clients, jobs, employees, stockProducts }: {
  invoices: Invoice[]; orders: CommercialOrder[]; quotes: Quote[];
  transactions: Transaction[]; clients: Client[]; jobs: ProductionJob[];
  employees: Employee[]; stockProducts: StockProduct[];
}) {
  const totalCA = invoices.reduce((s, i) => s + i.total, 0)
  const unpaidCount = invoices.filter(i => i.balance > 0).length

  const monthlyRevenue = useMemo(() => {
    const map: Record<number, { month: string; revenus: number; depenses: number }> = {}
    for (let m = 0; m < 12; m++) map[m] = { month: MONTHS_FR[m], revenus: 0, depenses: 0 }
    invoices.forEach(inv => { map[extractMonth(inv.createdAt)].revenus += inv.total })
    transactions.forEach(t => {
      const m = extractMonth(t.date)
      if (t.type === 'income') map[m].revenus += t.amount
      else map[m].depenses += t.amount
    })
    return Object.values(map).filter(d => d.revenus > 0 || d.depenses > 0)
  }, [invoices, transactions])

  const topClientsByRevenue = useMemo(() => {
    const map: Record<string, { name: string; total: number; orders: number }> = {}
    invoices.forEach(inv => {
      if (!map[inv.client]) map[inv.client] = { name: inv.client, total: 0, orders: 0 }
      map[inv.client].total += inv.total
      map[inv.client].orders += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [invoices])

  const ordersByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1 })
    const sl: Record<string, string> = { pending: 'En attente', confirmed: 'Confirmee', processing: 'En cours', shipped: 'Expediee', delivered: 'Livree', cancelled: 'Annulee' }
    return Object.entries(map).map(([k, v]) => ({ name: sl[k] || k, value: v }))
  }, [orders])

  const lowStockCount = stockProducts.filter(p => p.currentStock <= p.minStock).length

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Chiffre d'affaires" value={formatCurrency(totalCA)} icon={<TrendingUp size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Clients actifs" value={clients.length.toString()} icon={<Users size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Commandes" value={orders.length.toString()} icon={<ShoppingCart size={20}/>} gradient="gradient-purple"/>
        <KpiCard title="Factures impayees" value={unpaidCount.toString()} icon={<AlertTriangle size={20}/>} gradient="gradient-danger"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Evolution du chiffre d'affaires" subtitle="Revenus et depenses mensuels" className="lg:col-span-2"
          exportData={monthlyRevenue.map(d => ({ Mois: d.month, Revenus: d.revenus, Depenses: d.depenses }))}
          exportFilename="evolution-ca" exportTitle="Evolution du CA">
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/><stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ovExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`}/>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                <Area type="monotone" dataKey="revenus" name="Revenus" stroke="#2563EB" strokeWidth={2.5} fill="url(#ovRev)" dot={false}/>
                <Area type="monotone" dataKey="depenses" name="Depenses" stroke="#EF4444" strokeWidth={2} fill="url(#ovExp)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnee disponible</div>
          )}
        </ChartCard>

        <ChartCard title="Commandes par statut" subtitle="Repartition actuelle"
          exportData={ordersByStatus} exportFilename="commandes-statut" exportTitle="Commandes par statut">
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {ordersByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none"/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucune commande</div>
          )}
          <div className="space-y-1.5 mt-2">
            {ordersByStatus.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                  <span className="text-xs text-gray-600">{s.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top 5 clients par chiffre d'affaires" subtitle="Classement par montant facture"
        exportData={topClientsByRevenue.map(c => ({ Client: c.name, CA: c.total, Commandes: c.orders }))}
        exportFilename="top-clients" exportTitle="Top clients">
        <div className="space-y-3">
          {topClientsByRevenue.length > 0 ? topClientsByRevenue.map((c, i) => {
            const max = topClientsByRevenue[0]?.total || 1
            const pct = (c.total / max) * 100
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-bold text-gray-800">{formatCurrency(c.total)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400" style={{ width: `${pct}%` }}/>
                </div>
              </div>
            )
          }          ) : (
            <div className="text-center text-gray-400 text-sm py-8">Aucune donnee client</div>
          )}
        </div>
      </ChartCard>
    </>
  )
}

function CommercialTab({ invoices, orders, quotes }: {
  invoices: Invoice[]; orders: CommercialOrder[]; quotes: Quote[];
}) {
  const totalQuotes = quotes.length
  const totalOrders = orders.length
  const totalInvoices = invoices.length
  const convQO = totalQuotes > 0 ? ((totalOrders / totalQuotes) * 100).toFixed(1) : '0'
  const convOI = totalOrders > 0 ? ((totalInvoices / totalOrders) * 100).toFixed(1) : '0'

  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {}
    invoices.forEach(inv => { map[inv.service || 'Autre'] = (map[inv.service || 'Autre'] || 0) + inv.total })
    return Object.entries(map).map(([name, revenue]) => ({ name: name.length > 22 ? name.slice(0, 20) + '...' : name, revenue }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [invoices])

  const topClients = useMemo(() => {
    const map: Record<string, { name: string; total: number; invoices: number; paid: number }> = {}
    invoices.forEach(inv => {
      if (!map[inv.client]) map[inv.client] = { name: inv.client, total: 0, invoices: 0, paid: 0 }
      map[inv.client].total += inv.total; map[inv.client].invoices += 1; map[inv.client].paid += inv.paid
    })
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
  }, [invoices])

  const quotesStatus = useMemo(() => {
    const map: Record<string, number> = {}
    quotes.forEach(q => { map[q.status] = (map[q.status] || 0) + 1 })
    const sl: Record<string, string> = { draft: 'Brouillon', sent: 'Envoye', accepted: 'Accepte', rejected: 'Refuse', expired: 'Expire' }
    return Object.entries(map).map(([k, v]) => ({ name: sl[k] || k, value: v }))
  }, [quotes])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Devis" value={totalQuotes.toString()} icon={<FileText size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Commandes" value={totalOrders.toString()} icon={<ShoppingCart size={20}/>} gradient="gradient-purple"/>
        <KpiCard title="Factures" value={totalInvoices.toString()} icon={<ClipboardList size={20}/>} gradient="gradient-teal"/>
        <KpiCard title="Conv. devis -> cmd" value={`${convQO}%`} icon={<Target size={20}/>} gradient="gradient-success"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="CA par type de service" subtitle="Repartition des revenus"
          exportData={revenueByService} exportFilename="ca-par-service" exportTitle="CA par service">
          {revenueByService.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByService} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                <Bar dataKey="revenue" name="Revenus" radius={[6, 6, 0, 0]}>
                  {revenueByService.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnee</div>
          )}
        </ChartCard>

        <ChartCard title="Statut des devis" subtitle="Repartition"
          exportData={quotesStatus} exportFilename="statut-devis" exportTitle="Statut des devis">
          {quotesStatus.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={quotesStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {quotesStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none"/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {quotesStatus.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-xs text-gray-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucun devis</div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Top clients performants" subtitle="Classement par chiffre d'affaires"
        exportData={topClients.map(c => ({ Client: c.name, CA: c.total, Factures: c.invoices, Paye: c.paid }))}
        exportFilename="top-clients-commercial" exportTitle="Top clients">
        {topClients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">#</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">CA Total</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Factures</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Paye</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Reste</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 text-xs text-gray-400">{i + 1}</td>
                    <td className="py-2.5 text-xs font-medium text-gray-800">{c.name}</td>
                    <td className="py-2.5 text-xs font-bold text-gray-800 text-right">{formatCurrency(c.total)}</td>
                    <td className="py-2.5 text-xs text-gray-600 text-right">{c.invoices}</td>
                    <td className="py-2.5 text-xs text-green-600 font-medium text-right">{formatCurrency(c.paid)}</td>
                    <td className="py-2.5 text-xs text-red-500 font-medium text-right">{formatCurrency(c.total - c.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">Aucune donnee</div>
        )}
      </ChartCard>
    </>
  )
}

function FinanceTab({ transactions, budgetLines, invoices }: {
  transactions: Transaction[]; budgetLines: BudgetLine[]; invoices: Invoice[];
}) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const cashFlow = totalIncome - totalExpense

  const monthlyFinance = useMemo(() => {
    const map: Record<number, { month: string; revenus: number; depenses: number; benefice: number }> = {}
    for (let m = 0; m < 12; m++) map[m] = { month: MONTHS_FR[m], revenus: 0, depenses: 0, benefice: 0 }
    transactions.forEach(t => {
      const m = extractMonth(t.date)
      if (t.type === 'income') map[m].revenus += t.amount
      else map[m].depenses += t.amount
    })
    Object.values(map).forEach(d => { d.benefice = d.revenus - d.depenses })
    return Object.values(map).filter(d => d.revenus > 0 || d.depenses > 0)
  }, [transactions])

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(i => i.balance > 0).sort((a, b) => b.balance - a.balance)
  }, [invoices])

  const budgetUtil = useMemo(() =>
    budgetLines.map(b => ({
      category: b.category.length > 18 ? b.category.slice(0, 16) + '...' : b.category,
      alloue: b.allocated, depense: b.spent,
      pct: b.allocated > 0 ? ((b.spent / b.allocated) * 100).toFixed(1) : '0'
    }))
  , [budgetLines])

  const cashByMethod = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach(t => { map[t.method] = (map[t.method] || 0) + t.amount })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [transactions])

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Encaissements" value={formatCurrency(totalIncome)} icon={<TrendingUp size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Decaissements" value={formatCurrency(totalExpense)} icon={<TrendingDown size={20}/>} gradient="gradient-danger"/>
        <KpiCard title="Flux net" value={formatCurrency(cashFlow)} icon={<Wallet size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Factures impayees" value={unpaidInvoices.length.toString()} icon={<AlertTriangle size={20}/>} gradient="gradient-warning"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Revenus vs Depenses" subtitle="Flux mensuel" className="lg:col-span-2"
          exportData={monthlyFinance.map(d => ({ Mois: d.month, Revenus: d.revenus, Depenses: d.depenses, Benefice: d.benefice }))}
          exportFilename="revenus-depenses" exportTitle="Revenus vs Depenses">
          {monthlyFinance.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyFinance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                <Legend/>
                <Bar dataKey="revenus" name="Revenus" fill="#22C55E" radius={[4, 4, 0, 0]}/>
                <Bar dataKey="depenses" name="Depenses" fill="#EF4444" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune transaction</div>
          )}
        </ChartCard>

        <ChartCard title="Encaissements par methode" subtitle="Repartition"
          exportData={cashByMethod} exportFilename="methodes-paiement" exportTitle="Methodes de paiement">
          {cashByMethod.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={cashByMethod} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {cashByMethod.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none"/>)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucune donnee</div>
          )}
          <div className="space-y-1.5 mt-2">
            {cashByMethod.map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                  <span className="text-xs text-gray-600">{m.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-800">{formatCurrency(m.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Utilisation du budget" subtitle="Alloue vs Depense"
          exportData={budgetUtil.map(b => ({ Categorie: b.category, Alloue: b.alloue, Depense: b.depense, Pourcentage: b.pct + '%' }))}
          exportFilename="budget-utilisation" exportTitle="Utilisation du budget">
          {budgetUtil.length > 0 ? (
            <div className="space-y-3">
              {budgetUtil.map((b, i) => {
                const pct = parseFloat(b.pct)
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">{b.category}</span>
                      <span className={pct > 100 ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'}>{b.pct}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-gradient-to-r from-red-500 to-red-400' : pct > 80 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-green-500 to-green-400'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}/>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>Depense: {formatCurrency(b.depense)}</span>
                      <span>Alloue: {formatCurrency(b.alloue)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-gray-400 text-sm">Aucune ligne budgetaire</div>
          )}
        </ChartCard>

        <ChartCard title="Factures impayees" subtitle="A recouvrer"
          exportData={unpaidInvoices.map(i => ({ Numero: i.number, Client: i.client, Montant: i.total, Paye: i.paid, Reste: i.balance, Echeance: i.dueDate }))}
          exportFilename="factures-impayees" exportTitle="Factures impayees">
          {unpaidInvoices.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {unpaidInvoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{inv.number}</p>
                    <p className="text-[10px] text-gray-500">{inv.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-600">{formatCurrency(inv.balance)}</p>
                    <p className="text-[10px] text-gray-400">Echeance: {formatDate(inv.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-green-600 text-sm">
              <CheckCircle size={16} className="mr-2"/> Aucune facture impayee
            </div>
          )}
        </ChartCard>
      </div>
    </>
  )
}

function ProductionTab({ jobs, machines }: { jobs: ProductionJob[]; machines: Machine[] }) {
  const jobsByStatus = useMemo(() => {
    const map: Record<string, number> = {}
    jobs.forEach(j => { map[j.status] = (map[j.status] || 0) + 1 })
    const sl: Record<string, string> = { preparation: 'Preparation', impression: 'Impression', finition: 'Finition', controle: 'Controle', livraison: 'Livraison', termine: 'Termine' }
    return Object.entries(map).map(([k, v]) => ({ name: sl[k] || k, value: v }))
  }, [jobs])

  const jobsByPriority = useMemo(() => {
    const map: Record<string, number> = {}
    jobs.forEach(j => { map[j.priority] = (map[j.priority] || 0) + 1 })
    const sl: Record<string, string> = { urgent: 'Urgent', high: 'Eleve', normal: 'Normal', low: 'Bas' }
    return Object.entries(map).map(([k, v]) => ({ name: sl[k] || k, value: v }))
  }, [jobs])

  const machineUtil = useMemo(() => {
    const map: Record<string, { name: string; jobs: number; status: string; operator: string }> = {}
    jobs.forEach(j => {
      if (!map[j.machine]) map[j.machine] = { name: j.machine, jobs: 0, status: '', operator: j.operator }
      map[j.machine].jobs += 1
    })
    machines.forEach(m => {
      if (map[m.name]) { map[m.name].status = m.status; map[m.name].operator = m.operator }
    })
    return Object.values(map).sort((a, b) => b.jobs - a.jobs)
  }, [jobs, machines])

  const operatorProd = useMemo(() => {
    const map: Record<string, { name: string; jobs: number; completed: number; inProgress: number }> = {}
    jobs.forEach(j => {
      if (!map[j.operator]) map[j.operator] = { name: j.operator, jobs: 0, completed: 0, inProgress: 0 }
      map[j.operator].jobs += 1
      if (j.status === 'termine') map[j.operator].completed += 1
      else map[j.operator].inProgress += 1
    })
    return Object.values(map).sort((a, b) => b.completed - a.completed)
  }, [jobs])

  const activeJobs = jobs.filter(j => j.status !== 'termine')
  const completedJobs = jobs.filter(j => j.status === 'termine')
  const urgentJobs = jobs.filter(j => j.priority === 'urgent' && j.status !== 'termine')

  const priorityColors: Record<string, string> = { urgent: '#EF4444', high: '#F59E0B', normal: '#2563EB', low: '#9CA3AF' }
  const statusColors: Record<string, string> = { preparation: '#9CA3AF', impression: '#2563EB', finition: '#F59E0B', controle: '#0D9488', livraison: '#7C3AED', termine: '#22C55E' }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Travaux actifs" value={activeJobs.length.toString()} icon={<Printer size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Termines" value={completedJobs.length.toString()} icon={<CheckCircle size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Urgents" value={urgentJobs.length.toString()} icon={<AlertTriangle size={20}/>} gradient="gradient-danger"/>
        <KpiCard title="Machines" value={machines.length.toString()} icon={<ClipboardList size={20}/>} gradient="gradient-teal"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Travaux par statut" subtitle="Repartition"
          exportData={jobsByStatus} exportFilename="production-statut" exportTitle="Travaux par statut">
          {jobsByStatus.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={jobsByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {jobsByStatus.map((_, i) => <Cell key={i} fill={Object.values(statusColors)[i % 6]} stroke="none"/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {jobsByStatus.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: Object.values(statusColors)[i % 6] }}/>
                      <span className="text-xs text-gray-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucun travail</div>
          )}
        </ChartCard>

        <ChartCard title="Travaux par priorite" subtitle="Repartition"
          exportData={jobsByPriority} exportFilename="production-priorite" exportTitle="Travaux par priorite">
          {jobsByPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={jobsByPriority} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip/>
                <Bar dataKey="value" name="Nombre" radius={[6, 6, 0, 0]}>
                  {jobsByPriority.map((entry, i) => {
                    const keys = Object.keys(priorityColors)
                    return <Cell key={i} fill={priorityColors[keys[i]] || '#2563EB'}/>
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Aucun travail</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Utilisation des machines" subtitle="Nombre de travaux par machine"
          exportData={machineUtil.map(m => ({ Machine: m.name, Travaux: m.jobs, Statut: m.status, Operateur: m.operator }))}
          exportFilename="utilisation-machines" exportTitle="Utilisation des machines">
          {machineUtil.length > 0 ? (
            <div className="space-y-3">
              {machineUtil.map((m, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{m.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      m.status === 'service' ? 'bg-green-100 text-green-700' :
                      m.status === 'maintenance' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{m.status === 'service' ? 'En service' : m.status === 'maintenance' ? 'Maintenance' : 'En panne'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{m.jobs} travail{m.jobs > 1 ? 'x' : ''}</span>
                    <span>{m.operator}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-gray-400 text-sm">Aucune machine</div>
          )}
        </ChartCard>

        <ChartCard title="Productivite des operateurs" subtitle="Travaux realises"
          exportData={operatorProd.map(o => ({ Operateur: o.name, Total: o.jobs, Termines: o.completed, 'En_cours': o.inProgress }))}
          exportFilename="productivite-operateurs" exportTitle="Productivite des operateurs">
          {operatorProd.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={operatorProd} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="completed" name="Termines" fill="#22C55E" radius={[4, 4, 0, 0]}/>
                <Bar dataKey="inProgress" name="En cours" fill="#2563EB" radius={[4, 4, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Aucun operateur</div>
          )}
        </ChartCard>
      </div>
    </>
  )
}

function StockTab({ stockProducts, consumables, purchaseOrders, suppliers }: {
  stockProducts: StockProduct[]; consumables: Consumable[];
  purchaseOrders: PurchaseOrder[]; suppliers: Supplier[];
}) {
  const lowStockProducts = useMemo(() =>
    stockProducts.filter(p => p.currentStock <= p.minStock).sort((a, b) => a.currentStock - b.currentStock)
  , [stockProducts])

  const lowStockConsumables = useMemo(() =>
    consumables.filter(c => c.stock <= c.minStock).sort((a, b) => a.stock - b.stock)
  , [consumables])

  const stockValueByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    stockProducts.forEach(p => { map[p.category] = (map[p.category] || 0) + (p.currentStock * p.purchasePrice) })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [stockProducts])

  const topConsumedItems = useMemo(() => {
    const all = [
      ...stockProducts.map(p => ({ name: p.name, stock: p.currentStock, minStock: p.minStock })),
      ...consumables.map(c => ({ name: c.name, stock: c.stock, minStock: c.minStock }))
    ]
    return all.sort((a, b) => (a.stock / Math.max(a.minStock, 1)) - (b.stock / Math.max(b.minStock, 1))).slice(0, 8)
  }, [stockProducts, consumables])

  const purchaseSummary = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {}
    purchaseOrders.forEach(o => {
      if (!map[o.supplier.name]) map[o.supplier.name] = { total: 0, count: 0 }
      map[o.supplier.name].total += o.total; map[o.supplier.name].count += 1
    })
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total)
  }, [purchaseOrders])

  const stockAlertData = useMemo(() => [
    ...lowStockProducts.map(p => ({ code: p.code, name: p.name, category: p.category, stock: p.currentStock, min: p.minStock, unit: p.unit, supplier: p.supplier })),
    ...lowStockConsumables.map(c => ({ code: c.code, name: c.name, category: c.category, stock: c.stock, min: c.minStock, unit: c.unit, supplier: c.supplier })),
  ], [lowStockProducts, lowStockConsumables])

  const totalStockValue = stockValueByCategory.reduce((s, c) => s + c.value, 0)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Articles en stock" value={stockProducts.length.toString()} icon={<Package size={20}/>} gradient="gradient-primary"/>
        <KpiCard title="Alertes stock bas" value={stockAlertData.length.toString()} icon={<AlertTriangle size={20}/>} gradient="gradient-danger"/>
        <KpiCard title="Valeur stock" value={formatCurrency(totalStockValue)} icon={<Wallet size={20}/>} gradient="gradient-success"/>
        <KpiCard title="Commandes fournisseur" value={purchaseOrders.length.toString()} icon={<Truck size={20}/>} gradient="gradient-teal"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Alertes stock bas" subtitle="Articles a reapprovisionner"
          exportData={stockAlertData} exportFilename="alertes-stock" exportTitle="Alertes stock bas">
          {stockAlertData.length > 0 ? (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {stockAlertData.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-red-500"/>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                      <p className="text-[10px] text-gray-500">{item.code} - {item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-red-600">{item.stock} {item.unit}</p>
                    <p className="text-[10px] text-gray-400">Min: {item.min} {item.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-green-600 text-sm">
              <CheckCircle size={16} className="mr-2"/> Tous les stocks sont OK
            </div>
          )}
        </ChartCard>

        <ChartCard title="Valeur du stock par categorie" subtitle="Repartition de l'inventaire"
          exportData={stockValueByCategory.map(c => ({ Categorie: c.name, Valeur: c.value }))}
          exportFilename="valeur-stock" exportTitle="Valeur du stock">
          {stockValueByCategory.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={stockValueByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {stockValueByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none"/>)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {stockValueByCategory.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-xs text-gray-600">{c.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Aucun stock</div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Rotation du stock" subtitle="Articles les plus sollicites"
          exportData={topConsumedItems.map(c => ({ Article: c.name, Stock: c.stock, Minimum: c.minStock }))}
          exportFilename="rotation-stock" exportTitle="Rotation du stock">
          <div className="space-y-3">
            {topConsumedItems.map((item, i) => {
              const ratio = item.minStock > 0 ? ((item.stock / item.minStock) * 100) : 100
              const pct = Math.min(ratio, 100)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium">{item.name}</span>
                    <span className={ratio < 50 ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'}>{item.stock} unites</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ratio < 50 ? 'bg-gradient-to-r from-red-500 to-red-400' : ratio < 100 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-green-500 to-green-400'}`}
                      style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              )
            })}
            {topConsumedItems.length === 0 && <div className="text-center text-gray-400 text-sm py-4">Aucun article</div>}
          </div>
        </ChartCard>

        <ChartCard title="Achats par fournisseur" subtitle="Total des commandes"
          exportData={purchaseSummary.map(s => ({ Fournisseur: s.name, Total: s.total, Commandes: s.count }))}
          exportFilename="achats-fournisseur" exportTitle="Achats par fournisseur">
          {purchaseSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={purchaseSummary} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number) => formatCurrency(v)}/>
                <Bar dataKey="total" name="Total achats" radius={[6, 6, 0, 0]}>
                  {purchaseSummary.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Aucun achat</div>
          )}
        </ChartCard>
      </div>
    </>
  )
}
