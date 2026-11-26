import { api } from './api'
export const secretariatService = {
  getServices: () => api.get('/secretariat/services').then(r => r.data),
  createService: (body: any) => api.post('/secretariat/services', body).then(r => r.data),
  updateService: (id: string, body: any) => api.put(`/secretariat/services/${id}`, body).then(r => r.data),
  deleteService: (id: string) => api.delete(`/secretariat/services/${id}`),
  getOrders: (filters?: any) => api.get('/secretariat/orders', { params: filters }).then(r => r.data),
  createOrder: (body: any) => api.post('/secretariat/orders', body).then(r => r.data),
  updateOrder: (id: string, body: any) => api.put(`/secretariat/orders/${id}`, body).then(r => r.data),
  deleteOrder: (id: string) => api.delete(`/secretariat/orders/${id}`),
  updateOrderStatus: (id: string, status: string) => api.put(`/secretariat/orders/${id}/status`, { status }).then(r => r.data),
}
