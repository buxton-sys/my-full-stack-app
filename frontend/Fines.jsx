import React, { useEffect, useState } from "react";
import { getFines, addFine, payFine, flagInactive } from "../api";

export default function Fines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newFine, setNewFine] = useState({ memberId: "", amount: "", reason: "" });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchFines();
  }, []);

  const fetchFines = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFines();
      const rawData = (res && res.data) ? res.data : [];
      const now = new Date();

      const processed = rawData.map((f) => {
        const fineDate = new Date(f.createdAt || now);
        const daysInactive = Math.floor((now - fineDate) / (1000 * 60 * 60 * 24));
        const status = f.paid
          ? "Paid"
          : daysInactive > 90
          ? "Flagged (MIA)"
          : "Unpaid";
        return { ...f, status, daysInactive };
      });

      setFines(Array.isArray(processed) ? processed : []);
    } catch (e) {
      console.error("fetchFines failed", e);
      setFines([]);
      setError("Failed to load fines data ⚠️");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFine = async () => {
    if (!newFine.memberId || !newFine.amount || !newFine.reason) {
      setError("Please fill all fields! 📝");
      return;
    }

    if (Number(newFine.amount) <= 0) {
      setError("Please enter a valid amount! 💰");
      return;
    }

    try {
      await addFine(newFine);
      setNewFine({ memberId: "", amount: "", reason: "" });
      setSuccess("Fine added successfully! ⚡");
      setTimeout(() => setSuccess(''), 3000);
      await fetchFines();
    } catch (e) {
      console.error("addFine failed", e);
      setError("Failed to add fine 😔");
    }
  };

  const handlePayFine = async (fineId) => {
    try {
      await payFine(fineId);
      setSuccess("Fine paid successfully! ✅");
      setTimeout(() => setSuccess(''), 3000);
      await fetchFines();
    } catch (e) {
      console.error("payFine failed", e);
      setError("Payment failed 😔");
    }
  };

  const handleFlagInactive = async () => {
    try {
      await flagInactive();
      setSuccess("Inactive members flagged successfully! 🚩");
      setTimeout(() => setSuccess(''), 3000);
      await fetchFines();
    } catch (e) {
      setError("Failed to flag inactive members 😔");
    }
  };

  const filteredFines = fines.filter(fine => {
    if (filter === "all") return true;
    return fine.status.toLowerCase().includes(filter.toLowerCase());
  });

  const stats = {
    total: fines.length,
    unpaid: fines.filter(f => f.status === "Unpaid").length,
    paid: fines.filter(f => f.status === "Paid").length,
    flagged: fines.filter(f => f.status === "Flagged (MIA)").length,
    totalAmount: fines.reduce((sum, f) => sum + Number(f.amount || 0), 0),
    unpaidAmount: fines.filter(f => f.status === "Unpaid").reduce((sum, f) => sum + Number(f.amount || 0), 0),
    flaggedAmount: fines.filter(f => f.status === "Flagged (MIA)").reduce((sum, f) => sum + Number(f.amount || 0), 0)
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Paid": return "bg-green-100 text-green-800 border border-green-200";
      case "Unpaid": return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "Flagged (MIA)": return "bg-red-100 text-red-800 border border-red-200";
      default: return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-orange-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Fines & Discipline
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage member fines and compliance</p>
        </div>

        {/* Automated Action */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-4 sm:p-6 shadow-xl border border-orange-200 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">⚡</span> Automated Actions
          </h3>
          <button 
            onClick={handleFlagInactive}
            className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25 w-full sm:w-auto text-sm sm:text-base"
          >
            🚩 Flag Inactive Members (90+ Days)
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg border border-gray-200 text-center">
            <div className="text-xl sm:text-2xl mb-1">⚡</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600">Total Fines</div>
          </div>
          <div className="bg-yellow-50 rounded-2xl p-3 sm:p-4 shadow-lg border border-yellow-200 text-center">
            <div className="text-xl sm:text-2xl mb-1">💸</div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.unpaid}</div>
            <div className="text-xs sm:text-sm text-yellow-600">Unpaid</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-3 sm:p-4 shadow-lg border border-green-200 text-center">
            <div className="text-xl sm:text-2xl mb-1">✅</div>
            <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-xs sm:text-sm text-green-600">Paid</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 sm:p-4 shadow-lg border border-red-200 text-center">
            <div className="text-xl sm:text-2xl mb-1">🚩</div>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.flagged}</div>
            <div className="text-xs sm:text-sm text-red-600">Flagged</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-3 sm:p-4 shadow-lg border border-blue-200 text-center col-span-2">
            <div className="text-xl sm:text-2xl mb-1">💰</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">Ksh {stats.unpaidAmount.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-blue-600">Pending Collection</div>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl text-center font-medium transition-all duration-300 text-sm sm:text-base ${
            success 
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Add Fine Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl sm:text-2xl">➕</span> Issue New Fine
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Member ID</label>
              <input
                type="text"
                placeholder="Member ID 👤"
                value={newFine.memberId}
                onChange={(e) => setNewFine({ ...newFine, memberId: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Amount (Ksh)</label>
              <input
                type="number"
                placeholder="Fine amount 💰"
                value={newFine.amount}
                onChange={(e) => setNewFine({ ...newFine, amount: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Reason</label>
              <input
                type="text"
                placeholder="Reason for fine 📝"
                value={newFine.reason}
                onChange={(e) => setNewFine({ ...newFine, reason: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <button
              onClick={handleAddFine}
              className="md:col-span-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25 text-sm sm:text-base"
            >
              Add Fine ⚡
            </button>
          </div>
        </div>

        {/* Fines Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📋</span> All Fines
            </h3>
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl p-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-auto"
            >
              <option value="all">All Fines</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading fines...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Member ID</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Amount</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Reason</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Days</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Status</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 text-sm sm:text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.length > 0 ? (
                    filteredFines.map((fine, idx) => (
                      <tr key={fine._id ?? idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="font-semibold text-gray-800 text-sm sm:text-base">#{fine.memberId}</div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-orange-600 text-sm sm:text-base">Ksh {fine.amount}</div>
                        </td>
                        <td className="p-3 sm:p-4 text-gray-600 text-sm sm:text-base">{fine.reason}</td>
                        <td className="p-3 sm:p-4">
                          <div className={`font-medium text-sm sm:text-base ${fine.daysInactive > 90 ? 'text-red-600' : 'text-gray-600'}`}>
                            {fine.daysInactive}d
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusBadge(fine.status)}`}>
                            {fine.status}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          {fine.status !== "Paid" && (
                            <button
                              onClick={() => handlePayFine(fine._id)}
                              className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-xs sm:text-sm"
                            >
                              Pay 💳
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">🎉</div>
                        <p className="text-sm sm:text-base">No fines issued yet</p>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">Keep up the good work!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}