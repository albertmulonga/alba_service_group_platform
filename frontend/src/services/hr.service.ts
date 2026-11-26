import { api } from './api'

export const hrService = {
  // Employees (via /hr/employees)
  getEmployees: (filters?: { page?: number; limit?: number; status?: string; departmentId?: string }) =>
    api.get('/hr/employees', { params: { limit: 200, ...filters } }).then(r => r.data),
  getEmployee: (id: string) =>
    api.get(`/hr/employees/${id}`).then(r => r.data),
  createEmployee: (body: any) =>
    api.post('/hr/employees', body).then(r => r.data),
  updateEmployee: (id: string, body: any) =>
    api.put(`/hr/employees/${id}`, body).then(r => r.data),
  deleteEmployee: (id: string) =>
    api.delete(`/hr/employees/${id}`),

  // Contracts
  getContracts: (employeeId: string) =>
    api.get(`/hr/employees/${employeeId}/contracts`).then(r => r.data),
  createContract: (employeeId: string, body: any) =>
    api.post(`/hr/employees/${employeeId}/contracts`, body).then(r => r.data),
  updateContract: (employeeId: string, id: string, body: any) =>
    api.put(`/hr/employees/${employeeId}/contracts/${id}`, body).then(r => r.data),

  // Attendance
  getAttendance: (employeeId: string, filters?: { month?: number; year?: number }) =>
    api.get(`/hr/employees/${employeeId}/attendance`, { params: { limit: 100, ...filters } }).then(r => r.data),
  createAttendance: (employeeId: string, body: any) =>
    api.post(`/hr/employees/${employeeId}/attendance`, body).then(r => r.data),

  // Leaves
  getLeaves: (filters?: { status?: string; employeeId?: string; page?: number; limit?: number }) =>
    api.get('/hr/leaves', { params: { limit: 100, ...filters } }).then(r => r.data),
  createLeave: (body: any) =>
    api.post('/hr/leaves', body).then(r => r.data),
  approveLeave: (id: string) =>
    api.post(`/hr/leaves/${id}/approve`).then(r => r.data),
  rejectLeave: (id: string, notes?: string) =>
    api.post(`/hr/leaves/${id}/reject`, { notes }).then(r => r.data),
  deleteLeave: (id: string) =>
    api.delete(`/hr/leaves/${id}`),

  // Salaries
  getSalaries: (filters?: { employeeId?: string; month?: number; year?: number; page?: number; limit?: number }) =>
    api.get('/hr/salaries', { params: { limit: 200, ...filters } }).then(r => r.data),
  getMySalaries: (filters?: { month?: number; year?: number }) =>
    api.get('/hr/salaries/my', { params: filters }).then(r => r.data),
  createSalary: (body: any) =>
    api.post('/hr/salaries', body).then(r => r.data),
  updateSalary: (id: string, body: any) =>
    api.put(`/hr/salaries/${id}`, body).then(r => r.data),
  paySalary: (id: string, body?: any) =>
    api.post(`/hr/salaries/${id}/pay`, body).then(r => r.data),
  confirmSalary: (id: string) =>
    api.post(`/hr/salaries/${id}/confirm`).then(r => r.data),
  deleteSalary: (id: string) =>
    api.delete(`/hr/salaries/${id}`),
}
