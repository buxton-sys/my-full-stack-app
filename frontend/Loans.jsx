import React, { useEffect, useState } from "react";
import { getLoans, requestLoan, repayLoan, getLoan, applyInterest, applyPenalty } from "../api";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [newLoan, setNewLoan] = useState({ memberId: "", amount: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState("all");
  const [showLoanDetails, setShowLoanDetails] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLoans();
      const payload = (res && res.data) ? res.data : [];
      setLoans(Array.isArray(payload) ? payload : []);
    } catch (e) {
      console.error('fetchLoans failed', e);
      setLoans([]);
      setError('Failed to load loans data 💸');
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleLoan = async (loanId) => {
    try {
      const res = await getLoan(loanId);
      setSelectedLoan(res.data);
      setShowLoanDetails(true);
    } catch (e) {
      setError('Failed to fetch loan details 😔');
    }
  };

  const handleRequest = async () => {
    if (!newLoan.memberId || !newLoan.amount || !newLoan.reason) {
      setError('Please fill all fields! 📝');
      return;
    }

    try {
      await requestLoan(newLoan);
      setNewLoan({ memberId: "", amount: "", reason: "" });
      setSuccess('Loan request submitted! 📨');
      setTimeout(() => setSuccess(''), 3000);
      fetchLoans();
    } catch (e) {
      setError('Failed to submit loan request 😔');
    }
  };

  const handleRepay = async (loanId, amount) => {
    try {
      await repayLoan(loanId, amount);
      setSuccess('Payment processed successfully! ✅');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
    } catch (e) {
      console.error('repay failed', e);
      setError('Payment failed 😔');
    }
  };

  const handleApplyInterest = async () => {
    try {
      await applyInterest();
      setSuccess('10% interest applied to all active loans! 📈');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
    } catch (e) {
      setError('Failed to apply interest 😔');
    }
  };

  const handleApplyPenalty = async () => {
    try {
      await applyPenalty();
      setSuccess('Ksh 50 penalty applied to overdue loans! ⚠️');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
    } catch (e) {
      setError('Failed to apply penalties 😔');
    }
  };

  const handleApprove = async (loanId) => {
    try {
      await approveLoan(loanId);
      setSuccess('Loan approved! 👍');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
    } catch (e) {
      setError('Approval failed 😔');
    }
  };

  const handleReject = async (loanId) => {
    try {
      await rejectLoan(loanId);
      setSuccess('Loan rejected! 👎');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
    } catch (e) {
      setError('Rejection failed 😔');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === "all") return true;
    return loan.status === filter;
  });

  const stats = {
    total: loans.length,
    pending: loans.filter(l => l.status === "pending").length,
    approved: loans.filter(l => l.status === "approved").length,
    rejected: loans.filter(l => l.status === "rejected").length,
    totalAmount: loans.reduce((sum, l) => sum + Number(l.amount || 0), 0),
    overdue: loans.filter(l => l.isOverdue).length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "text-green-600 bg-green-100";
      case "rejected": return "text-red-600 bg-red-100";
      case "pending": return "text-yellow-600 bg-yellow-100";
      case "overdue": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Loan Management
          </h1>
          <p className="text-gray-600">Manage loan requests, repayments, and automated processes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Loans</div>
          </div>
          <div className="bg-yellow-50 rounded-2xl p-4 shadow-lg border border-yellow-200 text-center">
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 shadow-lg border border-green-200 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 shadow-lg border border-red-200 text-center">
            <div className="text-2xl mb-1">❌</div>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-red-600">Rejected</div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 shadow-lg border border-orange-200 text-center">
            <div className="text-2xl mb-1">⚠️</div>
            <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
            <div className="text-sm text-orange-600">Overdue</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 shadow-lg border border-blue-200 text-center">
            <div className="text-2xl mb-1">💵</div>
            <div className="text-2xl font-bold text-blue-600">Ksh {stats.totalAmount.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Total Amount</div>
          </div>
        </div>

        {/* Automated Actions Card */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-6 shadow-xl border border-orange-200 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Automated Loan Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleApplyInterest}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
            >
              <span>📈</span> Apply 10% Interest to All Active Loans
            </button>
            <button 
              onClick={handleApplyPenalty}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2"
            >
              <span>⚠️</span> Apply Ksh 50 Weekly Penalty (Overdue)
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            success 
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Request Loan Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📥</span> Request New Loan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Member ID</label>
              <input 
                type="text" 
                placeholder="Enter member ID 👤" 
                value={newLoan.memberId}
                onChange={e => setNewLoan({...newLoan, memberId: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Amount</label>
              <input 
                type="number" 
                placeholder="Loan amount 💰" 
                value={newLoan.amount}
                onChange={e => setNewLoan({...newLoan, amount: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Reason</label>
              <input 
                type="text" 
                placeholder="Loan purpose 📝" 
                value={newLoan.reason}
                onChange={e => setNewLoan({...newLoan, reason: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            <button 
              onClick={handleRequest}
              disabled={loading}
              className="md:col-span-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25"
            >
              {loading ? "Submitting..." : "Submit Loan Request 🚀"}
            </button>
          </div>
        </div>

        {/* Loans Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📋</span> Loan Applications
            </h3>
            
            <div className="flex gap-4 items-center">
              {/* Filter */}
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Loans</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading loans...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-700">Member</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Reason</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.length > 0 ? (
                    filteredLoans.map((loan, idx) => (
                      <tr key={loan.id ?? idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">#{loan.memberId}</div>
                          <button 
                            onClick={() => fetchSingleLoan(loan.id)}
                            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                          >
                            View Details 👁️
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-purple-600">Ksh {loan.amount}</div>
                          {loan.interest && (
                            <div className="text-xs text-gray-500">+{loan.interest} interest</div>
                          )}
                          {loan.penalty && (
                            <div className="text-xs text-red-500">+{loan.penalty} penalty</div>
                          )}
                        </td>
                        <td className="p-4 text-gray-600">{loan.reason}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(loan.status)}`}>
                            {loan.status}
                            {loan.isOverdue && " ⚠️"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 flex-wrap">
                            {loan.status === "pending" && (
                              <>
                                <button 
                                  onClick={() => handleApprove(loan.id)}
                                  className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors"
                                >
                                  Approve ✅
                                </button>
                                <button 
                                  onClick={() => handleReject(loan.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition-colors"
                                >
                                  Reject ❌
                                </button>
                              </>
                            )}
                            {loan.status === "approved" && (
                              <button 
                                onClick={() => handleRepay(loan.id, loan.amount)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                              >
                                Repay 💳
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">📭</div>
                        <p>No loans found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Loan Details Modal */}
        {showLoanDetails && selectedLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Loan Details</h3>
                <button 
                  onClick={() => setShowLoanDetails(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member ID:</span>
                  <span className="font-semibold">#{selectedLoan.memberId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-purple-600">Ksh {selectedLoan.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest:</span>
                  <span className="text-green-600">{selectedLoan.interest || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Penalty:</span>
                  <span className="text-red-600">{selectedLoan.penalty || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLoan.status)}`}>
                    {selectedLoan.status}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <span className="text-gray-600">Reason:</span>
                  <p className="text-gray-800 mt-1">{selectedLoan.reason}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}