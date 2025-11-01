import React, { useEffect, useState } from "react";
import { 
  getMembers, 
  getSavingsWithMembers, 
  getLoansWithMembers, 
  getDashboardStats, 
  getUserRole,
  getLeaderboard,
  getGroupProgress,
  getFinancialSummary,
  getFinesWithMembers
} from "../api";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Component for circular savings progress
function SavingsProgress({ total, target }) {
  const percentage = Math.round((total / target) * 100);
  return (
    <div style={{ width: 120, height: 120 }}>
      <CircularProgressbar
        value={percentage}
        text={`${percentage}%`}
        styles={buildStyles({
          textColor: "#2575fc",
          pathColor: "#6a11cb",
          trailColor: "#eee",
        })}
      />
      <p className="text-center mt-2 text-sm text-gray-700 dark:text-gray-300">
        Saved: {total.toLocaleString()} / {target.toLocaleString()}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loans, setLoans] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [target] = useState(60000);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    progress: 0
  });
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [userSpecificData, setUserSpecificData] = useState({});
  const [groupProgress, setGroupProgress] = useState(null);

  useEffect(() => {
    const role = getUserRole();
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(role);
    setCurrentUser(user);
    
    if (role === 'treasurer' || role === 'admin') {
      fetchDashboardData();
    } else {
      fetchUserSpecificData(user);
    }
  }, []);

  // Admin/Treasurer sees all data - FIXED
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [membersRes, savingsRes, loansRes, leaderboardRes, groupProgressRes, finesRes] = await Promise.allSettled([
        getMembers(),
        getFinancialSummary(),
        getLoansWithMembers(),
        getLeaderboard(),
        getGroupProgress(),
        getFinesWithMembers()
      ]);

      // Handle members response - FIXED
      let membersData = [];
      if (membersRes.status === 'fulfilled') {
        membersData = Array.isArray(membersRes.value?.data) ? membersRes.value.data : membersRes.value || [];
      }
      setMembers(membersData);

      // Handle savings response - FIXED
      let savingsAmount = 0;
      if (savingsRes.status === 'fulfilled') {
        savingsAmount = savingsRes.value.data.total_savings;
      }
      setTotalSavings(savingsAmount);

      // Handle loans response - FIXED
      let loansData = [];
      if (loansRes.status === 'fulfilled') {
        loansData = Array.isArray(loansRes.value?.data) ? loansRes.value.data : loansRes.value || [];
      }
      // Count only approved/pending loans, not rejected
      const activeLoansCount = loansData.filter(loan => 
        loan.status === 'approved' || loan.status === 'pending'
      ).length;
      setLoans(loansData);

      // Handle leaderboard response - FIXED
      let leaderboardData = [];
      if (leaderboardRes.status === 'fulfilled') {
        leaderboardData = leaderboardRes.value.data;
      }
      setLeaderboard(leaderboardData);

      // Handle group progress - FIXED
      if (groupProgressRes.status === 'fulfilled') {
        setGroupProgress(groupProgressRes.value?.data || groupProgressRes.value);
      }

      let finesData = [];
      if (finesRes.status === 'fulfilled') {
        finesData = finesRes.value.data;
      }

      // Calculate progress
      const progress = Math.min((savingsAmount / target) * 100, 100);

      setStats({
        totalMembers: membersData.length,
        totalSavings: savingsAmount,
        activeLoans: activeLoansCount,
        progress: progress
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Regular members see only their data - FIXED
  const fetchUserSpecificData = async (user) => {
    try {
      setLoading(true);
      
      // Get current user's member data
      const membersRes = await getMembers();
      const membersData = Array.isArray(membersRes?.data) ? membersRes.data : membersRes || [];
      const currentMember = membersData.find(m => 
        m.email === user?.email || m.member_code === user?.member_code || m.username === user?.username
      );
      
      if (currentMember) {
        setUserSpecificData({
          name: currentMember.name,
          memberCode: currentMember.member_code,
          balance: currentMember.balance || 0,
          totalSavings: currentMember.total_savings || 0,
          loans: currentMember.loans || 0,
          fines: currentMember.fines || 0,
          afterschool: currentMember.afterschool || 0
        });
        
        // For members, show personal progress
        const personalTarget = 10000; // Personal target of 10,000
        const personalProgress = Math.min(((currentMember.balance || 0) / personalTarget) * 100, 100);
        
        setStats({
          totalMembers: 1, // Only themselves
          totalSavings: currentMember.balance || 0,
          activeLoans: currentMember.loans || 0,
          progress: personalProgress
        });
      } else {
        // Fallback if member not found
        setUserSpecificData({
          name: user?.name || 'Member',
          memberCode: user?.member_code || 'N/A',
          balance: 0,
          totalSavings: 0,
          loans: 0,
          fines: 0,
          afterschool: 0
        });
      }
      
    } catch (error) {
      console.error('User data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe data access - FIXED
  const safeTotalSavings = userRole === 'member' ? (userSpecificData.balance || 0) : (totalSavings || 0);
  const safeProgress = Math.min((safeTotalSavings / target) * 100, 100);
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : (leaderboard ? [leaderboard] : []);
  const safeActiveLoans = userRole === 'member' ? (userSpecificData.loans || 0) : (stats.activeLoans || 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-900/20 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
          {userRole === 'member' ? 'My Dashboard' : 'Group Dashboard'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm sm:text-base">
          {userRole === 'member' 
            ? `Welcome back, ${userSpecificData.name || 'Member'}!` 
            : 'Welcome to your Mercure management dashboard'
          }
        </p>
        
        {/* Member-specific welcome */}
        {userRole === 'member' && (
          <div className="mt-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Member Code</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">#{userSpecificData.memberCode}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 dark:text-gray-400 text-sm">Current Balance</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">Ksh {userSpecificData.balance?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Total Members Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {userRole === 'member' ? 'My Status' : 'Total Members'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {userRole === 'member' ? 'Active' : stats.totalMembers || 0}
              </h3>
              <p className="text-green-500 dark:text-green-400 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full mr-2"></span>
                {userRole === 'member' ? 'Member in good standing' : 'Active community'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-xl flex items-center justify-center text-white">
              {userRole === 'member' ? '👤' : '👥'}
            </div>
          </div>
        </div>

        {/* Total Savings Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {userRole === 'member' ? 'My Savings' : 'Total Savings'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2">
                Ksh {safeTotalSavings.toLocaleString()}
              </h3>
              <p className="text-blue-500 dark:text-blue-400 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></span>
                {userRole === 'member' ? 'Personal savings' : 'Group savings'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl flex items-center justify-center text-white">
              💰
            </div>
          </div>
        </div>

        {/* Total Loans Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {userRole === 'member' ? 'My Loans' : 'Active Loans'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {safeActiveLoans}
              </h3>
              <p className="text-orange-500 dark:text-orange-400 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full mr-2"></span>
                {userRole === 'member' ? 'Current loans' : 'Active loans'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl flex items-center justify-center text-white">
              📊
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {userRole === 'member' ? 'My Progress' : 'Savings Goal'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {safeProgress.toFixed(0)}%
              </h3>
              <p className="text-purple-500 dark:text-purple-400 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full mr-2"></span>
                {userRole === 'member' ? 'Personal target' : `Target: Ksh ${target.toLocaleString()}`}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700 rounded-xl flex items-center justify-center text-white">
              🎯
            </div>
          </div>
        </div>
      </div>

      {/* Progress and Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Savings Progress */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              {userRole === 'member' ? 'My Savings Progress' : 'Group Savings Progress'}
            </h2>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
              {safeProgress.toFixed(1)}% Complete
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            {/* Circular Progress */}
            <div className="flex-shrink-0">
              <div style={{ width: 120, height: 120 }}>
                <CircularProgressbar
                  value={safeProgress}
                  text={`${safeProgress.toFixed(0)}%`}
                  styles={buildStyles({
                    textColor: "#7c3aed",
                    pathColor: "#7c3aed",
                    trailColor: "#e5e7eb",
                    textSize: '16px',
                    pathTransitionDuration: 1,
                  })}
                />
              </div>
            </div>

            {/* Progress Details */}
            <div className="flex-1 w-full">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{userRole === 'member' ? 'My Savings' : 'Current Savings'}</span>
                    <span className="font-semibold dark:text-white">Ksh {safeTotalSavings.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${safeProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{userRole === 'member' ? 'My Target' : 'Target Goal'}</span>
                    <span className="font-semibold dark:text-white">Ksh {target.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {target - safeTotalSavings > 0 
                      ? `Ksh ${(target - safeTotalSavings).toLocaleString()} needed to reach goal`
                      : '🎉 Goal achieved!'
                    }
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="text-purple-600 dark:text-purple-400 font-bold text-base sm:text-lg">
                      {userRole === 'member' ? 'You' : stats.totalMembers || 0}
                    </div>
                    <div className="text-purple-500 dark:text-purple-300 text-xs">
                      {userRole === 'member' ? 'Member' : 'Members'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <div className="text-blue-600 dark:text-blue-400 font-bold text-base sm:text-lg">
                      {safeActiveLoans}
                    </div>
                    <div className="text-blue-500 dark:text-blue-300 text-xs">
                      {userRole === 'member' ? 'My Loans' : 'Active Loans'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard - Only show for admins */}
        {(userRole === 'treasurer' || userRole === 'admin') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Top Savers</h2>
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium">
                🏆 Leaderboard
              </span>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {safeLeaderboard.length > 0 ? (
                safeLeaderboard.slice(0, 5).map((member, index) => (
                  <div 
                    key={member.id || index} 
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white text-sm sm:text-base">
                          {member.name || `Member ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          #{member.member_code || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400 text-sm sm:text-base">
                        Ksh {(member.balance || member.total_savings || member.savings || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Savings</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-3xl sm:text-4xl mb-2">📊</div>
                  <p className="text-sm sm:text-base">No leaderboard data yet</p>
                  <p className="text-xs sm:text-sm mt-1">Start saving to appear here!</p>
                </div>
              )}
            </div>

            {safeLeaderboard.length > 5 && (
              <button className="w-full mt-4 text-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium py-2">
                View All {safeLeaderboard.length} Members →
              </button>
            )}
          </div>
        )}

        {/* Member Quick Actions */}
        {userRole === 'member' && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Quick Actions</h2>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                🚀 Actions
              </span>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/savings'}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                💰 Add Savings
              </button>
              <button 
                onClick={() => window.location.href = '/loans'}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                📈 View My Loans
              </button>
              <button 
                onClick={() => window.location.href = '/fines'}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg"
              >
                ⚡ Check Fines
              </button>
            </div>

            {/* Payment Info for Members */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 text-sm sm:text-base">💳 Payment Information</h3>
              <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <div><strong>Paybill:</strong> 522522</div>
                <div><strong>Account:</strong> 1341299678</div>
                <div><strong>Reference:</strong> Your Member Code #{userSpecificData.memberCode}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {userRole === 'member' ? 'You' : stats.totalMembers || 0}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {userRole === 'member' ? 'Member' : 'Total Members'}
          </div>
        </div>
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">Ksh {safeTotalSavings.toLocaleString()}</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {userRole === 'member' ? 'My Savings' : 'Group Savings'}
          </div>
        </div>
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
            {safeActiveLoans}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {userRole === 'member' ? 'My Loans' : 'Active Loans'}
          </div>
        </div>
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{safeProgress.toFixed(0)}%</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
            {userRole === 'member' ? 'My Progress' : 'Goal Progress'}
          </div>
        </div>
      </div>
    </div>
  );
}