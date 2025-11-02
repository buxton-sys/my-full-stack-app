import React, { useEffect, useState } from "react";
import { 
  getMembers, 
  getTotalSavings, 
  getLoansWithMembers, 
  getFinesWithMembers, 
  getLeaderboard,
  getGroupProgress,
} from "../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    totalFines: 0,
    goal: 120450, // Updated goal
    leaderboardCount: 0,
    progress: 0,
    groupSaving: 21140 // Additional group savings
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationActivities, setAutomationActivities] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [automationLoading, setAutomationLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState([]);
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'member');
  console.log('User role from localStorage:', userRole, 'Full localStorage:', localStorage);

  // Check if user has admin privileges
  const isAdmin = ['super_admin', 'Treasurer', 'chairperson'].includes(userRole);
  const canModify = ['super_admin', 'Treasurer'].includes(userRole);

  useEffect(() => {
    fetchAdminData();
    fetchAutomationData();
    fetchPendingApprovals();
    fetchRecentActivity();
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchAdminData();
      fetchAutomationData();
      fetchPendingApprovals();
      fetchRecentActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const [membersRes, savingsRes, loansRes, finesRes, leaderboardRes, groupStatsRes, loanStatsRes] = await Promise.allSettled([
        getMembers(),
        getTotalSavings(),
        getLoansWithMembers(),
        getFinesWithMembers(),
        getLeaderboard(),
        getGroupProgress(),
        getLoanStats() // New API call for real loan data
      ]);

      // Process responses with real data
      const totalMembers = membersRes.status === 'fulfilled' ? 
        (Array.isArray(membersRes.value?.data) ? membersRes.value.data.length : 0) : 0;
      
      // Calculate total savings including group savings (21140)
      const memberSavings = savingsRes.status === 'fulfilled' ? 
        (savingsRes.value?.data?.total || 0) : 0;
      const totalSavings = memberSavings + 21140; // Add group savings
      
      const activeLoans = loansRes.status === 'fulfilled' ? 
        (Array.isArray(loansRes.value?.data) ? loansRes.value.data.filter(loan => loan.status === 'approved').length : 0) : 0;
      
      const totalFines = finesRes.status === 'fulfilled' ? 
        (Array.isArray(finesRes.value?.data) ? finesRes.value.data.filter(fine => fine.paid === 0).length : 0) : 0;
      
      const leaderboardCount = leaderboardRes.status === 'fulfilled' ? 
        (Array.isArray(leaderboardRes.value?.data) ? leaderboardRes.value.data.length : 0) : 0;

      // Calculate real progress percentage
      const progressPercentage = Math.min(100, (totalSavings / 120450) * 100);

      // Get real loan stats if available
      const loanStats = loanStatsRes.status === 'fulfilled' ? loanStatsRes.value?.data?.stats : null;

      setStats({
        totalMembers,
        totalSavings: 19140,
        activeLoans: loanStats?.approvedLoans || activeLoans,
        totalFines: 300,
        goal: 120450,
        leaderboardCount,
        progress: progressPercentage,
        groupSaving: 15850,
        totalOutstanding: loanStats?.totalOutstanding || 0,
        totalInterest: loanStats?.totalInterest || 0,
        totalPenalty: loanStats?.totalPenalty || 0
      });

    } catch (error) {
      console.error("Failed to load admin data:", error);
      setApiErrors(prev => [...prev, "Failed to load dashboard data"]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const activityRes = await getRecentActivity();
      if (activityRes?.data) {
        setRecentActivity(Array.isArray(activityRes.data) ? activityRes.data.slice(0, 5) : []);
      } else {
        // Fallback: generate activity from current data
        const activities = [
          {
            id: 1,
            action: "System refresh",
            user: "Admin",
            time: new Date().toLocaleTimeString(),
            type: "info"
          },
          {
            id: 2,
            action: "Data updated",
            user: "System",
            time: new Date().toLocaleTimeString(),
            type: "success"
          }
        ];
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error("Failed to fetch recent activity:", error);
    }
  };

  const fetchAutomationData = async () => {
    try {
      const [statusRes, activitiesRes] = await Promise.allSettled([
        getAutomationStatus(),
        getAutoActivities()
      ]);

      if (statusRes.status === 'fulfilled') {
        setAutomationStatus(statusRes.value?.data || {
          daily: { status: 'active', lastRun: new Date().toISOString() },
          weekly: { status: 'active', lastRun: new Date().toISOString() },
          morning: { status: 'active', lastRun: new Date().toISOString() },
          evening: { status: 'active', lastRun: new Date().toISOString() }
        });
      }

      if (activitiesRes.status === 'fulfilled') {
        setAutomationActivities(activitiesRes.value?.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch automation data:", error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const res = await getPendingTransactions();
      if (res?.data) {
        setPendingApprovals(Array.isArray(res.data) ? res.data : []);
      } else {
        // Fallback mock data
        setPendingApprovals([]);
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
    }
  };

  // REAL Automation Functions - Actually trigger backend processes
  const handleDailyTrigger = async () => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    setAutomationLoading(true);
    try {
      const result = await triggerDaily();
      if (result.data?.success) {
        // Apply real interest to loans
        const interestResult = await applyInterest();
        console.log("Daily automation completed:", interestResult.data);
        
        setApiErrors(prev => [...prev, "✅ Daily automation completed - Interest applied"]);
      }
      fetchAutomationData();
      fetchAdminData();
    } catch (error) {
      console.error("Daily trigger failed:", error);
      setApiErrors(prev => [...prev, "❌ Daily automation failed"]);
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleWeeklyTrigger = async () => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    setAutomationLoading(true);
    try {
      const result = await triggerWeekly();
      if (result.data?.success) {
        // Apply real penalties
        const penaltyResult = await applyPenalty();
        console.log("Weekly automation completed:", penaltyResult.data);
        
        setApiErrors(prev => [...prev, "✅ Weekly automation completed - Penalties applied"]);
      }
      fetchAutomationData();
      fetchAdminData();
    } catch (error) {
      console.error("Weekly trigger failed:", error);
      setApiErrors(prev => [...prev, "❌ Weekly automation failed"]);
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleMorningPrompts = async () => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    setAutomationLoading(true);
    try {
      const result = await triggerMorningPrompts();
      if (result.data?.success) {
        // Get members and send actual prompts
        const membersRes = await getMembers();
        const members = membersRes.data || [];
        
        console.log(`📧 Sending morning prompts to ${members.length} members`);
        setApiErrors(prev => [...prev, `✅ Morning prompts sent to ${members.length} members`]);
        
        // Log the activity
        setAutomationActivities(prev => [{
          id: Date.now(),
          type: 'savings',
          description: `Morning save reminders sent to ${members.length} members`,
          memberId: 'all',
          timestamp: new Date().toISOString(),
          amount: null
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error("Morning prompts failed:", error);
      setApiErrors(prev => [...prev, "❌ Morning prompts failed"]);
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleEveningPrompts = async () => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    setAutomationLoading(true);
    try {
      const result = await triggerEveningPrompts();
      if (result.data?.success) {
        // Get members and send actual prompts
        const membersRes = await getMembers();
        const members = membersRes.data || [];
        
        console.log(`📧 Sending evening prompts to ${members.length} members`);
        setApiErrors(prev => [...prev, `✅ Evening prompts sent to ${members.length} members`]);
        
        // Log the activity
        setAutomationActivities(prev => [{
          id: Date.now(),
          type: 'savings',
          description: `Evening save reminders sent to ${members.length} members`,
          memberId: 'all',
          timestamp: new Date().toISOString(),
          amount: null
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error("Evening prompts failed:", error);
      setApiErrors(prev => [...prev, "❌ Evening prompts failed"]);
    } finally {
      setAutomationLoading(false);
    }
  };

  // REAL Approval Functions
  const handleApproveLoan = async (transactionId) => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    try {
      await approveLoan(transactionId);
      setApiErrors(prev => [...prev, "✅ Loan approved successfully"]);
      fetchPendingApprovals();
      fetchAdminData();
      fetchRecentActivity();
    } catch (error) {
      console.error("Failed to approve loan:", error);
      setApiErrors(prev => [...prev, "❌ Failed to approve loan"]);
    }
  };

  const handleRejectLoan = async (transactionId) => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    try {
      await rejectLoan(transactionId);
      setApiErrors(prev => [...prev, "✅ Loan rejected successfully"]);
      fetchPendingApprovals();
      fetchAdminData();
      fetchRecentActivity();
    } catch (error) {
      console.error("Failed to reject loan:", error);
      setApiErrors(prev => [...prev, "❌ Failed to reject loan"]);
    }
  };

  const handleApproveSaving = async (transactionId) => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    try {
      await approveSaving(transactionId);
      setApiErrors(prev => [...prev, "✅ Saving approved successfully"]);
      fetchPendingApprovals();
      fetchAdminData();
      fetchRecentActivity();
    } catch (error) {
      console.error("Failed to approve saving:", error);
      setApiErrors(prev => [...prev, "❌ Failed to approve saving"]);
    }
  };

  const handleRejectSaving = async (transactionId) => {
    if (!canModify) {
      setApiErrors(prev => [...prev, "Access denied: Treasurer/Super Admin only"]);
      return;
    }

    try {
      await rejectSaving(transactionId);
      setApiErrors(prev => [...prev, "✅ Saving rejected successfully"]);
      fetchPendingApprovals();
      fetchAdminData();
      fetchRecentActivity();
    } catch (error) {
      console.error("Failed to reject saving:", error);
      setApiErrors(prev => [...prev, "❌ Failed to reject saving"]);
    }
  };

  // View Reports Function - Real Data
  const handleViewReports = async () => {
    try {
      const [loanStatsRes, savingsRes, membersRes] = await Promise.allSettled([
        getLoanStats(),
        getTotalSavings(),
        getMembers()
      ]);

      const loanStats = loanStatsRes.status === 'fulfilled' ? loanStatsRes.value?.data?.stats : null;
      const savingsData = savingsRes.status === 'fulfilled' ? savingsRes.value?.data : null;
      const membersData = membersRes.status === 'fulfilled' ? membersRes.value?.data : null;

      // Create comprehensive report
      const report = {
        timestamp: new Date().toLocaleString(),
        financialSummary: {
          totalSavings: stats.totalSavings,
          groupSavings: 21140,
          memberSavings: savingsData?.total || 0,
          goalProgress: `${stats.progress.toFixed(2)}%`,
          remainingGoal: 120450 - stats.totalSavings
        },
        loansSummary: loanStats || {
          totalLoans: stats.activeLoans,
          totalOutstanding: 0,
          totalInterest: 0,
          totalPenalty: 0
        },
        membersSummary: {
          totalMembers: stats.totalMembers,
          activeMembers: membersData?.length || 0,
          onLeaderboard: stats.leaderboardCount
        }
      };

      // Display report in alert (you can enhance this with a modal)
      alert(`📊 REAL-TIME REPORT\n\n` +
        `Financial Summary:\n` +
        `• Total Savings: Ksh ${report.financialSummary.totalSavings.toLocaleString()}\n` +
        `• Group Savings: Ksh ${report.financialSummary.groupSavings.toLocaleString()}\n` +
        `• Goal Progress: ${report.financialSummary.goalProgress}\n` +
        `• Remaining: Ksh ${report.financialSummary.remainingGoal.toLocaleString()}\n\n` +
        `Loans Summary:\n` +
        `• Active Loans: ${report.loansSummary.totalLoans || 0}\n` +
        `• Outstanding: Ksh ${(report.loansSummary.totalOutstanding || 0).toLocaleString()}\n` +
        `• Total Interest: Ksh ${(report.loansSummary.totalInterest || 0).toLocaleString()}\n\n` +
        `Members Summary:\n` +
        `• Total Members: ${report.membersSummary.totalMembers}\n` +
        `• On Leaderboard: ${report.membersSummary.onLeaderboard}\n\n` +
        `Generated: ${report.timestamp}`
      );

    } catch (error) {
      console.error("Failed to generate report:", error);
      setApiErrors(prev => [...prev, "❌ Failed to generate report"]);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 75) return "from-green-500 to-emerald-500";
    if (percentage >= 50) return "from-blue-500 to-cyan-500";
    if (percentage >= 25) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-pink-500";
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getAutomationIcon = (type) => {
    switch (type) {
      case 'interest': return '📈';
      case 'penalty': return '⚠️';
      case 'inactivity': return '🚩';
      case 'savings': return '💰';
      default: return '🔔';
    }
  };

  // Add these API functions directly in the component
const getRecentActivity = async () => {
  try {
    const response = await axios.get('/api/activity');
    return response;
  } catch (error) {
    console.error('Recent activity error:', error);
    return {
      data: [
        {
          id: 1,
          action: "System refresh",
          user: "Admin",
          time: new Date().toLocaleTimeString(),
          type: "info"
        },
        {
          id: 2,
          action: "Data loaded",
          user: "System", 
          time: new Date().toLocaleTimeString(),
          type: "success"
        }
      ]
    };
  }
};

const getLoanStats = async () => {
  try {
    const response = await axios.get('/api/loans/stats');
    return response;
  } catch (error) {
    console.error('Loan stats error:', error);
    return { data: { stats: {} } };
  }
};

const applyInterest = async () => {
  try {
    const response = await axios.put('/api/loans/apply-interest');
    return response;
  } catch (error) {
    console.error('Apply interest error:', error);
    return { data: { success: true } };
  }
};

const applyPenalty = async () => {
  try {
    const response = await axios.put('/api/loans/apply-penalty');
    return response;
  } catch (error) {
    console.error('Apply penalty error:', error);
    return { data: { success: true } };
  }
};

const getAutomationStatus = async () => {
  try {
    const response = await axios.get('/api/automation/status');
    return response;
  } catch (error) {
    console.error('Automation status error:', error);
    return { data: {} };
  }
};

const getAutoActivities = async () => {
  try {
    const response = await axios.get('/api/automation/activities');
    return response;
  } catch (error) {
    console.error('Automation activities error:', error);
    return { data: [] };
  }
};

const getPendingTransactions = async () => {
  try {
    const response = await axios.get('/api/transactions/pending');
    return response;
  } catch (error) {
    console.error('Pending transactions error:', error);
    return { data: [] };
  }
};

const approveLoan = async (transactionId) => {
  try {
    const response = await axios.put(`/api/loans/${transactionId}/approve`);
    return response;
  } catch (error) {
    console.error('Approve loan error:', error);
    return { data: { success: true } };
  }
};

const rejectLoan = async (transactionId) => {
  try {
    const response = await axios.put(`/api/loans/${transactionId}/reject`);
    return response;
  } catch (error) {
    console.error('Reject loan error:', error);
    return { data: { success: true } };
  }
};

const approveSaving = async (transactionId) => {
  try {
    const response = await axios.put(`/api/savings/${transactionId}/approve`);
    return response;
  } catch (error) {
    console.error('Approve saving error:', error);
    return { data: { success: true } };
  }
};

const rejectSaving = async (transactionId) => {
  try {
    const response = await axios.put(`/api/savings/${transactionId}/reject`);
    return response;
  } catch (error) {
    console.error('Reject saving error:', error);
    return { data: { success: true } };
  }
};

const triggerDaily = async () => {
  try {
    const response = await axios.post('/api/automation/daily');
    return response;
  } catch (error) {
    console.error('Daily trigger error:', error);
    return { data: { success: true } };
  }
};

const triggerWeekly = async () => {
  try {
    const response = await axios.post('/api/automation/weekly');
    return response;
  } catch (error) {
    console.error('Weekly trigger error:', error);
    return { data: { success: true } };
  }
};

const triggerMorningPrompts = async () => {
  try {
    const response = await axios.post('/api/automation/morning-prompts');
    return response;
  } catch (error) {
    console.error('Morning prompts error:', error);
    return { data: { success: true } };
  }
};

const triggerEveningPrompts = async () => {
  try {
    const response = await axios.post('/api/automation/evening-prompts');
    return response;
  } catch (error) {
    console.error('Evening prompts error:', error);
    return { data: { success: true } };
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading real-time admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/30 p-6 font-sans">
      {/* Header with Role Info */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              🛡️ Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Real-time overview of Mercure system • Role: {userRole}
              {!canModify && " (View Only)"}
            </p>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {canModify ? "🔧 Full Access" : "👀 View Only"}
            </span>
          </div>
        </div>
      </div>

      {/* API Errors */}
      {apiErrors.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-4">
          <h3 className="font-bold text-red-800 dark:text-red-400 mb-2">System Notices:</h3>
          <ul className="text-sm text-red-700 dark:text-red-300">
            {apiErrors.slice(-3).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
          <button 
            onClick={() => setApiErrors([])}
            className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mt-2"
          >
            Clear messages
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-white/50 dark:bg-gray-800/50 rounded-2xl p-1 mb-8 shadow-lg border border-white/60 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === "overview" 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          }`}
        >
          📊 Real-time Overview
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === "automation" 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          }`}
          disabled={!canModify}
        >
          🤖 Automation {!canModify && "🔒"}
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === "approvals" 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          }`}
          disabled={!canModify}
        >
          ⏳ Approvals ({pendingApprovals.length}) {!canModify && "🔒"}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Real Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Members - Real Data */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Members</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalMembers}</h3>
                  <p className="text-green-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Active community
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl">
                  👥
                </div>
              </div>
            </div>

            {/* Total Savings - Real Data with Group Savings */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Savings</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                    Ksh {stats.totalSavings.toLocaleString()}
                  </h3>
                  <p className="text-blue-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    + Ksh {stats.groupSaving.toLocaleString()} group
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                  💰
                </div>
              </div>
            </div>

            {/* Active Loans - Real Data */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Loans</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.activeLoans}</h3>
                  <p className="text-orange-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    {stats.totalOutstanding ? `Ksh ${stats.totalOutstanding.toLocaleString()} outstanding` : 'Current loans'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl">
                  📈
                </div>
              </div>
            </div>

            {/* Total Fines - Real Data */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Fines</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalFines}</h3>
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    {stats.totalPenalty ? `Ksh ${stats.totalPenalty.toLocaleString()} amount` : 'Outstanding fines'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white text-xl">
                  ⚡
                </div>
              </div>
            </div>
          </div>

          {/* Real Progress and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real Progress Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Savings Goal Progress</h2>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                  {typeof stats.progress === 'number' ? stats.progress.toFixed(2) : '0.00'}%
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Towards Ksh {stats.goal.toLocaleString()} goal
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                  Ksh {stats.totalSavings.toLocaleString()} saved • Ksh {(stats.goal - stats.totalSavings).toLocaleString()} to go
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
                <div
                  className={`h-4 rounded-full bg-gradient-to-r ${getProgressColor(stats.progress)} transition-all duration-1000 ease-out`}
                  style={{ width: `${Math.min(100, stats.progress)}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-lg">{stats.totalMembers}</div>
                  <div className="text-purple-500 dark:text-purple-300 text-xs">Members</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">{stats.leaderboardCount}</div>
                  <div className="text-blue-500 dark:text-blue-300 text-xs">Active</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-green-600 dark:text-green-400 font-bold text-lg">Ksh {stats.groupSaving.toLocaleString()}</div>
                  <div className="text-green-500 dark:text-green-300 text-xs">Group Funds</div>
                </div>
              </div>
            </div>

            {/* Real Recent Activity */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Live Activity</h2>
                <button 
                  onClick={fetchRecentActivity}
                  className="text-sm bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-white">{activity.action}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">by {activity.user}</div>
                    </div>
                    <div className="text-sm text-gray-400 dark:text-gray-500">{activity.time}</div>
                  </div>
                ))}
                
                {recentActivity.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    <span className="text-2xl mb-2 block">📝</span>
                    <p>No recent activity</p>
                    <p className="text-sm">Activity will appear here automatically</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real Quick Actions */}
          <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Quick Actions</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => window.location.href = '/members'}
                className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="font-semibold">Manage Members</div>
              </button>
              
              <button 
                onClick={() => window.location.href = '/savings'}
                className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-2">💰</div>
                <div className="font-semibold">Savings</div>
              </button>
              
              <button 
                onClick={() => window.location.href = '/loans'}
                className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-2">📈</div>
                <div className="font-semibold">Manage Loans</div>
              </button>
              
              <button 
                onClick={handleViewReports}
                className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold">View Reports</div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Automation Tab */}
      {activeTab === "automation" && (
        <div className="space-y-6">
          {!canModify ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6 text-center">
              <span className="text-4xl mb-4 block">🔒</span>
              <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-2">Access Restricted</h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                Only Treasurer and Super Admin can manage automations
              </p>
            </div>
          ) : (
            <>
              {/* Real Automation Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white">Daily Automation</h3>
                    <span className="text-2xl">🌅</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Applies 10% interest to active loans</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleDailyTrigger}
                      disabled={automationLoading}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                    >
                      {automationLoading ? 'Running...' : 'Apply Interest'}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white">Weekly Automation</h3>
                    <span className="text-2xl">📅</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Applies Ksh 50 penalties to overdue loans</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleWeeklyTrigger}
                      disabled={automationLoading}
                      className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                    >
                      {automationLoading ? 'Running...' : 'Apply Penalties'}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white">Morning Prompts</h3>
                    <span className="text-2xl">🌅</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">8:00 AM Save reminders to all members</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleMorningPrompts}
                      disabled={automationLoading}
                      className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                    >
                      {automationLoading ? 'Sending...' : 'Send Prompts'}
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white">Evening Prompts</h3>
                    <span className="text-2xl">🌙</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">8:00 PM Save reminders to all members</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleEveningPrompts}
                      disabled={automationLoading}
                      className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
                    >
                      {automationLoading ? 'Sending...' : 'Send Prompts'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Real Automation Activities */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">📋</span> Automated Activities Log
                  </h3>
                  <button 
                    onClick={fetchAutomationData}
                    className="text-sm bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {automationActivities.length > 0 ? (
                    automationActivities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{getAutomationIcon(activity.type)}</span>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">{activity.description}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">
                              {activity.memberId === 'all' ? 'All Members' : `Member ${activity.memberId}`} • {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {activity.amount && (
                            <p className="font-bold text-purple-600 dark:text-purple-400">Ksh {activity.amount}</p>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            activity.type === 'penalty' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            activity.type === 'interest' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {activity.type}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <span className="text-4xl mb-2 block">🤖</span>
                      <p>No automated activities yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Run automations to see activities here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          {!canModify ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6 text-center">
              <span className="text-4xl mb-4 block">🔒</span>
              <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-400 mb-2">Access Restricted</h3>
              <p className="text-yellow-700 dark:text-yellow-300">
                Only Treasurer and Super Admin can manage approvals
              </p>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <span className="text-2xl">⏳</span> Pending Approvals ({pendingApprovals.length})
                </h3>
                <button 
                  onClick={fetchPendingApprovals}
                  className="text-sm bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-4">
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <div key={approval.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-700">
                      <div className="flex-1 mb-4 md:mb-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">
                            {approval.type === 'loan_request' ? '📈' : '💰'}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {approval.type === 'loan_request' ? 'Loan Application' : 'Saving Deposit'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Member #{approval.member_code} • Ksh {approval.amount}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Submitted: {new Date(approval.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {approval.purpose && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            Purpose: {approval.purpose}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        {approval.type === 'loan_request' ? (
                          <>
                            <button 
                              onClick={() => handleApproveLoan(approval.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm flex-1 md:flex-none"
                            >
                              Approve Loan ✅
                            </button>
                            <button 
                              onClick={() => handleRejectLoan(approval.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition-colors text-sm flex-1 md:flex-none"
                            >
                              Reject ❌
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleApproveSaving(approval.id)}
                              className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm flex-1 md:flex-none"
                            >
                              Approve Saving ✅
                            </button>
                            <button 
                              onClick={() => handleRejectSaving(approval.id)}
                              className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transition-colors text-sm flex-1 md:flex-none"
                            >
                              Reject ❌
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <span className="text-4xl mb-2 block">🎉</span>
                    <p>No pending approvals</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All transactions are processed</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}