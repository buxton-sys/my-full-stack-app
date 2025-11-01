import React, { useEffect, useState } from "react";
import { getLeaderboard } from "../api";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('savers');

  useEffect(() => {
    console.log("🔄 Leaderboard component mounted");
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    setLoading(true);
    setError('');
    try {
      console.log("📡 Making API call to backend...");
      const res = await getLeaderboard();
      console.log("✅ API Response:", res);
      console.log("📊 API Data:", res.data);
      
      // SAFELY handle the response
      let leadersData = [];
      
      if (Array.isArray(res?.data)) {
        leadersData = res.data;
      } else {
        console.warn("⚠️ Unexpected API response format:", res?.data);
        leadersData = [];
      }
      
      console.log("🎯 Final leaders data:", leadersData);
      setLeaders(leadersData);
    } catch (err) {
      console.error("❌ Leaderboard fetch error:", err);
      setError('Failed to load leaderboard: ' + (err.message || 'Check backend connection'));
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900/20 font-['Inter'] transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Track top performers in your community
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-6 py-4 rounded-2xl mb-6 transition-colors duration-300">
            <div className="flex items-center">
              <span className="mr-3 text-xl">⚠️</span>
              <div>
                <strong className="font-semibold">Error:</strong> {error}
                <div className="text-sm mt-1 text-red-600 dark:text-red-400">
                  Make sure your backend is running properly
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Content */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
          {/* Header Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">💰 Top Savers</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Members with highest savings contributions
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-medium">
                  {leaders.length} Members
                </span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/80 dark:to-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Rank</th>
                  <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Member</th>
                  <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Role</th>
                  <th className="text-right p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Total Savings</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading leaderboard...</p>
                      </div>
                    </td>
                  </tr>
                ) : leaders.length > 0 ? (
                  leaders.map((member, index) => (
                    <tr 
                      key={member.id || member._id || index} 
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-200 group"
                    >
                      <td className="p-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm transition-transform duration-300 group-hover:scale-110 ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-500/25' :
                          index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-lg shadow-gray-500/25' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/25' :
                          'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                          {member.name || 'Unknown Member'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ID: {member.member_code || member.id || 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-2 rounded-full text-sm font-medium border ${
                          member.role === 'Treasurer' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700' :
                          member.role === 'Chairperson' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700' :
                          member.role === 'Organizer' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700' :
                          member.role === 'Secretary' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700' :
                          'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600'
                        }`}>
                          {member.role || 'Member'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-xl text-green-600 dark:text-green-400">
                          Ksh {(member.total_savings || member.balance || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Total Contributions
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-5xl mb-4">📊</div>
                        <p className="text-lg font-medium mb-2">No leaderboard data available</p>
                        <p className="text-sm">Start saving to appear on the leaderboard!</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 text-center">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <div className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">Last updated:</span> {new Date().toLocaleDateString()}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Real data loaded from backend • {leaders.length} records
              </div>
            </div>
          </div>
        </div>

        {/* Retry Button */}
        <div className="text-center mt-8">
          <button
            onClick={fetchLeaders}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg shadow-purple-500/25 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Refreshing...
              </span>
            ) : (
              "🔄 Refresh Leaderboard"
            )}
          </button>
        </div>

        {/* Stats Summary */}
        {leaders.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-center transition-all duration-300 hover:shadow-xl">
              <div className="text-3xl mb-2">🥇</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {leaders[0]?.name || 'N/A'}
              </div>
              <div className="text-green-600 dark:text-green-400 font-semibold text-lg mt-1">
                Ksh {(leaders[0]?.total_savings || 0).toLocaleString()}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">Top Saver</div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-center transition-all duration-300 hover:shadow-xl">
              <div className="text-3xl mb-2">📈</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {leaders.length}
              </div>
              <div className="text-purple-600 dark:text-purple-400 font-semibold text-lg mt-1">
                Active Members
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">On Leaderboard</div>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-center transition-all duration-300 hover:shadow-xl">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Ksh {leaders.reduce((sum, member) => sum + (member.total_savings || 0), 0).toLocaleString()}
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold text-lg mt-1">
                Total Savings
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm mt-2">Combined</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}