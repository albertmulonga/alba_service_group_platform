import { api } from './api'

export interface Customer {
  id: string
  code: string
  category: string
  status: string
  companyName?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  province?: string
  country: string
  website?: string
  whatsapp?: string
  photo?: string
  notes?: string
  loyaltyPoints: number
  totalRevenue: number
  totalOrders: number
  lastOrderAt?: string
  birthDate?: string
  registeredAt: string
  createdAt: string
  updatedAt: string
}

export const customersService = {
  findAll: (filters?: Record<string, string>) =>
    api.get('/customers', { params: filters }).then(r => r.data),

  findOne: (id: string) =>
    api.get(`/customers/${id}`).then(r => r.data),

  create: (body: Partial<Customer>) =>
    api.post('/customers', body).then(r => r.data),

  update: (id: string, body: Partial<Customer>) =>
    api.put(`/customers/${id}`, body).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/customers/${id}`),

  getActivities: (id: string, limit = 20) =>
    api.get(`/customers/${id}/activities`, { params: { limit } }).then(r => r.data),

  createActivity: (id: string, body: any) =>
    api.post(`/customers/${id}/activities`, body).then(r => r.data),
}
