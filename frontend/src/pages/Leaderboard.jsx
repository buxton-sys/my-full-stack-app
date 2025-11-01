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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 font-sans">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          🏆 Leaderboard
        </h1>
        <p className="text-gray-500 mt-2">Track top performers in your community</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <div>
              <strong>Error:</strong> {error}
              <div className="text-sm mt-1">
                Make sure your backend is running on port 3001
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">💰 Top Savers</h2>
          <p className="text-gray-500 text-sm mt-1">
            Members with highest savings contributions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="text-left p-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left p-4 font-semibold text-gray-700">Member</th>
                <th className="text-left p-4 font-semibold text-gray-700">Role</th>
                <th className="text-right p-4 font-semibold text-gray-700">Total Savings</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((member, index) => (
                <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{member.name}</div>
                    <div className="text-sm text-gray-500">ID: {member.id}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.role === 'Treasurer' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'Organizer' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="font-bold text-lg text-green-600">
                      Ksh {(member.total_savings || 0).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
  Real data loaded from backend
</div>
    </div>

      {/* Test Backend Button */}
      <div className="text-center mt-6">
        <button
          onClick={fetchLeaders}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
        >
          🔄 Retry Backend Connection
        </button>
      </div>
    </div>
  );
}