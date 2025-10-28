import React, { useEffect, useState } from "react";
import { getSavings, addSaving, getAfterschool, addAfterschool, payAfterschool, getTotalSavings, getFinancialSummary } from "../api";

export default function Savings() {
  const [savings, setSavings] = useState([]);
  const [total, setTotal] = useState(0);
  const [afterschool, setAfterschool] = useState([]);
  const [newSaving, setNewSaving] = useState({ memberId: "", amount: "" });
  const [newAfterSchool, setNewAfterSchool] = useState({ memberId: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("savings");

  useEffect(() => {
    fetchSavings();
    fetchAfterschool();
    fetchFinancialSummary();
  }, []);

  const fetchSavings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSavings();
      const payload = (res && res.data) ? res.data : { savings: [], total: 0 };
      setSavings(Array.isArray(payload.savings) ? payload.savings : []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      console.error('fetchSavings failed', e);
      setSavings([]);
      setTotal(0);
      setError('Failed to load savings data 💸');
    } finally {
      setLoading(false);
    }
  };

  const fetchAfterschool = async () => {
    try {
      const res = await getAfterschool();
      const payload = (res && res.data) ? res.data : [];
      setAfterschool(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error('fetchAfterschool failed', e);
      setAfterschool([]);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      const res = await getFinancialSummary();
      setFinancialSummary(res.data || {});
    } catch (e) {
      console.error('fetchFinancialSummary failed', e);
    }
  };

  const fetchTotalSavings = async () => {
    try {
      const res = await getTotalSavings();
      setTotal(res.data?.total || 0);
    } catch (e) {
      console.error('fetchTotalSavings failed', e);
    }
  };

  const handleAddSaving = async () => {
    if (!newSaving.memberId || !newSaving.amount) {
      setError('Please fill both fields! 📝');
      return;
    }
    
    if (Number(newSaving.amount) <= 0) {
      setError('Please enter a valid amount! 💰');
      return;
    }
    
    try {
      await addSaving(newSaving);
      setNewSaving({ memberId: "", amount: "" });
      setSuccess('Savings added successfully! 💰');
      setTimeout(() => setSuccess(''), 3000);
      await fetchSavings();
      await fetchFinancialSummary();
    } catch (e) {
      setError('Failed to add savings 😔');
    }
  };

  const handleAddAfterSchool = async () => {
    if (!newAfterSchool.memberId || !newAfterSchool.amount) {
      setError('Please fill both fields! 📝');
      return;
    }
    
    if (Number(newAfterSchool.amount) <= 0) {
      setError('Please enter a valid amount! 💰');
      return;
    }
    
    try {
      await addAfterschool(newAfterSchool);
      setNewAfterSchool({ memberId: "", amount: "" });
      setSuccess('After-school contribution added successfully! 🎓');
      setTimeout(() => setSuccess(''), 3000);
      await fetchAfterschool();
      await fetchFinancialSummary();
    } catch (e) {
      setError('Failed to add after-school contribution 😔');
    }
  };

  const handlePayAfterschool = async (id, amount) => {
    try {
      await payAfterschool(id);
      setSuccess('Payment marked as completed! ✅');
      setTimeout(() => setSuccess(''), 3000);
      await fetchAfterschool();
      await fetchFinancialSummary();
    } catch (e) {
      setError('Payment update failed 😔');
    }
  };

  // Calculate stats
  const stats = {
    totalSavings: total,
    totalAfterSchool: afterschool.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    pendingAfterSchool: afterschool.filter(a => !a.paid).length,
    totalAfterSchoolAmount: afterschool.filter(a => !a.paid).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Finance Dashboard
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage savings and after-school payments</p>
        </div>

        {/* Financial Summary */}
        {financialSummary && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-4 sm:p-6 text-white shadow-xl mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📊</span> Financial Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">Ksh {financialSummary.totalSavings?.toLocaleString() || '0'}</div>
                <div className="text-xs sm:text-sm text-blue-100">Total Savings</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">Ksh {financialSummary.totalAfterSchool?.toLocaleString() || '0'}</div>
                <div className="text-xs sm:text-sm text-blue-100">After-school Fund</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">Ksh {financialSummary.pendingAfterSchool?.toLocaleString() || '0'}</div>
                <div className="text-xs sm:text-sm text-blue-100">Pending Payments</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">Ksh {financialSummary.grandTotal?.toLocaleString() || '0'}</div>
                <div className="text-xs sm:text-sm text-blue-100">Grand Total</div>
              </div>
            </div>
          </div>
        )}

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

        {/* Tab Navigation */}
        <div className="flex bg-white/50 rounded-2xl p-1 mb-6 sm:mb-8 shadow-lg border border-white/60">
          <button
            onClick={() => setActiveTab("savings")}
            className={`flex-1 py-2 sm:py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "savings" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            💰 Regular Savings
          </button>
          <button
            onClick={() => setActiveTab("afterschool")}
            className={`flex-1 py-2 sm:py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "afterschool" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🎓 After-school
          </button>
        </div>

        {/* Savings Tab */}
        {activeTab === "savings" && (
          <>
            {/* Add Savings Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">💸</span> Add New Savings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Member ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter member ID 👤" 
                    value={newSaving.memberId}
                    onChange={e => setNewSaving({...newSaving, memberId: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Amount (Ksh)</label>
                  <input 
                    type="number" 
                    placeholder="Amount 💰" 
                    value={newSaving.amount}
                    onChange={e => setNewSaving({...newSaving, amount: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button 
                  onClick={handleAddSaving}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 text-sm sm:text-base"
                >
                  {loading ? "Adding..." : "Add Saving 🚀"}
                </button>
              </div>
            </div>

            {/* Savings Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Total Savings Card */}
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl p-4 sm:p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold">Total Savings</h3>
                  <span className="text-xl sm:text-2xl">🏦</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-4">Ksh {stats.totalSavings.toLocaleString()}</p>
                
                <div className="bg-white/20 rounded-2xl p-3 sm:p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <span>📊</span> Recent Transactions
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savings.length > 0 ? (
                      savings.slice(0, 5).map((s, idx) => (
                        <div key={s.id || idx} className="flex justify-between items-center bg-white/10 rounded-xl p-2 sm:p-3">
                          <span className="font-medium text-xs sm:text-sm">Member {s.memberId}</span>
                          <span className="font-bold text-xs sm:text-sm">Ksh {s.amount}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/70 text-center py-2 text-sm">No savings yet 📭</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📈</span> Savings Overview
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-2xl border border-green-200">
                    <span className="text-green-700 font-semibold text-sm sm:text-base">Total Members Saved</span>
                    <span className="text-green-700 font-bold text-sm sm:text-base">{new Set(savings.map(s => s.memberId)).size}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <span className="text-blue-700 font-semibold text-sm sm:text-base">Total Transactions</span>
                    <span className="text-blue-700 font-bold text-sm sm:text-base">{savings.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-2xl border border-purple-200">
                    <span className="text-purple-700 font-semibold text-sm sm:text-base">Average Saving</span>
                    <span className="text-purple-700 font-bold text-sm sm:text-base">
                      Ksh {savings.length > 0 ? Math.round(stats.totalSavings / savings.length).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* After-school Tab */}
        {activeTab === "afterschool" && (
          <>
            {/* Add After-school Contribution */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">🎓</span> Add After-school Contribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Member ID</label>
                  <input 
                    type="text" 
                    placeholder="Enter member ID 👤" 
                    value={newAfterSchool.memberId}
                    onChange={e => setNewAfterSchool({...newAfterSchool, memberId: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Amount (Ksh)</label>
                  <input 
                    type="number" 
                    placeholder="Amount 💰" 
                    value={newAfterSchool.amount}
                    onChange={e => setNewAfterSchool({...newAfterSchool, amount: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button 
                  onClick={handleAddAfterSchool}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25 text-sm sm:text-base"
                >
                  {loading ? "Adding..." : "Add Contribution 🚀"}
                </button>
              </div>
            </div>

            {/* After-school Payments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* After-school Stats */}
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl p-4 sm:p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold">After-school Fund</h3>
                  <span className="text-xl sm:text-2xl">🎓</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-4">Ksh {stats.totalAfterSchool.toLocaleString()}</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/20 rounded-xl p-3">
                    <span className="text-cyan-100 text-sm sm:text-base">Pending Payments</span>
                    <span className="font-bold text-sm sm:text-base">{stats.pendingAfterSchool}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/20 rounded-xl p-3">
                    <span className="text-cyan-100 text-sm sm:text-base">Pending Amount</span>
                    <span className="font-bold text-sm sm:text-base">Ksh {stats.totalAfterSchoolAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* After-school Payments List */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📋</span> Pending Payments
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {afterschool.filter(a => !a.paid).length > 0 ? (
                    afterschool.filter(a => !a.paid).map((a) => (
                      <div key={a.id} className="flex justify-between items-center bg-gray-50 rounded-2xl p-3 sm:p-4 border border-gray-200 hover:border-blue-300 transition-all duration-300">
                        <div>
                          <span className="font-semibold text-gray-800 text-sm sm:text-base">Member {a.memberId}</span>
                          <p className="text-base sm:text-lg font-bold text-blue-600">Ksh {a.amount}</p>
                          {a.createdAt && (
                            <p className="text-xs text-gray-500">
                              Added: {new Date(a.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePayAfterschool(a.id, a.amount)}
                          className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-xs sm:text-sm"
                        >
                          Mark Paid ✅
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">🎉</span>
                      <p className="text-sm sm:text-base">No pending payments</p>
                      <p className="text-xs text-gray-400 mt-1">All after-school payments are completed!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}