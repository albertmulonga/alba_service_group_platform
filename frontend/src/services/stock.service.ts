import { api } from './api'

export const stockService = {
  // Products
  getProducts: (filters?: { categoryId?: string; supplierId?: string; search?: string; lowStock?: boolean }) =>
    api.get('/stock/products', { params: filters }).then(r => r.data),
  getProduct: (id: string) =>
    api.get(`/stock/products/${id}`).then(r => r.data),
  createProduct: (body: any) =>
    api.post('/stock/products', body).then(r => r.data),
  updateProduct: (id: string, body: any) =>
    api.put(`/stock/products/${id}`, body).then(r => r.data),
  deleteProduct: (id: string) =>
    api.delete(`/stock/products/${id}`),
  adjustStock: (productId: string, newQuantity: number, reason: string) =>
    api.post('/stock/adjust', { productId, newQuantity, reason }).then(r => r.data),

  // Categories
  getCategories: () =>
    api.get('/stock/categories').then(r => r.data),
  createCategory: (body: any) =>
    api.post('/stock/categories', body).then(r => r.data),
  updateCategory: (id: string, body: any) =>
    api.put(`/stock/categories/${id}`, body).then(r => r.data),
  deleteCategory: (id: string) =>
    api.delete(`/stock/categories/${id}`),

  // Suppliers
  getSuppliers: () =>
    api.get('/stock/suppliers').then(r => r.data),
  createSupplier: (body: any) =>
    api.post('/stock/suppliers', body).then(r => r.data),
  updateSupplier: (id: string, body: any) =>
    api.put(`/stock/suppliers/${id}`, body).then(r => r.data),
  deleteSupplier: (id: string) =>
    api.delete(`/stock/suppliers/${id}`),

  // Stock movements
  getMovements: (filters?: { productId?: string; type?: string; startDate?: string; endDate?: string }) =>
    api.get('/stock/stock-movements', { params: filters }).then(r => r.data),
  createMovement: (body: any) =>
    api.post('/stock/stock-movements', body).then(r => r.data),

  // Alerts
  getAlerts: (includeResolved = false) =>
    api.get('/stock/alerts', { params: { includeResolved } }).then(r => r.data),
  resolveAlert: (id: string) =>
    api.post(`/stock/alerts/${id}/resolve`).then(r => r.data),
}
