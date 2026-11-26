import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  History, Phone, Mail, Calendar, ShoppingCart, CreditCard,
  AlertCircle, Plus, Search, Filter, X, Clock, User, ChevronDown,
  MessageSquare, Users
} from 'lucide-react'

type InteractionType = 'appel' | 'email' | 'reunion' | 'commande' | 'paiement' | 'reclamation'

type Interaction = {
  id: string
  clientId: string
  clientName: string
  type: InteractionType
  date: string
  description: string
  agent: string
  amount?: number
  notes?: string
}

const interactionTypeConfig: Record<InteractionType, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  appel:     { label: 'Appel',     color: 'text-blue-600',   bgColor: 'bg-blue-100',   icon: <Phone size={14} /> },
  email:     { label: 'Email',     color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <Mail size={14} /> },
  reunion:   { label: 'Réunion',   color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <Calendar size={14} /> },
  commande:  { label: 'Commande',  color: 'text-green-600',  bgColor: 'bg-green-100',  icon: <ShoppingCart size={14} /> },
  paiement:  { label: 'Paiement',  color: 'text-emerald-600',bgColor: 'bg-emerald-100',icon: <CreditCard size={14} /> },
  reclamation:{ label: 'Réclamation', color: 'text-red-600',  bgColor: 'bg-red-100',    icon: <AlertCircle size={14} /> },
}

const mockInteractions: Interaction[] = [
  { id: '1', clientId: '1', clientName: 'Jean MUTOMBO', type: 'appel', date: '2026-08-18', description: 'Appel de suivi concernant la commande de papier A4. Le client confirme la réception partielle.', agent: 'Pascal MUKENDI' },
  { id: '2', clientId: '3', clientName: 'Patrick LUKUSA', type: 'commande', date: '2026-08-17', description: 'Nouvelle commande de 500 cartes de visite premium et 200 flyers A5.', agent: 'Marie KALONJI', amount: 850000 },
  { id: '3', clientId: '5', clientName: 'Emmanuel TSHISEKEDI', type: 'paiement', date: '2026-08-16', description: 'Paiement reçu par virement bancaire pour facture FAC-2026-045.', agent: 'Luc KABAMBA', amount: 3500000 },
  { id: '4', clientId: '2', clientName: 'Marie KABILA', type: 'email', date: '2026-08-15', description: 'Envoi du devis pour impression de 1000 brochures couleur recto-verso.', agent: 'Pascal MUKENDI' },
  { id: '5', clientId: '7', clientName: 'David KALALA', type: 'reunion', date: '2026-08-14', description: 'Réunion de planification annuelle. Discussion sur les besoins en graphisme pour Q4 2026.', agent: 'Marie KALONJI' },
  { id: '6', clientId: '1', clientName: 'Jean MUTOMBO', type: 'commande', date: '2026-08-12', description: 'Commande de 2000 enveloppes personnalisées et 500 tampons encreur.', agent: 'Pascal MUKENDI', amount: 1200000 },
  { id: '7', clientId: '6', clientName: 'Sylvie NGOY', type: 'reclamation', date: '2026-08-11', description: 'Réclamation concernant un retard de livraison de 3 jours sur la commande de flyers.', agent: 'Luc KABAMBA' },
  { id: '8', clientId: '5', clientName: 'Emmanuel TSHISEKEDI', type: 'appel', date: '2026-08-10', description: 'Appel pour demander un devis rapide pour un projet d\'affichage grand format.', agent: 'Marie KALONJI' },
  { id: '9', clientId: '3', clientName: 'Patrick LUKUSA', type: 'paiement', date: '2026-08-09', description: 'Paiement espèces reçu au guichet pour la commande de cartes de visite.', agent: 'Pascal MUKENDI', amount: 425000 },
  { id: '10', clientId: '8', clientName: 'Annie MASUDI', type: 'email', date: '2026-08-08', description: 'Relance par email pour le paiement en attente de la facture FAC-2026-031.', agent: 'Luc KABAMBA' },
  { id: '11', clientId: '4', clientName: 'Grâce MWAMBA', type: 'reunion', date: '2026-08-07', description: 'Réunion de résiliation du contrat de service annuel. Négociation en cours.', agent: 'Marie KALONJI' },
  { id: '12', clientId: '7', clientName: 'David KALALA', type: 'commande', date: '2026-08-05', description: 'Commande de 1000 dépliants A4 pliure 3 volets pour la campagne marketing.', agent: 'Pascal MUKENDI', amount: 650000 },
  { id: '13', clientId: '2', clientName: 'Marie KABILA', type: 'appel', date: '2026-08-04', description: 'Appel pour confirmer la date de livraison des brochures commandées.', agent: 'Luc KABAMBA' },
  { id: '14', clientId: '1', clientName: 'Jean MUTOMBO', type: 'reclamation', date: '2026-08-02', description: 'Réclamation sur la qualité de l\'impression des tampons. Demande de remplacement.', agent: 'Marie KALONJI' },
  { id: '15', clientId: '6', clientName: 'Sylvie NGOY', type: 'commande', date: '2026-08-01', description: 'Commande de 500 stickers vinyle pour véhicules promotionnels.', agent: 'Pascal MUKENDI', amount: 375000 },
  { id: '16', clientId: '5', clientName: 'Emmanuel TSHISEKEDI', type: 'email', date: '2026-07-30', description: 'Envoi du rapport mensuel des impressions et consommables utilisés.', agent: 'Luc KABAMBA' },
  { id: '17', clientId: '3', clientName: 'Patrick LUKUSA', type: 'appel', date: '2026-07-28', description: 'Appel de satisfaction post-livraison. Client très satisfait du résultat.', agent: 'Pascal MUKENDI' },
  { id: '18', clientId: '8', clientName: 'Annie MASUDI', type: 'paiement', date: '2026-07-25', description: 'Paiement mobile money reçu pour la facture FAC-2026-028.', agent: 'Marie KALONJI', amount: 150000 },
]

const agents = [...new Set(mockInteractions.map(i => i.agent))]

export default function ClientHistoryPage() {
  const { items, add } = useMockDB<Interaction>('alba-client-interactions', mockInteractions)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [newForm, setNewForm] = useState({
    clientId: '',
    type: 'appel' as InteractionType,
    description: '',
    agent: '',
    amount: '',
    notes: '',
  })

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach(i => map.set(i.clientId, i.clientName))
    return Array.from(map.entries())
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchesSearch = !search ||
        i.clientName.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase()) ||
        i.agent.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || i.type === typeFilter
      const matchesClient = clientFilter === 'all' || i.clientId === clientFilter
      const matchesDateFrom = !dateFrom || i.date >= dateFrom
      const matchesDateTo = !dateTo || i.date <= dateTo
      return matchesSearch && matchesType && matchesClient && matchesDateFrom && matchesDateTo
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [items, search, typeFilter, clientFilter, dateFrom, dateTo])

  const totalCalls = items.filter(i => i.type === 'appel').length
  const totalOrders = items.filter(i => i.type === 'commande').length
  const totalPayments = items.filter(i => i.type === 'paiement').length
  const totalRevenue = items.filter(i => i.type === 'paiement').reduce((s, i) => s + (i.amount || 0), 0)

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, Interaction[]> = {}
    filteredItems.forEach(i => {
      const d = new Date(i.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      if (!groups[key]) groups[key] = []
      groups[key].push(i)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredItems])

  const handleAddInteraction = () => {
    if (!newForm.clientId || !newForm.description || !newForm.agent) return
    const clientName = clients.find(c => c[0] === newForm.clientId)?.[1] || ''
    add({
      clientId: newForm.clientId,
      clientName,
      type: newForm.type,
      date: new Date().toISOString().split('T')[0],
      description: newForm.description,
      agent: newForm.agent,
      amount: newForm.amount ? Number(newForm.amount) : undefined,
      notes: newForm.notes || undefined,
    })
    setShowNewModal(false)
    setNewForm({ clientId: '', type: 'appel', description: '', agent: '', amount: '', notes: '' })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Historique des Interactions"
        subtitle="Suivi complet des échanges avec vos clients"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Clients / CRM' }, { label: 'Historique' }]}
        icon={<History size={22} />}
        iconBg="gradient-primary"
        actions={
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-xl hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
            <Plus size={15} /> Nouvelle interaction
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total interactions" value={items.length.toString()} icon={<MessageSquare size={20} />} gradient="gradient-primary" />
        <KpiCard title="Appels" value={totalCalls.toString()} icon={<Phone size={20} />} gradient="gradient-success" />
        <KpiCard title="Commandes" value={totalOrders.toString()} icon={<ShoppingCart size={20} />} gradient="gradient-teal" change={8} changeLabel="ce mois" />
        <KpiCard title="Paiements reçus" value={`${(totalRevenue / 1000000).toFixed(1)}M FC`} icon={<CreditCard size={20} />} gradient="gradient-warning" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client, agent, description..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les types</option>
            {(Object.keys(interactionTypeConfig) as InteractionType[]).map(t => (
              <option key={t} value={t}>{interactionTypeConfig[t].label}</option>
            ))}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les clients</option>
            {clients.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100'}`}>
            <Filter size={13} /> Filtres
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-3 items-end">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Date début</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Date fin</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:outline-none" />
            </div>
            {(dateFrom || dateTo || typeFilter !== 'all' || clientFilter !== 'all') && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter('all'); setClientFilter('all') }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {groupedByMonth.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune interaction trouvée</p>
          </div>
        )}

        {groupedByMonth.map(([monthKey, interactions]) => {
          const [year, month] = monthKey.split('-')
          const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          return (
            <div key={monthKey}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock size={14} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 capitalize">{monthName}</h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {interactions.length} interaction{interactions.length > 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="relative ml-4 pl-8 border-l-2 border-gray-100 space-y-1">
                {interactions.map((interaction, idx) => {
                  const config = interactionTypeConfig[interaction.type]
                  return (
                    <div key={interaction.id}
                      className="relative group py-4 hover:bg-gray-50/50 rounded-xl px-4 -ml-4 pl-8 transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className={`absolute left-[-9px] top-5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${config.bgColor} flex items-center justify-center`}>
                        <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.color}`}>
                              {config.icon} {config.label}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">{formatDate(interaction.date)}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{interaction.description}</p>
                          {interaction.amount && (
                            <p className="mt-1.5 text-xs font-bold text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded-lg">
                              {formatCurrency(interaction.amount)}
                            </p>
                          )}
                          {interaction.notes && (
                            <p className="mt-1.5 text-xs text-gray-500 italic bg-gray-50 px-3 py-1.5 rounded-lg">
                              📝 {interaction.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 min-w-[160px]">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[8px] font-bold">
                              {interaction.agent.split(' ').map(n => n[0]).join('')}
                            </div>
                            {interaction.agent}
                          </div>
                          <span className="text-[10px] text-gray-400">{interaction.clientName}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Nouvelle interaction</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                <select value={newForm.clientId} onChange={e => setNewForm({ ...newForm, clientId: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                  <option value="">Sélectionner un client</option>
                  {clients.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type d'interaction *</label>
                  <select value={newForm.type} onChange={e => setNewForm({ ...newForm, type: e.target.value as InteractionType })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                    {(Object.keys(interactionTypeConfig) as InteractionType[]).map(t => (
                      <option key={t} value={t}>{interactionTypeConfig[t].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Agent *</label>
                  <input value={newForm.agent} onChange={e => setNewForm({ ...newForm, agent: e.target.value })}
                    type="text" placeholder="Nom de l'agent"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                <textarea value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                  rows={3} placeholder="Décrivez l'interaction..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Montant (FC)</label>
                  <input value={newForm.amount} onChange={e => setNewForm({ ...newForm, amount: e.target.value })}
                    type="number" placeholder="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <input value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })}
                    type="text" placeholder="Notes supplémentaires"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Annuler
                </button>
                <button onClick={handleAddInteraction}
                  className="px-5 py-2 text-sm font-medium text-white rounded-xl hover:opacity-90 transition-colors"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
