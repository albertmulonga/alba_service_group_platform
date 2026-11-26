import { api } from './api'
export const maintenanceService = {
  getInterventions: (filters?: any) => api.get('/maintenance/interventions', { params: filters }).then(r => r.data),
  createIntervention: (body: any) => api.post('/maintenance/interventions', body).then(r => r.data),
  updateIntervention: (id: string, body: any) => api.put(`/maintenance/interventions/${id}`, body).then(r => r.data),
  deleteIntervention: (id: string) => api.delete(`/maintenance/interventions/${id}`),
  getMachines: () => api.get('/maintenance/machines').then(r => r.data),
  createMachine: (body: any) => api.post('/maintenance/machines', body).then(r => r.data),
  updateMachine: (id: string, body: any) => api.put(`/maintenance/machines/${id}`, body).then(r => r.data),
}
