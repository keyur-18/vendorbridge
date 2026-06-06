import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vb_token');
      localStorage.removeItem('vb_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getMe: () => api.get('/auth/me'),
};

// ─── Vendors ──────────────────────────────────────────────────
export const vendorsAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
  getCategories: () => api.get('/vendors/categories'),
};

// ─── RFQs ──────────────────────────────────────────────────
export const rfqsAPI = {
  getAll: (params) => api.get('/rfqs', { params }),
  getById: (id) => api.get(`/rfqs/${id}`),
  create: (data) => api.post('/rfqs', data),
  update: (id, data) => api.put(`/rfqs/${id}`, data),
  invite: (id, vendor_ids) => api.post(`/rfqs/${id}/invite`, { vendor_ids }),
  getQuotations: (rfqId) => api.get(`/rfqs/${rfqId}/quotations`),
  submitQuotation: (rfqId, data) => api.post(`/rfqs/${rfqId}/quotations`, data),
};

// ─── Quotations ────────────────────────────────────────────────
export const quotationsAPI = {
  getById: (id) => api.get(`/quotations/${id}`),
};

// ─── Approvals ────────────────────────────────────────────────
export const approvalsAPI = {
  getAll: (params) => api.get('/approvals', { params }),
  getById: (id) => api.get(`/approvals/${id}`),
  create: (data) => api.post('/approvals', data),
  act: (id, data) => api.put(`/approvals/${id}`, data),
};

// ─── Purchase Orders ───────────────────────────────────────────
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  updateStatus: (id, status) => api.put(`/purchase-orders/${id}/status`, { status }),
};

// ─── Invoices ─────────────────────────────────────────────────
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  getPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  sendEmail: (id) => api.post(`/invoices/${id}/send-email`),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
};

// ─── Reports ─────────────────────────────────────────────────
export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getVendorPerformance: () => api.get('/reports/vendor-performance'),
  getSpending: () => api.get('/reports/spending'),
  getMonthlyTrends: () => api.get('/reports/monthly-trends'),
};

// ─── Logs & Notifications ────────────────────────────────────
export const logsAPI = {
  getActivityLogs: (params) => api.get('/activity-logs', { params }),
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
