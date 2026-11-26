import { api } from './api'

export const usersService = {
  getAll: (filters?: Record<string, any>) =>
    api.get('/users', { params: filters }).then(r => r.data),

  getOne: (id: string) =>
    api.get(`/users/${id}`).then(r => r.data),

  create: (body: any) =>
    api.post('/users', body).then(r => r.data),

  update: (id: string, body: any) =>
    api.put(`/users/${id}`, body).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/users/${id}`),

  getRoles: () =>
    api.get('/users/roles').then(r => r.data),

  assignRole: (id: string, roleId: string) =>
    api.post(`/users/${id}/roles`, { roleId }).then(r => r.data),

  toggleStatus: (id: string) =>
    api.post(`/users/${id}/toggle-status`).then(r => r.data),

  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }).then(r => r.data),
}
