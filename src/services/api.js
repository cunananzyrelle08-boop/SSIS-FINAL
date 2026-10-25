// The Vite dev server forwards /api requests to the local Node server.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const api = {
  login: async (payload) => (await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })).user,
  me: async () => (await request('/auth/me')).user,
  logout: () => request('/auth/logout', { method: 'POST' }),
  student: async (id) => (await request(`/students/${encodeURIComponent(id)}`)).item,
  updateProfile: (id, payload) => request(`/students/${encodeURIComponent(id)}/profile`, { method: 'PUT', body: JSON.stringify(payload) }),
  students: async () => (await request('/students')).items,
  createStudent: async (payload) => (await request('/students', { method: 'POST', body: JSON.stringify(payload) })).item,
  grades: async (id) => (await request(`/students/${encodeURIComponent(id)}/grades`)).items,
  updateGrades: (id, items) => request(`/students/${encodeURIComponent(id)}/grades`, { method: 'PUT', body: JSON.stringify({ items }) }),
  enrollments: async (id) => (await request(`/students/${encodeURIComponent(id)}/enrollments`)).items,
  schedule: async (id) => (await request(`/students/${encodeURIComponent(id)}/schedule`)).items,
  finance: async (studentId) => request(`/finance${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`),
  charges: async () => (await request('/charges')).items,
  createCharge: async (payload) => (await request('/charges', { method: 'POST', body: JSON.stringify(payload) })).item,
  departments: async () => (await request('/departments')).items,
  departmentRecords: async () => (await request('/department-records')).items,
  sendRecordToDepartment: payload => request('/department-records', { method: 'POST', body: JSON.stringify(payload) }),
  retrieveDepartmentRecord: payload => request('/department-records/retrieve', { method: 'POST', body: JSON.stringify(payload) }),
  decideDepartmentRecord: (id, payload) => request(`/department-records/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addGrade: async (id, payload) => (await request(`/students/${encodeURIComponent(id)}/grades`, { method: 'POST', body: JSON.stringify(payload) })).item,
  enrollmentList: async () => (await request('/enrollments')).items,
  saveEnrollment: payload => request('/enrollments', { method: 'POST', body: JSON.stringify(payload) }),
  reports: async () => (await request('/reports')).items,
  report: name => request(`/reports/${encodeURIComponent(name)}`),
  recordPayment: async (payload) => (await request('/payments', { method: 'POST', body: JSON.stringify(payload) })).item,
  documentRequests: async () => (await request('/document-requests')).items,
  createDocumentRequest: async (payload) => (await request('/document-requests', { method: 'POST', body: JSON.stringify(payload) })).item,
  updateDocumentRequest: (id, payload) => request(`/document-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  payments: async () => (await request('/payments')).items,
  clearance: async (studentId) => (await request(`/clearance${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`)).items,
  updateClearance: (id, payload) => request(`/clearance/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  users: async () => (await request('/users')).items,
  createUser: async (payload) => (await request('/users', { method: 'POST', body: JSON.stringify(payload) })).item,
  updateUser: (id, payload) => request(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
};
