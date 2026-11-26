// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  photo?: string
  role: Role
  department?: string
  agency?: string
  function?: string
  status: 'active' | 'inactive'
  lastLogin?: string
  createdAt: string
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export interface Permission {
  id: string
  name: string
  module: string
  action: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// ─── KPI / Stats ─────────────────────────────────────────────────────────────
export interface KpiCard {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: string
  color: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'teal'
}

// ─── Client ──────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  clientCode: string
  clientType: 'individual' | 'company' | 'public' | 'school' | 'ngo' | 'hospital'
  companyName?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  country: string
  status: 'active' | 'inactive'
  commercialManager?: string
  totalSpent?: number
  lastActivity?: string
  createdAt: string
}

// ─── Employee ────────────────────────────────────────────────────────────────
export interface Employee {
  id: string
  matricule: string
  firstName: string
  lastName: string
  function: string
  department: string
  agency: string
  phone: string
  email: string
  contractType: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Prestataire'
  hireDate: string
  status: 'active' | 'inactive' | 'leave'
  salary?: number
  photo?: string
}

// ─── Print Order ─────────────────────────────────────────────────────────────
export interface PrintOrder {
  id: string
  orderNumber: string
  client: Client
  service: string
  description: string
  priority: 'normal' | 'urgent' | 'very_urgent'
  status: PrintOrderStatus
  totalCost: number
  paid: number
  dueDate: string
  createdAt: string
}

export type PrintOrderStatus =
  | 'draft'
  | 'quote_pending'
  | 'quote_validated'
  | 'payment_pending'
  | 'in_preparation'
  | 'printing'
  | 'finishing'
  | 'quality_check'
  | 'ready'
  | 'delivered'
  | 'closed'
  | 'cancelled'

// ─── Invoice ─────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string
  invoiceNumber: string
  client: Client
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paid: number
  balance: number
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'unpaid' | 'cancelled'
  dueDate: string
  createdAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

// ─── Stock ───────────────────────────────────────────────────────────────────
export interface Product {
  id: string
  productCode: string
  name: string
  category: string
  unit: string
  purchasePrice: number
  salePrice: number
  currentStock: number
  minimumStock: number
  supplier?: string
  location?: string
}

// ─── Notification ────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'danger'
  isRead: boolean
  createdAt: string
}

// ─── Navigation ──────────────────────────────────────────────────────────────
export interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
  children?: NavItem[]
  permission?: string
}
