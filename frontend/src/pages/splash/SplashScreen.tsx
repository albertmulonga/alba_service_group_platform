import { useEffect, useRef, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

const DURATION = 3400 // ms total before exit starts

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const finishedRef = useRef(false)

  // Fade in after first paint
  useEffect(() => {
    const t = setTimeout(() => setPhase('visible'), 80)
    return () => clearTimeout(t)
  }, [])

  // Progress animation
  useEffect(() => {
    const animate = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const raw = elapsed / DURATION
      // easeInOutQuad
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2
      const pct = Math.min(100, Math.round(eased * 100))
      setProgress(pct)

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else if (!finishedRef.current) {
        finishedRef.current = true
        setProgress(100)
        setTimeout(() => setPhase('exit'), 400)
        setTimeout(() => onFinish(), 400 + 700)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [onFinish])

  const isEnter = phase === 'enter'
  const isExit = phase === 'exit'

  return (
    <div
      className="splash-root"
      style={{
        opacity: isEnter || isExit ? 0 : 1,
        transform: isExit ? 'scale(1.04)' : 'scale(1)',
        transition: isEnter
          ? 'opacity 0.5s ease'
          : 'opacity 0.65s ease, transform 0.65s ease',
      }}
    >
      <div className="splash-bg" />
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />
      <div className="splash-grid" />

      {/* Main content */}
      <div className="splash-content">
        <div className="splash-logo-wrap">
          <div className="splash-halo" />
          <div className="splash-logo-ring">
            <img
              src="/alba-logo.png"
              alt="ALBA SERVICE GROUP"
              className="splash-logo-img splash-breathing"
            />
          </div>
        </div>

        <h1 className="splash-company-name">ALBA SERVICE GROUP</h1>

        <p className="splash-tagline">
          Votre partenaire de confiance pour des solutions<br />
          professionnelles, numériques et administratives.
        </p>

        <div className="splash-divider" />
      </div>

      {/* Bottom loading */}
      <div className="splash-bottom">
        <p className="splash-loading-text">Préparation de votre espace de travail...</p>
        <div className="splash-progress-track">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
          <div
            className="splash-progress-glow"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
        <p className="splash-progress-pct">{progress}%</p>
      </div>
    </div>
  )
}
