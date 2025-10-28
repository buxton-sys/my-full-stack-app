import { useEffect, useState } from "react";
import { getMembers, getTotalSavings, getLoans, getDashboardStats, getFines, getLeaderboard } from "../api";

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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch all admin data in parallel
      const [membersRes, savingsRes, loansRes, finesRes, leaderboardRes] = await Promise.allSettled([
        getMembers(),
        getTotalSavings(),
        getLoans(),
        getFines(),
        getLeaderboard()
      ]);

      // Process responses with safe fallbacks
      const totalMembers = membersRes.status === 'fulfilled' ? 
        (Array.isArray(membersRes.value?.data) ? membersRes.value.data.length : 0) : 0;
      
      const totalSavings = savingsRes.status === 'fulfilled' ? 
        (savingsRes.value?.data?.total_savings || savingsRes.value?.data?.total || 0) : 0;
      
      const activeLoans = loansRes.status === 'fulfilled' ? 
        (Array.isArray(loansRes.value?.data) ? loansRes.value.data.length : 0) : 0;
      
      const totalFines = finesRes.status === 'fulfilled' ? 
        (Array.isArray(finesRes.value?.data) ? finesRes.value.data.length : 0) : 0;
      
      const leaderboardCount = leaderboardRes.status === 'fulfilled' ? 
        (Array.isArray(leaderboardRes.value?.data) ? leaderboardRes.value.data.length : 0) : 0;

      const progress = Math.min((totalSavings / stats.goal) * 100, 100);

      setStats({
        totalMembers,
        totalSavings,
        activeLoans,
        totalFines,
        goal: 100000,
        leaderboardCount,
        progress
      });

      // Mock recent activity - replace with real data from your API
      setRecentActivity([
        { id: 1, action: "New member registered", user: "John Doe", time: "2 mins ago", type: "success" },
        { id: 2, action: "Loan application submitted", user: "Jane Smith", time: "5 mins ago", type: "warning" },
        { id: 3, action: "Savings deposit", user: "Mike Johnson", time: "10 mins ago", type: "success" },
        { id: 4, action: "Fine issued", user: "Sarah Wilson", time: "15 mins ago", type: "error" },
        { id: 5, action: "Announcement posted", user: "Admin", time: "20 mins ago", type: "info" }
      ]);

    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          🛡️ Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-2">Complete overview and management of Mercure system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Members */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Members</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalMembers}</h3>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Savings</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Loans</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.activeLoans}</h3>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Fines</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalFines}</h3>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Savings Goal Progress</h2>
          
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-gray-800 mb-2">{stats.progress.toFixed(1)}%</div>
            <p className="text-gray-500">Towards Ksh {stats.goal.toLocaleString()} goal</p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className={`h-4 rounded-full bg-gradient-to-r ${getProgressColor(stats.progress)} transition-all duration-1000 ease-out`}
              style={{ width: `${stats.progress}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-purple-600 font-bold text-lg">{stats.totalMembers}</div>
              <div className="text-purple-500 text-xs">Members</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-blue-600 font-bold text-lg">{stats.leaderboardCount}</div>
              <div className="text-blue-500 text-xs">On Leaderboard</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{activity.action}</div>
                  <div className="text-sm text-gray-500">by {activity.user}</div>
                </div>
                <div className="text-sm text-gray-400">{activity.time}</div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 text-center text-purple-600 hover:text-purple-700 text-sm font-medium py-2">
            View All Activity →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Actions</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-semibold">Add Member</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">💰</div>
            <div className="font-semibold">Add Savings</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">📈</div>
            <div className="font-semibold">Manage Loans</div>
          </button>
          
          <button className="p-4 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">View Reports</div>
          </button>
        </div>
      </div>
    </div>
  );
}