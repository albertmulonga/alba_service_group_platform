import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Eye, EyeOff, Lock, Mail, ArrowRight, Loader2,
  Printer, FileText, Monitor, Users, BarChart2,
  Shield, CheckCircle, AlertCircle, AlertTriangle, Wifi,
  ChevronLeft,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────── */
type MsgType = 'success' | 'error' | 'warning' | 'network'

interface FlashMsg {
  type: MsgType
  text: string
}

/* ─── Floating service cards config ─────────────────── */
const FLOAT_CARDS = [
  { icon: <Printer className="w-5 h-5" />, label: 'Imprimerie',        color: 'from-blue-500 to-blue-600',    delay: '0s'    },
  { icon: <FileText className="w-5 h-5" />, label: 'Secrétariat',      color: 'from-emerald-500 to-emerald-600', delay: '0.4s' },
  { icon: <Monitor className="w-5 h-5" />, label: 'Informatique',      color: 'from-violet-500 to-violet-600', delay: '0.8s'  },
  { icon: <Users className="w-5 h-5" />, label: 'Clients',             color: 'from-orange-500 to-orange-600', delay: '1.2s'  },
  { icon: <BarChart2 className="w-5 h-5" />, label: 'Tableau de bord', color: 'from-rose-500 to-pink-600',    delay: '1.6s'  },
  { icon: <Shield className="w-5 h-5" />, label: 'Sécurité',           color: 'from-slate-500 to-slate-700',  delay: '2s'    },
]

const MAX_ATTEMPTS = 10 // augmenté pour éviter les blocages pendant le dev

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [remember, setRemember]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [flash, setFlash]             = useState<FlashMsg | null>(null)
  const [attempts, setAttempts]       = useState(0)
  const [lockUntil, setLockUntil]     = useState<number | null>(null)
  const [lockLeft, setLockLeft]       = useState(0)
  const [emailErr, setEmailErr]       = useState('')
  const [pwdErr, setPwdErr]           = useState('')
  const [entered, setEntered]         = useState(false)
  const [mousePos, setMousePos]       = useState({ x: 0.5, y: 0.5 })
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* entrance animation */
  useEffect(() => { setTimeout(() => setEntered(true), 60) }, [])

  /* countdown for lockout */
  useEffect(() => {
    if (!lockUntil) return
    const id = setInterval(() => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000)
      if (left <= 0) { setLockUntil(null); setAttempts(0); setLockLeft(0); clearInterval(id) }
      else setLockLeft(left)
    }, 500)
    return () => clearInterval(id)
  }, [lockUntil])

  /* parallax mouse tracking */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const showFlash = (msg: FlashMsg, duration = 5000) => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setFlash(msg)
    flashTimer.current = setTimeout(() => setFlash(null), duration)
  }

  const validate = () => {
    let ok = true
    if (!email.trim()) { setEmailErr('Ce champ est requis.'); ok = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Adresse e-mail invalide.'); ok = false }
    else setEmailErr('')
    if (!password) { setPwdErr('Ce champ est requis.'); ok = false }
    else if (password.length < 4) { setPwdErr('Mot de passe trop court.'); ok = false }
    else setPwdErr('')
    return ok
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (lockUntil && Date.now() < lockUntil) return
    if (!validate()) return

    setLoading(true)
    try {
      await login(email, password)
      showFlash({ type: 'success', text: 'Connexion réussie. Bienvenue !' })
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || ''
      const newAttempts = attempts + 1

      if (msg.toLowerCase().includes('disabled') || msg.toLowerCase().includes('désactivé')) {
        showFlash({ type: 'warning', text: 'Votre compte est désactivé. Contactez l\'administrateur.' })
      } else if (!navigator.onLine || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('econnrefused')) {
        showFlash({ type: 'network', text: 'Impossible de contacter le serveur. Vérifiez votre connexion.' })
      } else {
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + 60_000
          setLockUntil(until)
          showFlash({ type: 'warning', text: 'Trop de tentatives. Compte protégé pendant 60 secondes.', }, 60_000)
        } else {
          showFlash({ type: 'error', text: `Adresse e-mail ou mot de passe incorrect. (${newAttempts}/${MAX_ATTEMPTS})` })
        }
        setAttempts(newAttempts)
      }
    } finally {
      setLoading(false)
    }
  }

  const isLocked = !!lockUntil && Date.now() < lockUntil

  const px = (mousePos.x - 0.5) * 18
  const py = (mousePos.y - 0.5) * 12

  return (
    <div className="login-root">
      {/* ── Background ── */}
      <div className="login-bg" />
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />
      <div className="login-grid" />

      {/* ── Back to welcome ── */}
      <button className="login-back-btn" onClick={() => navigate('/welcome')}>
        <ChevronLeft className="w-4 h-4" />
        <span>Accueil</span>
      </button>

      <div
        className="login-layout"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* ══════════════════════════════════════
            LEFT PANEL
        ══════════════════════════════════════ */}
        <div className="login-left">
          {/* Parallax illustration area */}
          <div
            className="login-left-illus"
            style={{ transform: `translate(${px}px, ${py}px)`, transition: 'transform 0.1s ease-out' }}
          >
            {/* Central ring */}
            <div className="login-illus-ring">
              <img src="/alba-logo.png" alt="ALBA" className="login-illus-logo" />
            </div>

            {/* Floating service cards */}
            {FLOAT_CARDS.map((card, i) => {
              const cols = 3
              const row = Math.floor(i / cols)
              const col = i % cols
              return (
                <div
                  key={i}
                  className="login-float-card"
                  style={{
                    top: `${24 + row * 42}%`,
                    left: `${8 + col * 30}%`,
                    animationDelay: card.delay,
                  }}
                >
                  <div className={`login-float-icon bg-gradient-to-br ${card.color}`}>
                    {card.icon}
                  </div>
                  <span className="login-float-label">{card.label}</span>
                </div>
              )
            })}
          </div>

          {/* Text overlay */}
          <div className="login-left-text">
            <h2 className="login-left-title">
              Bienvenue chez<br />
              <span className="login-left-title-accent">ALBA SERVICE GROUP</span>
            </h2>
            <p className="login-left-desc">
              Connectez-vous pour accéder à votre espace de travail sécurisé
              et gérer efficacement toutes vos activités professionnelles.
            </p>

            {/* Stats strip */}
            <div className="login-left-stats">
              {[
                { v: '1 200+', l: 'Clients' },
                { v: '8 600+', l: 'Travaux' },
                { v: '98%',    l: 'Satisfaction' },
              ].map((s, i) => (
                <div key={i} className="login-left-stat">
                  <span className="login-left-stat-v">{s.v}</span>
                  <span className="login-left-stat-l">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            RIGHT PANEL — FORM
        ══════════════════════════════════════ */}
        <div className="login-right">
          <div className="login-card">
            {/* Logo */}
            <div className="login-card-logo-wrap">
              <div className="login-card-logo-ring">
                <img src="/alba-logo.png" alt="ALBA" className="login-card-logo-img" />
              </div>
              <div className="login-card-logo-text">
                <span className="login-card-company">ALBA SERVICE GROUP</span>
                <span className="login-card-subtitle">Bienvenue dans votre espace professionnel.</span>
              </div>
            </div>

            {/* Flash message */}
            {flash && (
              <div className={`login-flash login-flash-${flash.type}`}>
                {flash.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                {flash.type === 'error'   && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {flash.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {flash.type === 'network' && <Wifi className="w-4 h-4 flex-shrink-0" />}
                <span>{flash.text}</span>
              </div>
            )}

            {/* Lock warning */}
            {isLocked && (
              <div className="login-lock-warning">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Compte temporairement protégé. Réessayez dans <strong>{lockLeft}s</strong>.</span>
                <button
                  type="button"
                  onClick={() => { setLockUntil(null); setAttempts(0); setLockLeft(0) }}
                  className="ml-auto text-[11px] font-semibold text-amber-200 hover:text-white underline"
                >
                  Débloquer
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              {/* Email */}
              <div className="login-field">
                <label className="login-label">Adresse e-mail</label>
                <div className={`login-input-wrap ${emailErr ? 'login-input-error' : ''}`}>
                  <Mail className="login-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                    placeholder="Entrez votre adresse e-mail"
                    className="login-input"
                    autoComplete="email"
                    disabled={loading || isLocked}
                  />
                </div>
                {emailErr && <p className="login-field-err">{emailErr}</p>}
              </div>

              {/* Password */}
              <div className="login-field">
                <label className="login-label">Mot de passe</label>
                <div className={`login-input-wrap ${pwdErr ? 'login-input-error' : ''}`}>
                  <Lock className="login-input-icon" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPwdErr('') }}
                    placeholder="Entrez votre mot de passe"
                    className="login-input"
                    autoComplete="current-password"
                    disabled={loading || isLocked}
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPwd(v => !v)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwdErr && <p className="login-field-err">{pwdErr}</p>}
              </div>

              {/* Remember + Forgot */}
              <div className="login-row">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="login-checkbox"
                  />
                  <span>Se souvenir de moi</span>
                </label>
                <button type="button" className="login-forgot">
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isLocked}
                className="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="login-footer">
        <span className="font-semibold text-white/80">ALBA SERVICE GROUP</span>
        <span className="mx-1 text-white/30">·</span>
        <span>L'excellence au service de vos projets.</span>
        <span className="mx-1 text-white/30">·</span>
        <span>Kindu – Maniema – RDC</span>
        <span className="mx-1 text-white/30">·</span>
        <span>© 2026 ALBA SERVICE GROUP. Tous droits réservés.</span>
      </footer>
    </div>
  )
}
