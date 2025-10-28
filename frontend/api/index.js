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

// API functions
export const getMembers = () => api.get('/members');
export const addMember = (memberData) => api.post('/members', memberData);
export const updateMember = (id, memberData) => api.put(`/members/${id}`, memberData);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const approveMember = (id) => api.post(`/members/${id}/approve`);

export default api;
