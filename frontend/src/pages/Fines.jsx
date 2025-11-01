import React, { useEffect, useState } from "react";
import { 
  getFinesWithMembers, 
  addFine, 
  payFine, 
  flagInactive, 
  getUserRole,
  payFinePending,
  getPendingTransactions,
  markFinePaid,
  approveTransaction
} from "../api";

export default function Fines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newFine, setNewFine] = useState({ memberId: "", amount: "", reason: "" });
  const [filter, setFilter] = useState("all");
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    const role = getUserRole();
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(role);
    setCurrentUser(user);
    fetchFines();
    fetchPendingPayments();
  }, []);

  const fetchFines = async () => {
  setLoading(true);
  setError('');
  try {
    const res = await getFinesWithMembers();
    const finesData = Array.isArray(res?.data) ? res.data : [];
    
    // Filter fines based on user role
    let filteredFines = finesData;
    if (userRole === 'member') {
      const userMemberCode = currentUser?.member_code;
      filteredFines = finesData.filter(fine => fine.member_code === userMemberCode);
    }

    const now = new Date();
    const processed = filteredFines.map((f) => {
      const fineDate = new Date(f.date || f.created_at || now);
      const daysInactive = Math.floor((now - fineDate) / (1000 * 60 * 60 * 24));
      const status = f.paid === 1 ? "Paid" : daysInactive > 90 ? "Flagged (MIA)" : "Unpaid";
      return { ...f, status, daysInactive };
    });

    setFines(processed);
  } catch (e) {
    console.error("fetchFines failed", e);
    setFines([]);
    setError("Failed to load fines data ⚠️");
  } finally {
    setLoading(false);
  }
};

  const fetchPendingPayments = async () => {
  try {
    if (userRole === 'admin' || userRole === 'treasurer') {
      const res = await getPendingTransactions();
      const pendingPaymentsData = Array.isArray(res?.data) ? res.data.filter(t => t.type === 'fine_payment') : [];
      setPendingPayments(pendingPaymentsData);
    }
  } catch (error) {
    console.error('fetchPendingPayments failed', error);
    setPendingPayments([]);
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
      await addFine({
  member_code: newFine.memberId,
  amount: Number(newFine.amount),
  reason: newFine.reason
});
      setNewFine({ memberId: "", amount: "", reason: "" });
      setSuccess("Fine added successfully! ⚡");
      setTimeout(() => setSuccess(''), 3000);
      await fetchFines();
    } catch (e) {
      console.error("addFine failed", e);
      setError("Failed to add fine 😔");
    }
  };

  const handlePayFine = async (fineId, amount) => {
  try {
    if (userRole === 'member') {
      // Members submit payment for approval
      await payFinePending({
        member_code: currentUser.member_code,
        fine_id: fineId,
        amount: Number(amount)
      });
      
      setSuccess('Fine payment submitted for admin approval! ⏳');
      
    } else {
      // Admins can process directly
      await markFinePaid(fineId);
      setSuccess("Fine marked as paid successfully! ✅");
    }
    
    setTimeout(() => setSuccess(''), 3000);
    await fetchFines();
    await fetchPendingPayments();
    
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

  const handleApprovePayment = async (paymentId) => {
  try {
    await approveTransaction(paymentId);
    
    setSuccess('Fine payment approved! ✅');
    setTimeout(() => setSuccess(''), 3000);
    await fetchFines();
    await fetchPendingPayments();
    
  } catch (e) {
    setError('Approval failed 😔');
  }
};

  // Filter fines based on user role and selected filter
  const filteredFines = fines.filter(fine => {
    if (filter === "all") return true;
    return fine.status.toLowerCase().includes(filter.toLowerCase());
  });

  // User-specific fines
  const userFines = userRole === 'member' 
    ? fines.filter(fine => fine.member_code === currentUser?.member_code)
    : fines;

  const stats = {
    total: userFines.length,
    unpaid: userFines.filter(f => f.status === "Unpaid").length,
    paid: userFines.filter(f => f.status === "Paid").length,
    flagged: userFines.filter(f => f.status === "Flagged (MIA)").length,
    totalAmount: userFines.reduce((sum, f) => sum + Number(f.amount || 0), 0),
    unpaidAmount: userFines.filter(f => f.status === "Unpaid").reduce((sum, f) => sum + Number(f.amount || 0), 0),
    flaggedAmount: userFines.filter(f => f.status === "Flagged (MIA)").reduce((sum, f) => sum + Number(f.amount || 0), 0)
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
            {userRole === 'member' ? 'My Fines' : 'Fines & Discipline'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            {userRole === 'member' 
              ? 'View and manage your fines' 
              : 'Manage member fines and compliance'
            }
          </p>
        </div>

        {/* Pending Payments - Only for Admins */}
        {(userRole === 'treasurer' || userRole === 'admin') && pendingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-3xl p-4 sm:p-6 shadow-xl border border-blue-200 dark:border-blue-800 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⏳</span> Pending Fine Payments ({pendingPayments.length})
            </h3>
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-100">
                      Member #{payment.member_code} - Fine #{payment.fine_id}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold">Ksh {payment.amount}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted: {new Date(payment.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleApprovePayment(payment.id)}
                    className="mt-2 sm:mt-0 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-sm"
                  >
                    Approve Payment ✅
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automated Action - Only for Admins */}
        {(userRole === 'treasurer' || userRole === 'admin') && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/50 dark:to-orange-900/50 rounded-3xl p-4 sm:p-6 shadow-xl border border-orange-200 dark:border-orange-800 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⚡</span> Automated Actions
            </h3>
            <button 
              onClick={handleFlagInactive}
              className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-red-600 hover:to-orange-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25 w-full sm:w-auto text-sm sm:text-base"
            >
              🚩 Flag Inactive Members (90+ Days)
            </button>
          </div>
        )}

        {/* Payment Info for Members */}
        {userRole === 'member' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 rounded-3xl p-4 sm:p-6 shadow-xl border border-green-200 dark:border-green-800 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💳</span> Fine Payment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200">
                <div className="font-semibold text-green-800 dark:text-green-300 mb-2">Bank Transfer</div>
                <div><strong>Paybill:</strong> 522522</div>
                <div><strong>Account:</strong> 1341299678</div>
                <div><strong>Reference:</strong> FINE-#{currentUser?.member_code}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200">
                <div className="font-semibold text-green-800 dark:text-green-300 mb-2">After Payment</div>
                <div>1. Make payment using above details</div>
                <div>2. Submit your payment here</div>
                <div>3. Wait for admin approval</div>
                <div>4. Receive confirmation email</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">⚡</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {userRole === 'member' ? 'My Fines' : 'Total Fines'}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/50 rounded-2xl p-3 sm:p-4 shadow-lg border border-yellow-200 dark:border-yellow-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">💸</div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unpaid}</div>
            <div className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">Unpaid</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/50 rounded-2xl p-3 sm:p-4 shadow-lg border border-green-200 dark:border-green-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">✅</div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.paid}</div>
            <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">Paid</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/50 rounded-2xl p-3 sm:p-4 shadow-lg border border-red-200 dark:border-red-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">🚩</div>
            <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.flagged}</div>
            <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">Flagged</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/50 rounded-2xl p-3 sm:p-4 shadow-lg border border-blue-200 dark:border-blue-700 text-center col-span-2">
            <div className="text-xl sm:text-2xl mb-1">💰</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">Ksh {stats.unpaidAmount.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
              {userRole === 'member' ? 'My Pending' : 'Pending Collection'}
            </div>
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

        {/* Add Fine Section - Only for Admins */}
        {(userRole === 'treasurer' || userRole === 'admin') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">➕</span> Issue New Fine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Member Code</label>
                <input
                  type="text"
                  placeholder="Member code 👤"
                  value={newFine.memberId}
                  onChange={(e) => setNewFine({ ...newFine, memberId: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Amount (Ksh)</label>
                <input
                  type="number"
                  placeholder="Fine amount 💰"
                  value={newFine.amount}
                  onChange={(e) => setNewFine({ ...newFine, amount: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Reason</label>
                <input
                  type="text"
                  placeholder="Reason for fine 📝"
                  value={newFine.reason}
                  onChange={(e) => setNewFine({ ...newFine, reason: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              <button
                onClick={handleAddFine}
                className="md:col-span-3 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25 text-sm sm:text-base"
              >
                Add Fine ⚡
              </button>
            </div>
          </div>
        )}

        {/* Fines Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📋</span> 
              {userRole === 'member' ? 'My Fines' : 'All Fines'}
            </h3>
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-auto"
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
              <p className="text-gray-600 dark:text-gray-400">Loading fines...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                      {userRole === 'member' ? 'My Fine' : 'Member Code'}
                    </th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Amount</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Reason</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Days</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Status</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.length > 0 ? (
                    filteredFines.map((fine, idx) => (
                      <tr key={fine._id ?? idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                            {userRole === 'member' ? 'Fine' : `#${fine.member_code}`}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-orange-600 dark:text-orange-400 text-sm sm:text-base">Ksh {fine.amount}</div>
                        </td>
                        <td className="p-3 sm:p-4 text-gray-600 dark:text-gray-400 text-sm sm:text-base">{fine.reason}</td>
                        <td className="p-3 sm:p-4">
                          <div className={`font-medium text-sm sm:text-base ${fine.daysInactive > 90 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
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
                              onClick={() => handlePayFine(fine._id, fine.amount)}
                              className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-xs sm:text-sm"
                            >
                              {userRole === 'member' ? 'Submit Payment ⏳' : 'Mark Paid 💳'}
                            </button>
                          )}
                          {fine.status === "Paid" && userRole === 'member' && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              Paid ✅
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="text-3xl sm:text-4xl mb-2">
                          {userRole === 'member' ? '🎉' : '📝'}
                        </div>
                        <p className="text-sm sm:text-base">
                          {userRole === 'member' ? 'No fines issued to you' : 'No fines issued yet'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                          {userRole === 'member' ? 'Keep up the good work!' : 'No fines have been issued to members'}
                        </p>
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