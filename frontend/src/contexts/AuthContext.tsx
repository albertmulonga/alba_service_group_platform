import { createContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { User, AuthState } from '@/types'
import type { Permission } from '@/lib/permissions'
import { hasPermission as checkPermission } from '@/lib/permissions'
import { api } from '@/services/api'

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>
  logout: () => void
  can: (permission: Permission) => boolean
  changePassword: (email: string, newPassword: string) => { success: boolean; message: string }
}

export const AuthContext = createContext<AuthContextType | null>(null)

const LS_TOKEN = 'alba_token'
const LS_USER  = 'alba_user'

function buildUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    photo: raw.photo,
    role: raw.roles?.length
      ? { id: raw.roles[0].roleId, name: raw.roles[0].role.name, permissions: [] }
      : { id: raw.id, name: 'Utilisateur', permissions: [] },
    department: raw.department?.name || '',
    agency:     raw.branch?.name || '',
    function:   raw.position || '',
    status: raw.status === 'ACTIVE' ? 'active' : 'inactive',
    lastLogin: raw.lastLoginAt || new Date().toISOString(),
    createdAt: raw.createdAt   || new Date().toISOString(),
  }
}

function saveSession(token: string, user: User) {
  localStorage.setItem(LS_TOKEN, token)
  localStorage.setItem(LS_USER, JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem(LS_TOKEN)
  localStorage.removeItem(LS_USER)
  localStorage.removeItem('alba-profile')
  sessionStorage.removeItem('alba_tab_active')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN)
    const userStr = localStorage.getItem(LS_USER)

    if (!token || !userStr) {
      setState(prev => ({ ...prev, isLoading: false }))
      return
    }

    /* Token local (compte créé par admin) — pas besoin de valider backend */
    if (token.startsWith('local-token-')) {
      try {
        const user = JSON.parse(userStr) as User
        if (!user?.role?.name) throw new Error('Bad user')
        setState({ user, token, isAuthenticated: true, isLoading: false })
      } catch {
        clearSession()
        setState(prev => ({ ...prev, isLoading: false }))
      }
      return
    }

    /* Token backend — valider contre /auth/profile */
    api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data: profile }) => {
      const user = buildUser(profile)
      saveSession(token, user)
      setState({ user, token, isAuthenticated: true, isLoading: false })
    }).catch(() => {
      clearSession()
      setState(prev => ({ ...prev, isLoading: false }))
    })
  }, [])

  /* ── Login ── */
  const login = async (email: string, password: string) => {
    /* 1. Chercher dans les comptes créés par admin (localStorage) */
    try {
      const raw = localStorage.getItem('alba-platform-users')
      if (raw) {
        const localUsers: any[] = JSON.parse(raw)
        const found = localUsers.find(
          u => u.email?.toLowerCase() === email.toLowerCase()
            && u.password === password
            && u.status !== 'locked'
            && u.status !== 'inactive'
        )
        if (found) {
          const user: User = {
            id: found.id,
            email: found.email,
            firstName: found.firstName || '',
            lastName: found.lastName || '',
            phone: found.phone || '',
            photo: found.photo || undefined,
            role: { id: found.id, name: found.role || 'Utilisateur', permissions: [] },
            department: found.department || '',
            agency: found.agency || '',
            function: found.position || '',
            status: 'active',
            lastLogin: new Date().toISOString(),
            createdAt: found.createdAt || new Date().toISOString(),
          }
          const token = `local-token-${found.id}-${Date.now()}`
          saveSession(token, user)
          /* Update lastLogin */
          const updated = localUsers.map(u => u.id === found.id ? { ...u, lastLogin: new Date().toISOString() } : u)
          localStorage.setItem('alba-platform-users', JSON.stringify(updated))
          setState({ user, token, isAuthenticated: true, isLoading: false })
          return
        }
        /* Account found but wrong password or locked */
        const accountExists = localUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (accountExists) {
          if (accountExists.status === 'locked') throw new Error('Compte verrouillé par l\'administrateur.')
          if (accountExists.status === 'inactive') throw new Error('Compte désactivé. Contactez l\'administrateur.')
          throw new Error('Mot de passe incorrect.')
        }
      }
    } catch (e: any) {
      /* If it's one of our custom errors, rethrow directly */
      if (e.message && !e.response) throw e
    }

    /* 2. Essayer le backend */
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem(LS_TOKEN, data.accessToken)

    let backendUser: any = data.user || {}
    try {
      const { data: profile } = await api.get('/auth/profile')
      backendUser = profile
    } catch {}

    const user: User = buildUser(backendUser)
    saveSession(data.accessToken, user)
    setState({ user, token: data.accessToken, isAuthenticated: true, isLoading: false })
  }

  /* ── Register ── */
  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const { data: apiData } = await api.post('/auth/register', data)
    localStorage.setItem(LS_TOKEN, apiData.accessToken)

    let backendUser: any = apiData.user || {}
    try {
      const { data: profile } = await api.get('/auth/profile')
      backendUser = profile
    } catch {
      /* stick with register response */
    }

    const user: User = buildUser(backendUser)
    saveSession(apiData.accessToken, user)
    setState({ user, token: apiData.accessToken, isAuthenticated: true, isLoading: false })
  }

  /* ── Logout ── */
  const logout = () => {
    clearSession()
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false })
  }

  /* ── Permission check ── */
  const can = useCallback((permission: Permission): boolean => {
    if (!state.user) return false
    return checkPermission(state.user.role.name, permission)
  }, [state.user])

  /* ── Change password (via backend API) ── */
  const changePassword = (email: string, newPassword: string): { success: boolean; message: string } => {
    if (newPassword.length < 8)        return { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' }
    if (!/[A-Z]/.test(newPassword))    return { success: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule.' }
    if (!/[0-9]/.test(newPassword))    return { success: false, message: 'Le mot de passe doit contenir au moins un chiffre.' }
    return { success: true, message: 'Utilisez la page Profil pour modifier le mot de passe.' }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, can, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
