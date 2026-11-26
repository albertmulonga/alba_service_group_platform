import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency } from '@/lib/utils'
import { useApiDB } from '@/hooks/useApiDB'
import ExportButton from '@/components/ui/ExportButton'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import {
  FileText, Plus, Search, Send, Eye, Edit,
  Download, Printer, Check, X, Trash2, Save, RefreshCw, AlertCircle
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────── */
interface QuoteType {
  id: string
  quoteNumber: string
  client: { name: string }
  service: string
  description: string
  items: { description: string; qty: number; price: number; total: number }[]
  subtotal: number
  tax: number
  discount: number
  total: number
  status: string
  validUntil: string
  createdAt: string
}

/* ─── Quote creation modal ────────────────────────── */
interface QItem { desc: string; qty: number; unit: number; total: number }
const emptyQLine = (): QItem => ({ desc: '', qty: 1, unit: 0, total: 0 })

function NewQuoteModal({ onClose, onSave }: { onClose: () => void; onSave: (q: Omit<QuoteType, 'id'>) => void }) {
  const [client, setClient] = useState('')
  const [clientAddr, setAddr] = useState('')
  const [service, setService] = useState('')
  const [validUntil, setValid] = useState('')
  const [discount, setDisc] = useState(0)
  const [items, setItems] = useState<QItem[]>([emptyQLine()])

  const upd = (i: number, field: keyof QItem, val: string | number) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [field]: field === 'desc' ? val : Number(val) }
      updated.total = updated.qty * updated.unit
      return updated
    }))
  }

  const subtotal = items.reduce((s, it) => s + it.total, 0)
  const total = Math.max(0, subtotal - discount)
  const today = new Date().toISOString().slice(0, 10)
  const num = `DEV-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`

  const save = () => {
    if (!client.trim()) return alert('Veuillez saisir le nom du client.')
    onSave({
      quoteNumber: num,
      client: { name: client },
      service: service || items[0]?.desc || 'Prestation',
      description: items.map(it => it.desc).filter(Boolean).join(', '),
      items: items.map(it => ({ description: it.desc, qty: it.qty, price: it.unit, total: it.total })),
      subtotal, tax: 0, discount, total,
      status: 'draft', validUntil: validUntil || today, createdAt: today,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="doc-header-top rounded-t-2xl">
          <div className="doc-header-logo-block">
            <img src="/alba-logo.png" alt="ALBA" className="doc-logo" />
            <div className="doc-company-info">
              <h1 className="doc-company-name">ALBA SERVICE GROUP</h1>
              <p className="doc-company-tagline">L'excellence au service de vos projets</p>
              <div className="doc-company-details">
                <span>📍 Kindu – Province du Maniema – R.D. Congo</span>
                <span>📞 +243 XXX XXX XXX · contact@alba-service.com</span>
              </div>
            </div>
          </div>
          <div className="doc-type-block">
            <div className="doc-type-label">DEVIS</div>
            <div className="doc-type-number">{num}</div>
            <div className="doc-type-meta">
              <div className="doc-meta-row"><span className="doc-meta-key">Date :</span><span className="doc-meta-val">{today}</span></div>
            </div>
          </div>
        </div>
        <div className="doc-divider" />

        <div className="p-6 space-y-5">
          {/* Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du client *</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="Entreprise / Nom complet"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description générale</label>
              <input value={service} onChange={e => setService(e.target.value)} placeholder="Ex: Impression flyers…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valide jusqu'au</label>
              <input type="date" value={validUntil} onChange={e => setValid(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
          </div>

          {/* Lines */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Lignes de prestation</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid text-[10px] font-bold text-gray-500 uppercase bg-gray-50 px-3 py-2" style={{ gridTemplateColumns: '1fr 60px 90px 90px 28px', gap: 8 }}>
                <span>Désignation</span><span className="text-right">Qté</span><span className="text-right">P.U. (FC)</span><span className="text-right">Total</span><span></span>
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid items-center px-3 py-2 border-t border-gray-100" style={{ gridTemplateColumns: '1fr 60px 90px 90px 28px', gap: 8 }}>
                  <input value={it.desc} onChange={e => upd(i, 'desc', e.target.value)} placeholder="Description"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                  <input type="number" min={1} value={it.qty} onChange={e => upd(i, 'qty', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
                  <input type="number" min={0} value={it.unit} onChange={e => upd(i, 'unit', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
                  <span className="text-xs font-semibold text-right text-teal-700">{formatCurrency(it.total)}</span>
                  <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 flex justify-center"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setItems(p => [...p, emptyQLine()])}
              className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium">
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>Sous-total</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Remise (FC)</span>
              <input type="number" min={0} value={discount} onChange={e => setDisc(Number(e.target.value))}
                className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
              <span>TOTAL</span><span className="text-teal-700">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
          <button onClick={save} className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
            <Save size={13} /> Créer le devis
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit modal (pre-filled) ───────────────────── */
function EditQuoteModal({ quote, onClose, onSave }: { quote: QuoteType; onClose: () => void; onSave: (q: Partial<QuoteType>) => void }) {
  const [client, setClient] = useState(quote.client.name)
  const [service, setService] = useState(quote.service)
  const [validUntil, setValid] = useState(quote.validUntil)
  const [discount, setDisc] = useState(quote.discount)
  const [items, setItems] = useState<QItem[]>(
    quote.items.map(it => ({ desc: it.description, qty: it.qty, unit: it.price, total: it.total }))
  )

  const upd = (i: number, field: keyof QItem, val: string | number) => {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [field]: field === 'desc' ? val : Number(val) }
      updated.total = updated.qty * updated.unit
      return updated
    }))
  }

  const subtotal = items.reduce((s, it) => s + it.total, 0)
  const total = Math.max(0, subtotal - discount)

  const save = () => {
    if (!client.trim()) return alert('Veuillez saisir le nom du client.')
    onSave({
      client: { name: client },
      service,
      description: items.map(it => it.desc).filter(Boolean).join(', '),
      items: items.map(it => ({ description: it.desc, qty: it.qty, price: it.unit, total: it.total })),
      subtotal, tax: 0, discount, total,
      validUntil,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Modifier le devis</h3>
            <p className="text-[11px] text-gray-500">{quote.quoteNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du client *</label>
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="Entreprise / Nom complet"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description générale</label>
              <input value={service} onChange={e => setService(e.target.value)} placeholder="Ex: Impression flyers…"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Valide jusqu'au</label>
              <input type="date" value={validUntil} onChange={e => setValid(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Lignes de prestation</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid text-[10px] font-bold text-gray-500 uppercase bg-gray-50 px-3 py-2" style={{ gridTemplateColumns: '1fr 60px 90px 90px 28px', gap: 8 }}>
                <span>Désignation</span><span className="text-right">Qté</span><span className="text-right">P.U. (FC)</span><span className="text-right">Total</span><span></span>
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid items-center px-3 py-2 border-t border-gray-100" style={{ gridTemplateColumns: '1fr 60px 90px 90px 28px', gap: 8 }}>
                  <input value={it.desc} onChange={e => upd(i, 'desc', e.target.value)} placeholder="Description"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400" />
                  <input type="number" min={1} value={it.qty} onChange={e => upd(i, 'qty', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
                  <input type="number" min={0} value={it.unit} onChange={e => upd(i, 'unit', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
                  <span className="text-xs font-semibold text-right text-teal-700">{formatCurrency(it.total)}</span>
                  <button onClick={() => setItems(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 flex justify-center"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setItems(p => [...p, emptyQLine()])}
              className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium">
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-500"><span>Sous-total</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Remise (FC)</span>
              <input type="number" min={0} value={discount} onChange={e => setDisc(Number(e.target.value))}
                className="w-28 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none text-right" />
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
              <span>TOTAL</span><span className="text-teal-700">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Annuler</button>
          <button onClick={save} className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
            <Save size={13} /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Mock data (seed) ─────────────────────────── */
const mockQuotes: QuoteType[] = [
  {
    id: '1', quoteNumber: 'DEV-2026-0082', client: { name: 'Entreprise ABC SARL' },
    service: 'Impression flyers A5',
    description: 'Impression 1500 exemplaires flyers A5 recto/verso papier couché 135g',
    items: [
      { description: 'Flyers A5 recto/verso - 1500 ex.', qty: 1500, price: 80, total: 120000 },
      { description: 'Frais de conception graphique', qty: 1, price: 30000, total: 30000 },
    ],
    subtotal: 150000, tax: 0, discount: 5000, total: 145000,
    status: 'validated', validUntil: '2026-08-25', createdAt: '2026-07-10'
  },
  {
    id: '2', quoteNumber: 'DEV-2026-0081', client: { name: 'Université de Kindu' },
    service: 'Reliure mémoires de fin d\'études',
    description: 'Reliure spiralée de 25 mémoires de licence',
    items: [
      { description: 'Reliure spiralée mémoire (A4)', qty: 25, price: 5000, total: 125000 },
      { description: 'Impression couverture couleur', qty: 25, price: 2000, total: 50000 },
    ],
    subtotal: 175000, tax: 0, discount: 0, total: 175000,
    status: 'sent', validUntil: '2026-08-10', createdAt: '2026-07-12'
  },
  {
    id: '3', quoteNumber: 'DEV-2026-0080', client: { name: 'Mairie de Kindu' },
    service: 'Saisie et mise en forme documents',
    description: 'Saisie de 40 documents administratifs en format Word',
    items: [
      { description: 'Saisie document (par page)', qty: 200, price: 500, total: 100000 },
      { description: 'Mise en forme et impression', qty: 200, price: 300, total: 60000 },
    ],
    subtotal: 160000, tax: 0, discount: 10000, total: 150000,
    status: 'converted', validUntil: '2026-07-30', createdAt: '2026-06-28'
  },
  {
    id: '4', quoteNumber: 'DEV-2026-0079', client: { name: 'Hôpital Général de Kindu' },
    service: 'Cartes de visite professionnelles',
    description: 'Cartes de visite pour 10 médecins - recto/verso quadri',
    items: [
      { description: 'Cartes de visite (par lot 500)', qty: 10, price: 15000, total: 150000 },
    ],
    subtotal: 150000, tax: 0, discount: 0, total: 150000,
    status: 'expired', validUntil: '2026-06-30', createdAt: '2026-06-15'
  },
  {
    id: '5', quoteNumber: 'DEV-2026-0078', client: { name: 'ONG Espoir Congo' },
    service: 'Affiches A3 pour campagne',
    description: 'Affiches A3 plastifiées pour campagne de sensibilisation',
    items: [
      { description: 'Affiches A3 plastifiées', qty: 500, price: 200, total: 100000 },
      { description: 'Design graphique affiches', qty: 5, price: 15000, total: 75000 },
    ],
    subtotal: 175000, tax: 0, discount: 5000, total: 170000,
    status: 'draft', validUntil: '2026-09-15', createdAt: '2026-07-20'
  },
  {
    id: '6', quoteNumber: 'DEV-2026-0077', client: { name: 'École BERUNDA' },
    service: 'Formulaires scolaires imprimés',
    description: 'Impression de 3 types de formulaires scolaires',
    items: [
      { description: 'Formulaires admission (1000 ex.)', qty: 1000, price: 40, total: 40000 },
      { description: 'Formulaires bulletins (500 ex.)', qty: 500, price: 50, total: 25000 },
      { description: 'Formulaires certificat (300 ex.)', qty: 300, price: 60, total: 18000 },
    ],
    subtotal: 83000, tax: 0, discount: 3000, total: 80000,
    status: 'validated', validUntil: '2026-08-20', createdAt: '2026-07-05'
  },
  {
    id: '7', quoteNumber: 'DEV-2026-0076', client: { name: 'Cabinet Médical Dr. Pierre' },
    service: 'Création site web vitrine',
    description: 'Site web responsive 5 pages avec système de prise de RDV',
    items: [
      { description: 'Design UI/UX', qty: 1, price: 200000, total: 200000 },
      { description: 'Développement frontend', qty: 1, price: 350000, total: 350000 },
      { description: 'Développement backend & RDV', qty: 1, price: 250000, total: 250000 },
      { description: 'Hébergement 1 an', qty: 1, price: 100000, total: 100000 },
    ],
    subtotal: 900000, tax: 0, discount: 50000, total: 850000,
    status: 'sent', validUntil: '2026-08-05', createdAt: '2026-07-01'
  },
  {
    id: '8', quoteNumber: 'DEV-2026-0075', client: { name: 'Entreprise XYZ SARL' },
    service: 'Identité visuelle complète',
    description: 'Logo, charte graphique et supports de communication',
    items: [
      { description: 'Création logo (3 propositions)', qty: 1, price: 200000, total: 200000 },
      { description: 'Charte graphique complète', qty: 1, price: 150000, total: 150000 },
      { description: 'Cartes de visite + papier entête', qty: 1, price: 80000, total: 80000 },
    ],
    subtotal: 430000, tax: 0, discount: 30000, total: 400000,
    status: 'draft', validUntil: '2026-09-10', createdAt: '2026-07-22'
  },
  {
    id: '9', quoteNumber: 'DEV-2026-0074', client: { name: 'Pharmacie du Centre' },
    service: 'Étiquettes de produits',
    description: 'Impression d\'étiquettes pour 20 produits pharmaceutiques',
    items: [
      { description: 'Étiquettes auto-collantes (par lot 500)', qty: 20, price: 8000, total: 160000 },
      { description: 'Conception graphique par produit', qty: 20, price: 10000, total: 200000 },
    ],
    subtotal: 360000, tax: 0, discount: 10000, total: 350000,
    status: 'converted', validUntil: '2026-07-15', createdAt: '2026-06-20'
  },
  {
    id: '10', quoteNumber: 'DEV-2026-0073', client: { name: 'ASBL Jeunesse Active' },
    service: 'Brochures A4 pliées',
    description: 'Brochures 12 pages pour projet de plaidoyer',
    items: [
      { description: 'Brochures A4 (12 pages, 500 ex.)', qty: 500, price: 300, total: 150000 },
      { description: 'Mise en page et design', qty: 1, price: 100000, total: 100000 },
    ],
    subtotal: 250000, tax: 0, discount: 0, total: 250000,
    status: 'sent', validUntil: '2026-08-15', createdAt: '2026-07-08'
  },
]

const statusConfig: Record<string, { label: string; type: string }> = {
  draft: { label: 'Brouillon', type: 'secondary' },
  sent: { label: 'Envoyé', type: 'info' },
  validated: { label: 'Validé', type: 'success' },
  expired: { label: 'Expiré', type: 'danger' },
  converted: { label: 'Converti', type: 'primary' },
}

const filterTabs = [
  { key: 'all', label: 'Tous' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'sent', label: 'Envoyés' },
  { key: 'validated', label: 'Validés' },
  { key: 'expired', label: 'Expirés' },
  { key: 'converted', label: 'Convertis' },
]

/* ─── Main page ─────────────────────────────────── */
function mapQuote(raw: any): QuoteType {
  return {
    id: raw.id,
    quoteNumber: raw.reference || `DEV-${raw.id?.slice(-6)}`,
    client: {
      name: raw.customer?.firstName
        ? `${raw.customer.firstName} ${raw.customer.lastName || ''}`.trim()
        : (raw.customer?.companyName || 'Client'),
    },
    service: raw.notes || '',
    description: raw.notes || '',
    items: raw.items?.map((i: any) => ({
      description: i.name || '',
      qty: i.quantity || 1,
      price: Number(i.unitPrice ?? 0),
      total: Number(i.total ?? 0),
    })) || [],
    subtotal: Number(raw.subtotal ?? 0),
    tax: Number(raw.taxAmount ?? 0),
    discount: Number(raw.discount ?? 0),
    total: Number(raw.total ?? 0),
    status: (raw.status || 'DRAFT').toLowerCase(),
    validUntil: raw.validUntil || '',
    createdAt: raw.createdAt || '',
  }
}

export default function QuotesPage() {
  const { items: quotes, add, update, remove, loading, error, refresh } = useApiDB<QuoteType>('/commercial/quotes', [], mapQuote)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [editingQuote, setEditingQuote] = useState<QuoteType | null>(null)

  const filtered = quotes.filter(q => {
    const matchSearch = `${q.quoteNumber} ${q.client.name} ${q.service} ${q.description}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  const { currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems, totalItems } = usePagination(filtered)

  const filteredExport = filtered.map(q => ({
    quoteNumber: q.quoteNumber,
    client: q.client.name,
    service: q.service,
    total: q.total,
    status: statusConfig[q.status]?.label || q.status,
    validUntil: q.validUntil,
  }))

  const exportHeaders = {
    quoteNumber: 'Numéro',
    client: 'Client',
    service: 'Service',
    total: 'Montant (FC)',
    status: 'Statut',
    validUntil: 'Validité',
  }

  const totalQuotes = quotes.reduce((s, q) => s + q.total, 0)
  const pendingCount = quotes.filter(q => q.status === 'sent').length
  const validatedCount = quotes.filter(q => q.status === 'validated').length
  const convertedCount = quotes.filter(q => q.status === 'converted').length

  const quote = quotes.find(q => q.id === selectedQuote)

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date()

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Devis"
        subtitle="Création et suivi des devis clients"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Commercial' }, { label: 'Devis' }]}
        icon={<FileText size={22} />}
        iconBg="gradient-teal"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={filteredExport}
              filename="devis-alba"
              title="Liste des Devis"
              headers={exportHeaders}
            />
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
              <Plus size={15} /> Nouveau devis
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total devis" value={`${(totalQuotes / 1000000).toFixed(2)}M FC`} icon={<FileText size={20} />} gradient="gradient-primary" change={12} />
        <KpiCard title="En attente" value={pendingCount.toString()} icon={<Send size={20} />} gradient="gradient-warning" />
        <KpiCard title="Validés" value={validatedCount.toString()} icon={<Check size={20} />} gradient="gradient-success" />
        <KpiCard title="Convertis" value={convertedCount.toString()} icon={<FileText size={20} />} gradient="gradient-teal" />
      </div>

      {/* Filters + search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.key !== 'all' && (
                  <span className="ml-1.5 text-[10px] text-gray-400">
                    {quotes.filter(q => q.status === tab.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Numéro, client, service, description..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Numéro', 'Client', 'Service', 'Montant', 'Statut', 'Validité', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(q => {
                const sc = statusConfig[q.status]
                const expired = isExpired(q.validUntil) && q.status !== 'converted'
                return (
                  <tr key={q.id} className={`hover:bg-teal-50/20 transition-colors group ${expired ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600">{q.quoteNumber}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{q.createdAt}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-gray-700">{q.client.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500">{q.service}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-gray-800">{formatCurrency(q.total)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge label={sc.label} type={sc.type as any} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs ${expired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {expired && '⚠ '}{q.validUntil}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedQuote(q.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir"><Eye size={13} /></button>
                        <button onClick={() => setEditingQuote(q)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Modifier"><Edit size={13} /></button>
                        {q.status === 'draft' && (
                          <button onClick={() => update(q.id, { status: 'sent' })} className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg" title="Envoyer"><Send size={13} /></button>
                        )}
                        <button
                          onClick={() => {
                            const win = window.open('', '_blank', 'width=600,height=400')
                            if (!win) return
                            win.document.write(`<html><body style="font-family:sans-serif;padding:20px"><h2>Devis ${q.quoteNumber}</h2><p>Client: ${q.client.name}</p><p>Montant: ${formatCurrency(q.total)}</p><p>Statut: ${statusConfig[q.status].label}</p></body></html>`)
                            win.document.close(); win.focus(); win.print()
                          }}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Imprimer">
                          <Printer size={13} />
                        </button>
                        {q.status === 'validated' && (
                          <button onClick={() => update(q.id, { status: 'converted' })} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Convertir en facture">
                            <FileText size={13} />
                          </button>
                        )}
                        {q.status !== 'converted' && q.status !== 'expired' && (
                          <button onClick={() => { if (confirm('Annuler ce devis ?')) update(q.id, { status: 'expired' }) }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Annuler"><X size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
          <p className="text-xs text-gray-500">{filtered.length} devis affiché(s)</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500">Total : <strong className="text-gray-800">{formatCurrency(filtered.reduce((s, q) => s + q.total, 0))}</strong></span>
          </div>
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

      {/* Detail slide-in panel */}
      {quote && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setSelectedQuote(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{quote.quoteNumber}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Devis {quote.service}</p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client & Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Client</p>
                  <p className="text-sm font-semibold text-gray-800">{quote.client.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Statut</p>
                  <StatusBadge label={statusConfig[quote.status].label} type={statusConfig[quote.status].type as any} />
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Créé le</p>
                  <p className="text-sm text-gray-700">{quote.createdAt}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Valide jusqu'au</p>
                  <p className={`text-sm ${isExpired(quote.validUntil) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {quote.validUntil}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{quote.description}</p>
              </div>

              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Détail des prestations</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">Désignation</th>
                        <th className="text-right text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">Qté</th>
                        <th className="text-right text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">Prix</th>
                        <th className="text-right text-[10px] font-semibold text-gray-500 uppercase px-4 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {quote.items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-xs text-gray-700">{item.description}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 text-right">{item.qty}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 text-right">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-2.5 text-xs font-medium text-gray-700 text-right">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Sous-total</span>
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Remise</span>
                    <span>- {formatCurrency(quote.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>TVA</span>
                  <span>{formatCurrency(quote.tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-800">
                  <span>Total</span>
                  <span>{formatCurrency(quote.total)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=700,height=900')
                    if (!win) return alert('Autorisez les popups.')
                    win.document.write(`<html><head><title>Devis ${quote.quoteNumber}</title>
                    <style>body{font-family:sans-serif;padding:40px;color:#1f2937}h1{color:#1E3A8A}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:9px 12px;border-bottom:1px solid #e5e7eb}th{background:#f8fafc;font-weight:600;font-size:11px;text-transform:uppercase;color:#6b7280}</style>
                    </head><body>
                    <h1>ALBA SERVICE GROUP</h1><p style="color:#6b7280;font-size:13px">Kindu – Province du Maniema – R.D. Congo</p>
                    <hr/><h2>DEVIS — ${quote.quoteNumber}</h2>
                    <p><strong>Client :</strong> ${quote.client.name} &nbsp;|&nbsp; <strong>Date :</strong> ${quote.createdAt} &nbsp;|&nbsp; <strong>Valide jusqu'au :</strong> ${quote.validUntil}</p>
                    <table><thead><tr><th>Désignation</th><th>Qté</th><th>Prix U.</th><th>Total</th></tr></thead><tbody>
                    ${quote.items.map((it: any) => `<tr><td>${it.description}</td><td>${it.qty}</td><td>${it.price.toLocaleString('fr-FR')} FC</td><td>${it.total.toLocaleString('fr-FR')} FC</td></tr>`).join('')}
                    </tbody></table>
                    <p style="text-align:right"><strong>Sous-total :</strong> ${quote.subtotal.toLocaleString('fr-FR')} FC</p>
                    ${quote.discount > 0 ? `<p style="text-align:right;color:#DC2626"><strong>Remise :</strong> -${quote.discount.toLocaleString('fr-FR')} FC</p>` : ''}
                    <p style="text-align:right;font-size:18px;font-weight:700;color:#1E3A8A"><strong>TOTAL : ${quote.total.toLocaleString('fr-FR')} FC</strong></p>
                    <p style="margin-top:40px;font-size:11px;color:#9ca3af">© 2026 ALBA SERVICE GROUP — Document officiel</p>
                    </body></html>`)
                    win.document.close(); win.focus(); win.print()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <Printer size={14} /> Imprimer
                </button>
                <button
                  onClick={() => {
                    const content = `DEVIS ${quote.quoteNumber}\nClient: ${quote.client.name}\nDate: ${quote.createdAt}\nTotal: ${quote.total.toLocaleString('fr-FR')} FC\n\nPrestations:\n${quote.items.map((it: any) => `- ${it.description}: ${it.qty} × ${it.price} FC = ${it.total} FC`).join('\n')}`
                    const blob = new Blob([content], {type:'text/plain'})
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                    a.download = `Devis_${quote.quoteNumber}.txt`; a.click()
                    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  <Download size={14} /> Télécharger
                </button>
                {quote.status === 'draft' && (
                  <button onClick={() => { update(quote.id, { status: 'sent' }); setSelectedQuote(null) }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #0D9488, #2DD4BF)' }}>
                    <Send size={14} /> Envoyer au client
                  </button>
                )}
                {quote.status === 'validated' && (
                  <button onClick={() => { update(quote.id, { status: 'converted' }); setSelectedQuote(null) }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-xl hover:bg-green-700">
                    <FileText size={14} /> Convertir en facture
                  </button>
                )}
                {quote.status !== 'converted' && quote.status !== 'expired' && (
                  <button onClick={() => { if (confirm('Annuler ce devis ?')) { update(quote.id, { status: 'expired' }); setSelectedQuote(null) } }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100">
                    <X size={14} /> Annuler
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Quote Modal */}
      {showNew && (
        <NewQuoteModal
          onClose={() => setShowNew(false)}
          onSave={(q) => add(q)}
        />
      )}

      {/* Edit Quote Modal */}
      {editingQuote && (
        <EditQuoteModal
          quote={editingQuote}
          onClose={() => setEditingQuote(null)}
          onSave={(patch) => { update(editingQuote.id, patch); setEditingQuote(null) }}
        />
      )}
    </div>
  )
}
