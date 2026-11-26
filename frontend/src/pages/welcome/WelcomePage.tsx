import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Printer, FileText, Monitor, BookOpen, CheckCircle, Star,
  Handshake, Rocket, Target, Lock, Heart, ArrowRight,
  ChevronLeft, ChevronRight, MapPin, Phone, Mail,
  Users, FileCheck, Award, Smile, Cpu, Shield,
  Building2, Lightbulb, Clock, Zap
} from 'lucide-react'

// ─── CONFIG (easy to edit) ─────────────────────────────────────────────────
const STATS = [
  { icon: '👥', value: 1240, label: 'Clients accompagnés', suffix: '+' },
  { icon: '📄', value: 45000, label: 'Documents traités', suffix: '+' },
  { icon: '🖨️', value: 8600, label: 'Travaux réalisés', suffix: '+' },
  { icon: '💻', value: 120, label: 'Projets numériques', suffix: '+' },
  { icon: '⭐', value: 98, label: 'Taux de satisfaction', suffix: '%' },
]

const SERVICES = [
  {
    icon: <Printer className="w-8 h-8" />,
    color: 'from-blue-600 to-blue-400',
    shadow: 'shadow-blue-200',
    title: 'Imprimerie Professionnelle',
    items: [
      'Impression couleur et noir & blanc',
      'Impression grand format',
      'Cartes de visite & Flyers',
      'Affiches & Brochures',
      'Reliure & Plastification',
      'Conception graphique',
    ],
  },
  {
    icon: <FileText className="w-8 h-8" />,
    color: 'from-emerald-600 to-emerald-400',
    shadow: 'shadow-emerald-200',
    title: 'Secrétariat Professionnel',
    items: [
      'Photocopie & Numérisation',
      'Saisie et mise en page',
      'Impression administrative',
      'Traitement de dossiers',
      'Services bureautiques',
      'Archivage & gestion documentaire',
    ],
  },
  {
    icon: <Monitor className="w-8 h-8" />,
    color: 'from-violet-600 to-violet-400',
    shadow: 'shadow-violet-200',
    title: 'Services Informatiques',
    items: [
      'Développement d\'applications',
      'Maintenance informatique',
      'Installation et configuration',
      'Assistance technique',
      'Réseaux informatiques',
      'Sécurisation des systèmes',
    ],
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    color: 'from-orange-600 to-amber-400',
    shadow: 'shadow-orange-200',
    title: 'Formation Professionnelle',
    items: [
      'Informatique de base',
      'Bureautique avancée',
      'Programmation',
      'Bases de données',
      'Développement d\'applications',
      'Accompagnement personnalisé',
    ],
  },
]

const WHY_US = [
  { icon: <CheckCircle className="w-5 h-5" />, text: 'Qualité garantie' },
  { icon: <Zap className="w-5 h-5" />, text: 'Service rapide' },
  { icon: <Users className="w-5 h-5" />, text: 'Personnel qualifié' },
  { icon: <Target className="w-5 h-5" />, text: 'Solutions personnalisées' },
  { icon: <Handshake className="w-5 h-5" />, text: 'Accompagnement professionnel' },
  { icon: <Clock className="w-5 h-5" />, text: 'Respect des délais' },
  { icon: <FileCheck className="w-5 h-5" />, text: 'Tarification transparente' },
  { icon: <Smile className="w-5 h-5" />, text: 'Satisfaction du client' },
]

const VALUES = [
  { icon: <Star className="w-7 h-7" />, label: 'Excellence', color: 'from-amber-500 to-yellow-400', bg: 'bg-amber-50' },
  { icon: <Handshake className="w-7 h-7" />, label: 'Intégrité', color: 'from-blue-600 to-blue-400', bg: 'bg-blue-50' },
  { icon: <Rocket className="w-7 h-7" />, label: 'Innovation', color: 'from-violet-600 to-violet-400', bg: 'bg-violet-50' },
  { icon: <Award className="w-7 h-7" />, label: 'Qualité', color: 'from-emerald-600 to-emerald-400', bg: 'bg-emerald-50' },
  { icon: <Lock className="w-7 h-7" />, label: 'Confidentialité', color: 'from-slate-600 to-slate-400', bg: 'bg-slate-50' },
  { icon: <Heart className="w-7 h-7" />, label: 'Satisfaction client', color: 'from-rose-500 to-pink-400', bg: 'bg-rose-50' },
]

const TESTIMONIALS = [
  {
    name: 'Marie Kabila',
    role: 'Directrice d\'école',
    avatar: '👩‍🏫',
    text: 'ALBA SERVICE GROUP nous a accompagnés dans la numérisation complète de nos dossiers scolaires. Travail impeccable, délais respectés et personnel très professionnel.',
    rating: 5,
  },
  {
    name: 'Jean-Pierre Mutombo',
    role: 'Chef d\'entreprise',
    avatar: '👨‍💼',
    text: 'Grâce à leurs services d\'imprimerie, nos supports de communication ont pris un tout autre niveau. Je recommande vivement ALBA SERVICE GROUP.',
    rating: 5,
  },
  {
    name: 'Sophie Lukusa',
    role: 'Secrétaire administrative',
    avatar: '👩‍💻',
    text: 'La formation en bureautique que j\'ai suivie chez eux a transformé ma façon de travailler. Formateurs compétents et pédagogie excellente.',
    rating: 5,
  },
  {
    name: 'Patrick Mwamba',
    role: 'Responsable IT',
    avatar: '👨‍💻',
    text: 'Nous avons confié la maintenance de notre parc informatique à ALBA. Réactivité, expertise et professionnalisme sont au rendez-vous à chaque intervention.',
    rating: 5,
  },
]

// ─── COUNTER HOOK ───────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, active = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = (timestamp: number) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, active])
  return count
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, suffix, active }: {
  icon: string; value: number; label: string; suffix: string; active: boolean
}) {
  const count = useCountUp(value, 2200, active)
  return (
    <div className="welcome-stat-card">
      <div className="welcome-stat-icon">{icon}</div>
      <div className="welcome-stat-value">
        {count.toLocaleString('fr-FR')}{suffix}
      </div>
      <div className="welcome-stat-label">{label}</div>
    </div>
  )
}

// ─── REVEAL ON SCROLL ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function WelcomePage() {
  const navigate = useNavigate()
  const [testimonialIdx, setTestimonialIdx] = useState(0)
  const [appeared, setAppeared] = useState(false)

  // sections reveal
  const heroReveal = useReveal()
  const servicesReveal = useReveal()
  const whyReveal = useReveal()
  const statsReveal = useReveal()
  const engagementReveal = useReveal()
  const valuesReveal = useReveal()
  const testimonialsReveal = useReveal()

  // Page entrance
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 50)
    return () => clearTimeout(t)
  }, [])

  // Auto-advance testimonials
  useEffect(() => {
    const t = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const prev = () => setTestimonialIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
  const next = () => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length)

  return (
    <div
      className="welcome-root"
      style={{
        opacity: appeared ? 1 : 0,
        transform: appeared ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="welcome-header">
        <div className="welcome-header-inner">
          <div className="welcome-header-logo">
            <img src="/alba-logo.png" alt="ALBA" className="welcome-header-logo-img" />
            <div>
              <span className="welcome-header-name">ALBA SERVICE GROUP</span>
              <span className="welcome-header-slogan">L'excellence au service de vos projets.</span>
            </div>
          </div>
          <button
            className="welcome-header-btn"
            onClick={() => navigate('/login')}
          >
            <Lock className="w-4 h-4" />
            <span>Connexion</span>
          </button>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="welcome-hero">
        {/* Background decoration */}
        <div className="welcome-hero-bg" />
        <div className="welcome-hero-orb welcome-hero-orb-1" />
        <div className="welcome-hero-orb welcome-hero-orb-2" />

        <div
          ref={heroReveal.ref}
          className="welcome-hero-inner"
          style={{
            opacity: heroReveal.visible ? 1 : 0,
            transform: heroReveal.visible ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
          }}
        >
          <div className="welcome-hero-text">
            <div className="welcome-hero-badge">
              <Zap className="w-3.5 h-3.5" />
              <span>Solutions Professionnelles · Kindu, Maniema</span>
            </div>
            <h1 className="welcome-hero-title">
              Bienvenue chez<br />
              <span className="welcome-hero-title-accent">ALBA SERVICE GROUP</span>
            </h1>
            <p className="welcome-hero-desc">
              Nous mettons notre expertise au service des particuliers, des entreprises, des écoles,
              des organisations et des institutions afin d'offrir des solutions rapides, fiables et innovantes.
              Notre objectif est de simplifier votre travail grâce à des services professionnels de haute qualité.
            </p>
            <div className="welcome-hero-actions">
              <button
                className="welcome-cta-btn"
                onClick={() => navigate('/login')}
              >
                <Lock className="w-5 h-5" />
                <span>Accéder à mon espace</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                className="welcome-secondary-btn"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <span>Nos services</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mini stats */}
            <div className="welcome-hero-mini-stats">
              {[
                { value: '1 200+', label: 'Clients' },
                { value: '45k+', label: 'Documents' },
                { value: '98%', label: 'Satisfaction' },
              ].map((s, i) => (
                <div key={i} className="welcome-hero-mini-stat">
                  <span className="welcome-hero-mini-value">{s.value}</span>
                  <span className="welcome-hero-mini-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Illustration */}
          <div className="welcome-hero-illustration">
            <div className="welcome-hero-ill-ring">
              <img src="/alba-logo.png" alt="ALBA SERVICE GROUP" className="welcome-hero-ill-logo" />
              {/* Orbiting icons */}
              {[
                { icon: <Printer className="w-5 h-5 text-blue-600" />, label: 'Imprimerie', angle: 0 },
                { icon: <FileText className="w-5 h-5 text-emerald-600" />, label: 'Secrétariat', angle: 72 },
                { icon: <Monitor className="w-5 h-5 text-violet-600" />, label: 'Informatique', angle: 144 },
                { icon: <BookOpen className="w-5 h-5 text-orange-600" />, label: 'Formation', angle: 216 },
                { icon: <Cpu className="w-5 h-5 text-rose-600" />, label: 'Innovation', angle: 288 },
              ].map((item, i) => {
                const r = 140
                const rad = (item.angle - 90) * (Math.PI / 180)
                const x = Math.cos(rad) * r
                const y = Math.sin(rad) * r
                return (
                  <div
                    key={i}
                    className="welcome-orbit-item"
                    style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                  >
                    <div className="welcome-orbit-icon">{item.icon}</div>
                    <span className="welcome-orbit-label">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ───────────────────────────────────────────────── */}
      <section id="services" className="welcome-section welcome-section-light">
        <div
          ref={servicesReveal.ref}
          className="welcome-container"
        >
          <div
            className="welcome-section-header"
            style={{
              opacity: servicesReveal.visible ? 1 : 0,
              transform: servicesReveal.visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <span className="welcome-section-badge">Ce que nous offrons</span>
            <h2 className="welcome-section-title">Nos Services</h2>
            <p className="welcome-section-subtitle">
              Une gamme complète de solutions professionnelles pour répondre à tous vos besoins.
            </p>
          </div>

          <div className="welcome-services-grid">
            {SERVICES.map((service, i) => (
              <div
                key={i}
                className="welcome-service-card"
                style={{
                  opacity: servicesReveal.visible ? 1 : 0,
                  transform: servicesReveal.visible ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.97)',
                  transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
                }}
              >
                <div className={`welcome-service-icon-wrap bg-gradient-to-br ${service.color} ${service.shadow}`}>
                  <div className="text-white">{service.icon}</div>
                </div>
                <h3 className="welcome-service-title">{service.title}</h3>
                <ul className="welcome-service-list">
                  {service.items.map((item, j) => (
                    <li key={j} className="welcome-service-item">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY US ─────────────────────────────────────────────────── */}
      <section className="welcome-section welcome-section-dark">
        <div
          ref={whyReveal.ref}
          className="welcome-container"
        >
          <div
            className="welcome-section-header"
            style={{
              opacity: whyReveal.visible ? 1 : 0,
              transform: whyReveal.visible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <span className="welcome-section-badge-light">Notre différence</span>
            <h2 className="welcome-section-title text-white">Pourquoi choisir ALBA SERVICE GROUP ?</h2>
          </div>

          <div className="welcome-why-grid">
            {WHY_US.map((item, i) => (
              <div
                key={i}
                className="welcome-why-card"
                style={{
                  opacity: whyReveal.visible ? 1 : 0,
                  transform: whyReveal.visible ? 'translateY(0)' : 'translateY(24px)',
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`,
                }}
              >
                <div className="welcome-why-icon">{item.icon}</div>
                <span className="welcome-why-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ENGAGEMENT + VISION ────────────────────────────────────── */}
      <section className="welcome-section welcome-section-light">
        <div
          ref={engagementReveal.ref}
          className="welcome-container"
        >
          <div className="welcome-engagement-grid">
            {/* Engagement */}
            <div
              className="welcome-engagement-card"
              style={{
                opacity: engagementReveal.visible ? 1 : 0,
                transform: engagementReveal.visible ? 'translateX(0)' : 'translateX(-32px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}
            >
              <div className="welcome-engagement-icon-wrap">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="welcome-engagement-title">Notre Engagement</h3>
              <p className="welcome-engagement-text">
                Chez ALBA SERVICE GROUP, chaque projet est traité avec sérieux, professionnalisme et passion.
                Notre priorité est d'offrir à chaque client des services fiables, rapides et conformes à ses attentes.
              </p>
            </div>

            {/* Vision */}
            <div
              className="welcome-engagement-card"
              style={{
                opacity: engagementReveal.visible ? 1 : 0,
                transform: engagementReveal.visible ? 'translateX(0)' : 'translateX(32px)',
                transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
              }}
            >
              <div className="welcome-engagement-icon-wrap" style={{ background: 'linear-gradient(135deg, #7C3AED15, #A78BFA15)' }}>
                <Lightbulb className="w-8 h-8 text-violet-600" />
              </div>
              <h3 className="welcome-engagement-title">Notre Vision</h3>
              <p className="welcome-engagement-text">
                Devenir une référence incontournable dans les domaines de l'imprimerie, du secrétariat, des services
                informatiques et des solutions numériques, en proposant des services innovants qui accompagnent
                durablement les particuliers, les entreprises et les institutions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ─────────────────────────────────────────────────── */}
      <section className="welcome-section welcome-section-gradient">
        <div
          ref={valuesReveal.ref}
          className="welcome-container"
        >
          <div
            className="welcome-section-header"
            style={{
              opacity: valuesReveal.visible ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }}
          >
            <span className="welcome-section-badge-light">Ce qui nous guide</span>
            <h2 className="welcome-section-title text-white">Nos Valeurs</h2>
          </div>

          <div className="welcome-values-grid">
            {VALUES.map((v, i) => (
              <div
                key={i}
                className={`welcome-value-card ${v.bg}`}
                style={{
                  opacity: valuesReveal.visible ? 1 : 0,
                  transform: valuesReveal.visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.95)',
                  transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
                }}
              >
                <div className={`welcome-value-icon bg-gradient-to-br ${v.color}`}>
                  <div className="text-white">{v.icon}</div>
                </div>
                <span className="welcome-value-label">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────────── */}
      <section className="welcome-section welcome-section-light">
        <div
          ref={statsReveal.ref}
          className="welcome-container"
        >
          <div
            className="welcome-section-header"
            style={{
              opacity: statsReveal.visible ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }}
          >
            <span className="welcome-section-badge">Nos chiffres</span>
            <h2 className="welcome-section-title">ALBA en chiffres</h2>
          </div>

          <div className="welcome-stats-grid">
            {STATS.map((s, i) => (
              <StatCard key={i} {...s} active={statsReveal.visible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────── */}
      <section className="welcome-section welcome-section-dark">
        <div
          ref={testimonialsReveal.ref}
          className="welcome-container"
        >
          <div
            className="welcome-section-header"
            style={{
              opacity: testimonialsReveal.visible ? 1 : 0,
              transition: 'opacity 0.7s ease',
            }}
          >
            <span className="welcome-section-badge-light">Ce qu'ils disent</span>
            <h2 className="welcome-section-title text-white">Témoignages</h2>
          </div>

          <div className="welcome-testimonial-wrap">
            <button className="welcome-testimonial-nav" onClick={prev}>
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="welcome-testimonial-card">
              <div className="welcome-testimonial-stars">
                {Array.from({ length: TESTIMONIALS[testimonialIdx].rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="welcome-testimonial-text">
                "{TESTIMONIALS[testimonialIdx].text}"
              </p>
              <div className="welcome-testimonial-author">
                <div className="welcome-testimonial-avatar">
                  {TESTIMONIALS[testimonialIdx].avatar}
                </div>
                <div>
                  <p className="welcome-testimonial-name">{TESTIMONIALS[testimonialIdx].name}</p>
                  <p className="welcome-testimonial-role">{TESTIMONIALS[testimonialIdx].role}</p>
                </div>
              </div>
            </div>

            <button className="welcome-testimonial-nav" onClick={next}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots */}
          <div className="welcome-testimonial-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`welcome-testimonial-dot ${i === testimonialIdx ? 'welcome-testimonial-dot-active' : ''}`}
                onClick={() => setTestimonialIdx(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────── */}
      <section className="welcome-cta-section">
        <div className="welcome-cta-inner">
          <Building2 className="welcome-cta-icon-bg" />
          <h2 className="welcome-cta-title">Prêt à commencer ?</h2>
          <p className="welcome-cta-desc">
            Connectez-vous à votre espace de travail et gérez votre activité en toute simplicité.
          </p>
          <button
            className="welcome-cta-btn-large"
            onClick={() => navigate('/login')}
          >
            <Lock className="w-5 h-5" />
            <span>Accéder à mon espace</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="welcome-footer">
        <div className="welcome-footer-inner">
          <div className="welcome-footer-brand">
            <img src="/alba-logo.png" alt="ALBA" className="welcome-footer-logo" />
            <div>
              <p className="welcome-footer-name">ALBA SERVICE GROUP</p>
              <p className="welcome-footer-tagline">
                Nous construisons des solutions professionnelles qui facilitent votre quotidien
                et contribuent à la réussite de vos projets.
              </p>
            </div>
          </div>

          <div className="welcome-footer-contact">
            <div className="welcome-footer-contact-item">
              <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Kindu – Province du Maniema – République Démocratique du Congo</span>
            </div>
          </div>

          <div className="welcome-footer-divider" />
          <p className="welcome-footer-copy">
            © 2026 ALBA SERVICE GROUP. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  )
}
