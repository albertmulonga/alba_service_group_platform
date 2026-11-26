import React, { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import { useNotifications } from '@/contexts/NotificationContext'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  FileText, Plus, Search, Eye, Edit,
  CheckCircle, XCircle, Printer, DollarSign,
  AlertCircle, Clock, X, Trash2, Save, Download, RefreshCw
} from 'lucide-react'

/* ─── Types ────────────────────────────────────────── */
interface InvoiceItem { desc: string; qty: number; unit: number; total: number }
interface Invoice {
  id: string; number: string; client: string; clientAddr: string
  clientPhone: string; service: string
  items: InvoiceItem[]
  subtotal: number; discount: number; tax: number
  total: number; paid: number; balance: number
  status: string; dueDate: string; createdAt: string
}

function mapInvoice(raw: any): Invoice {
  const items = raw.items?.map((it: any) => ({
    desc: it.name || it.description || '',
    qty: it.quantity || it.qty || 1,
    unit: Number(it.unitPrice ?? it.unit ?? 0),
    total: Number(it.total ?? 0),
  })) || []
  const total = Number(raw.total ?? 0)
  const paid  = Number(raw.paidAmount ?? raw.paid ?? 0)
  return {
    id:          raw.id,
    number:      raw.reference || `F-${raw.id?.slice(-6)}`,
    client:      raw.customer?.firstName
      ? `${raw.customer.firstName} ${raw.customer.lastName || ''}`.trim()
      : (raw.customer?.companyName || 'Client'),
    clientAddr:  raw.customer?.address || '',
    clientPhone: raw.customer?.phone   || '',
    service:     raw.notes || '',
    items,
    subtotal:    Number(raw.subtotal ?? total),
    discount:    Number(raw.discount  ?? 0),
    tax:         Number(raw.taxAmount ?? 0),
    total,
    paid,
    balance:     Math.max(0, total - paid),
    status:      (raw.status || 'DRAFT').toLowerCase(),
    dueDate:     raw.dueDate    || '',
    createdAt:   raw.createdAt  || '',
  }
}

/* ─── Mock data ─────────────────────────────────────── */
/* ─── Mock data ─────────────────────────────────────── */
const STATUS: Record<string, { label:string; type:any; stamp:string }> = {
  paid:      { label:'Payée',     type:'success',   stamp:'doc-stamp-paid'    },
  partial:   { label:'Partielle', type:'warning',   stamp:'doc-stamp-partial' },
  unpaid:    { label:'Impayée',   type:'danger',    stamp:'doc-stamp-unpaid'  },
  draft:     { label:'Brouillon', type:'secondary', stamp:'doc-stamp-draft'   },
  cancelled: { label:'Annulée',   type:'danger',    stamp:'doc-stamp-unpaid'  },
}

/* ─── Empty line ────────────────────────────────────── */
const emptyLine = (): InvoiceItem => ({ desc:'', qty:1, unit:0, total:0 })

/* ─── Invoice PDF View ──────────────────────────────── */
function InvoicePDF({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const sl = STATUS[inv.status]
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

        {/* ── Header ── */}
        <div className="doc-header-top rounded-t-2xl">
          <div className="doc-header-logo-block">
            <img src="/alba-logo.png" alt="ALBA" className="doc-logo" />
            <div className="doc-company-info">
              <h1 className="doc-company-name">ALBA SERVICE GROUP</h1>
              <p className="doc-company-tagline">L'excellence au service de vos projets</p>
              <div className="doc-company-details">
                <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
                <span>📞 +243 XXX XXX XXX</span>
                <span>✉ contact@alba-service.com</span>
              </div>
            </div>
          </div>
          <div className="doc-type-block">
            <div className="doc-type-label">FACTURE</div>
            <div className="doc-type-number">{inv.number}</div>
            <div className="doc-type-meta">
              <div className="doc-meta-row"><span className="doc-meta-key">Date :</span><span className="doc-meta-val">{inv.createdAt}</span></div>
              <div className="doc-meta-row"><span className="doc-meta-key">Échéance :</span><span className="doc-meta-val">{inv.dueDate}</span></div>
            </div>
          </div>
        </div>
        <div className="doc-divider" />

        {/* ── Client ── */}
        <div className="doc-client-block">
          <div className="doc-client-label">FACTURÉ À :</div>
          <div className="doc-client-name">{inv.client}</div>
          <div className="doc-client-detail">📍 {inv.clientAddr}</div>
          <div className="doc-client-detail">📞 {inv.clientPhone}</div>
        </div>

        {/* ── Body ── */}
        <div className="doc-body">
          {/* Stamp */}
          <div className="flex justify-end mb-3">
            <span className={`doc-stamp ${sl.stamp}`}>{sl.label}</span>
          </div>

          {/* Service label */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Détail des prestations</p>

          {/* Table */}
          <table className="doc-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Désignation</th>
                <th className="text-right">Qté</th>
                <th className="text-right">Prix unitaire</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i}>
                  <td style={{width:28, color:'#94A3B8'}}>{i+1}</td>
                  <td>{item.desc}</td>
                  <td className="text-right">{item.qty.toLocaleString('fr-FR')}</td>
                  <td className="text-right">{formatCurrency(item.unit)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="doc-totals">
            <div className="doc-total-row"><span className="doc-total-key">Sous-total</span><span className="doc-total-val">{formatCurrency(inv.subtotal)}</span></div>
            {inv.discount > 0 && <div className="doc-total-row"><span className="doc-total-key" style={{color:'#DC2626'}}>Remise</span><span className="doc-total-val" style={{color:'#DC2626'}}>- {formatCurrency(inv.discount)}</span></div>}
            <div className="doc-total-row"><span className="doc-total-key">TVA (0%)</span><span className="doc-total-val">{formatCurrency(inv.tax)}</span></div>
            <div className="doc-total-row final"><span className="doc-total-key">TOTAL TTC</span><span className="doc-total-val">{formatCurrency(inv.total)}</span></div>
            {inv.paid > 0 && <div className="doc-total-row" style={{marginTop:8}}><span className="doc-total-key" style={{color:'#16A34A'}}>Déjà payé</span><span className="doc-total-val" style={{color:'#16A34A'}}>- {formatCurrency(inv.paid)}</span></div>}
            {inv.balance > 0 && <div className="doc-total-row" style={{background:'#FEF2F2',borderRadius:8,padding:'6px 14px',marginTop:2}}><span style={{color:'#DC2626',fontWeight:700,fontSize:12}}>RESTE À PAYER</span><span style={{color:'#DC2626',fontWeight:800,fontSize:15}}>{formatCurrency(inv.balance)}</span></div>}
          </div>

          {/* Payment modes */}
          <div style={{marginTop:16,padding:'10px 14px',background:'#F8FAFC',borderRadius:10,border:'1px solid #E2E8F0'}}>
            <p style={{fontSize:10,fontWeight:700,color:'#64748B',marginBottom:4,letterSpacing:'0.06em'}}>MODES DE PAIEMENT ACCEPTÉS :</p>
            <p style={{fontSize:11,color:'#475569'}}>Espèces · Mobile Money (Airtel/Orange) · Virement bancaire · Chèque</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="doc-footer">
          <div className="doc-footer-text">
            Merci pour votre confiance.<br />
            Pour toute question, contactez-nous à contact@alba-service.com
          </div>
          <div className="doc-footer-brand">© 2026 ALBA SERVICE GROUP</div>
        </div>

        {/* ── Actions bar ── */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">Fermer</button>
          <button
            onClick={() => {
              const el = document.querySelector('.invoice-print-area') as HTMLElement
              const win = window.open('', '_blank', 'width=800,height=900')
              if (!win) { alert('Autorisez les popups.'); return }
              win.document.write(`<html><head><title>Facture ${inv.number}</title>
              <style>body{font-family:sans-serif;padding:32px;color:#1f2937}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;border-bottom:1px solid #e5e7eb}th{background:#f8fafc;font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600}h1{color:#1E3A8A;font-size:22px;font-weight:900;letter-spacing:.05em}</style>
              </head><body>
              <h1>ALBA SERVICE GROUP</h1>
              <p style="color:#6b7280;font-size:12px">L'excellence au service de vos projets | Kindu – Maniema – RDC</p>
              <hr style="margin:12px 0"/>
              <div style="display:flex;justify-content:space-between">
                <div><strong>FACTURE</strong><br/><span style="font-family:monospace;font-size:14px">${inv.number}</span></div>
                <div style="text-align:right"><p>Date : ${inv.createdAt}</p><p>Échéance : ${inv.dueDate}</p></div>
              </div>
              <div style="margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px">
                <strong>Facturé à :</strong> ${inv.client}<br/>
                <span style="color:#6b7280">${inv.clientAddr}</span><br/>
                <span style="color:#6b7280">${inv.clientPhone}</span>
              </div>
              <table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix U.</th><th>Montant</th></tr></thead><tbody>
              ${inv.items.map(it => `<tr><td>${it.desc}</td><td>${it.qty}</td><td>${it.unit.toLocaleString('fr-FR')} FC</td><td>${it.total.toLocaleString('fr-FR')} FC</td></tr>`).join('')}
              </tbody></table>
              <div style="text-align:right;margin-top:16px">
                <p>Sous-total : ${inv.subtotal.toLocaleString('fr-FR')} FC</p>
                ${inv.discount > 0 ? `<p style="color:#DC2626">Remise : -${inv.discount.toLocaleString('fr-FR')} FC</p>` : ''}
                <p style="font-size:18px;font-weight:700;color:#1E3A8A">TOTAL : ${inv.total.toLocaleString('fr-FR')} FC</p>
                ${inv.balance > 0 ? `<p style="color:#DC2626">Reste à payer : ${inv.balance.toLocaleString('fr-FR')} FC</p>` : '<p style="color:#16A34A">✓ Facture soldée</p>'}
              </div>
              <p style="margin-top:40px;font-size:11px;color:#9ca3af">Modes de paiement : Espèces · Mobile Money · Virement | © 2026 ALBA SERVICE GROUP</p>
              </body></html>`)
              win.document.close(); win.focus(); win.print()
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl">
            <Printer size={13}/> Imprimer
          </button>
          <button
            onClick={() => {
              const content = `FACTURE ${inv.number}\nClient: ${inv.client}\nDate: ${inv.createdAt}\n\n${inv.items.map(it=>`${it.desc} | Qté: ${it.qty} | P.U: ${it.unit} FC | Total: ${it.total} FC`).join('\n')}\n\nTotal: ${inv.total.toLocaleString('fr-FR')} FC\nPayé: ${inv.paid.toLocaleString('fr-FR')} FC\nSolde: ${inv.balance.toLocaleString('fr-FR')} FC`
              const blob = new Blob([content], {type:'text/plain'})
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
              a.download = `Facture_${inv.number}.txt`; a.click()
              setTimeout(()=>URL.revokeObjectURL(a.href), 1000)
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
            <Download size={13}/> Télécharger
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Invoice Form Modal (New + Edit) ──────────────── */
function InvoiceFormModal({ onClose, onSave, initial, onNewCreated }: { onClose:()=>void; onSave:(inv:Invoice)=>void; initial?:Invoice; onNewCreated?:()=>void }) {
  const isEdit = !!initial
  const [client, setClient]       = useState(initial?.client       ?? '')
  const [clientAddr, setAddr]     = useState(initial?.clientAddr   ?? '')
  const [clientPhone, setPhone]   = useState(initial?.clientPhone  ?? '')
  const [service, setService]     = useState(initial?.service      ?? '')
  const [dueDate, setDueDate]     = useState(initial?.dueDate      ?? '')
  const [discount, setDiscount]   = useState(initial?.discount     ?? 0)
  const [items, setItems]         = useState<InvoiceItem[]>(initial?.items ?? [emptyLine()])

  const updateItem = (i:number, field:keyof InvoiceItem, val:string|number) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [field]: field === 'desc' ? val : Number(val) }
      updated.total = updated.qty * updated.unit
      return updated
    }))
  }

  const subtotal = items.reduce((s, it) => s + it.total, 0)
  const total    = Math.max(0, subtotal - discount)
  const today    = new Date().toISOString().slice(0, 10)
  const num      = initial?.number ?? `F-2026-${String(Math.floor(Math.random()*9000)+1000)}`

  const save = () => {
    if (!client.trim()) return alert('Veuillez saisir le nom du client.')
    if (items.every(it => !it.desc.trim())) return alert('Ajoutez au moins une prestation.')

    if (isEdit) {
      onSave({
        ...initial!,
        client, clientAddr, clientPhone,
        service: service || items[0]?.desc || 'Prestation', items,
        subtotal, discount, tax: 0, total,
        paid: initial!.paid,
        balance: total - initial!.paid,
        status: total - initial!.paid <= 0 ? 'paid' : initial!.paid > 0 ? 'partial' : initial!.status,
        dueDate: dueDate || today,
      })
    } else {
      onSave({ id: Date.now().toString(), number: num, client, clientAddr, clientPhone,
        service: service || items[0]?.desc || 'Prestation', items,
        subtotal, discount, tax: 0, total, paid: 0, balance: total,
        status: 'draft', dueDate: dueDate || today, createdAt: today })
      onNewCreated?.()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
              <FileText size={18} className="text-white"/>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">{isEdit ? 'Modifier la Facture' : 'Nouvelle Facture'}</h3>
              <p className="text-[10px] text-gray-400">{num}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Client */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Informations client</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du client *</label>
                <input value={client} onChange={e=>setClient(e.target.value)} placeholder="Entreprise / Nom complet"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse</label>
                <input value={clientAddr} onChange={e=>setAddr(e.target.value)} placeholder="Adresse, quartier, ville"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
                <input value={clientPhone} onChange={e=>setPhone(e.target.value)} placeholder="+243 XXX XXX XXX"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
              </div>
            </div>
          </div>

          {/* Doc info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description générale</label>
              <input value={service} onChange={e=>setService(e.target.value)} placeholder="Ex: Impression flyers…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date d'échéance</label>
              <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Lignes de prestation</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid text-[10px] font-bold text-gray-500 uppercase bg-gray-50 px-3 py-2" style={{gridTemplateColumns:'1fr 60px 90px 90px 28px',gap:8}}>
                <span>Désignation</span><span className="text-right">Qté</span><span className="text-right">P.U. (FC)</span><span className="text-right">Total</span><span></span>
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid items-center px-3 py-2 border-t border-gray-100" style={{gridTemplateColumns:'1fr 60px 90px 90px 28px',gap:8}}>
                  <input value={it.desc} onChange={e=>updateItem(i,'desc',e.target.value)} placeholder="Description de la prestation"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"/>
                  <input type="number" min={1} value={it.qty} onChange={e=>updateItem(i,'qty',e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"/>
                  <input type="number" min={0} value={it.unit} onChange={e=>updateItem(i,'unit',e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"/>
                  <span className="text-xs font-semibold text-right text-blue-700">{formatCurrency(it.total)}</span>
                  <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-600 flex justify-center">
                    <Trash2 size={13}/>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={()=>setItems(p=>[...p,emptyLine()])}
              className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Plus size={13}/> Ajouter une ligne
            </button>
          </div>

          {/* Totals preview */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>Sous-total</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Remise (FC)</span>
              <input type="number" min={0} value={discount} onChange={e=>setDiscount(Number(e.target.value))}
                className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right"/>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
              <span>TOTAL TTC</span><span className="text-blue-700">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
          <button onClick={save} className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
            style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
            <Save size={13}/> {isEdit ? 'Enregistrer' : 'Créer la facture'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Payment Modal ─────────────────────────────────── */
function PaymentModal({ inv, onClose, onSave }: { inv:Invoice; onClose:()=>void; onSave:(inv:Invoice)=>void }) {
  const [amount, setAmount] = useState(inv.balance)

  const save = () => {
    if (amount <= 0) return alert('Montant invalide.')
    if (amount > inv.balance) return alert('Le montant ne peut pas dépasser le solde restant.')
    const newPaid  = inv.paid + amount
    const newBal   = inv.total - newPaid
    const newStatus = newBal <= 0 ? 'paid' : 'partial'
    onSave({ ...inv, paid: newPaid, balance: newBal, status: newStatus })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-50"><DollarSign size={18} className="text-green-600"/></div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Enregistrer un paiement</h3>
              <p className="text-[10px] text-gray-400">{inv.number} — {inv.client}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500"><span>Total facture</span><span className="font-medium text-gray-700">{formatCurrency(inv.total)}</span></div>
            <div className="flex justify-between text-xs text-gray-500"><span>Déjà payé</span><span className="font-medium text-green-600">{formatCurrency(inv.paid)}</span></div>
            <div className="flex justify-between text-xs font-bold text-red-600"><span>Reste à payer</span><span>{formatCurrency(inv.balance)}</span></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Montant à enregistrer (FC) *</label>
            <input type="number" min={1} max={inv.balance} value={amount} onChange={e=>setAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right font-semibold"/>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
            <AlertCircle size={14} className="text-amber-500 shrink-0"/>
            <p className="text-[11px] text-amber-700">Le paiement sera enregistré et le statut de la facture mis à jour automatiquement.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
          <button onClick={save} className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90 bg-green-600">
            <DollarSign size={13}/> Enregistrer le paiement
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main page ─────────────────────────────────────── */
export default function InvoicesPage() {
  const { items: invoices, add, update, remove, loading, error, refresh } = useApiDB<Invoice>('/commercial/invoices', [], mapInvoice)
  const { addNotification } = useNotifications()

  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewInv, setViewInv]     = useState<Invoice | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [editInv, setEditInv]     = useState<Invoice | null>(null)
  const [payInv, setPayInv]       = useState<Invoice | null>(null)

  const filtered = invoices.filter(inv => {
    const ms = `${inv.number} ${inv.client} ${inv.service}`.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'all' || inv.status === statusFilter)
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const totalRevenue = invoices.reduce((s,i)=>s+i.total,0)
  const totalPaid    = invoices.reduce((s,i)=>s+i.paid,0)
  const totalBalance = invoices.reduce((s,i)=>s+i.balance,0)
  const overdueCount = invoices.filter(i=>i.status==='unpaid'&&new Date(i.dueDate)<new Date()).length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Factures"
        subtitle="Suivi des paiements et créances clients"
        breadcrumbs={[{label:'Accueil'},{label:'Commercial'},{label:'Factures'}]}
        icon={<FileText size={22}/>}
        iconBg="gradient-teal"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filtered}
              filename="factures-alba"
              title="Liste des Factures"
              headers={['Facture', 'Client', 'Prestation', 'Total', 'Payé', 'Solde', 'Échéance', 'Statut']}
            />
            <button onClick={()=>setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{background:'linear-gradient(135deg,#1E3A8A,#2563EB)'}}>
              <Plus size={15}/> Nouvelle facture
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total facturé"      value={`${(totalRevenue/1000000).toFixed(2)}M FC`} icon={<FileText size={20}/>}     gradient="gradient-primary" change={18}/>
        <KpiCard title="Montant encaissé"   value={`${(totalPaid/1000000).toFixed(2)}M FC`}    icon={<CheckCircle size={20}/>}  gradient="gradient-success"/>
        <KpiCard title="Créances clients"   value={formatCurrency(totalBalance)}                icon={<AlertCircle size={20}/>}  gradient="gradient-danger"/>
        <KpiCard title="Factures en retard" value={overdueCount.toString()}                     icon={<Clock size={20}/>}        gradient="gradient-warning"/>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Numéro, client, service..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none min-w-36">
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Facture','Client','Prestation','Total','Payé','Solde','Échéance','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(inv=>{
                const sl = STATUS[inv.status]
                const isOverdue = inv.status==='unpaid'&&new Date(inv.dueDate)<new Date()
                return (
                  <tr key={inv.id} className={`hover:bg-blue-50/20 transition-colors group ${isOverdue?'bg-red-50/30':''}`}>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600">{inv.number}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(inv.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-xs font-medium text-gray-700">{inv.client}</span></td>
                    <td className="px-4 py-3.5"><span className="text-xs text-gray-500">{inv.service}</span></td>
                    <td className="px-4 py-3.5"><span className="text-xs font-semibold text-gray-800">{formatCurrency(inv.total)}</span></td>
                    <td className="px-4 py-3.5"><span className="text-xs font-medium text-green-600">{formatCurrency(inv.paid)}</span></td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${inv.balance>0?'text-red-600':'text-green-600'}`}>
                        {inv.balance>0?formatCurrency(inv.balance):'—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs ${isOverdue?'text-red-600 font-semibold':'text-gray-500'}`}>
                        {isOverdue&&'⚠ '}{formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge label={sl.label} type={sl.type}/></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setViewInv(inv)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir"><Eye size={13}/></button>
                        <button onClick={()=>setEditInv(inv)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Modifier"><Edit size={13}/></button>
                        <button
                          onClick={() => setViewInv(inv)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Imprimer">
                          <Printer size={13}/>
                        </button>
                        {inv.balance>0&&<button onClick={()=>setPayInv(inv)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Paiement"><DollarSign size={13}/></button>}
                        <button onClick={()=>{ if(window.confirm(`Supprimer la facture ${inv.number} ?`)) remove(inv.id) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} facture(s)</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">Total : <strong className="text-gray-800">{formatCurrency(filtered.reduce((s,i)=>s+i.total,0))}</strong></span>
            <span className="text-gray-500">Solde : <strong className="text-red-600">{formatCurrency(filtered.reduce((s,i)=>s+i.balance,0))}</strong></span>
          </div>
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

      {viewInv && <InvoicePDF inv={viewInv} onClose={()=>setViewInv(null)}/>}
      {showNew  && <InvoiceFormModal onClose={()=>setShowNew(false)} onSave={inv=>add(inv as any)} onNewCreated={() => addNotification({
        title: 'Nouvelle facture créée',
        message: `Facture pour ${invoices.length > 0 ? 'client' : 'nouveau client'} — ${new Date().toLocaleDateString('fr-FR')}`,
        type: 'info',
        module: 'Commercial',
        link: '/commercial/invoices',
      })}/>}
      {editInv  && <InvoiceFormModal initial={editInv} onClose={()=>setEditInv(null)} onSave={inv=>update(inv.id, inv as any)}/>}
      {payInv   && <PaymentModal inv={payInv} onClose={()=>setPayInv(null)} onSave={inv=>update(inv.id, inv as any)}/>}
    </div>
  )
}
