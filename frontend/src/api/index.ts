import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' }
});

export default api;

// Product APIs
export const productApi = {
  list: (params?: Record<string, unknown>) => api.get('/products', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// Schedule Record APIs
export const scheduleRecordApi = {
  list: (params?: Record<string, unknown>) => api.get('/schedule-records', { params }),
  create: (data: Record<string, unknown>) => api.post('/schedule-records', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/schedule-records/${id}`, data),
};

// Schedule Plan APIs
export const schedulePlanApi = {
  list: (params?: Record<string, unknown>) => api.get('/schedule-plans', { params }),
  create: (data: Record<string, unknown>) => api.post('/schedule-plans', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/schedule-plans/${id}`, data),
  delete: (id: number) => api.delete(`/schedule-plans/${id}`),
};

// Import APIs
export const importApi = {
  upload: (file: File, operator?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (operator) formData.append('operator', operator);
    return api.post('/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  confirm: (data: Record<string, unknown>) => api.post('/import/confirm', data),
};

// Dashboard APIs
export const dashboardApi = {
  stats: (params?: Record<string, unknown>) => api.get('/dashboard/stats', { params }),
  weeklyCalendar: (params?: Record<string, unknown>) => api.get('/dashboard/weekly-calendar', { params }),
  repushSuggestions: (params?: Record<string, unknown>) => api.get('/dashboard/repush-suggestions', { params }),
};
