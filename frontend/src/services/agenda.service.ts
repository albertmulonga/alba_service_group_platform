import { api } from './api'
export const agendaService = {
  getEvents: (filters?: { startDate?: string; endDate?: string; type?: string }) =>
    api.get('/agenda/events', { params: filters }).then(r => r.data),
  createEvent: (body: any) => api.post('/agenda/events', body).then(r => r.data),
  updateEvent: (id: string, body: any) => api.put(`/agenda/events/${id}`, body).then(r => r.data),
  deleteEvent: (id: string) => api.delete(`/agenda/events/${id}`),
}
