import { api } from './api'

export const financeService = {
  // Transactions
  getTransactions: (filters?: { accountId?: string; type?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/finance/transactions', { params: filters }).then(r => r.data),
  createTransaction: (body: any) =>
    api.post('/finance/transactions', body).then(r => r.data),
  deleteTransaction: (id: string) =>
    api.delete(`/finance/transactions/${id}`),

  // Revenues
  getRevenues: (filters?: { category?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/finance/revenues', { params: { ...filters, limit: filters?.limit ?? 100 } }).then(r => r.data),
  createRevenue: (body: any) =>
    api.post('/finance/revenues', body).then(r => r.data),
  updateRevenue: (id: string, body: any) =>
    api.put(`/finance/revenues/${id}`, body).then(r => r.data),
  deleteRevenue: (id: string) =>
    api.delete(`/finance/revenues/${id}`),

  // Expenses
  getExpenses: (filters?: { category?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/finance/expenses', { params: { ...filters, limit: filters?.limit ?? 100 } }).then(r => r.data),
  createExpense: (body: any) =>
    api.post('/finance/expenses', body).then(r => r.data),
  updateExpense: (id: string, body: any) =>
    api.put(`/finance/expenses/${id}`, body).then(r => r.data),
  deleteExpense: (id: string) =>
    api.delete(`/finance/expenses/${id}`),

  // Accounts
  getAccounts: (filters?: { type?: string; page?: number; limit?: number }) =>
    api.get('/finance/accounts', { params: { ...filters, limit: filters?.limit ?? 100 } }).then(r => r.data),
  createAccount: (body: any) =>
    api.post('/finance/accounts', body).then(r => r.data),
  updateAccount: (id: string, body: any) =>
    api.put(`/finance/accounts/${id}`, body).then(r => r.data),
  deleteAccount: (id: string) =>
    api.delete(`/finance/accounts/${id}`),

  // Dashboard & Reports
  getSummary: (filters?: { startDate?: string; endDate?: string }) =>
    api.get('/finance/dashboard/financial-summary', { params: filters }).then(r => r.data),
  getProfitLoss: (filters?: { startDate?: string; endDate?: string }) =>
    api.get('/finance/reports/profit-loss', { params: filters }).then(r => r.data),
}
