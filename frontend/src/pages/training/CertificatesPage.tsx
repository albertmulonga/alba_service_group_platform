import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import KpiCard from '@/components/ui/KpiCard'
import ExportButton from '@/components/ui/ExportButton'
import { formatDate, getInitials } from '@/lib/utils'
import { useMockDB } from '@/hooks/useMockDB'
import {
  Award, Search, TrendingUp, CheckCircle, Clock, X, Printer,
  Download, Eye, Star
} from 'lucide-react'

/* ─── Types ────────────────────────────────────────────── */
type Certificate = {
  id: string
  studentName: string
  courseName: string
  completionDate: string
  grade: number
  status: 'Obtenu' | 'En attente' | 'Non obtenu'
  hours: number
}

/* ─── Mock data ─────────────────────────────────────────── */
const MOCK_CERTIFICATES: Certificate[] = [
  { id: 'CERT-001', studentName: 'Jean Mukoka', courseName: 'Développement Web Full Stack', completionDate: '2026-07-20', grade: 88, status: 'Obtenu', hours: 192 },
  { id: 'CERT-002', studentName: 'Marie Tshiala', courseName: 'Microsoft Office Professionnel', completionDate: '2026-07-10', grade: 92, status: 'Obtenu', hours: 96 },
  { id: 'CERT-003', studentName: 'Paul Kabila', courseName: 'Développement Web Full Stack', completionDate: '2026-07-20', grade: 55, status: 'Non obtenu', hours: 192 },
  { id: 'CERT-004', studentName: 'Sophie Ngoy', courseName: 'Adobe Photoshop & Illustrator', completionDate: '2026-08-15', grade: 0, status: 'En attente', hours: 128 },
  { id: 'CERT-005', studentName: 'André Mbuyi', courseName: 'Maintenance Informatique', completionDate: '2026-07-15', grade: 82, status: 'Obtenu', hours: 80 },
  { id: 'CERT-006', studentName: 'Claire Mutombo', courseName: 'Maintenance Informatique', completionDate: '2026-07-15', grade: 91, status: 'Obtenu', hours: 80 },
  { id: 'CERT-007', studentName: 'Patricia Kasongo', courseName: 'Microsoft Office Professionnel', completionDate: '2026-07-10', grade: 78, status: 'Obtenu', hours: 96 },
  { id: 'CERT-008', studentName: 'Samuel Lukusa', courseName: 'Cybersécurité Fondamentaux', completionDate: '2026-09-30', grade: 0, status: 'En attente', hours: 64 },
  { id: 'CERT-009', studentName: 'Grâce Ilunga', courseName: 'Développement Web Full Stack', completionDate: '2026-07-20', grade: 95, status: 'Obtenu', hours: 192 },
  { id: 'CERT-010', studentName: 'David Mwamba', courseName: 'Adobe Photoshop & Illustrator', completionDate: '2026-08-15', grade: 0, status: 'En attente', hours: 128 },
  { id: 'CERT-011', studentName: 'Chantal Kabongo', courseName: 'Microsoft Office Professionnel', completionDate: '2026-07-10', grade: 70, status: 'Obtenu', hours: 96 },
  { id: 'CERT-012', studentName: 'Rodrigue Sendwe', courseName: 'Maintenance Informatique', completionDate: '2026-07-15', grade: 45, status: 'Non obtenu', hours: 80 },
  { id: 'CERT-013', studentName: 'Bénédicte Kasongo', courseName: 'Flutter & Développement Mobile', completionDate: '2026-10-15', grade: 0, status: 'En attente', hours: 160 },
  { id: 'CERT-014', studentName: 'Emmanuel Tshimanga', courseName: 'Développement Web Full Stack', completionDate: '2026-07-20', grade: 85, status: 'Obtenu', hours: 192 },
]

/* ─── Status config ──────────────────────────────────────── */
const statusConfig: Record<string, { type: string }> = {
  'Obtenu':     { type: 'success' },
  'En attente': { type: 'warning' },
  'Non obtenu': { type: 'danger' },
}

/* ─── Main component ─────────────────────────────────── */
export default function CertificatesPage() {
  const { items: certificates } = useMockDB<Certificate>('alba-certificates', MOCK_CERTIFICATES)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = certificates.filter(c => {
    const matchSearch = `${c.studentName} ${c.courseName} ${c.id}`.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const {
    currentPage, setCurrentPage, pageSize, setPageSize,
    paginatedItems, totalItems, totalPages
  } = usePagination(filtered, 10)

  const totalCerts = certificates.length
  const obtained = certificates.filter(c => c.status === 'Obtenu').length
  const pending = certificates.filter(c => c.status === 'En attente').length
  const successRate = totalCerts > 0 ? Math.round((obtained / totalCerts) * 100) : 0

  const generateCertificate = (cert: Certificate) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificat - ${cert.studentName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
          .certificate {
            width: 297mm; height: 210mm; background: #fff; position: relative; overflow: hidden;
            font-family: 'Inter', sans-serif;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          }
          .border-outer {
            position: absolute; inset: 12px; border: 3px solid #16A34A; border-radius: 8px;
          }
          .border-inner {
            position: absolute; inset: 18px; border: 1px solid #16A34A55; border-radius: 6px;
          }
          .corner { position: absolute; width: 60px; height: 60px; }
          .corner-tl { top: 20px; left: 20px; border-top: 4px solid #16A34A; border-left: 4px solid #16A34A; }
          .corner-tr { top: 20px; right: 20px; border-top: 4px solid #16A34A; border-right: 4px solid #16A34A; }
          .corner-bl { bottom: 20px; left: 20px; border-bottom: 4px solid #16A34A; border-left: 4px solid #16A34A; }
          .corner-br { bottom: 20px; right: 20px; border-bottom: 4px solid #16A34A; border-right: 4px solid #16A34A; }
          .content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 50px 80px; text-align: center; }
          .logo-area { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
          .logo-circle { width: 64px; height: 64px; background: linear-gradient(135deg, #16A34A, #22C55E); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 22px; font-family: 'Playfair Display', serif; }
          .company-name { font-size: 22px; font-weight: 700; color: #1a1a1a; letter-spacing: 3px; }
          .subtitle { font-size: 10px; color: #666; letter-spacing: 5px; text-transform: uppercase; margin-top: 2px; }
          .divider { width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #16A34A, transparent); margin: 16px 0; }
          .cert-title { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; color: #16A34A; letter-spacing: 4px; margin-bottom: 6px; }
          .cert-subtitle { font-size: 12px; color: #888; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 20px; }
          .text-body { font-size: 14px; color: #444; line-height: 1.8; max-width: 500px; }
          .student-name { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 10px 0; border-bottom: 2px solid #16A34A44; padding-bottom: 4px; display: inline-block; }
          .course-info { font-size: 13px; color: #555; margin: 8px 0; }
          .course-name { font-weight: 700; color: #16A34A; }
          .details-row { display: flex; gap: 40px; margin: 16px 0; justify-content: center; }
          .detail-item { text-align: center; }
          .detail-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 2px; }
          .detail-value { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 2px; }
          .signatures { display: flex; justify-content: space-between; width: 100%; margin-top: 30px; padding: 0 40px; }
          .signature { text-align: center; }
          .sig-line { width: 180px; border-top: 1px solid #ccc; margin-bottom: 6px; }
          .sig-name { font-size: 11px; font-weight: 600; color: #333; }
          .sig-title { font-size: 9px; color: #888; }
          .date-footer { position: absolute; bottom: 40px; font-size: 10px; color: #aaa; letter-spacing: 1px; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 900; color: #16A34A08; font-family: 'Playfair Display', serif; letter-spacing: 20px; pointer-events: none; }
          @media print { body { background: none; } .certificate { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="border-outer"></div>
          <div class="border-inner"></div>
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
          <div class="watermark">ALBA</div>
          <div class="content">
            <div class="logo-area">
              <div class="logo-circle">A</div>
              <div>
                <div class="company-name">ALBA SERVICE GROUP</div>
                <div class="subtitle">Digital Academy</div>
              </div>
            </div>
            <div class="divider"></div>
            <div class="cert-title">CERTIFICAT DE RÉUSSITE</div>
            <div class="cert-subtitle">Certificat de formation professionnelle</div>
            <div class="text-body">
              Le jury certifie que
            </div>
            <div class="student-name">${cert.studentName}</div>
            <div class="text-body">
              a suivi avec succès la formation en
            </div>
            <div class="course-info"><span class="course-name">${cert.courseName}</span></div>
            <div class="details-row">
              <div class="detail-item">
                <div class="detail-label">Date d'obtention</div>
                <div class="detail-value">${new Date(cert.completionDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Note obtenue</div>
                <div class="detail-value">${cert.grade}/100</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Heures de formation</div>
                <div class="detail-value">${cert.hours}h</div>
              </div>
            </div>
            <div class="signatures">
              <div class="signature">
                <div class="sig-line"></div>
                <div class="sig-name">Directeur Général</div>
                <div class="sig-title">ALBA Service Group</div>
              </div>
              <div class="signature">
                <div class="sig-line"></div>
                <div class="sig-name">Formateur Référent</div>
                <div class="sig-title">ALBA Digital Academy</div>
              </div>
            </div>
            <div class="date-footer">Réf: ${cert.id} · Kindu, Maniema, RDC</div>
          </div>
        </div>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => printWindow.print(), 600)
      setToast(`Certificat de ${cert.studentName} généré`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Certificats de Formation"
        subtitle="Gestion et génération des certificats de formation"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Formation' }, { label: 'Certificats' }]}
        icon={<Award size={22} />}
        iconBg="gradient-warning"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total certificats" value={totalCerts.toString()} icon={<Award size={20} />} gradient="gradient-primary" />
        <KpiCard title="Obtenus" value={obtained.toString()} icon={<CheckCircle size={20} />} gradient="gradient-success" />
        <KpiCard title="En attente" value={pending.toString()} icon={<Clock size={20} />} gradient="gradient-warning" />
        <KpiCard title="Taux de réussite" value={`${successRate}%`} icon={<TrendingUp size={20} />} gradient="gradient-teal" change={8} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un apprenant, formation, référence..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none">
            <option value="all">Tous les statuts</option>
            <option value="Obtenu">Obtenu</option>
            <option value="En attente">En attente</option>
            <option value="Non obtenu">Non obtenu</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Liste des certificats ({totalItems})</h3>
          <ExportButton
            data={filtered}
            filename="certificats-alba"
            title="Certificats de Formation"
            headers={{ id: 'Référence', studentName: 'Apprenant', courseName: 'Formation', completionDate: 'Date', grade: 'Note', status: 'Statut', hours: 'Heures' }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['Apprenant', 'Formation', 'Date', 'Note', 'Heures', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.map(c => (
                <tr key={c.id} className="hover:bg-green-50/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                        {getInitials(c.studentName)}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-gray-800">{c.studentName}</span>
                        <p className="text-[10px] text-gray-400">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-gray-700 max-w-[200px] truncate block">{c.courseName}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(c.completionDate)}</td>
                  <td className="px-4 py-3.5">
                    {c.grade > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-bold text-gray-700">{c.grade}/100</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-gray-600">{c.hours}h</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge label={c.status} type={statusConfig[c.status]?.type as any || 'secondary'} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreviewCert(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Aperçu">
                        <Eye size={13} />
                      </button>
                      {c.status === 'Obtenu' && (
                        <button onClick={() => generateCertificate(c)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Générer certificat">
                          <Printer size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun certificat trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage} totalPages={totalPages} totalItems={totalItems}
          pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
        />
      </div>

      {/* Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewCert(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                  <Award size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Aperçu du certificat</h3>
                  <p className="text-[10px] text-gray-400">{previewCert.studentName} · {previewCert.courseName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewCert.status === 'Obtenu' && (
                  <button onClick={() => generateCertificate(previewCert)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-xl hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
                    <Printer size={13} /> Imprimer
                  </button>
                )}
                <button onClick={() => setPreviewCert(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex items-center justify-center min-h-[400px]">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-[700px] aspect-[1.414] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-3 border-2 border-green-600/30 rounded-md pointer-events-none" />
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3"
                  style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>A</div>
                <p className="text-lg font-bold tracking-[3px] text-gray-800">ALBA SERVICE GROUP</p>
                <p className="text-[9px] text-gray-400 tracking-[4px] uppercase">Digital Academy</p>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-green-500 to-transparent my-4" />
                <p className="text-2xl font-black text-green-600 tracking-[3px] font-serif">CERTIFICAT DE RÉUSSITE</p>
                <p className="text-[9px] text-gray-400 tracking-[5px] uppercase mt-1 mb-4">Certificat de formation professionnelle</p>
                <p className="text-sm text-gray-500">Le jury certifie que</p>
                <p className="text-2xl font-bold text-gray-800 font-serif border-b-2 border-green-500/30 pb-1 my-2">{previewCert.studentName}</p>
                <p className="text-sm text-gray-500">a suivi avec succès la formation en</p>
                <p className="text-sm font-bold text-green-600 mt-1">{previewCert.courseName}</p>
                <div className="flex gap-8 mt-4">
                  <div className="text-center">
                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Date</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(previewCert.completionDate)}</p>
                  </div>
                  {previewCert.grade > 0 && (
                    <div className="text-center">
                      <p className="text-[8px] text-gray-400 uppercase tracking-wider">Note</p>
                      <p className="text-sm font-bold text-gray-800">{previewCert.grade}/100</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-[8px] text-gray-400 uppercase tracking-wider">Heures</p>
                    <p className="text-sm font-bold text-gray-800">{previewCert.hours}h</p>
                  </div>
                </div>
                <div className="flex justify-between w-full mt-6 px-8">
                  <div className="text-center">
                    <div className="w-36 border-t border-gray-300 mb-1" />
                    <p className="text-[10px] font-semibold text-gray-700">Directeur Général</p>
                    <p className="text-[8px] text-gray-400">ALBA Service Group</p>
                  </div>
                  <div className="text-center">
                    <div className="w-36 border-t border-gray-300 mb-1" />
                    <p className="text-[10px] font-semibold text-gray-700">Formateur Référent</p>
                    <p className="text-[8px] text-gray-400">ALBA Digital Academy</p>
                  </div>
                </div>
                <p className="absolute bottom-4 text-[8px] text-gray-300">Réf: {previewCert.id} · Kindu, Maniema, RDC</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-fade-in gradient-success">
          <CheckCircle size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
