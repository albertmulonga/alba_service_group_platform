import { Fingerprint } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import WindowsHelloEnrollmentCard from '@/components/hr/WindowsHelloEnrollmentCard'

export default function AttendanceEnrollmentPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Enregistrer mon empreinte"
        subtitle="Configure la vérification utilisée avec ton badge de présence."
        breadcrumbs={[{ label: 'Accueil' }, { label: 'Présence' }, { label: 'Mon empreinte' }]}
        icon={<Fingerprint size={22} />}
        iconBg="gradient-primary"
      />
      <div className="max-w-3xl space-y-4">
        <WindowsHelloEnrollmentCard />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Cette étape doit être faite par l’employé connecté, avec son compte ALBA et son profil Windows personnels.
          Un administrateur ne peut pas enregistrer l’empreinte d’un autre employé depuis sa propre session.
        </div>
      </div>
    </div>
  )
}
