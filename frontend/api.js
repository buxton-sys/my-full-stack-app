import axios from "axios";

const BASE_URL = 'https://mercure-group.onrender.com'
  

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});


// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// AUTH endpoints
export const login = (credentials) => { // The login form sends 'email' and 'password'
  return api.post("/api/login", { login: credentials.email, password: credentials.password });
};

// Replace all direct axios calls with api instance
export const getAutomationStatus = () => {
  return api.get('/api/automation/status');
};

export const triggerDaily = () => {
  return api.post('/api/automation/trigger/daily');
};

export const triggerWeekly = () => {
  return api.post('/api/automation/trigger/weekly');
};

export const getAutoActivities = () => {
  return api.get('/automation/activities');
};

// MEMBERS endpoints
export const getMembers = () => {
  return api.get("/api/members");
};

export const getPendingMembers = () => {
  return api.get("/api/members/pending");
};

export const addMember = (memberData) => {
  return api.post("/api/members", memberData);
};

export const rejectMember = (memberId) => {
  return api.put(`/api/members/${memberId}/reject`);
};

export const updateMember = (id, memberData) => {
  return api.put(`/api/members/${id}`, memberData);
};

export const deleteMember = (id) => {
  return api.delete(`/api/members/${id}`);
};

export const approveMember = (id) => {
  return api.put(`/api/members/${id}/approve`);
};

export const getMemberStats = () => {
  return api.get("/api/members/stats");
};

// SAVINGS endpoints
export const getSavings = () => {
  return api.get("/api/get-savings");
};

export const getTotalSavings = () => {
  return api.get("/api/get-total-savings");
};

export const addSaving = (savingData) => {
  return api.post("/api/add-savings", savingData);
};

// AFTERSCHOOL endpoints
export const getAfterschool = () => {
  return api.get("/api/afterschool");
};

export const payAfterschool = (data) => {
  return api.post("/api/afterschool/pay", data);
};

export const addAfterschool = (data) => {
  return api.post("/api/afterschool", data);
};

export const getTotalAfterschool = () => {
  return api.get("/api/afterschool/total");
};

export const getFinancialSummary = () => {
  return api.get("/api/financial/summary"); // Assuming this is correct
};

// LOANS endpoints
export const getLoans = () => {
  return api.get("/api/get-loans");
};

export const requestLoan = (loanData) => {
  return api.post("/api/request-loan", loanData);
};

export const repayLoan = (loanId, amount) => {
  return api.post(`/api/loans/${loanId}/repay`, { payment_amount: amount });
};

export const approveLoan = (loanId) => {
  return api.put(`/api/loans/${loanId}/approve`);
};

export const rejectLoan = (loanId) => {
  return api.put(`/api/loans/${loanId}/reject`);
};

export const getTotalLoans = () => {
  return api.get("/api/loans/total");
};

export const getPendingLoansCount = () => {
  return api.get("/api/loans/pending/count");
};

export const getActiveLoansCount = async () => {
  return await api.get("/api/loans/active/count");
};

export const getCompletedLoansCount = async () => {
  return await api.get("/api/loans/completed/count");
};

export const getRejectedLoansCount = () => {
  return api.get("/api/loans/rejected/count");
};

export const getLoanStats = () => {
  return api.get("/api/loans/stats");
};

export const getLoanById = (loanId) => {
  return api.get(`/api/loans/${loanId}`);
};

export const getLoanRepayments = async (loanId) => {
  return await api.get(`/api/loans/${loanId}/repayments`);
};

export const getLoan = (loanId) => {
  return api.get(`/api/loans/${loanId}`);
};

export const applyInterest = () => {
  return api.put("/api/loans/apply-interest");
};

export const applyPenalty = () => {
  return api.put("/api/loans/apply-penalty");
};

// FINES endpoints
export const getFines = () => {
  return api.get("/api/get-fines");
};

export const flagInactive = () => { // This seems to be a fine-related action
  return api.put("/api/fines/flag-inactive");
};

export const addFine = async (fineData) => {
  return await api.post("/api/add-fine", fineData);
};

export const payFine = async (fineId, amount) => {
  return await api.post(`/api/fines/${fineId}/pay`, { amount });
};

// ANNOUNCEMENTS endpoints
export const addAnnouncement = (announcementData) => {
  return api.post("/api/announcements", announcementData);
};

export const getAnnouncements = () => {
  return api.get("/api/announcements");
};

export const deleteAnnouncement = (id) => {
  return api.delete(`/api/announcements/${id}`);
};

// DASHBOARD & LEADERBOARD endpoints
export const getDashboardStats = () => {
  return api.get("/api/dashboard/stats");
};

export const getLeaderboard = () => {
  return api.get("/api/leaderboard/top-savers");
};

export const getAdminStats = () => {
  return api.get("/api/admin/stats");
};

export const getRecentMembers = async () => {
  return await api.get("/api/members/recent");
};

export const getPendingLoans = async () => {
  return await api.get("/api/loans/pending");
};

// UTILITIES
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getUserRole = () => {
  return localStorage.getItem('role');
};

export const register = async (userData) => {
  return await api.post("/api/register", userData);
};

// ------------------ AUTOMATION ------------------

export const triggerMorningPrompts = () => {
  return api.post("/api/automation/trigger/morning");
};

export const triggerEveningPrompts = () => {
  return api.post("/api/automation/trigger/evening");
};

export const sendManualPrompt = (data) => {
  return api.post("/api/automation/send-prompt", data);
};

export const getAutomationMembers = () => {
  return api.get("/api/automation/members");
};


export default api;

