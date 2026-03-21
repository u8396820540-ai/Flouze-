import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updatePrefs: (data) => api.put('/auth/preferences', data),
};

export const incomeAPI = {
  getAll: (month) => api.get('/income', { params: { month } }),
  create: (data) => api.post('/income', data),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
  reorder: (items) => api.post('/income/reorder', { items }),
};

export const fixedAPI = {
  getAll: (month) => api.get('/fixed', { params: { month } }),
  create: (data) => api.post('/fixed', data),
  update: (id, data) => api.put(`/fixed/${id}`, data),
  delete: (id) => api.delete(`/fixed/${id}`),
  reorder: (items) => api.post('/fixed/reorder', { items }),
  togglePaid: (id) => api.patch(`/fixed/${id}/toggle-paid`, {}),
  addItem: (id, label, amount) => api.post(`/fixed/${id}/items`, { label, amount }),
  deleteItem: (itemId) => api.delete(`/fixed/items/${itemId}`),
};

export const savingsAPI = {
  getAll: (month) => api.get('/savings', { params: { month } }),
  create: (data) => api.post('/savings', data),
  update: (id, data) => api.put(`/savings/${id}`, data),
  addAmount: (id, amount) => api.patch(`/savings/${id}/add`, { amount }),
  delete: (id) => api.delete(`/savings/${id}`),
  reorder: (items) => api.post('/savings/reorder', { items }),
};

export const variableAPI = {
  getAll: (month) => api.get('/variable', { params: { month } }),
  create: (data) => api.post('/variable', data),
  update: (id, data) => api.put(`/variable/${id}`, data),
  delete: (id) => api.delete(`/variable/${id}`),
  reorder: (items) => api.post('/variable/reorder', { items }),
  history: () => api.get('/variable/history'),
};

export const variableBudgetsAPI = {
  getAll: (month) => api.get('/variable-budgets', { params: { month } }),
  create: (data) => api.post('/variable-budgets', data),
  update: (id, data) => api.put(`/variable-budgets/${id}`, data),
  delete: (id) => api.delete(`/variable-budgets/${id}`),
  reorder: (items) => api.post('/variable-budgets/reorder', { items }),
};

export const categoriesAPI = {
  getAll: (type) => api.get('/categories', { params: { type } }),
  create: (data) => api.post('/categories', data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const copyMonthAPI = {
  copy: (fromMonth, toMonth) => api.post('/copy-month', { fromMonth, toMonth }),
};

export default api;
