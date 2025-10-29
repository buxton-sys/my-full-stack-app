import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://mercure-group.onrender.com/api' 
  : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions for Members
export const getMembers = () => api.get('/members');
export const addMember = (memberData) => api.post('/members', memberData);
export const updateMember = (id, memberData) => api.put(`/members/${id}`, memberData);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const approveMember = (id) => api.post(`/members/${id}/approve`);

// API functions for Dashboard
export const getGroupStats = () => api.get('/group-stats');
export const getTotalSavings = () => api.get('/get-total-savings');
export const getSavings = () => api.get('/get-savings');
export const getLoans = () => api.get('/get-loans');
export const getFines = () => api.get('/get-fines');
export const getLeaderboard = () => api.get('/leaderboard');

export default api;
