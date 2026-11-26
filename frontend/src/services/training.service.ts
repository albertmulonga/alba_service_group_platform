import { api } from './api'
export const trainingService = {
  getCourses: (filters?: any) => api.get('/training/courses', { params: { limit: 200, ...filters } }).then(r => r.data),
  createCourse: (body: any) => api.post('/training/courses', body).then(r => r.data),
  updateCourse: (id: string, body: any) => api.put(`/training/courses/${id}`, body).then(r => r.data),
  deleteCourse: (id: string) => api.delete(`/training/courses/${id}`),
  getSessions: (filters?: any) => api.get('/training/sessions', { params: filters }).then(r => r.data),
  createSession: (body: any) => api.post('/training/sessions', body).then(r => r.data),
  updateSession: (id: string, body: any) => api.put(`/training/sessions/${id}`, body).then(r => r.data),
}
