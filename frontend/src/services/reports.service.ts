import { api } from './api'

export const reportsService = {
  getDashboard: () =>
    api.get('/reports/dashboard').then(r => r.data),

  getSalesReport: (filters?: { startDate?: string; endDate?: string; customerId?: string }) =>
    api.get('/reports/sales', { params: filters }).then(r => r.data),

  getFinanceReport: (filters?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/finance', { params: filters }).then(r => r.data),
}
