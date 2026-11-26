import { api } from './api'
export const graphicsService = {
  getProjects: (filters?: any) => api.get('/graphics/projects', { params: filters }).then(r => r.data),
  createProject: (body: any) => api.post('/graphics/projects', body).then(r => r.data),
  updateProject: (id: string, body: any) => api.put(`/graphics/projects/${id}`, body).then(r => r.data),
  deleteProject: (id: string) => api.delete(`/graphics/projects/${id}`),
}
