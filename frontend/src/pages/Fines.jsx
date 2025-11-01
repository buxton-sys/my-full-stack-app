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
  approveTransaction,
  getMembersDropdown
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
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const role = getUserRole();
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(role);
    setCurrentUser(user);
    fetchFines();
    fetchPendingPayments();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await getMembersDropdown();
      setMembers(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

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
        
        // Find member name
        const member = members.find(m => m.member_code === f.member_code);
        
        return { 
          ...f, 
          status, 
          daysInactive,
          member_name: member?.name || f.member_name || 'Unknown Member'
        };
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
      if (userRole === 'admin' || userRole === 'Treasurer') {
        const res = await getPendingTransactions();
        const pendingPaymentsData = Array.isArray(res?.data) ? res.data.filter(t => t.type === 'fine_payment') : [];
        
        // Add member names to pending payments
        const paymentsWithNames = pendingPaymentsData.map(payment => {
          const member = members.find(m => m.member_code === payment.member_code);
          return {
            ...payment,
            member_name: member?.name || 'Unknown Member'
          };
        });
        
        setPendingPayments(paymentsWithNames);
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
      case "Paid": return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700";
      case "Unpaid": return "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700";
      case "Flagged (MIA)": return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700";
      default: return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-orange-900/20 font-['Inter'] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            {userRole === 'member' ? 'My Fines' : 'Fines & Discipline'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {userRole === 'member' 
              ? 'View and manage your fines' 
              : 'Manage member fines and compliance'
            }
          </p>
          {userRole && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Logged in as: <span className="font-semibold text-orange-600 dark:text-orange-400">{userRole}</span>
            </p>
          )}
        </div>

        {/* Pending Payments - Only for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin') && pendingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-3xl p-6 shadow-xl border border-blue-200 dark:border-blue-800 mb-8 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">⏳</span> Pending Fine Payments ({pendingPayments.length})
            </h3>
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 rounded-2xl p-4 border border-blue-200 dark:border-blue-700 transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                      {payment.member_name}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold text-xl">
                      Ksh {payment.amount?.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Member Code: #{payment.member_code} • Fine ID: #{payment.fine_id}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Submitted: {new Date(payment.created_at || payment.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleApprovePayment(payment.id)}
                    className="mt-3 sm:mt-0 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25"
                  >
                    Approve Payment ✅
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automated Action - Only for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin') && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/50 dark:to-orange-900/50 rounded-3xl p-6 shadow-xl border border-orange-200 dark:border-orange-800 mb-8 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span> Automated Actions
            </h3>
            <button 
              onClick={handleFlagInactive}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25"
            >
              🚩 Flag Inactive Members (90+ Days)
            </button>
          </div>
        )}

        {/* Payment Info for Members */}
        {userRole === 'member' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 rounded-3xl p-6 shadow-xl border border-green-200 dark:border-green-800 mb-8 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">💳</span> Fine Payment Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:shadow-lg">
                <div className="font-semibold text-green-800 dark:text-green-300 text-lg mb-3">Bank Transfer</div>
                <div className="space-y-2 text-sm">
                  <div><strong className="text-gray-700 dark:text-gray-300">Paybill:</strong> 522522</div>
                  <div><strong className="text-gray-700 dark:text-gray-300">Account:</strong> 1341299678</div>
                  <div><strong className="text-gray-700 dark:text-gray-300">Reference:</strong> FINE-#{currentUser?.member_code}</div>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:shadow-lg">
                <div className="font-semibold text-green-800 dark:text-green-300 text-lg mb-3">After Payment</div>
                <div className="space-y-2 text-sm">
                  <div>1. Make payment using above details</div>
                  <div>2. Submit your payment here</div>
                  <div>3. Wait for admin approval</div>
                  <div>4. Receive confirmation email</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-xl">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {userRole === 'member' ? 'My Fines' : 'Total Fines'}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/50 rounded-2xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-700 text-center transition-all duration-300 hover:shadow-xl">
            <div className="text-3xl mb-2">💸</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unpaid}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">Unpaid</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/50 rounded-2xl p-6 shadow-lg border border-green-200 dark:border-green-700 text-center transition-all duration-300 hover:shadow-xl">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.paid}</div>
            <div className="text-sm text-green-600 dark:text-green-400 mt-1">Paid</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/50 rounded-2xl p-6 shadow-lg border border-red-200 dark:border-red-700 text-center transition-all duration-300 hover:shadow-xl">
            <div className="text-3xl mb-2">🚩</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.flagged}</div>
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">Flagged</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/50 rounded-2xl p-6 shadow-lg border border-blue-200 dark:border-blue-700 text-center col-span-2 transition-all duration-300 hover:shadow-xl">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Ksh {stats.unpaidAmount.toLocaleString()}</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {userRole === 'member' ? 'My Pending' : 'Pending Collection'}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            success 
              ? "bg-green-500/20 text-green-700 border border-green-500/30 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Add Fine Section - Only for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 mb-8 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
              <span className="text-2xl">➕</span> Issue New Fine
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Member</label>
                <select
                  value={newFine.memberId}
                  onChange={(e) => setNewFine({ ...newFine, memberId: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select Member 👤</option>
                  {members.map(member => (
                    <option key={member.member_code} value={member.member_code}>
                      #{member.member_code} - {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Amount (Ksh)</label>
                <input
                  type="number"
                  placeholder="Fine amount 💰"
                  value={newFine.amount}
                  onChange={(e) => setNewFine({ ...newFine, amount: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Reason</label>
                <input
                  type="text"
                  placeholder="Reason for fine 📝"
                  value={newFine.reason}
                  onChange={(e) => setNewFine({ ...newFine, reason: e.target.value })}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddFine}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25"
                >
                  Add Fine ⚡
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fines Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-2xl">📋</span> 
              {userRole === 'member' ? 'My Fines' : 'All Fines'}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({filteredFines.length} {filter !== 'all' ? filter : 'total'})
              </span>
            </h3>
            
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 w-full lg:w-auto"
            >
              <option value="all">All Fines</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading fines...</p>
            </div>
          ) : filteredFines.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/80 dark:to-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Member</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Amount</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Reason</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Days</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.map((fine, idx) => (
                    <tr 
                      key={fine._id ?? idx} 
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-200 group"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 text-base">
                          {fine.member_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          ID: #{fine.member_code}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-orange-600 dark:text-orange-400 text-xl">
                          Ksh {fine.amount?.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300 text-base">
                        {fine.reason}
                      </td>
                      <td className="p-4">
                        <div className={`font-medium text-base ${fine.daysInactive > 90 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {fine.daysInactive}d
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-2 rounded-full text-sm font-medium border ${getStatusBadge(fine.status)}`}>
                          {fine.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {fine.status !== "Paid" && (
                          <button
                            onClick={() => handlePayFine(fine._id, fine.amount)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25"
                          >
                            {userRole === 'member' ? 'Submit Payment ⏳' : 'Mark Paid 💳'}
                          </button>
                        )}
                        {fine.status === "Paid" && userRole === 'member' && (
                          <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 px-3 py-2 rounded-full text-sm font-medium border border-green-200 dark:border-green-700">
                            Paid ✅
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <div className="text-6xl mb-4">
                {userRole === 'member' ? '🎉' : '📝'}
              </div>
              <p className="text-xl font-medium mb-2">
                {userRole === 'member' ? 'No fines issued to you' : 'No fines issued yet'}
              </p>
              <p className="text-gray-400 dark:text-gray-500">
                {userRole === 'member' ? 'Keep up the good work!' : 'No fines have been issued to members'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}