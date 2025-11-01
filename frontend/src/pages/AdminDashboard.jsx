import React, { useEffect, useState } from "react";
import { 
  getMembers, 
  getTotalSavings, 
  getLoansWithMembers, 
  getFinesWithMembers, 
  getLeaderboard,
  getGroupProgress,
  getAutomationStatus, 
  getAutoActivities,
  getPendingTransactions,
  approveLoan,
  rejectLoan,
  approveSaving,
  rejectSaving,
  triggerDaily,
  triggerWeekly,
  triggerMorningPrompts,
  triggerEveningPrompts
} from "../api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    totalFines: 0,
    goal: 100000,
    leaderboardCount: 0,
    progress: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [automationActivities, setAutomationActivities] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [automationLoading, setAutomationLoading] = useState(false);
  const [apiErrors, setApiErrors] = useState([]);

  useEffect(() => {
    fetchAdminData();
    fetchAutomationData();
    fetchPendingApprovals();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchAdminData();
      fetchAutomationData();
      fetchPendingApprovals();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const [membersRes, savingsRes, loansRes, finesRes, leaderboardRes, groupStatsRes] = await Promise.allSettled([
        getMembers(),
        getTotalSavings(),
        getLoansWithMembers(),
        getFinesWithMembers(),
        getLeaderboard(),
        getGroupProgress()
      ]);

      // Process responses with safe fallbacks
      const totalMembers = membersRes.status === 'fulfilled' ? 
        (Array.isArray(membersRes.value?.data) ? membersRes.value.data.length : 0) : 0;
      
      const totalSavings = savingsRes.status === 'fulfilled' ? 
        (savingsRes.value?.data?.total || 0) : 0;
      
      const activeLoans = loansRes.status === 'fulfilled' ? 
        (Array.isArray(loansRes.value?.data) ? loansRes.value.data.filter(loan => loan.status === 'approved').length : 0) : 0;
      
      const totalFines = finesRes.status === 'fulfilled' ? 
        (Array.isArray(finesRes.value?.data) ? finesRes.value.data.filter(fine => fine.paid === 0).length : 0) : 0;
      
      const leaderboardCount = leaderboardRes.status === 'fulfilled' ? 
        (Array.isArray(leaderboardRes.value?.data) ? leaderboardRes.value.data.length : 0) : 0;

      const groupProgress = groupStatsRes.status === 'fulfilled' ? 
        (groupStatsRes.value?.data?.progress_percentage || 0) : 0;

      setStats({
        totalMembers,
        totalSavings,
        activeLoans,
        totalFines,
        goal: 100000,
        leaderboardCount,
        progress: groupProgress
      });

      // Get recent activity from actual data
      const recentMembers = membersRes.status === 'fulfilled' ? 
        (Array.isArray(membersRes.value?.data) ? membersRes.value.data.slice(0, 3) : []) : [];
      
      const recentActivities = recentMembers.map((member, index) => ({
        id: index + 1,
        action: "Member active",
        user: member.name,
        time: "Recently",
        type: "success"
      }));

      setRecentActivity(recentActivities);

    } catch (error) {
      console.error("Failed to load admin data:", error);
      setApiErrors(prev => [...prev, "Failed to load dashboard data"]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomationData = async () => {
    try {
      const [statusRes, activitiesRes] = await Promise.allSettled([
        getAutomationStatus(),
        getAutoActivities()
      ]);

      if (statusRes.status === 'fulfilled') {
        setAutomationStatus(statusRes.value?.data || null);
      } else {
        console.log("Automation status API not available");
      }

      if (activitiesRes.status === 'fulfilled') {
        setAutomationActivities(activitiesRes.value?.data || []);
      } else {
        console.log("Automation activities API not available");
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
      }
    } catch (error) {
      console.error("Failed to fetch pending approvals:", error);
    }
  };

  // Automation Functions
  const handleDailyTrigger = async () => {
    setAutomationLoading(true);
    try {
      await triggerDaily();
      setTimeout(() => {
        fetchAutomationData();
        setAutomationLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Daily trigger failed:", error);
      setAutomationLoading(false);
    }
  };

  const handleWeeklyTrigger = async () => {
    setAutomationLoading(true);
    try {
      await triggerWeekly();
      setTimeout(() => {
        fetchAutomationData();
        setAutomationLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Weekly trigger failed:", error);
      setAutomationLoading(false);
    }
  };

  const handleMorningPrompts = async () => {
    setAutomationLoading(true);
    try {
      await triggerMorningPrompts();
      setTimeout(() => {
        fetchAutomationData();
        setAutomationLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Morning prompts failed:", error);
      setAutomationLoading(false);
    }
  };

  const handleEveningPrompts = async () => {
    setAutomationLoading(true);
    try {
      await triggerEveningPrompts();
      setTimeout(() => {
        fetchAutomationData();
        setAutomationLoading(false);
      }, 2000);
    } catch (error) {
      console.error("Evening prompts failed:", error);
      setAutomationLoading(false);
    }
  };

  // Approval Functions
  const handleApproveLoan = async (transactionId) => {
    try {
      await approveLoan(transactionId);
      fetchPendingApprovals();
      fetchAdminData();
    } catch (error) {
      console.error("Failed to approve loan:", error);
      setApiErrors(prev => [...prev, "Failed to approve loan"]);
    }
  };

  const handleRejectLoan = async (transactionId) => {
    try {
      await rejectLoan(transactionId);
      fetchPendingApprovals();
      fetchAdminData();
    } catch (error) {
      console.error("Failed to reject loan:", error);
      setApiErrors(prev => [...prev, "Failed to reject loan"]);
    }
  };

  const handleApproveSaving = async (transactionId) => {
    try {
      await approveSaving(transactionId);
      fetchPendingApprovals();
      fetchAdminData();
    } catch (error) {
      console.error("Failed to approve saving:", error);
      setApiErrors(prev => [...prev, "Failed to approve saving"]);
    }
  };

  const handleRejectSaving = async (transactionId) => {
    try {
      await rejectSaving(transactionId);
      fetchPendingApprovals();
      fetchAdminData();
    } catch (error) {
      console.error("Failed to reject saving:", error);
      setApiErrors(prev => [...prev, "Failed to reject saving"]);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/30 p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          🛡️ Admin Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Complete overview and management of Mercure system</p>
      </div>

      {/* API Errors */}
      {apiErrors.length > 0 && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-4">
          <h3 className="font-bold text-red-800 dark:text-red-400 mb-2">System Notices:</h3>
          <ul className="text-sm text-red-700 dark:text-red-300">
            {apiErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
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
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab("automation")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === "automation" 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          }`}
        >
          🤖 Automation
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
            activeTab === "approvals" 
              ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
              : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          }`}
        >
          ⏳ Approvals ({pendingApprovals.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Members */}
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

            {/* Total Savings */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Savings</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                    Ksh {stats.totalSavings.toLocaleString()}
                  </h3>
                  <p className="text-blue-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Group savings
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                  💰
                </div>
              </div>
            </div>

            {/* Active Loans */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Loans</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.activeLoans}</h3>
                  <p className="text-orange-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                    Current loans
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-xl">
                  📈
                </div>
              </div>
            </div>

            {/* Total Fines */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Fines</p>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalFines}</h3>
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Outstanding fines
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white text-xl">
                  ⚡
                </div>
              </div>
            </div>
          </div>

          {/* Progress and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Savings Goal Progress</h2>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                  {stats.progress.toFixed(1)}%
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Towards Ksh {stats.goal.toLocaleString()} goal
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
                <div
                  className={`h-4 rounded-full bg-gradient-to-r ${getProgressColor(stats.progress)} transition-all duration-1000 ease-out`}
                  style={{ width: `${stats.progress}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-lg">{stats.totalMembers}</div>
                  <div className="text-purple-500 dark:text-purple-300 text-xs">Members</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">{stats.leaderboardCount}</div>
                  <div className="text-blue-500 dark:text-blue-300 text-xs">On Leaderboard</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Recent Activity</h2>
              
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
              </div>

              <button className="w-full mt-4 text-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium py-2">
                View All Activity →
              </button>
            </div>
          </div>

          {/* Quick Actions */}
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
                onClick={() => window.location.href = '/reports'}
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
          {/* Automation Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-green-200 dark:border-green-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Daily Automation</h3>
                <span className="text-2xl">🌅</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Runs at 6:00 AM daily</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleDailyTrigger}
                  disabled={automationLoading}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  {automationLoading ? 'Running...' : 'Run Now'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Weekly Automation</h3>
                <span className="text-2xl">📅</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Runs Monday 8:00 AM</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleWeeklyTrigger}
                  disabled={automationLoading}
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
                >
                  {automationLoading ? 'Running...' : 'Run Now'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-orange-200 dark:border-orange-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Morning Prompts</h3>
                <span className="text-2xl">🌅</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">8:00 AM STK Push</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleMorningPrompts}
                  disabled={automationLoading}
                  className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                >
                  {automationLoading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-purple-200 dark:border-purple-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Evening Prompts</h3>
                <span className="text-2xl">🌙</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">8:00 PM Reminders</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleEveningPrompts}
                  disabled={automationLoading}
                  className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-purple-600 transition-colors text-sm disabled:opacity-50"
                >
                  {automationLoading ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>

          {/* Automation Activities */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">📋</span> Recent Automated Activities
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {automationActivities.length > 0 ? (
                automationActivities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getAutomationIcon(activity.type)}</span>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{activity.description}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          Member #{activity.memberId} • {new Date(activity.timestamp).toLocaleString()}
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
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">System will log activities here automatically</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <span className="text-2xl">⏳</span> Pending Approvals ({pendingApprovals.length})
            </h3>

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
        </div>
      )}
    </div>
  );
}