import { useEffect, useRef, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { BrowserQRCodeReader } from '@zxing/browser'
import { QRCodeSVG } from 'qrcode.react'
import {
  BadgeCheck,
  Camera,
  Fingerprint,
  LoaderCircle,
  Printer,
  QrCode,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import WindowsHelloEnrollmentCard from '@/components/hr/WindowsHelloEnrollmentCard'
import { getAttendanceErrorMessage } from '@/services/attendance-security.service'

type Employee = {
  id: string
  code: string
  firstName: string
  lastName: string
  position?: string | null
  photo?: string | null
  department?: string
}

export type IssuedEmployeeBadge = {
  token: string
  issuedAt: string
  employee: Employee
}

type Props = {
  open: boolean
  onClose: () => void
  onAttendanceRecorded: () => void
  initialTab?: 'scan' | 'badge'
  initialIssuedBadge?: IssuedEmployeeBadge | null
}

export default function AttendanceQrTools({
  open,
  onClose,
  onAttendanceRecorded,
  initialTab = 'scan',
  initialIssuedBadge = null,
}: Props) {
  const [tab, setTab] = useState<'scan' | 'badge'>(initialTab)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [issuedBadge, setIssuedBadge] = useState<IssuedEmployeeBadge | null>(initialIssuedBadge)
  const [scanValue, setScanValue] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setError('')
    api.get('/hr/employees', { params: { limit: 200, status: 'ACTIVE' } })
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        if (!active) return
        const activeEmployees = list.filter((employee: Employee) => employee.id && employee.code)
        setEmployees(activeEmployees)
        setSelectedEmployeeId((current) => current || activeEmployees[0]?.id || '')
      })
      .catch((cause: unknown) => {
        if (active) setError(`Impossible de charger les employés : ${getErrorMessage(cause)}`)
      })
    return () => { active = false }
  }, [open])

  useEffect(() => {
    if (!open || !cameraActive || !videoRef.current) return
    let cancelled = false
    const reader = new BrowserQRCodeReader()
    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!result || processingRef.current) return
      controlsRef.current?.stop()
      setCameraActive(false)
      void processScannedToken(result.getText())
    }).then((controls) => {
      if (cancelled) controls.stop()
      else controlsRef.current = controls
    }).catch((cause: unknown) => {
      if (cancelled) return
      setCameraActive(false)
      setError(`La caméra n’a pas pu démarrer : ${getAttendanceErrorMessage(cause)}`)
    })
    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open, cameraActive])

  useEffect(() => {
    if (open) return
    controlsRef.current?.stop()
    controlsRef.current = null
    setCameraActive(false)
    setIssuedBadge(null)
    setSuccess('')
  }, [open])

  const processScannedToken = async (token: string) => {
    if (processingRef.current) return
    const value = token.trim()
    if (!value) {
      setError('Le QR ne contient pas de code de badge')
      return
    }
    processingRef.current = true
    setBusy(true)
    setError('')
    setSuccess('')
    setScanValue('')
    try {
      const { data: challenge } = await api.post('/hr/attendance/scan/options', { token: value })
      const response = await startAuthentication({ optionsJSON: challenge.options })
      const { data: result } = await api.post('/hr/attendance/scan/verify', {
        token: value,
        challengeId: challenge.challengeId,
        response,
      })
      const action = result.action === 'check-out' ? 'départ' : 'arrivée'
      setSuccess(`${action.charAt(0).toUpperCase()}${action.slice(1)} enregistrée avec QR et Windows Hello.`)
      onAttendanceRecorded()
    } catch (cause) {
      setError(getAttendanceErrorMessage(cause))
    } finally {
      processingRef.current = false
      setBusy(false)
    }
  }

  const issueBadge = async () => {
    if (!selectedEmployeeId) {
      setError('Sélectionne un employé actif.')
      return
    }
    if (issuedBadge && !window.confirm('Créer un nouveau QR révoquera le badge précédent. Continuer ?')) {
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const { data } = await api.post(`/hr/employees/${selectedEmployeeId}/cards/issue`)
      setIssuedBadge(data)
      setSuccess('Nouveau badge prêt. L’ancien QR de cet employé a été révoqué.')
    } catch (cause) {
      setError(getAttendanceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId)

  return (
    <div className="attendance-qr-overlay fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onMouseDown={onClose}>
      <style>{`
        @media print {
          @page { size: 85mm 135mm; margin: 0; }
          body * { visibility: hidden !important; }
          .attendance-qr-overlay {
            position: static !important; display: block !important; inset: auto !important;
            width: auto !important; height: auto !important; padding: 0 !important;
            background: transparent !important; overflow: visible !important;
          }
          .attendance-qr-modal {
            position: static !important; display: block !important; overflow: visible !important;
            width: auto !important; max-width: none !important; max-height: none !important;
            padding: 0 !important; background: transparent !important; box-shadow: none !important;
          }
          .attendance-qr-content {
            max-height: none !important; overflow: visible !important; padding: 0 !important;
          }
          #alba-employee-badge-print,
          #alba-employee-badge-print * { visibility: visible !important; }
          #alba-employee-badge-print {
            position: absolute !important; left: 0 !important; top: 0 !important;
            display: block !important; width: 85mm !important; padding: 0 !important;
          }
          .badge-print-face {
            width: 85mm !important; height: 135mm !important; margin: 0 !important;
            border-radius: 0 !important; box-shadow: none !important;
            page-break-after: always !important; break-after: page !important;
            print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important;
          }
          .badge-print-face:last-child {
            page-break-after: auto !important; break-after: auto !important;
          }
        }
      `}</style>
      <div
        className="attendance-qr-modal w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pointage QR & sécurité Windows Hello</h2>
            <p className="mt-1 text-xs text-slate-500">Le pointage est enregistré uniquement après les deux vérifications.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-100 px-5 pt-3">
          <button
            onClick={() => { setTab('scan'); setError(''); setSuccess('') }}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === 'scan' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <QrCode size={16} /> Scanner un badge
          </button>
          <button
            onClick={() => { setTab('badge'); setError(''); setSuccess('') }}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold ${tab === 'badge' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BadgeCheck size={16} /> Badges employés
          </button>
        </div>

        <div className="attendance-qr-content max-h-[78vh] overflow-y-auto p-5">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}

          {tab === 'scan' ? (
            <div className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
              <section className="space-y-4">
                <WindowsHelloEnrollmentCard disabled={busy} />

                <label className="block text-xs font-semibold text-slate-700" htmlFor="attendance-qr-token">
                  Scanner USB ou code QR
                </label>
                <input
                  id="attendance-qr-token"
                  autoFocus
                  autoComplete="off"
                  value={scanValue}
                  onChange={(event) => setScanValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void processScannedToken(scanValue)
                  }}
                  placeholder="Scanne le badge avec un lecteur QR USB puis confirme"
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={busy}
                />
                <button
                  onClick={() => void processScannedToken(scanValue)}
                  disabled={busy || !scanValue.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                  Vérifier le QR et Windows Hello
                </button>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Caméra du PC</h3>
                    <p className="mt-1 text-xs text-slate-500">Autorise l’accès à la caméra pour scanner le badge.</p>
                  </div>
                  <Camera size={19} className="text-slate-500" />
                </div>
                <div className="overflow-hidden rounded-lg bg-slate-900">
                  <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
                </div>
                <button
                  onClick={() => {
                    setError('')
                    setCameraActive((active) => !active)
                  }}
                  disabled={busy}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  <Camera size={15} /> {cameraActive ? 'Arrêter la caméra' : 'Activer la caméra'}
                </button>
              </section>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[minmax(230px,0.8fr)_1fr]">
              <section className="space-y-4">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="badge-employee">
                  Employé
                </label>
                <select
                  id="badge-employee"
                  value={selectedEmployeeId}
                  onChange={(event) => { setSelectedEmployeeId(event.target.value); setIssuedBadge(null) }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  disabled={busy}
                >
                  {employees.length === 0 && <option value="">Aucun employé actif</option>}
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName} — {employee.code}
                    </option>
                  ))}
                </select>
                <button
                  onClick={issueBadge}
                  disabled={busy || !selectedEmployeeId}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <QrCode size={16} />}
                  Créer / renouveler le badge QR
                </button>
                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  Le QR est un code secret : il est affiché une seule fois. Le renouveler révoque immédiatement l’ancien badge.
                </p>
                {issuedBadge && (
                  <button
                    onClick={() => window.print()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer size={16} /> Imprimer le badge
                  </button>
                )}
              </section>

              {issuedBadge ? (
                <div id="alba-employee-badge-print" className="flex flex-col items-center gap-4 rounded-xl bg-slate-100 p-4">
                  <div className="badge-print-face relative flex h-[520px] w-[330px] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl">
                    <div className="relative flex h-[165px] flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 px-4 text-center text-white">
                      <img src="/alba-logo.png" alt="ALBA" className="mb-2 h-14 w-14 rounded-full bg-white object-contain p-1" />
                      <p className="text-[11px] font-black uppercase tracking-[0.16em]">ALBA SERVICE GROUP</p>
                      <p className="mt-1 text-[10px] font-medium text-blue-100">CARTE DE SERVICE</p>
                      <div className="absolute -bottom-9 flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-blue-100 text-xl font-black text-blue-900 shadow-md">
                        {issuedBadge.employee.photo
                          ? <img src={issuedBadge.employee.photo} alt="" className="h-full w-full object-cover" />
                          : `${issuedBadge.employee.firstName[0] ?? ''}${issuedBadge.employee.lastName[0] ?? ''}`}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col items-center px-5 pt-12 text-center">
                      <h3 className="text-lg font-black uppercase leading-tight">
                        {issuedBadge.employee.firstName} {issuedBadge.employee.lastName}
                      </h3>
                      <p className="mt-1 text-xs font-bold uppercase text-red-700">
                        {issuedBadge.employee.position || issuedBadge.employee.department || 'Employé'}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500">
                        MATRICULE : {issuedBadge.employee.code}
                      </p>
                      <div className="mt-auto flex w-full items-center justify-between border-t border-slate-100 py-4">
                        <div className="max-w-[135px] text-left">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-blue-900">Présence ALBA</p>
                          <p className="mt-1 text-[9px] leading-4 text-slate-500">Scanner le QR puis confirmer avec Windows Hello.</p>
                          <p className="mt-2 text-[8px] text-slate-400">
                            Émis le {new Date(issuedBadge.issuedAt).toLocaleDateString('fr-CD')}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                          <QRCodeSVG value={issuedBadge.token} size={104} level="Q" includeMargin />
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-400" />
                  </div>
                  <div className="badge-print-face flex h-[520px] w-[330px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white shadow-xl">
                    <div className="flex items-center gap-3 border-b border-white/15 px-6 py-5">
                      <img src="/alba-logo.png" alt="ALBA" className="h-12 w-12 rounded-full bg-white object-contain p-1" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide">ALBA SERVICE GROUP</p>
                        <p className="mt-1 text-[9px] text-blue-200">L’excellence au service de vos projets.</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-center px-7">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Carte d’identification</p>
                      <div className="mt-4 rounded-xl border border-white/15 bg-white/10 p-4">
                        <p className="text-[11px] font-bold leading-5">
                          Ce badge est strictement personnel et ne peut pas être prêté.
                        </p>
                        <p className="mt-3 text-[10px] leading-5 text-blue-100">
                          En cas de perte, veuillez le remettre à l’administration.
                        </p>
                      </div>
                      <div className="mt-4 rounded-xl border border-cyan-200/30 p-4">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-cyan-100">Pointage sécurisé</p>
                        <p className="mt-1 text-[9px] leading-4 text-blue-100">
                          Le QR doit être accompagné de la vérification Windows Hello.
                        </p>
                      </div>
                    </div>
                    <div className="h-3 bg-gradient-to-r from-red-600 via-white to-cyan-300" />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <div>
                    <BadgeCheck className="mx-auto text-slate-400" size={34} />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {selectedEmployee
                        ? `Le badge de ${selectedEmployee.firstName} ${selectedEmployee.lastName} apparaîtra ici`
                        : 'Sélectionne un employé pour préparer son badge'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Le QR ne contient aucune donnée personnelle lisible.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">
            <p>
              Windows Hello valide l’utilisateur de ce compte Windows (empreinte si disponible, PIN système possible en secours).
              Pour reconnaître plusieurs employés sur une borne partagée, un lecteur biométrique externe compatible sera nécessaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
