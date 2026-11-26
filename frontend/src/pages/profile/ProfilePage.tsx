import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import PhotoUploader from '@/components/ui/PhotoUploader'
import {
  User, Mail, Phone, Building2, Briefcase,
  Shield, Key, Save, Edit,
  Clock, Activity, LogIn, Monitor, Check, X
} from 'lucide-react'

const STORAGE_KEY = 'alba-profile'

function loadProfile(user: any) {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photo: user?.photo || null,
  }
}

function getPwStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score: 1, label: 'Faible', color: 'bg-red-500' }
  if (score <= 2) return { score: 2, label: 'Moyen', color: 'bg-orange-500' }
  if (score <= 3) return { score: 3, label: 'Bon', color: 'bg-yellow-500' }
  if (score <= 4) return { score: 4, label: 'Fort', color: 'bg-blue-500' }
  return { score: 5, label: 'Excellent', color: 'bg-green-500' }
}

export default function ProfilePage() {
  const { user, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [form, setForm] = useState(() => loadProfile(user))
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  useEffect(() => {
    setForm(loadProfile(user))
  }, [user])

  const pwValidations = useMemo(() => ({
    length: pwForm.newPw.length >= 8,
    uppercase: /[A-Z]/.test(pwForm.newPw),
    number: /[0-9]/.test(pwForm.newPw),
    match: pwForm.newPw.length > 0 && pwForm.newPw === pwForm.confirm,
    currentFilled: pwForm.current.length > 0,
  }), [pwForm])

  const allPwValid = pwValidations.length && pwValidations.uppercase && pwValidations.number && pwValidations.match && pwValidations.currentFilled
  const pwStrength = getPwStrength(pwForm.newPw)

  const handleSave = async () => {
    try {
      const { data } = await api.put(`/users/${user!.id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      })
      const updatedUser = { ...user, ...data }
      localStorage.setItem('alba_user', JSON.stringify(updatedUser))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Profile save error:', err)
    }
  }

  const handleDeletePhoto = () => {
    setForm({ ...form, photo: null })
  }

  const handlePasswordChange = async () => {
    setPwError('')
    setPwSuccess('')

    if (pwForm.newPw !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }

    try {
      await api.post(`/users/${user!.id}/reset-password`, {
        newPassword: pwForm.newPw,
      })
      setPwSuccess('Mot de passe mis à jour avec succès')
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de la mise à jour du mot de passe'
      setPwError(typeof msg === 'string' ? msg : msg[0] || 'Erreur inconnue')
    }
  }

  const recentActivity = [
    { action: 'Connexion au système', time: 'Il y a 5 min', icon: <LogIn size={13} />, color: 'text-green-600 bg-green-50' },
    { action: 'Facture F-2026-0156 créée', time: 'Il y a 1h', icon: <Activity size={13} />, color: 'text-blue-600 bg-blue-50' },
    { action: 'Client Entreprise ABC modifié', time: 'Il y a 2h', icon: <Edit size={13} />, color: 'text-purple-600 bg-purple-50' },
    { action: 'Rapport mensuel exporté', time: 'Hier 14:30', icon: <Monitor size={13} />, color: 'text-orange-600 bg-orange-50' },
  ]

  const loginHistory = [
    { date: '27/07/2026 08:15', ip: '192.168.1.10', device: 'Windows 11 / Chrome', success: true },
    { date: '26/07/2026 07:52', ip: '192.168.1.10', device: 'Windows 11 / Chrome', success: true },
    { date: '25/07/2026 09:01', ip: '192.168.1.15', device: 'Android / Firefox', success: true },
    { date: '24/07/2026 22:45', ip: '10.0.0.5', device: 'Inconnu', success: false },
  ]

  const tabs = [
    { id: 'profile', label: 'Mon profil', icon: <User size={14} /> },
    { id: 'security', label: 'Sécurité', icon: <Shield size={14} /> },
    { id: 'activity', label: 'Activités', icon: <Activity size={14} /> },
    { id: 'sessions', label: 'Sessions', icon: <Clock size={14} /> },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mon Profil"
        subtitle="Gérer vos informations personnelles et sécurité"
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Profil' }]}
        icon={<User size={22} />}
        iconBg="gradient-primary"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #0F2460, #1E3A8A, #2563EB)' }}>
            <div className="absolute -bottom-10 left-6">
              <div className="relative">
                <PhotoUploader
                  value={form.photo}
                  onChange={photo => setForm({ ...form, photo })}
                  size={96}
                  name={`${form.firstName || user?.firstName || ''} ${form.lastName || user?.lastName || ''}`.trim() || 'U'}
                />
              </div>
            </div>
          </div>
          <div className="pt-12 px-6 pb-6">
            <h2 className="font-bold text-gray-800">{form.firstName || user?.firstName} {form.lastName || user?.lastName}</h2>
            <p className="text-sm text-gray-500">{user?.role?.name}</p>
            <div className="mt-1">
              <StatusBadge label={user?.status === 'active' ? 'Actif' : 'Inactif'}
                type={user?.status === 'active' ? 'success' : 'danger'} />
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-gray-600">
                <Mail size={13} className="text-gray-400 flex-shrink-0" />
                <span>{form.email || user?.email}</span>
              </div>
              {(form.phone || user?.phone) && (
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Phone size={13} className="text-gray-400 flex-shrink-0" />
                  <span>{form.phone || user?.phone}</span>
                </div>
              )}
              {user?.department && (
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                  <span>{user.department}</span>
                </div>
              )}
              {user?.function && (
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                  <span>{user.function}</span>
                </div>
              )}
              {user?.lastLogin && (
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Clock size={13} className="text-gray-400 flex-shrink-0" />
                  <span>Connecté {new Date(user.lastLogin).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="font-semibold text-gray-800">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Prénom</label>
                  <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nom</label>
                  <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    type="email"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">Rôle</p>
                  <p className="text-sm font-semibold text-blue-600">{user?.role?.name}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">Département</p>
                  <p className="text-sm text-gray-600">{user?.department || '—'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">Fonction</p>
                  <p className="text-sm text-gray-600">{user?.function || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 justify-end">
                {form.photo && (
                  <button onClick={handleDeletePhoto}
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                    Supprimer la photo
                  </button>
                )}
                {saved && (
                  <span className="text-xs text-green-600 font-medium">Profil enregistré avec succès ✓</span>
                )}
                <button onClick={handleSave}
                  className={`flex items-center gap-2 px-5 py-2 text-sm text-white rounded-xl transition-all ${saved ? 'bg-green-500' : ''}`}
                  style={!saved ? { background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' } : {}}>
                  <Save size={14} />
                  {saved ? 'Enregistré ✓' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h3 className="font-semibold text-gray-800">Changer le mot de passe</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Mot de passe actuel</label>
                  <input value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                    type="password" placeholder="••••••••"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                  <input value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
                    type="password" placeholder="Minimum 8 caractères"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  {pwForm.newPw.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex gap-1 flex-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <span className={`text-xs font-medium ml-2 ${pwStrength.score <= 2 ? 'text-red-600' : pwStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {pwStrength.label}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
                  <input value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    type="password" placeholder="Répéter le mot de passe"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>

              {pwForm.newPw.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Vérifications</p>
                  {[
                    { ok: pwValidations.length, label: 'Au moins 8 caractères' },
                    { ok: pwValidations.uppercase, label: 'Au moins 1 lettre majuscule' },
                    { ok: pwValidations.number, label: 'Au moins 1 chiffre' },
                    { ok: pwValidations.match, label: 'Les mots de passe correspondent' },
                  ].map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {v.ok ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <X size={14} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${v.ok ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{v.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {pwError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-medium text-red-700">{pwError}</p>
                </div>
              )}
              {pwSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-medium text-green-700">{pwSuccess}</p>
                </div>
              )}
              <div className="flex items-center gap-3 justify-end">
                <button onClick={handlePasswordChange}
                  disabled={!allPwValid}
                  className={`flex items-center gap-2 px-5 py-2 text-sm text-white rounded-xl transition-all ${!allPwValid ? 'bg-gray-300 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 shadow-md'}`}>
                  <Key size={14} /> Changer le mot de passe
                </button>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Activités récentes</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                      {a.icon}
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{a.action}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Historique des connexions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Date', 'Adresse IP', 'Appareil', 'Statut'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loginHistory.map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-700">{l.date}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{l.ip}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{l.device}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={l.success ? 'Réussi' : 'Échoué'}
                            type={l.success ? 'success' : 'danger'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
