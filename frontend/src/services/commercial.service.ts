import { api } from './api'

export const commercialService = {
  // Quotes
  getQuotes: (filters?: Record<string, any>) =>
    api.get('/commercial/quotes', { params: filters }).then(r => r.data),
  getQuote: (id: string) =>
    api.get(`/commercial/quotes/${id}`).then(r => r.data),
  createQuote: (body: any) =>
    api.post('/commercial/quotes', body).then(r => r.data),
  updateQuote: (id: string, body: any) =>
    api.put(`/commercial/quotes/${id}`, body).then(r => r.data),
  convertQuote: (id: string) =>
    api.post(`/commercial/quotes/${id}/convert`).then(r => r.data),

  // Orders
  getOrders: (filters?: Record<string, any>) =>
    api.get('/commercial/orders', { params: filters }).then(r => r.data),
  getOrder: (id: string) =>
    api.get(`/commercial/orders/${id}`).then(r => r.data),
  createOrder: (body: any) =>
    api.post('/commercial/orders', body).then(r => r.data),
  updateOrderStatus: (id: string, status: string) =>
    api.put(`/commercial/orders/${id}/status`, { status }).then(r => r.data),

  // Invoices
  getInvoices: (filters?: Record<string, any>) =>
    api.get('/commercial/invoices', { params: filters }).then(r => r.data),
  getInvoice: (id: string) =>
    api.get(`/commercial/invoices/${id}`).then(r => r.data),
  createInvoice: (body: any) =>
    api.post('/commercial/invoices', body).then(r => r.data),

  // Payments
  getPayments: (invoiceId?: string) =>
    api.get('/commercial/payments', { params: invoiceId ? { invoiceId } : {} }).then(r => r.data),
  createPayment: (body: any) =>
    api.post('/commercial/payments', body).then(r => r.data),
}
