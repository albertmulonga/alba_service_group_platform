import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

/* ─── Types ──────────────────────────────────────────── */
type ThemeMode    = 'light' | 'dark'
type FontSize     = 'small' | 'normal' | 'large'
type Density      = 'compact' | 'comfortable' | 'spacious'

interface ThemeSettings {
  theme:        ThemeMode
  primaryColor: string
  fontSize:     FontSize
  density:      Density
  currency:     string
  language:     string
  dateFormat:   string
  companyName:  string
}

interface ThemeContextType extends ThemeSettings {
  setTheme:        (t: ThemeMode) => void
  setPrimaryColor: (c: string)    => void
  setFontSize:     (s: FontSize)  => void
  setDensity:      (d: Density)   => void
  setCurrency:     (c: string)    => void
  setLanguage:     (l: string)    => void
  setDateFormat:   (f: string)    => void
  setCompanyName:  (n: string)    => void
  resetTheme:      () => void
}

/* ─── Defaults ───────────────────────────────────────── */
const DEFAULTS: ThemeSettings = {
  theme:        'light',
  primaryColor: '#1E3A8A',
  fontSize:     'normal',
  density:      'comfortable',
  currency:     'FC',
  language:     'Français',
  dateFormat:   'DD/MM/YYYY',
  companyName:  'ALBA SERVICE GROUP',
}

const STORAGE_KEY = 'alba-theme-settings'

/* ─── Helpers — apply to DOM ────────────────────────── */
function applyTheme(settings: ThemeSettings) {
  const root = document.documentElement

  /* ── Dark / Light ── */
  root.classList.toggle('dark', settings.theme === 'dark')

  /* ── Primary color CSS variables ── */
  const hex = settings.primaryColor
  root.style.setProperty('--color-primary',       hex)
  root.style.setProperty('--color-primary-light', lighten(hex, 20))
  root.style.setProperty('--color-primary-dark',  darken(hex, 10))

  /* ── Sidebar gradient via CSS variable ── */
  root.style.setProperty('--sidebar-bg-from', darken(hex, 30))
  root.style.setProperty('--sidebar-bg-to',   darken(hex, 50))

  /* ── Font size ── */
  const fontSizeMap: Record<FontSize, string> = {
    small:  '13px',
    normal: '14px',
    large:  '16px',
  }
  root.style.setProperty('font-size', fontSizeMap[settings.fontSize])
  root.style.fontSize = fontSizeMap[settings.fontSize]

  /* ── Density ── */
  const densityMap: Record<Density, string> = {
    compact:     '0.75',
    comfortable: '1',
    spacious:    '1.25',
  }
  root.style.setProperty('--density-scale', densityMap[settings.density])
  root.setAttribute('data-density', settings.density)
}

/* ─── Color utilities ────────────────────────────────── */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [30, 58, 138]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('')
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r - amount, g - amount, b - amount)
}

/* ─── Context ────────────────────────────────────────── */
const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...DEFAULTS, ...JSON.parse(stored) }
    } catch {}
    return DEFAULTS
  })

  /* Apply on every settings change */
  useEffect(() => {
    applyTheme(settings)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  const setTheme        = useCallback((t: ThemeMode)  => setSettings(s => ({ ...s, theme: t })), [])
  const setPrimaryColor = useCallback((c: string)     => setSettings(s => ({ ...s, primaryColor: c })), [])
  const setFontSize     = useCallback((f: FontSize)   => setSettings(s => ({ ...s, fontSize: f })), [])
  const setDensity      = useCallback((d: Density)    => setSettings(s => ({ ...s, density: d })), [])
  const setCurrency     = useCallback((c: string)     => setSettings(s => ({ ...s, currency: c })), [])
  const setLanguage     = useCallback((l: string)     => setSettings(s => ({ ...s, language: l })), [])
  const setDateFormat   = useCallback((f: string)     => setSettings(s => ({ ...s, dateFormat: f })), [])
  const setCompanyName  = useCallback((n: string)     => setSettings(s => ({ ...s, companyName: n })), [])
  const resetTheme      = useCallback(()              => setSettings(DEFAULTS), [])

  return (
    <ThemeContext.Provider value={{
      ...settings,
      setTheme, setPrimaryColor, setFontSize, setDensity,
      setCurrency, setLanguage, setDateFormat, setCompanyName, resetTheme
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
