import axios from "axios";

const BASE_URL = 'https://mercure-group.onrender.com';

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
export const login = (credentials) => {
  return api.post("/api/login", credentials);
};

export const forgotPassword = (email) => {
  return api.post("/api/forgot-password", { email });
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

export const getSavingsWithMembers = () => {
  return api.get("/api/savings-with-members");
};

export const getTotalSavingsWithMembers = () => {
  return api.get("/api/total-savings-with-members");
};

export const addSaving = (savingData) => {
  return api.post("/api/add-saving", savingData);
};

export const getTotalSavings = () => {
  return api.get("/api/get-total-savings");
};

// AFTERSCHOOL endpoints
export const getAfterschoolWithMembers = () => {
  return api.get('/api/afterschool-with-members');
};

export const payAfterschool = (data) => {
  return api.post("/api/afterschool/pay", data);
};

export const addAfterschool = (data) => {
  return api.post('/api/add-afterschool', data);
};

export const updateAfterschool = (data) => {
  return api.put('/api/update-afterschool', data);
};

export const deleteAfterschool = (data) => {
  return api.delete('/api/delete-afterschool', { data });
};

export const getTotalAfterschoolWithMembers = () => {
  return api.get('/api/total-afterschool-with-members');
};

export const getAfterschoolStats = () => {
  return api.get('/api/afterschool-stats');
};

export const getAfterschool = () => {
  return api.get('/api/afterschool');
};

export const getFinancialSummary = () => {
  return api.get('/api/financial/summary');
};

export const getFinancialSummaryWithMembers = () => {
  return api.get('/api/financial-summary-with-members');
};

export const updateSaving = (savingId, savingData) => {
  return api.put(`/api/savings/${savingId}`, savingData);
};

export const deleteSaving = (savingId) => {
  return api.delete(`/api/savings/${savingId}`);
};

// LOANS endpoints
export const getLoans = () => {
  return api.get("/api/get-loans");
};

export const getLoansWithMembers = () => {
  return api.get("/api/loans-with-members");
};

export const requestLoan = (loanData) => {
  return api.post("/api/request-loan", loanData);
};

export const requestLoanPending = (loanData) => {
  return api.post("/api/request-loan-pending", loanData);
};

export const repayLoan = (loanId, amount) => {
  return api.post(`/api/loans/${loanId}/repay`, { payment_amount: amount });
};

export const approveLoan = (loanId) => {
  return api.put(`/api/loans/${loanId}/approve`);
};

export const rejectLoan = (loanId, reason) => {
  return api.put(`/api/loans/${loanId}/reject`, { reason });
};

export const getTotalLoans = () => {
  return api.get("/api/loans/total");
};

export const getPendingLoansCount = () => {
  return api.get("/api/loans/pending/count");
};

export const getActiveLoansCount = () => {
  return api.get("/api/loans/active/count");
};

export const getCompletedLoansCount = () => {
  return api.get("/api/loans/completed/count");
};

export const getRejectedLoansCount = () => {
  return api.get("/api/loans/rejected/count");
};

export const getLoanStats = () => {
  return api.get("/api/loans/stats");
};

export const getLoan = (loanId) => {
  return api.get(`/api/loans/${loanId}`);
};

export const repayLoanPending = (repaymentData) => {
  return api.post("/api/repay-loan-pending", repaymentData);
};

export const getLoanRepayments = (loanId) => {
  return api.get(`/api/loans/${loanId}/repayments`);
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

export const getFinesWithMembers = () => {
  return api.get("/api/fines-with-members");
};

export const flagInactive = () => {
  return api.put("/api/fines/flag-inactive");
};

export const addFine = (fineData) => {
  return api.post("/api/add-fine", fineData);
};

export const payFine = (fineId, amount) => {
  return api.post(`/api/fines/${fineId}/pay`, { amount });
};

export const payFinePending = (paymentData) => {
  return api.post("/api/pay-fine-pending", paymentData);
};

export const markFinePaid = (fineId) => {
  return api.put(`/api/fines/${fineId}/pay`);
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

export const getRecentMembers = () => {
  return api.get("/api/members/recent");
};

export const getPendingLoans = () => {
  return api.get("/api/loans/pending");
};

export const getGroupProgress = () => {
  return api.get("/api/group-progress");
};

export const getGroupStats = () => {
  return api.get("/api/group-stats");
};

export const getMembersDropdown = () => {
  return api.get("/api/members-dropdown");
};

// PENDING TRANSACTIONS endpoints
export const getPendingTransactions = () => {
  return api.get("/api/pending-transactions");
};

export const addPendingTransaction = (transactionData) => {
  return api.post("/api/pending-transactions", transactionData);
};

export const approveTransaction = (transactionId) => {
  return api.put(`/api/pending-transactions/${transactionId}/approve`);
};

export const rejectTransaction = (transactionId, reason) => {
  return api.put(`/api/pending-transactions/${transactionId}/reject`, { reason });
};

// USER DATA endpoints
export const getUserData = (memberCode) => {
  return api.get(`/api/user/${memberCode}/data`);
};

// UTILITIES
export const checkAuth = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

export const getUserRole = () => {
  return localStorage.getItem('role');
};

export const register = (userData) => {
  return api.post("/api/register", userData);
};

// Saving Approval Functions
export const approveSaving = async (transactionId) => {
  try {
    const response = await api.put(`/api/savings/approve/${transactionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const rejectSaving = async (transactionId) => {
  try {
    const response = await api.put(`/api/savings/reject/${transactionId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// AUTOMATION ENDPOINTS - CORRECTED AND COMPLETE
export const getAutomationMembers = () => {
  return api.get("/api/automation/members");
};

export const sendManualPrompt = (data) => {
  return api.post("/api/automation/send-manual-prompt", data);
};

export const triggerMorningPrompts = () => {
  return api.post("/api/automation/trigger-morning-prompts");
};

export const triggerEveningPrompts = () => {
  return api.post("/api/automation/trigger-evening-prompts");
};

export const getAutomationStatus = () => {
  return api.get("/api/automation/status");
};

// Additional automation functions (if needed)
export const getAutoActivities = async () => {
  try {
    const response = await api.get('/api/automation/activities');
    return response;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const triggerDaily = async () => {
  try {
    const response = await api.post('/api/automation/daily');
    return response;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const triggerWeekly = async () => {
  try {
    const response = await api.post('/api/automation/weekly');
    return response;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default api;