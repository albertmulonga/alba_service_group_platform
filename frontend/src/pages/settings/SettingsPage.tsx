import React, { useState, useEffect, useCallback, useRef } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import {
  Settings, Building2, Bell, Shield, Database, Palette, Globe,
  CheckCircle, Upload, Trash2, Download, Clock,
  Mail, Smartphone, Volume2, VolumeX, Music, LogOut, HardDrive, AlertTriangle, Info
} from 'lucide-react'
import { resetAllMockDB } from '@/hooks/useMockDB'
import { useTheme } from '@/contexts/ThemeContext'
import { useMessaging } from '@/contexts/MessagingContext'

/* ─── Constants ───────────────────────────────────────── */

const MOCK_DB_KEYS = [
  'alba-clients', 'alba-employees', 'alba-departments', 'alba-secretariat-services',
  'alba-secretariat-orders', 'alba-stock', 'alba-cash-transactions', 'alba-invoices',
  'alba-purchase-orders', 'alba-suppliers', 'alba-payments', 'alba-quotes',
  'alba-commercial-orders', 'alba-accounting-entries', 'alba-budget',
  'alba-documents', 'alba-it-projects', 'alba-it-tickets', 'alba-it-tasks',
  'alba-consumables', 'alba-events', 'alba-graphics', 'alba-machines',
  'alba-production', 'alba-courses', 'alba-students', 'alba-maintenance'
]

const STORAGE_KEY_NOTIFS = 'alba-settings-notifs'
const STORAGE_KEY_SECURITY = 'alba-settings-security'
const STORAGE_KEY_COMPANY = 'alba-company-settings'
const STORAGE_KEY_DB = 'alba-settings-db'
const STORAGE_KEY_LOCALIZATION = 'alba-settings-localization'

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'company', label: 'Entreprise', icon: <Building2 size={18} /> },
  { id: 'appearance', label: 'Apparence', icon: <Palette size={18} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
  { id: 'security', label: 'Sécurité', icon: <Shield size={18} /> },
  { id: 'database', label: 'Base de données', icon: <Database size={18} /> },
  { id: 'localization', label: 'Localisation', icon: <Globe size={18} /> },
  { id: 'sounds', label: 'Sonneries', icon: <Music size={18} /> },
]

/* ─── Defaults ────────────────────────────────────────── */

const DEFAULT_NOTIFS = {
  newOrders: true,
  payments: true,
  stockAlerts: true,
  lateInvoices: true,
  itTickets: true,
  newEmployees: false,
  emailNotifs: true,
  appNotifs: true,
  soundNotifs: false,
  quietHourStart: '22',
  quietHourEnd: '07',
}

const DEFAULT_SECURITY = {
  sessionTimeout: '30',
  maxLoginAttempts: '5',
  autoLogout: true,
  twoFactor: false,
  minPasswordLength: '8',
  requireUppercase: true,
  requireNumber: true,
}

const DEFAULT_COMPANY = {
  name: 'ALBA SERVICE GROUP',
  slogan: 'Une seule plateforme pour gérer toute votre entreprise.',
  address: '',
  city: '',
  province: '',
  country: 'RDC',
  phone: '',
  email: '',
  website: '',
  rccm: '',
  cnss: '',
  tva: '',
  invoicePrefix: 'F-2026-',
  quotePrefix: 'D-2026-',
  orderPrefix: 'ALB-',
  defaultTax: '0',
}

const DEFAULT_DB = {
  autoBackup: true,
  backupFrequency: 'daily',
}

const DEFAULT_LOCALIZATION = {
  timezone: 'Africa/Kinshasa',
  numberFormat: 'space',
}

const STORAGE_KEY_SOUNDS = 'alba-sound-settings'

const MESSAGE_SOUNDS = [
  { id: 'default', label: 'Défaut', description: 'Son standard' },
  { id: 'soft', label: 'Doux', description: 'Notification douce' },
  { id: 'bright', label: 'Brillant', description: 'Son cristallin' },
  { id: 'pop', label: 'Pop', description: 'Pop interactif' },
  { id: 'chime', label: 'Carillon', description: 'Carillon élégant' },
  { id: 'muted', label: 'Muet', description: 'Pas de son' },
]

const CALL_RINGTONES = [
  { id: 'default', label: 'Défaut', description: 'Sonnerie standard' },
  { id: 'classic', label: 'Classique', description: 'Téléphone classique' },
  { id: 'modern', label: 'Moderne', description: 'Sonnerie moderne' },
  { id: 'elegant', label: 'Élégant', description: 'Sonnerie élégante' },
  { id: 'urgent', label: 'Urgent', description: 'Appel urgent' },
  { id: 'gentle', label: 'Doux', description: 'Sonnerie douce' },
]

const COLOR_PRESETS = [
  { label: 'Bleu marine', color: '#1E3A8A' },
  { label: 'Bleu roi', color: '#2563EB' },
  { label: 'Vert', color: '#15803d' },
  { label: 'Violet', color: '#7C3AED' },
  { label: 'Teal', color: '#0D9488' },
  { label: 'Orange', color: '#EA580C' },
  { label: 'Rouge', color: '#DC2626' },
  { label: 'Rose', color: '#DB2777' },
]

/* ─── Toast System ────────────────────────────────────── */

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'info' | 'error'
}

let toastId = 0
let toastTimeouts: ReturnType<typeof setTimeout>[] = []

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const bg =
          t.type === 'success'
            ? 'from-emerald-500 to-green-600'
            : t.type === 'error'
              ? 'from-red-500 to-rose-600'
              : 'from-blue-500 to-indigo-600'
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-medium animate-slide-in-right bg-gradient-to-r ${bg}`}
          >
            <CheckCircle size={18} className="flex-shrink-0" />
            <span>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Sound Generators (Web Audio API) ────────────────── */

function playSound(type: string, volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const vol = ctx.createGain()
    vol.gain.value = volume / 100
    vol.connect(ctx.destination)

    if (type === 'muted') return

    const sounds: Record<string, { freq: number; dur: number; type: OscillatorType }> = {
      default:  { freq: 800, dur: 0.15, type: 'sine' },
      soft:     { freq: 600, dur: 0.2,  type: 'sine' },
      bright:   { freq: 1200, dur: 0.1, type: 'triangle' },
      pop:      { freq: 1000, dur: 0.08, type: 'square' },
      chime:    { freq: 880, dur: 0.3,  type: 'sine' },
    }

    const s = sounds[type] || sounds.default
    const osc = ctx.createOscillator()
    osc.connect(vol)
    osc.type = s.type
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime)

    if (type !== 'default') {
      const osc2 = ctx.createOscillator()
      osc2.connect(vol)
      osc2.type = s.type
      osc2.frequency.setValueAtTime(s.freq * 1.5, ctx.currentTime)
      osc2.start(ctx.currentTime)
      osc2.stop(ctx.currentTime + s.dur)
    }

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + s.dur)
    setTimeout(() => ctx.close(), (s.dur + 0.1) * 1000)
  } catch {}
}

function playRingtone(type: string, volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const vol = ctx.createGain()
    vol.gain.value = volume / 100
    vol.connect(ctx.destination)

    const patterns: Record<string, number[][]> = {
      default:  [[800, 200], [0, 100], [800, 200]],
      classic:  [[440, 300], [0, 100], [440, 300], [0, 100], [880, 300]],
      modern:   [[600, 150], [800, 150], [1000, 150], [0, 100], [1000, 150], [800, 150]],
      elegant:  [[523, 400], [0, 150], [659, 400], [0, 150], [784, 600]],
      urgent:   [[1000, 100], [0, 50], [1000, 100], [0, 50], [1000, 100], [0, 50], [1200, 300]],
      gentle:   [[440, 400], [0, 200], [554, 400], [0, 200], [659, 600]],
    }

    const pattern = patterns[type] || patterns.default
    let time = ctx.currentTime

    pattern.forEach(([freq, dur]) => {
      if (freq > 0) {
        const osc = ctx.createOscillator()
        osc.connect(vol)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, time)
        osc.start(time)
        osc.stop(time + dur / 1000)
      }
      time += dur / 1000
    })

    setTimeout(() => ctx.close(), (time - ctx.currentTime + 0.1) * 1000)
  } catch {}
}

/* ─── Custom Animated Toggle ──────────────────────────── */

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-1 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        checked
          ? 'bg-gradient-to-r from-emerald-400 to-green-500 focus:ring-green-500/20'
          : 'bg-gray-200 focus:ring-gray-400/20'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/* ─── Section Card ────────────────────────────────────── */

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50">
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

/* ─── Form Row ────────────────────────────────────────── */

function FormRow({
  label,
  sublabel,
  children,
  border = true,
}: {
  label: string
  sublabel?: string
  children: React.ReactNode
  border?: boolean
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 py-4 ${
        border ? 'border-b border-gray-50 last:border-0' : ''
      }`}
    >
      <div className="sm:w-56 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

/* ─── Styled Input ────────────────────────────────────── */

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white ${className}`}
    />
  )
}

/* ─── Styled Select ───────────────────────────────────── */

function Select({
  value,
  onChange,
  children,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white appearance-none cursor-pointer ${className}`}
    >
      {children}
    </select>
  )
}

/* ─── Main Component ──────────────────────────────────── */

export default function SettingsPage() {
  const {
    theme,
    fontSize,
    currency,
    language,
    dateFormat,
    primaryColor,
    density,
    setTheme,
    setFontSize,
    setCurrency,
    setLanguage,
    setDateFormat,
    setCompanyName,
    setPrimaryColor,
    setDensity,
    resetTheme,
  } = useTheme()

  const [activeTab, setActiveTab] = useState('company')
  const [toasts, setToasts] = useState<ToastItem[]>([])

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3500)
    toastTimeouts.push(t)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    return () => {
      toastTimeouts.forEach(clearTimeout)
      toastTimeouts = []
    }
  }, [])

  /* ── Company state ── */
  const [companyForm, setCompanyForm] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPANY)
      if (stored) return { ...DEFAULT_COMPANY, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_COMPANY
  })

  const updateCompany = useCallback(
    (field: string, value: string) => {
      setCompanyForm((prev) => {
        const next = { ...prev, [field]: value }
        return next
      })
    },
    []
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(companyForm))
    if (companyForm.name) setCompanyName(companyForm.name)
  }, [companyForm, setCompanyName])

  /* ── Notifications state ── */
  const [notifs, setNotifs] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFS)
      if (stored) return { ...DEFAULT_NOTIFS, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_NOTIFS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(notifs))
  }, [notifs])

  /* ── Security state ── */
  const [security, setSec] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SECURITY)
      if (stored) return { ...DEFAULT_SECURITY, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_SECURITY
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SECURITY, JSON.stringify(security))
  }, [security])

  /* ── Database state ── */
  const [dbSettings, setDbSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DB)
      if (stored) return { ...DEFAULT_DB, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_DB
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(dbSettings))
  }, [dbSettings])

  /* ── Localization state ── */
  const [localization, setLocalization] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOCALIZATION)
      if (stored) return { ...DEFAULT_LOCALIZATION, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_LOCALIZATION
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOCALIZATION, JSON.stringify(localization))
  }, [localization])

  /* ── Logo upload state ── */
  const [logoPreview, setLogoPreview] = useState<string | null>(() => {
    return localStorage.getItem('alba-company-logo') || null
  })
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleLogoUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        showToast('Veuillez sélectionner une image', 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setLogoPreview(result)
        localStorage.setItem('alba-company-logo', result)
        showToast('Logo mis à jour avec succès')
      }
      reader.readAsDataURL(file)
    },
    [showToast]
  )

  /* ── Database storage calculation ── */
  const calculateStorageUsage = useCallback(() => {
    let total = 0
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('alba-')) {
        total += (localStorage.getItem(key)?.length || 0) * 2
        count++
      }
    }
    return { bytes: total, count }
  }, [])

  const [storageInfo, setStorageInfo] = useState({ bytes: 0, count: 0 })

  useEffect(() => {
    setStorageInfo(calculateStorageUsage())
  }, [activeTab, calculateStorageUsage])

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  /* ── Backup count from localStorage ── */
  const [backupCount, setBackupCount] = useState(() => {
    return parseInt(localStorage.getItem('alba-backup-count') || '47', 10)
  })

  /* ── Active sessions (simulated) ── */
  const [activeSessions] = useState([
    { device: 'Windows — Chrome', ip: '192.168.1.10', time: 'Maintenant', current: true },
    { device: 'Android — App', ip: '10.0.0.5', time: 'Il y a 2h', current: false },
  ])

  /* ══════════════════════════════════════════════════════ */
  /*  HANDLERS                                            */
  /* ══════════════════════════════════════════════════════ */

  const handleExportBackup = useCallback(() => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('alba-')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          data[key!] = localStorage.getItem(key)
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alba-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    const newCount = backupCount + 1
    setBackupCount(newCount)
    localStorage.setItem('alba-backup-count', String(newCount))
    showToast('Sauvegarde exportée avec succès')
  }, [backupCount, showToast])

  const handleImportBackup = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          Object.entries(data).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value))
          })
          showToast('Données restaurées avec succès. Rechargement...')
          setTimeout(() => window.location.reload(), 1000)
        } catch {
          showToast('Fichier de sauvegarde invalide', 'error')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [showToast])

  const handleResetDB = useCallback(() => {
    if (
      window.confirm(
        '⚠️ ATTENTION : Cette action est IRRÉVERSIBLE.\n\nToutes les données seront supprimées et la page sera rechargée.\n\nContinuer ?'
      )
    ) {
      if (
        window.confirm(
          'Dernière confirmation : Voulez-vous vraiment réinitialiser TOUTES les données ?'
        )
      ) {
        showToast('Réinitialisation en cours...')
        setTimeout(() => {
          resetAllMockDB(MOCK_DB_KEYS)
        }, 800)
      }
    }
  }, [showToast])

  const handleLogoutAllSessions = useCallback(() => {
    if (window.confirm('Déconnecter toutes les autres sessions ?')) {
      showToast('Toutes les sessions ont été déconnectées')
    }
  }, [showToast])

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER TABS                                         */
  /* ══════════════════════════════════════════════════════ */

  const renderCompanyTab = () => (
    <div className="space-y-5">
      <SectionCard title="Logo de l'entreprise" subtitle="Ajoutez le logo officiel de votre société">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleLogoUpload(file)
          }}
          onClick={() => logoInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50/50'
              : 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(file)
            }}
          />
          {logoPreview ? (
            <div className="flex flex-col items-center gap-4">
              <img
                src={logoPreview}
                alt="Logo"
                className="w-24 h-24 object-contain rounded-xl border border-gray-200 bg-white p-2"
              />
              <p className="text-xs text-gray-400">Cliquez ou glissez pour changer le logo</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setLogoPreview(null)
                  localStorage.removeItem('alba-company-logo')
                  showToast('Logo supprimé')
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Supprimer le logo
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Glissez un fichier ici ou cliquez pour parcourir
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — Max 2 Mo</p>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Informations générales" subtitle="Identité et coordonnées de l'entreprise">
        {(
          [
            { key: 'name', label: "Nom de l'entreprise", sublabel: 'Nom officiel affiché partout' },
            { key: 'slogan', label: 'Slogan', sublabel: 'Phrase d\'accroche' },
            { key: 'address', label: 'Adresse complète', sublabel: 'Rue, quartier, numéro' },
            { key: 'city', label: 'Ville', sublabel: 'Ville principale' },
            { key: 'province', label: 'Province', sublabel: 'Province ou état' },
            { key: 'country', label: 'Pays', sublabel: 'Pays' },
            { key: 'phone', label: 'Téléphone', sublabel: 'Numéro principal', type: 'tel' },
            { key: 'email', label: 'Email', sublabel: 'Email principal', type: 'email' },
            { key: 'website', label: 'Site web', sublabel: 'URL du site officiel' },
          ] as const
        ).map((f) => (
          <FormRow key={f.key} label={f.label} sublabel={f.sublabel}>
            <Input
              value={companyForm[f.key]}
              onChange={(v) => updateCompany(f.key, v)}
              type={(f as { type?: string }).type || 'text'}
              placeholder={f.label}
            />
          </FormRow>
        ))}
      </SectionCard>

      <SectionCard title="Identifiants légaux" subtitle="Numéros d'enregistrement officiels">
        {[
          { key: 'rccm', label: 'Numéro RCCM', sublabel: 'Registre du Commerce' },
          { key: 'cnss', label: 'Numéro CNSS', sublabel: 'Caisse Nationale de Sécurité Sociale' },
          { key: 'tva', label: 'Numéro TVA', sublabel: 'Numéro de TVA intracommunautaire' },
        ].map((f) => (
          <FormRow key={f.key} label={f.label} sublabel={f.sublabel}>
            <Input
              value={companyForm[f.key as keyof typeof companyForm]}
              onChange={(v) => updateCompany(f.key, v)}
              placeholder={f.label}
            />
          </FormRow>
        ))}
      </SectionCard>

      <SectionCard title="Numérotation des documents" subtitle="Préfixes et paramètres de génération">
        {[
          { key: 'invoicePrefix', label: 'Préfixe factures', sublabel: 'Ex: F-2026-' },
          { key: 'quotePrefix', label: 'Préfixe devis', sublabel: 'Ex: D-2026-' },
          { key: 'orderPrefix', label: 'Préfixe commandes', sublabel: 'Ex: ALB-' },
          { key: 'defaultTax', label: 'TVA par défaut (%)', sublabel: '0 si non applicable' },
        ].map((f) => (
          <FormRow key={f.key} label={f.label} sublabel={f.sublabel}>
            <Input
              value={companyForm[f.key as keyof typeof companyForm]}
              onChange={(v) => updateCompany(f.key, v)}
              className="max-w-[200px]"
              placeholder={f.sublabel}
            />
          </FormRow>
        ))}
      </SectionCard>
    </div>
  )

  const renderAppearanceTab = () => (
    <div className="space-y-5">
      <SectionCard title="Thème" subtitle="Personnalisez l'apparence de l'interface">
        <FormRow label="Mode d'affichage" sublabel="Basculer entre thème clair et sombre">
          <div className="flex gap-3">
            {([
              { value: 'light', label: 'Clair', icon: '☀️' },
              { value: 'dark', label: 'Sombre', icon: '🌙' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setTheme(opt.value)
                  showToast(`Thème ${opt.label} activé`)
                }}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </FormRow>

        <FormRow label="Taille de police" sublabel="Ajuster la taille du texte global">
          <div className="flex gap-3">
            {([
              { value: 'small', label: 'Petit', size: 'text-xs' },
              { value: 'normal', label: 'Normal', size: 'text-sm' },
              { value: 'large', label: 'Grand', size: 'text-base' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setFontSize(opt.value)
                  showToast(`Police: ${opt.label}`)
                }}
                className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border-2 transition-all min-w-[90px] ${
                  fontSize === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className={`font-bold ${opt.size}`}>Aa</span>
                <span className="text-[10px] font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </FormRow>

        <FormRow label="Densité d'interface" sublabel="Espace entre les éléments">
          <div className="flex gap-3">
            {([
              { value: 'compact', label: 'Compact', desc: 'Dense' },
              { value: 'comfortable', label: 'Normal', desc: 'Par défaut' },
              { value: 'spacious', label: 'Spacieux', desc: 'Aéré' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setDensity(opt.value)
                  showToast(`Densité: ${opt.label}`)
                }}
                className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border-2 transition-all min-w-[110px] ${
                  density === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </FormRow>
      </SectionCard>

      <SectionCard title="Couleur principale" subtitle="Personnalisez la couleur dominante de l'application">
        <FormRow label="Sélectionnez une couleur" sublabel="Appliquée aux boutons, sidebar et accents">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer p-0.5"
                title="Couleur personnalisée"
              />
              <Input
                value={primaryColor}
                onChange={(v) => setPrimaryColor(v)}
                placeholder="#1E3A8A"
                className="w-28 font-mono text-center"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  title={p.label}
                  onClick={() => {
                    setPrimaryColor(p.color)
                    showToast(`Couleur: ${p.label}`)
                  }}
                  className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                    primaryColor === p.color
                      ? 'border-gray-800 scale-110 shadow-lg'
                      : 'border-transparent'
                  }`}
                  style={{ background: p.color }}
                />
              ))}
            </div>
          </div>
        </FormRow>

        {/* Preview card */}
        <div className="mt-6 p-5 rounded-2xl border border-gray-200 bg-gray-50/50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
            Aperçu en temps réel
          </p>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              }}
            >
              A
            </div>
            <div className="flex-1">
              <div
                className="h-3.5 rounded-full w-36 mb-2"
                style={{ background: primaryColor }}
              />
              <div className="h-2.5 rounded-full w-24 bg-gray-300" />
            </div>
            <button
              type="button"
              className="px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              }}
            >
              Bouton
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={() => {
              resetTheme()
              showToast('Thème réinitialisé aux valeurs par défaut')
            }}
            className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Style de la barre latérale" subtitle="Densité de la navigation principale">
        <FormRow label="Mode d'affichage" sublabel="Compact = icônes seules, Normal = icônes + texte">
          <div className="flex gap-3">
            {([
              { value: 'compact', label: 'Compact', desc: 'Icônes seules' },
              { value: 'normal', label: 'Normal', desc: 'Icônes + texte' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  localStorage.setItem('alba-sidebar-style', opt.value)
                  showToast(`Sidebar: ${opt.label}`)
                }}
                className="flex flex-col items-start gap-1 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 transition-all min-w-[120px]"
              >
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </FormRow>
      </SectionCard>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className="space-y-5">
      <SectionCard title="Types de notifications" subtitle="Choisissez quelles alertes recevoir">
        {[
          { key: 'newOrders', label: 'Commandes nouvelles', sublabel: 'Notifier à chaque nouvelle commande reçue' },
          { key: 'payments', label: 'Paiements reçus', sublabel: 'Confirmer les paiements entrants' },
          { key: 'stockAlerts', label: 'Alertes stock', sublabel: 'Quand un produit atteint le seuil minimum' },
          { key: 'lateInvoices', label: 'Factures en retard', sublabel: 'Alerte pour factures impayées' },
          { key: 'itTickets', label: 'Tickets IT', sublabel: 'Nouveaux tickets de support technique' },
          { key: 'newEmployees', label: 'Nouveaux employés', sublabel: 'Quand un employé est ajouté au système' },
        ].map((n) => (
          <FormRow key={n.key} label={n.label} sublabel={n.sublabel}>
            <Toggle
              checked={notifs[n.key as keyof typeof notifs] as boolean}
              onChange={(v) => {
                setNotifs((prev) => ({ ...prev, [n.key]: v }))
                showToast(`${n.label}: ${v ? 'activé' : 'désactivé'}`)
              }}
            />
          </FormRow>
        ))}
      </SectionCard>

      <SectionCard title="Canaux de livraison" subtitle="Comment recevoir vos notifications">
        {[
          {
            key: 'emailNotifs',
            label: 'Notifications email',
            sublabel: 'Recevoir les alertes par email',
            icon: <Mail size={16} className="text-gray-400" />,
          },
          {
            key: 'appNotifs',
            label: 'Notifications in-app',
            sublabel: 'Afficher dans le panneau de notifications',
            icon: <Smartphone size={16} className="text-gray-400" />,
          },
          {
            key: 'soundNotifs',
            label: 'Notifications sonores',
            sublabel: 'Jouer un son pour les alertes importantes',
            icon: <Volume2 size={16} className="text-gray-400" />,
          },
        ].map((n) => (
          <FormRow key={n.key} label={n.label} sublabel={n.sublabel}>
            <div className="flex items-center gap-3">
              {n.icon}
              <Toggle
                checked={notifs[n.key as keyof typeof notifs] as boolean}
                onChange={(v) => {
                  setNotifs((prev) => ({ ...prev, [n.key]: v }))
                  showToast(`${n.label}: ${v ? 'activé' : 'désactivé'}`)
                }}
              />
            </div>
          </FormRow>
        ))}
      </SectionCard>

      <SectionCard title="Heures de silence" subtitle="Suspendre les notifications pendant certaines heures">
        <FormRow label="Période de silence" sublabel="Aucune notification sonore durant ces heures" border={false}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <Select
                value={notifs.quietHourStart}
                onChange={(v) => setNotifs((prev) => ({ ...prev, quietHourStart: v }))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={String(i)}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </Select>
            </div>
            <span className="text-gray-400 text-sm">à</span>
            <Select
              value={notifs.quietHourEnd}
              onChange={(v) => setNotifs((prev) => ({ ...prev, quietHourEnd: v }))}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={String(i)}>
                  {String(i).padStart(2, '0')}:00
                </option>
              ))}
            </Select>
          </div>
        </FormRow>
      </SectionCard>
    </div>
  )

  const renderSecurityTab = () => (
    <div className="space-y-5">
      <SectionCard title="Sessions et accès" subtitle="Gestion de la durée et des sessions actives">
        <FormRow label="Expiration de session" sublabel="Déconnecter après inactivité">
          <Select
            value={security.sessionTimeout}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, sessionTimeout: v }))
              showToast('Délai de session mis à jour')
            }}
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 heure</option>
            <option value="240">4 heures</option>
            <option value="480">8 heures</option>
          </Select>
        </FormRow>

        <FormRow label="Tentatives max de connexion" sublabel="Avant blocage temporaire du compte">
          <Select
            value={security.maxLoginAttempts}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, maxLoginAttempts: v }))
              showToast('Limite de tentatives mise à jour')
            }}
          >
            <option value="3">3 tentatives</option>
            <option value="5">5 tentatives</option>
            <option value="10">10 tentatives</option>
          </Select>
        </FormRow>

        <FormRow label="Déconnexion automatique" sublabel="Déconnecter après inactivité prolongée">
          <Toggle
            checked={security.autoLogout}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, autoLogout: v }))
              showToast(`Auto-déconnexion: ${v ? 'activée' : 'désactivée'}`)
            }}
          />
        </FormRow>

        <FormRow label="Double authentification (2FA)" sublabel="Sécurité renforcée — U1, OTP ou biométrie" border={false}>
          <Toggle
            checked={security.twoFactor}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, twoFactor: v }))
              showToast(`2FA: ${v ? 'activée' : 'désactivée'}`)
            }}
          />
        </FormRow>
        {security.twoFactor && (
          <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-600">
                La double authentification sera demandée lors de la prochaine connexion.
                Un code OTP sera envoyé par email ou SMS.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Politique de mot de passe" subtitle="Exigences pour les mots de passe des utilisateurs">
        <FormRow label="Longueur minimale" sublabel="Nombre minimum de caractères">
          <Select
            value={security.minPasswordLength}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, minPasswordLength: v }))
              showToast('Politique de mot de passe mise à jour')
            }}
          >
            <option value="6">6 caractères</option>
            <option value="8">8 caractères</option>
            <option value="10">10 caractères</option>
            <option value="12">12 caractères</option>
          </Select>
        </FormRow>

        <FormRow label="Majuscule requise" sublabel="Au moins une lettre majuscule">
          <Toggle
            checked={security.requireUppercase}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, requireUppercase: v }))
              showToast('Règle majuscule mise à jour')
            }}
          />
        </FormRow>

        <FormRow label="Chiffre requis" sublabel="Au moins un chiffre" border={false}>
          <Toggle
            checked={security.requireNumber}
            onChange={(v) => {
              setSec((prev) => ({ ...prev, requireNumber: v }))
              showToast('Règle chiffre mise à jour')
            }}
          />
        </FormRow>
      </SectionCard>

      <SectionCard title="Sessions actives" subtitle="Appareils actuellement connectés à votre compte">
        <div className="space-y-3">
          {activeSessions.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                s.current ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50/50'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {s.device}
                  {s.current && (
                    <span className="ml-2 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      ACTUELLE
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  IP: {s.ip} · {s.time}
                </p>
              </div>
              {!s.current && (
                <button
                  type="button"
                  onClick={() => showToast('Session déconnectée')}
                  className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                >
                  <LogOut size={12} /> Déconnecter
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleLogoutAllSessions}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Déconnecter toutes les sessions
          </button>
        </div>
      </SectionCard>
    </div>
  )

  const renderDatabaseTab = () => {
    const usage = storageInfo
    const maxStorage = 5 * 1024 * 1024 // 5 MB assumed
    const usagePercent = Math.min(100, Math.round((usage.bytes / maxStorage) * 100))

    return (
      <div className="space-y-5">
        <SectionCard title="État des sauvegardes" subtitle="Informations sur les sauvegardes du système">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: 'Dernière sauvegarde',
                value: new Date().toLocaleDateString('fr-FR'),
                color: 'from-emerald-400 to-green-500',
                icon: <CheckCircle size={20} />,
              },
              {
                label: 'Taille totale',
                value: formatBytes(usage.bytes),
                color: 'from-blue-400 to-indigo-500',
                icon: <HardDrive size={20} />,
              },
              {
                label: 'Sauvegardes totales',
                value: String(backupCount),
                color: 'from-violet-400 to-purple-500',
                icon: <Database size={20} />,
              },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 text-white shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs opacity-80">{s.label}</p>
                  <div className="opacity-60">{s.icon}</div>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <FormRow label="Sauvegarde automatique" sublabel="Planification automatique des sauvegardes">
            <Toggle
              checked={dbSettings.autoBackup}
              onChange={(v) => {
                setDbSettings((prev) => ({ ...prev, autoBackup: v }))
                showToast(`Sauvegarde auto: ${v ? 'activée' : 'désactivée'}`)
              }}
            />
          </FormRow>

          {dbSettings.autoBackup && (
            <FormRow label="Fréquence" sublabel="Intervalle de sauvegarde automatique">
              <Select
                value={dbSettings.backupFrequency}
                onChange={(v) => {
                  setDbSettings((prev) => ({ ...prev, backupFrequency: v }))
                  showToast('Fréquence mise à jour')
                }}
              >
                <option value="6h">Toutes les 6 heures</option>
                <option value="12h">Toutes les 12 heures</option>
                <option value="daily">Quotidienne (02:00)</option>
                <option value="weekly">Hebdomadaire</option>
              </Select>
            </FormRow>
          )}
        </SectionCard>

        <SectionCard title="Actions de sauvegarde" subtitle="Exporter, importer ou restaurer vos données">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:shadow-md hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              }}
            >
              <Download size={16} />
              Sauvegarder maintenant
            </button>
            <button
              type="button"
              onClick={handleImportBackup}
              className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Upload size={16} />
              Importer données
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Utilisation du stockage" subtitle="Espace utilisé par les données locales">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">{formatBytes(usage.bytes)} utilisé</span>
              <span className="text-gray-400">{formatBytes(maxStorage)} maximum</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${usagePercent}%`,
                  background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc)`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400">{usage.count} clés de données alba-*</p>
          </div>
        </SectionCard>

        <SectionCard title="Réinitialisation des données" subtitle="Réinitialiser toutes les données à leurs valeurs par défaut">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Attention — Action irréversible</p>
                <p className="text-xs text-red-500 mt-1">
                  Cette action supprimera toutes les données (clients, employés, stocks, commandes, etc.)
                  et rechargera la page. Créez une sauvegarde avant de continuer.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDB}
            className="flex items-center gap-2.5 px-5 py-3 text-sm font-semibold text-white rounded-xl transition-all hover:shadow-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
          >
            <Trash2 size={16} />
            Réinitialiser les données
          </button>
        </SectionCard>
      </div>
    )
  }

  const renderLocalizationTab = () => (
    <div className="space-y-5">
      <SectionCard title="Langue et région" subtitle="Paramètres linguistiques et régionaux">
        <FormRow label="Langue principale" sublabel="Langue de l'interface utilisateur">
          <Select
            value={language}
            onChange={(v) => {
              setLanguage(v)
              showToast(`Langue: ${v}`)
            }}
          >
            <option value="Français">Français</option>
            <option value="English">English</option>
            <option value="Swahili">Swahili</option>
          </Select>
        </FormRow>

        <FormRow label="Devise" sublabel="Devise par défaut pour les montants">
          <Select
            value={currency}
            onChange={(v) => {
              setCurrency(v)
              showToast(`Devise: ${v}`)
            }}
          >
            <option value="FC">Franc Congolais (FC)</option>
            <option value="$">Dollar US ($)</option>
            <option value="€">Euro (€)</option>
          </Select>
        </FormRow>

        <FormRow label="Fuseau horaire" sublabel="Heure locale du système">
          <Select
            value={localization.timezone}
            onChange={(v) => {
              setLocalization((prev) => ({ ...prev, timezone: v }))
              showToast('Fuseau horaire mis à jour')
            }}
          >
            <option value="Africa/Kinshasa">Africa/Kinshasa (UTC+1)</option>
            <option value="Africa/Lubumbashi">Africa/Lubumbashi (UTC+2)</option>
            <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
            <option value="UTC">UTC+0</option>
            <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
            <option value="America/New_York">America/New York (UTC-5/-4)</option>
          </Select>
        </FormRow>
      </SectionCard>

      <SectionCard title="Formats" subtitle="Format d'affichage des dates, heures et nombres">
        <FormRow label="Format de date" sublabel="Manière d'afficher les dates">
          <div className="flex gap-3">
            {([
              { value: 'DD/MM/YYYY', example: '20/08/2026' },
              { value: 'YYYY-MM-DD', example: '2026-08-20' },
            ] as const).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setDateFormat(f.value)
                  showToast(`Format date: ${f.value}`)
                }}
                className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all ${
                  dateFormat === f.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-bold font-mono">{f.value}</span>
                <span className="text-[10px] opacity-60">{f.example}</span>
              </button>
            ))}
          </div>
        </FormRow>

        <FormRow label="Format de nombre" sublabel="Séparateur de milliers et décimales" border={false}>
          <div className="flex gap-3">
            {([
              { value: 'space', label: '1 234,56', desc: 'Espace + virgule' },
              { value: 'comma', label: '1,234.56', desc: 'Virgule + point' },
            ] as const).map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setLocalization((prev) => ({ ...prev, numberFormat: f.value }))
                  showToast(`Format nombre: ${f.label}`)
                }}
                className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition-all ${
                  localization.numberFormat === f.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-bold font-mono">{f.label}</span>
                <span className="text-[10px] opacity-60">{f.desc}</span>
              </button>
            ))}
          </div>
        </FormRow>
      </SectionCard>

      <SectionCard title="Aperçu" subtitle="Voici à quoi ressembleront les formats dans l'application">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Date</p>
            <p className="text-sm font-semibold text-gray-700">
              {dateFormat === 'DD/MM/YYYY' ? '20/08/2026' : '2026-08-20'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Montant</p>
            <p className="text-sm font-semibold text-gray-700">
              {currency}{' '}
              {localization.numberFormat === 'space' ? '1 234 500,00' : '1,234,500.00'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Langue</p>
            <p className="text-sm font-semibold text-gray-700">{language}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fuseau</p>
            <p className="text-sm font-semibold text-gray-700">
              {localization.timezone.split('/')[1] || localization.timezone}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  )

  const renderSoundsTab = () => {
    const { soundSettings, updateSoundSettings } = useMessaging()

    return (
      <div className="space-y-6">
        <SectionCard
          title="Notifications de messages"
          subtitle="Configurez le son des nouveaux messages"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Son des messages</p>
                <p className="text-xs text-gray-400">Jouer un son lors de la réception d'un message</p>
              </div>
              <Toggle
                checked={soundSettings.enableMessageSound}
                onChange={(v) => updateSoundSettings({ enableMessageSound: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Volume des messages</p>
                <p className="text-xs text-gray-400">Réglez le volume des notifications sonores</p>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={14} className="text-gray-300" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={soundSettings.messageVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    updateSoundSettings({ messageVolume: v })
                    if (v > 0) playSound(soundSettings.messageSound, v)
                  }}
                  className="w-32 accent-emerald-500"
                  disabled={!soundSettings.enableMessageSound}
                />
                <Volume2 size={14} className="text-gray-400" />
                <span className="text-xs font-mono text-gray-500 w-8 text-right">{soundSettings.messageVolume}%</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Choisir un son</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MESSAGE_SOUNDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      updateSoundSettings({ messageSound: s.id })
                      if (s.id !== 'muted') playSound(s.id, soundSettings.messageVolume)
                    }}
                    disabled={!soundSettings.enableMessageSound}
                    className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                      soundSettings.messageSound === s.id
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${!soundSettings.enableMessageSound ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {soundSettings.messageSound === s.id && (
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-gray-700">{s.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Sonnerie d'appels"
          subtitle="Configurez la sonnerie des appels entrants"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Son des appels</p>
                <p className="text-xs text-gray-400">Jouer une sonnerie lors des appels entrants</p>
              </div>
              <Toggle
                checked={soundSettings.enableCallSound}
                onChange={(v) => updateSoundSettings({ enableCallSound: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Volume des appels</p>
                <p className="text-xs text-gray-400">Réglez le volume de la sonnerie</p>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={14} className="text-gray-300" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={soundSettings.callVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    updateSoundSettings({ callVolume: v })
                    if (v > 0) playRingtone(soundSettings.callRingtone, v)
                  }}
                  className="w-32 accent-emerald-500"
                  disabled={!soundSettings.enableCallSound}
                />
                <Volume2 size={14} className="text-gray-400" />
                <span className="text-xs font-mono text-gray-500 w-8 text-right">{soundSettings.callVolume}%</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Choisir une sonnerie</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CALL_RINGTONES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      updateSoundSettings({ callRingtone: r.id })
                      playRingtone(r.id, soundSettings.callVolume)
                    }}
                    disabled={!soundSettings.enableCallSound}
                    className={`p-3 rounded-xl text-left transition-all duration-200 border ${
                      soundSettings.callRingtone === r.id
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${!soundSettings.enableCallSound ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {soundSettings.callRingtone === r.id && (
                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-gray-700">{r.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Paramètres généraux"
          subtitle="Options de sonnerie supplémentaires"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-start gap-3">
                <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-700">À propos des sonneries</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Les sonneries sont générées via Web Audio API. Vous pouvez cliquer sur chaque son
                    pour l'écouter avant de le sélectionner. Le son est appliqué automatiquement
                    après sélection.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Réinitialiser les sonneries</p>
                <p className="text-xs text-gray-400">Restaurer les sons par défaut</p>
              </div>
              <button
                onClick={() => {
                  updateSoundSettings({
                    messageSound: 'default',
                    callRingtone: 'default',
                    messageVolume: 80,
                    callVolume: 100,
                    enableMessageSound: true,
                    enableCallSound: true,
                  })
                  showToast('Sonneries réinitialisées')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  /* ══════════════════════════════════════════════════════ */
  /*  MAIN RENDER                                         */
  /* ══════════════════════════════════════════════════════ */

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyTab()
      case 'appearance':
        return renderAppearanceTab()
      case 'notifications':
        return renderNotificationsTab()
      case 'security':
        return renderSecurityTab()
      case 'database':
        return renderDatabaseTab()
      case 'localization':
        return renderLocalizationTab()
      case 'sounds':
        return renderSoundsTab()
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <PageHeader
        title="Paramètres du Système"
        subtitle="Configuration générale de ALBA SERVICE GROUP PLATFORM"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Paramètres' }]}
        icon={<Settings size={22} />}
        iconBg="gradient-primary"
      />

      <div className="flex gap-6">
        {/* Sidebar navigation */}
        <div className="w-56 flex-shrink-0">
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-1 sticky top-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
                style={
                  activeTab === tab.id
                    ? {
                        background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
                      }
                    : undefined
                }
              >
                <span
                  className={`flex-shrink-0 ${
                    activeTab === tab.id ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>
    </div>
  )
}
