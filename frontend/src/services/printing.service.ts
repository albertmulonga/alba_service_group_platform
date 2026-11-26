import { api } from './api'

export const printingService = {
  // Services
  getServices: () =>
    api.get('/print/services').then(r => r.data),
  createService: (body: any) =>
    api.post('/print/services', body).then(r => r.data),
  updateService: (id: string, body: any) =>
    api.put(`/print/services/${id}`, body).then(r => r.data),
  deleteService: (id: string) =>
    api.delete(`/print/services/${id}`),

  // Orders
  getOrders: (filters?: { customerId?: string; status?: string; priority?: string; search?: string }) =>
    api.get('/print/orders', { params: filters }).then(r => r.data),
  getOrder: (id: string) =>
    api.get(`/print/orders/${id}`).then(r => r.data),
  createOrder: (body: any) =>
    api.post('/print/orders', body).then(r => r.data),
  updateOrder: (id: string, body: any) =>
    api.put(`/print/orders/${id}`, body).then(r => r.data),
  updateOrderStatus: (id: string, status: string) =>
    api.put(`/print/orders/${id}/status`, { status }).then(r => r.data),
  deleteOrder: (id: string) =>
    api.delete(`/print/orders/${id}`),

  // Production steps
  getProductionSteps: (orderId: string) =>
    api.get(`/print/orders/${orderId}/production-steps`).then(r => r.data),
  addProductionStep: (orderId: string, body: any) =>
    api.post(`/print/orders/${orderId}/production-steps`, body).then(r => r.data),
  completeProductionStep: (stepId: string) =>
    api.post(`/print/production-steps/${stepId}/complete`).then(r => r.data),

  // Delivery
  deliverOrder: (orderId: string, body: any) =>
    api.post(`/print/orders/${orderId}/delivery`, body).then(r => r.data),
}
