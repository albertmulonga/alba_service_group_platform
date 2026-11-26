import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Permission } from '@/lib/permissions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/auth/LoginPage'
import WelcomePage from '@/pages/welcome/WelcomePage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientHistoryPage from '@/pages/clients/ClientHistoryPage'
import ClientSegmentsPage from '@/pages/clients/ClientSegmentsPage'
import EmployeesPage from '@/pages/employees/EmployeesPage'
import DepartmentsPage from '@/pages/departments/DepartmentsPage'
import PrintOrdersPage from '@/pages/print/PrintOrdersPage'
import PrintServicesPage from '@/pages/printing/PrintServicesPage'
import ConsumablesPage from '@/pages/print/ConsumablesPage'
import ProductionPage from '@/pages/print/ProductionPage'
import MachinesPage from '@/pages/print/MachinesPage'
import StockPage from '@/pages/stock/StockPage'
import StockMovementsPage from '@/pages/stock/StockMovementsPage'
import InvoicesPage from '@/pages/commercial/InvoicesPage'
import QuotesPage from '@/pages/commercial/QuotesPage'
import CommercialOrdersPage from '@/pages/commercial/CommercialOrdersPage'
import PaymentsPage from '@/pages/commercial/PaymentsPage'
import CashPage from '@/pages/finance/CashPage'
import AccountingPage from '@/pages/finance/AccountingPage'
import BudgetPage from '@/pages/finance/BudgetPage'
import FinancialStatementsPage from '@/pages/finance/FinancialStatementsPage'
import TaxPage from '@/pages/finance/TaxPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SecretariatPage from '@/pages/secretariat/SecretariatPage'
import MaintenancePage from '@/pages/maintenance/MaintenancePage'
import TrainingPage from '@/pages/training/TrainingPage'
import CertificatesPage from '@/pages/training/CertificatesPage'
import TrainingAttendancePage from '@/pages/training/TrainingAttendancePage'
import ReportsPage from '@/pages/reports/ReportsPage'
import AgendaPage from '@/pages/agenda/AgendaPage'
import GraphicsPage from '@/pages/graphics/GraphicsPage'
import ITProjectsPage from '@/pages/it/ITProjectsPage'
import ITTasksPage from '@/pages/it/ITTasksPage'
import ITTicketsPage from '@/pages/it/ITTicketsPage'
import PurchasesPage from '@/pages/purchases/PurchasesPage'
import DocumentsPage from '@/pages/documents/DocumentsPage'
import UsersPage from '@/pages/admin/UsersPage'
import ProfilePage from '@/pages/profile/ProfilePage'
import LeavePage from '@/pages/hr/LeavePage'
import PayrollPage from '@/pages/hr/PayrollPage'
import AttendancePage from '@/pages/hr/AttendancePage'
import MaPaiePage from '@/pages/hr/MaPaiePage'
import AgenciesPage from '@/pages/agencies/AgenciesPage'
import MessagingPage from '@/pages/messaging/MessagingPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm mt-3">Chargement...</p>
        </div>
      </div>
    )
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/welcome" replace />
}

function PermissionRoute({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useAuth()
  if (!can(permission)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Accès refusé</h2>
            <p className="text-gray-500 text-sm mt-1">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<PermissionRoute permission="dashboard.view"><DashboardPage /></PermissionRoute>} />

          {/* Clients / CRM */}
          <Route path="clients" element={<PermissionRoute permission="clients.view"><ClientsPage /></PermissionRoute>} />
          <Route path="clients/history" element={<PermissionRoute permission="clients.view"><ClientHistoryPage /></PermissionRoute>} />
          <Route path="clients/segments" element={<PermissionRoute permission="clients.view"><ClientSegmentsPage /></PermissionRoute>} />

          {/* Employés / RH */}
          <Route path="employees" element={<PermissionRoute permission="employees.view"><EmployeesPage /></PermissionRoute>} />
          <Route path="hr/leaves" element={<PermissionRoute permission="employees.view"><LeavePage /></PermissionRoute>} />
          <Route path="hr/payroll" element={<PermissionRoute permission="employees.view"><PayrollPage /></PermissionRoute>} />
          <Route path="hr/attendance" element={<PermissionRoute permission="employees.view"><AttendancePage /></PermissionRoute>} />
          <Route path="hr/ma-paie" element={<MaPaiePage />} />

          {/* Organisation */}
          <Route path="departments" element={<PermissionRoute permission="departments.view"><DepartmentsPage /></PermissionRoute>} />

          {/* Imprimerie */}
          <Route path="print/orders" element={<PermissionRoute permission="printing.view"><PrintOrdersPage /></PermissionRoute>} />
          <Route path="print/services" element={<PermissionRoute permission="printing.view"><PrintServicesPage /></PermissionRoute>} />
          <Route path="print/production" element={<PermissionRoute permission="production.view"><ProductionPage /></PermissionRoute>} />
          <Route path="print/machines" element={<PermissionRoute permission="machines.view"><MachinesPage /></PermissionRoute>} />
          <Route path="print/consumables" element={<PermissionRoute permission="consumables.view"><ConsumablesPage /></PermissionRoute>} />

          {/* Secrétariat */}
          <Route path="secretariat" element={<PermissionRoute permission="secretariat.view"><SecretariatPage /></PermissionRoute>} />

          {/* Informatique */}
          <Route path="it/projects" element={<PermissionRoute permission="it.view"><ITProjectsPage /></PermissionRoute>} />
          <Route path="it/tasks" element={<PermissionRoute permission="it.view"><ITTasksPage /></PermissionRoute>} />
          <Route path="it/tickets" element={<PermissionRoute permission="it.view"><ITTicketsPage /></PermissionRoute>} />

          {/* Graphisme */}
          <Route path="graphics" element={<PermissionRoute permission="graphics.view"><GraphicsPage /></PermissionRoute>} />

          {/* Maintenance */}
          <Route path="maintenance" element={<PermissionRoute permission="maintenance.view"><MaintenancePage /></PermissionRoute>} />

          {/* Formation */}
          <Route path="training" element={<PermissionRoute permission="training.view"><TrainingPage /></PermissionRoute>} />
          <Route path="training/certificates" element={<PermissionRoute permission="training.view"><CertificatesPage /></PermissionRoute>} />
          <Route path="training/attendance" element={<PermissionRoute permission="training.view"><TrainingAttendancePage /></PermissionRoute>} />

          {/* Commercial */}
          <Route path="commercial/quotes" element={<PermissionRoute permission="commercial.view"><QuotesPage /></PermissionRoute>} />
          <Route path="commercial/orders" element={<PermissionRoute permission="commercial.view"><CommercialOrdersPage /></PermissionRoute>} />
          <Route path="commercial/invoices" element={<PermissionRoute permission="commercial.view"><InvoicesPage /></PermissionRoute>} />
          <Route path="commercial/payments" element={<PermissionRoute permission="commercial.view"><PaymentsPage /></PermissionRoute>} />

          {/* Stock */}
          <Route path="stock" element={<PermissionRoute permission="stock.view"><StockPage /></PermissionRoute>} />
          <Route path="stock/movements" element={<PermissionRoute permission="stock.view"><StockMovementsPage /></PermissionRoute>} />

          {/* Achats */}
          <Route path="purchases" element={<PermissionRoute permission="purchases.view"><PurchasesPage /></PermissionRoute>} />

          {/* Finance */}
          <Route path="finance/cash" element={<PermissionRoute permission="finance.view"><CashPage /></PermissionRoute>} />
          <Route path="finance/accounting" element={<PermissionRoute permission="accounting.view"><AccountingPage /></PermissionRoute>} />
          <Route path="finance/budget" element={<PermissionRoute permission="budget.view"><BudgetPage /></PermissionRoute>} />
          <Route path="finance/statements" element={<PermissionRoute permission="finance.view"><FinancialStatementsPage /></PermissionRoute>} />
          <Route path="finance/tax" element={<PermissionRoute permission="finance.view"><TaxPage /></PermissionRoute>} />

          {/* Agences */}
          <Route path="agencies" element={<AgenciesPage />} />

          {/* Messagerie */}
          <Route path="messaging" element={<MessagingPage />} />

          {/* Documents */}
          <Route path="documents" element={<PermissionRoute permission="documents.view"><DocumentsPage /></PermissionRoute>} />

          {/* Agenda */}
          <Route path="agenda" element={<PermissionRoute permission="agenda.view"><AgendaPage /></PermissionRoute>} />

          {/* Rapports */}
          <Route path="reports" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />

          {/* Administration */}
          <Route path="admin/users" element={<PermissionRoute permission="admin.users"><UsersPage /></PermissionRoute>} />

          {/* Paramètres */}
          <Route path="settings" element={<PermissionRoute permission="settings.view"><SettingsPage /></PermissionRoute>} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
