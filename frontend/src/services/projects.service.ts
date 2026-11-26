import { api } from './api'
export const projectsService = {
  getProjects: (filters?: any) => api.get('/projects', { params: filters }).then(r => r.data),
  getProject: (id: string) => api.get(`/projects/${id}`).then(r => r.data),
  createProject: (body: any) => api.post('/projects', body).then(r => r.data),
  updateProject: (id: string, body: any) => api.put(`/projects/${id}`, body).then(r => r.data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  getTasks: (projectId?: string) => api.get('/projects/tasks', { params: projectId ? { projectId } : {} }).then(r => r.data),
  createTask: (body: any) => api.post('/projects/tasks', body).then(r => r.data),
  updateTask: (id: string, body: any) => api.put(`/projects/tasks/${id}`, body).then(r => r.data),
  getTickets: (filters?: any) => api.get('/projects/tickets', { params: filters }).then(r => r.data),
  createTicket: (body: any) => api.post('/projects/tickets', body).then(r => r.data),
  updateTicket: (id: string, body: any) => api.put(`/projects/tickets/${id}`, body).then(r => r.data),
}
