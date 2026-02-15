import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const loanService = {
  getLoans: () => api.get('/loans'),
  getLoan: (id) => api.get(`/loans/${id}`),
  createLoan: (loan) => api.post('/loans', loan),
  updateLoanStatus: (id, status) => api.put(`/loans/${id}/status`, { status }),
};

export const borrowerService = {
  getBorrowers: () => api.get('/borrowers'),
  getBorrower: (id) => api.get(`/borrowers/${id}`),
  createBorrower: (borrower) => api.post('/borrowers', borrower),
};

export default api;
