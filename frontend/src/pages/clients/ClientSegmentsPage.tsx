import { useState, useMemo } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Users, Star, Crown, UserCheck, Sparkles, Clock,
  Search, Eye, Phone, Mail, MapPin, ChevronDown, ChevronRight,
  TrendingUp, PieChart as PieChartIcon, BarChart3, Layers, X
} from 'lucide-react'

type ClientType = {
  id: string
  code: string
  firstName: string
  lastName: string
  companyName: string
  email: string
  phone: string
  address: string
  city: string
  province: string
  country: string
  category: string
  status: string
  totalSpent: number
  ordersCount: number
  createdAt: string
}

type SegmentKey = 'vip' | 'premium' | 'standard' | 'nouveau' | 'inactif'

type SegmentConfig = {
  key: SegmentKey
  label: string
  description: string
  color: string
  bgGradient: string
  borderColor: string
  icon: React.ReactNode
  badgeBg: string
  badgeText: string
}

const segmentConfigs: SegmentConfig[] = [
  {
    key: 'vip', label: 'VIP',
    description: 'Chiffre d\'affaires supérieur à 5 000 000 FC',
    color: '#F59E0B', bgGradient: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
    borderColor: 'border-amber-200', icon: <Crown size={20} />,
    badgeBg: 'bg-amber-100', badgeText: 'text-amber-700',
  },
  {
    key: 'premium', label: 'Premium',
    description: 'Chiffre d\'affaires supérieur à 2 000 000 FC',
    color: '#8B5CF6', bgGradient: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
    borderColor: 'border-violet-200', icon: <Star size={20} />,
    badgeBg: 'bg-violet-100', badgeText: 'text-violet-700',
  },
  {
    key: 'standard', label: 'Standard',
    description: 'Chiffre d\'affaires supérieur à 500 000 FC',
    color: '#3B82F6', bgGradient: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
    borderColor: 'border-blue-200', icon: <UserCheck size={20} />,
    badgeBg: 'bg-blue-100', badgeText: 'text-blue-700',
  },
  {
    key: 'nouveau', label: 'Nouveau',
    description: 'Client inscrit depuis moins de 3 mois',
    color: '#10B981', bgGradient: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
    borderColor: 'border-emerald-200', icon: <Sparkles size={20} />,
    badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700',
  },
  {
    key: 'inactif', label: 'Inactif',
    description: 'Plus de 6 mois sans commande',
    color: '#6B7280', bgGradient: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
    borderColor: 'border-gray-200', icon: <Clock size={20} />,
    badgeBg: 'bg-gray-100', badgeText: 'text-gray-600',
  },
]

const mockClients: ClientType[] = [
  { id: '1', code: 'CLT-001', firstName: 'Jean', lastName: 'MUTOMBO', companyName: 'Mutombo & Fils SARL', email: 'jean.mutombo@mutombo-fils.cd', phone: '+243 81 234 5678', address: '12, Av. Lumumba', city: 'Kindu', province: 'Maniema', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 2450000, ordersCount: 12, createdAt: '2024-01-15' },
  { id: '2', code: 'CLT-002', firstName: 'Marie', lastName: 'KABILA', companyName: '', email: 'marie.kabila@gmail.com', phone: '+243 99 876 5432', address: '56, Av. Kasavubu', city: 'Kindu', province: 'Maniema', country: 'RDC', category: 'INDIVIDUAL', status: 'ACTIVE', totalSpent: 875000, ordersCount: 5, createdAt: '2024-03-22' },
  { id: '3', code: 'CLT-003', firstName: 'Patrick', lastName: 'LUKUSA', companyName: 'Lukusa Trading', email: 'plukusa@lukusa-trading.cd', phone: '+243 82 345 6789', address: '78, Av. Tabora', city: 'Masisi', province: 'Nord-Kivu', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 5200000, ordersCount: 28, createdAt: '2023-11-08' },
  { id: '4', code: 'CLT-004', firstName: 'Grâce', lastName: 'MWAMBA', companyName: '', email: 'grace.mwamba@yahoo.fr', phone: '+243 85 432 1098', address: '34, Av. Sendwe', city: 'Lubumbashi', province: 'Haut-Katanga', country: 'RDC', category: 'INDIVIDUAL', status: 'INACTIVE', totalSpent: 320000, ordersCount: 2, createdAt: '2024-06-10' },
  { id: '5', code: 'CLT-005', firstName: 'Emmanuel', lastName: 'TSHISEKEDI', companyName: 'Tshisekedi Industries', email: 'e.tshisekedi@tshi-ind.cd', phone: '+243 81 567 8901', address: '90, Av. du 30 Juin', city: 'Kinshasa', province: 'Kinshasa', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 12800000, ordersCount: 45, createdAt: '2023-05-01' },
  { id: '6', code: 'CLT-006', firstName: 'Sylvie', lastName: 'NGOY', companyName: '', email: 'sylvie.ngoy@outlook.com', phone: '+243 99 654 3210', address: '15, Av. Kasa-Vubu', city: 'Bukavu', province: 'Sud-Kivu', country: 'RDC', category: 'INDIVIDUAL', status: 'ACTIVE', totalSpent: 1200000, ordersCount: 8, createdAt: '2024-02-14' },
  { id: '7', code: 'CLT-007', firstName: 'David', lastName: 'KALALA', companyName: 'Kalala Logistics', email: 'dkalala@kalala-log.cd', phone: '+243 82 789 0123', address: '200, Av. Industrielle', city: 'Lubumbashi', province: 'Haut-Katanga', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 3750000, ordersCount: 19, createdAt: '2023-08-20' },
  { id: '8', code: 'CLT-008', firstName: 'Annie', lastName: 'MASUDI', companyName: '', email: 'annie.masudi@gmail.com', phone: '+243 85 012 3456', address: '8, Av. Mobutu', city: 'Kindu', province: 'Maniema', country: 'RDC', category: 'INDIVIDUAL', status: 'INACTIVE', totalSpent: 150000, ordersCount: 1, createdAt: '2024-07-05' },
  { id: '9', code: 'CLT-009', firstName: 'Robert', lastName: 'KASONGO', companyName: 'Kasongo & Partners', email: 'rkasongo@kasongo-p.cd', phone: '+243 81 111 2233', address: '45, Av. de la Paix', city: 'Kinshasa', province: 'Kinshasa', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 7500000, ordersCount: 35, createdAt: '2023-03-10' },
  { id: '10', code: 'CLT-010', firstName: 'Claire', lastName: 'MBAYA', companyName: '', email: 'claire.mbaya@yahoo.fr', phone: '+243 99 444 5566', address: '12, Av. Lumumba', city: 'Lubumbashi', province: 'Haut-Katanga', country: 'RDC', category: 'INDIVIDUAL', status: 'ACTIVE', totalSpent: 620000, ordersCount: 3, createdAt: '2026-06-01' },
  { id: '11', code: 'CLT-011', firstName: 'Thomas', lastName: 'KABONGO', companyName: 'Kabongo Media', email: 'tkabongo@kabongo-media.cd', phone: '+243 82 777 8899', address: '88, Av. Central', city: 'Kindu', province: 'Maniema', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 4100000, ordersCount: 22, createdAt: '2023-12-05' },
  { id: '12', code: 'CLT-012', firstName: 'Hélène', lastName: 'NGOMA', companyName: '', email: 'helene.ngoma@gmail.com', phone: '+243 85 222 3344', address: '23, Av. Kasai', city: 'Bukavu', province: 'Sud-Kivu', country: 'RDC', category: 'INDIVIDUAL', status: 'INACTIVE', totalSpent: 280000, ordersCount: 1, createdAt: '2025-01-20' },
  { id: '13', code: 'CLT-013', firstName: 'Samuel', lastName: 'LUBALA', companyName: 'Lubala Industries', email: 'slubala@lubala-ind.cd', phone: '+243 81 555 6677', address: '150, Av. Industrielle', city: 'Lubumbashi', province: 'Haut-Katanga', country: 'RDC', category: 'COMPANY', status: 'ACTIVE', totalSpent: 9200000, ordersCount: 41, createdAt: '2023-06-15' },
  { id: '14', code: 'CLT-014', firstName: 'Nadège', lastName: 'KALUBA', companyName: '', email: 'nadege.kaluba@outlook.com', phone: '+243 99 111 0022', address: '7, Av. Tabora', city: 'Kindu', province: 'Maniema', country: 'RDC', category: 'INDIVIDUAL', status: 'ACTIVE', totalSpent: 510000, ordersCount: 4, createdAt: '2026-05-18' },
]

function computeSegments(clients: ClientType[]) {
  const now = new Date()
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const segments: Record<SegmentKey, ClientType[]> = {
    vip: [], premium: [], standard: [], nouveau: [], inactif: [],
  }

  clients.forEach(c => {
    const createdDate = new Date(c.createdAt)
    if (createdDate > threeMonthsAgo) {
      segments.nouveau.push(c)
    }
    if (c.totalSpent > 5000000) {
      segments.vip.push(c)
    } else if (c.totalSpent > 2000000) {
      segments.premium.push(c)
    } else if (c.totalSpent > 500000) {
      segments.standard.push(c)
    }
    if (c.status === 'INACTIVE' || createdDate < sixMonthsAgo) {
      segments.inactif.push(c)
    }
  })

  return segments
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  let cumulative = 0
  const radius = 80
  const cx = 100
  const cy = 100

  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += d.value
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    const largeArc = d.value / total > 0.5 ? 1 : 0

    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    const midAngle = (startAngle + endAngle) / 2
    const labelRadius = radius * 0.65
    const lx = cx + labelRadius * Math.cos(midAngle)
    const ly = cy + labelRadius * Math.sin(midAngle)

    return { path, color: d.color, lx, ly, value: d.value, label: d.label, pct: Math.round((d.value / total) * 100) }
  })

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.path} fill={s.color} stroke="white" strokeWidth="2" className="transition-all duration-300 hover:opacity-80" />
          {s.pct >= 5 && (
            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-bold fill-white">
              {s.pct}%
            </text>
          )}
        </g>
      ))}
      <circle cx={cx} cy={cy} r="40" fill="white" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-[14px] font-bold fill-gray-800">{total}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" className="text-[7px] fill-gray-400">CLIENTS</text>
    </svg>
  )
}

export default function ClientSegmentsPage() {
  const { items: clients } = useMockDB<ClientType>('alba-clients', mockClients)
  const [search, setSearch] = useState('')
  const [expandedSegment, setExpandedSegment] = useState<SegmentKey | null>(null)
  const [selectedClient, setSelectedClient] = useState<ClientType | null>(null)

  const segments = useMemo(() => computeSegments(clients), [clients])

  const segmentSummary = useMemo(() => {
    return segmentConfigs.map(sc => {
      const clientsInSegment = segments[sc.key]
      const totalRevenue = clientsInSegment.reduce((s, c) => s + c.totalSpent, 0)
      return { ...sc, count: clientsInSegment.length, totalRevenue }
    })
  }, [segments])

  const filteredClientList = useMemo(() => {
    if (!expandedSegment) return []
    return segments[expandedSegment].filter(c => {
      return !search ||
        `${c.firstName} ${c.lastName} ${c.companyName}`.toLowerCase().includes(search.toLowerCase())
    })
  }, [segments, expandedSegment, search])

  const totalClients = clients.length
  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0)
  const vipRevenue = segments.vip.reduce((s, c) => s + c.totalSpent, 0)

  const pieData = segmentConfigs.map(sc => ({
    label: sc.label,
    value: segments[sc.key].length,
    color: sc.color,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Segments Clients"
        subtitle="Classification et analyse de votre portefeuille clients"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Clients / CRM' }, { label: 'Segments' }]}
        icon={<Layers size={22} />}
        iconBg="gradient-primary"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total clients" value={totalClients.toString()} icon={<Users size={20} />} gradient="gradient-primary" />
        <KpiCard title="Clients VIP" value={segments.vip.length.toString()} icon={<Crown size={20} />} gradient="gradient-warning" />
        <KpiCard title="CA total" value={`${(totalRevenue / 1000000).toFixed(1)}M FC`} icon={<TrendingUp size={20} />} gradient="gradient-teal" change={12} changeLabel="vs mois dernier" />
        <KpiCard title="CA VIP" value={`${(vipRevenue / 1000000).toFixed(1)}M FC`} icon={<BarChart3 size={20} />} gradient="gradient-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PieChartIcon size={16} className="text-blue-600" /> Répartition des segments
            </h3>
            <PieChart data={pieData} />
            <div className="space-y-2">
              {segmentSummary.map(s => (
                <div key={s.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600">{s.label}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div className="space-y-3">
            {segmentSummary.map(s => {
              const isExpanded = expandedSegment === s.key
              return (
                <div key={s.key} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${s.borderColor}`}>
                  <button onClick={() => setExpandedSegment(isExpanded ? null : s.key)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: s.bgGradient }}>
                      <span style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-800">{s.label}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeBg} ${s.badgeText}`}>
                          {s.count} client{s.count > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.description}</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(s.totalRevenue)}</p>
                      <p className="text-[10px] text-gray-400">CA total</p>
                    </div>
                    <div className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-3">
                      {filteredClientList.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs py-6">Aucun client dans ce segment</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {filteredClientList.map(client => (
                            <div key={client.id}
                              className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors cursor-pointer"
                              onClick={() => setSelectedClient(client)}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                                {client.firstName[0]}{client.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">
                                  {client.firstName} {client.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {client.companyName || 'Individuel'} · {client.city}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-xs font-bold text-gray-800">{formatCurrency(client.totalSpent)}</p>
                                <p className="text-[10px] text-gray-400">{client.ordersCount} cmd</p>
                              </div>
                              <StatusBadge
                                label={client.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                                type={client.status === 'ACTIVE' ? 'success' : 'danger'} />
                              <Eye size={14} className="text-gray-300 hover:text-blue-600 transition-colors flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">Détails du client</h3>
              <button onClick={() => setSelectedClient(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                  {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{selectedClient.firstName} {selectedClient.lastName}</p>
                  <p className="text-xs text-gray-500">{selectedClient.companyName || 'Client individuel'}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{selectedClient.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{selectedClient.ordersCount}</p>
                  <p className="text-[10px] text-blue-500">Commandes</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{formatCurrency(selectedClient.totalSpent)}</p>
                  <p className="text-[10px] text-green-500">Total dépensé</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone size={13} className="text-gray-400" /> {selectedClient.phone}
                </div>
                {selectedClient.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail size={13} className="text-gray-400" /> {selectedClient.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin size={13} className="text-gray-400" /> {selectedClient.city}, {selectedClient.province}
                </div>
              </div>

              <div className="pt-2 text-[10px] text-gray-400 text-center">
                Membre depuis le {formatDate(selectedClient.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
