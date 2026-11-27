import { useState } from 'react'
import { Fingerprint, LoaderCircle } from 'lucide-react'
import {
  getAttendanceErrorMessage,
  registerWindowsHelloForCurrentEmployee,
} from '@/services/attendance-security.service'

type Props = {
  disabled?: boolean
}

export default function WindowsHelloEnrollmentCard({ disabled = false }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const register = async () => {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await registerWindowsHelloForCurrentEmployee()
      setSuccess('Windows Hello est enregistré pour ton compte employé.')
    } catch (cause) {
      setError(getAttendanceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-start gap-3">
        <Fingerprint className="mt-0.5 shrink-0 text-blue-700" size={20} />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900">Enregistrer mon empreinte</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Connecte-toi à ton compte ALBA depuis ton propre profil Windows, puis suis la demande Windows Hello.
            La vérification utilise l’empreinte ou le PIN configuré dans Windows; aucune image d’empreinte n’est envoyée à ALBA.
          </p>
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void register()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Fingerprint size={14} />}
            Enregistrer Windows Hello
          </button>
          {error && <p role="alert" className="mt-3 text-xs font-medium text-red-700">{error}</p>}
          {success && <p role="status" className="mt-3 text-xs font-medium text-green-700">{success}</p>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            Un lecteur externe partagé nécessite un modèle et un SDK compatibles; un lecteur USB ne fonctionne pas automatiquement avec Windows Hello.
          </p>
        </div>
      </div>
    </section>
  )
}
