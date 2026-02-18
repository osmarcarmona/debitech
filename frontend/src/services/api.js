import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loanService = {
  getLoans: (params) => api.get('/loans', { params }),
  getLoan: (id) => api.get(`/loans/${id}`),
  createLoan: (loan) => api.post('/loans', loan),
  updateLoanStatus: (id, status) => api.put(`/loans/${id}/status`, { status }),
  getPayments: (id) => api.get(`/loans/${id}/payments`),
  addPayment: (id, payment) => api.post(`/loans/${id}/payments`, payment),
  updatePayment: (paymentId, payment) => api.put(`/payments/${paymentId}`, payment),
  deletePayment: (paymentId) => api.delete(`/payments/${paymentId}`),
};

export const borrowerService = {
  getBorrowers: () => api.get('/borrowers'),
  getBorrower: (id) => api.get(`/borrowers/${id}`),
  createBorrower: (borrower) => api.post('/borrowers', borrower),
};

export const reportsService = {
  getReports: (params) => api.get('/reports', { params }),
};

export default api;
