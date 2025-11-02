import React, { useEffect, useState } from "react";
import { 
  getLoansWithMembers, 
  requestLoan, 
  repayLoan, 
  getLoan, 
  applyInterest, 
  applyPenalty, 
  approveLoan, 
  rejectLoan, 
  getUserRole,
  requestLoanPending,
  getPendingTransactions,
  repayLoanPending,
  getMembersDropdown,
  getLoanStats,
  getLoanRepayments
} from "../api";

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [newLoan, setNewLoan] = useState({ memberId: "", amount: "", reason: "", purpose: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState("all");
  const [showLoanDetails, setShowLoanDetails] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [repaymentAmount, setRepaymentAmount] = useState({});
  const [pendingLoans, setPendingLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [loanStats, setLoanStats] = useState(null);
  const [activeTab, setActiveTab] = useState("loans");
  const [bulkAction, setBulkAction] = useState("");
  const [selectedLoans, setSelectedLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const role = getUserRole();
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(role);
    setCurrentUser(user);
    fetchLoans();
    fetchPendingLoans();
    fetchLoanStats();
    if (role === 'admin' || role === 'Treasurer' || role === 'Chairperson') {
      fetchMembers();
    }
  }, []);

  // Enhanced loan fetching with real data processing
  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await getLoansWithMembers();
      console.log('📊 Loans API Response:', res);
      
      const loansData = Array.isArray(res?.data) ? res.data : [];
      
      // Process loans with enhanced calculations
      const processedLoans = loansData.map(loan => {
        const loanDate = new Date(loan.created_at || loan.timestamp);
        const today = new Date();
        const daysSinceLoan = Math.floor((today - loanDate) / (1000 * 60 * 60 * 24));
        const isOverdue = daysSinceLoan > 30;
        const daysOverdue = Math.max(0, daysSinceLoan - 30);
        const weeklyPenalties = Math.floor(daysOverdue / 7);
        
        // Calculate totals
        const totalInterest = loan.interest || 0;
        const totalPenalty = loan.penalty || 0;
        const totalAmount = loan.total_amount || loan.amount;
        const paidAmount = loan.paid_amount || 0;
        const remainingAmount = totalAmount + totalInterest + totalPenalty - paidAmount;
        
        return {
          ...loan,
          isOverdue,
          daysSinceLoan,
          daysOverdue,
          weeklyPenalties,
          dueDate: new Date(loanDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          totalOwed: Number(totalAmount) + Number(totalInterest) + Number(totalPenalty),
          paidAmount,
          remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
          isFullyPaid: remainingAmount <= 0,
          lastUpdated: new Date().toISOString()
        };
      });

      // Filter based on user role
      if (userRole === 'member') {
        const memberLoans = processedLoans.filter(loan => 
          loan.member_code === currentUser?.member_code || 
          loan.memberId === currentUser?.member_code
        );
        setLoans(memberLoans);
      } else {
        setLoans(processedLoans);
      }
    } catch (error) {
      console.error('❌ fetchLoans failed', error);
      setError('Failed to load loans');
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await getMembersDropdown();
      if (res?.data) {
        setMembers(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchLoanStats = async () => {
    try {
      const res = await getLoanStats();
      if (res?.data) {
        setLoanStats(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch loan stats:', error);
    }
  };

  const fetchPendingLoans = async () => {
    try {
      if (userRole === 'admin' || userRole === 'Treasurer' || userRole === 'Chairperson') {
        const res = await getPendingTransactions();
        const pendingLoansData = Array.isArray(res?.data) ? res.data.filter(t => t.type === 'loan_request') : [];
        setPendingLoans(pendingLoansData);
      }
    } catch (error) {
      console.error('fetchPendingLoans failed', error);
      setPendingLoans([]);
    }
  };

  // Enhanced loan details with repayment history
  const fetchSingleLoan = async (loanId) => {
    try {
      const res = await getLoan(loanId);
      if (res?.data?.success) {
        const loanWithRepayments = await fetchLoanRepayments(loanId);
        setSelectedLoan({
          ...res.data.loan,
          repayments: loanWithRepayments?.data || []
        });
        setShowLoanDetails(true);
      } else {
        setError('Failed to fetch loan details 😔');
      }
    } catch (e) {
      setError('Failed to fetch loan details 😔');
    }
  };

  const fetchLoanRepayments = async (loanId) => {
    try {
      return await getLoanRepayments(loanId);
    } catch (error) {
      console.error('Failed to fetch repayments:', error);
      return { data: [] };
    }
  };

  // Enhanced loan request with member selection for admins
  const handleRequest = async () => {
    if (!newLoan.amount || !newLoan.reason) {
      setError('Please fill all required fields! 📝');
      return;
    }

    if (Number(newLoan.amount) <= 0) {
      setError('Please enter a valid amount! 💰');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const memberIdToUse = userRole === 'member' ? currentUser.member_code : newLoan.memberId;
      
      if (!memberIdToUse) {
        setError('Member code is required!');
        return;
      }

      if (userRole === 'member') {
        await requestLoanPending({
          member_code: memberIdToUse,
          amount: Number(newLoan.amount),
          purpose: newLoan.purpose || 'General',
          reason: newLoan.reason,
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setSuccess('Loan request submitted for admin approval! ⏳ We will notify you once reviewed.');
      } else {
        await requestLoan({
          memberId: memberIdToUse,
          amount: newLoan.amount,
          reason: newLoan.reason,
          purpose: newLoan.purpose
        });
        setSuccess('Loan approved and created successfully! ✅');
      }
      
      setNewLoan({ memberId: "", amount: "", reason: "", purpose: "" });
      setTimeout(() => setSuccess(''), 5000);
      await fetchLoans();
      await fetchPendingLoans();
      await fetchLoanStats();
      
    } catch (e) {
      console.error('Loan request failed:', e);
      setError('Failed to submit loan request 😔. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced repayment with better validation
  const handleRepay = async (loanId, amount) => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid repayment amount! 💰');
      return;
    }

    const loan = loans.find(l => l.id === loanId);
    if (loan && Number(amount) > loan.remainingAmount) {
      setError(`Repayment amount cannot exceed remaining balance of Ksh ${loan.remainingAmount}!`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (userRole === 'member') {
        await repayLoanPending({
          member_code: currentUser.member_code,
          loan_id: loanId,
          amount: Number(amount)
        });
        setSuccess('Repayment submitted for admin approval! ⏳');
      } else {
        await repayLoan(loanId, amount);
        setSuccess('Payment processed successfully! ✅');
      }
      
      setRepaymentAmount(prev => ({ ...prev, [loanId]: '' }));
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
      await fetchLoanStats();
      
    } catch (e) {
      console.error('Repayment failed:', e);
      setError('Payment failed 😔. Please check the amount and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced interest application with confirmation
  const handleApplyInterest = async () => {
    if (!window.confirm('Apply 10% interest to all active loans? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await applyInterest();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for backend
    await fetchLoans(); // Refresh loans data
    await fetchLoanStats(); // Refresh stats
    

      if (res?.data?.success) {
        setSuccess(`✅ ${res.data.message} - Total interest: Ksh ${res.data.total_interest_applied}`);
      } else {
        setSuccess('10% interest applied to all active loans! 📈');
      }
      setTimeout(() => setSuccess(''), 5000);
      await fetchLoans();
      await fetchLoanStats();
    } catch (e) {
      console.error('Interest application failed:', e);
      setError('Failed to apply interest 😔');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced penalty application with confirmation
  const handleApplyPenalty = async () => {
    if (!window.confirm('Apply Ksh 50 weekly penalties to all overdue loans?')) {
      return;
    }

    try {
      setLoading(true);
      const res = await applyPenalty();
      if (res?.data?.success) {
        setSuccess(`⚠️ ${res.data.message} - Total penalties: Ksh ${res.data.total_penalties_applied}`);
      } else {
        setSuccess('Ksh 50 penalty applied to overdue loans! ⚠️');
      }
      setTimeout(() => setSuccess(''), 5000);
      await fetchLoans();
      await fetchLoanStats();
    } catch (e) {
      console.error('Penalty application failed:', e);
      setError('Failed to apply penalties 😔');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Auto-apply both interest and penalties
  const handleAutoApplyAll = async () => {
    if (!window.confirm('Apply both 10% interest and weekly penalties to all applicable loans?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Apply interest first
      await applyInterest();
      
      // Then apply penalties
      await applyPenalty();
      
      setSuccess('✅ All automated charges applied successfully! Interest and penalties updated.');
      setTimeout(() => setSuccess(''), 5000);
      await fetchLoans();
      await fetchLoanStats();
      
    } catch (e) {
      console.error('Auto-apply failed:', e);
      setError('Failed to apply automated charges 😔');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Bulk actions for loans
  const handleBulkAction = async () => {
    if (!bulkAction || selectedLoans.length === 0) {
      setError('Please select loans and an action!');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let successCount = 0;
      let errorCount = 0;

      for (const loanId of selectedLoans) {
        try {
          if (bulkAction === 'approve') {
            await approveLoan(loanId);
            successCount++;
          } else if (bulkAction === 'reject') {
            await rejectLoan(loanId);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to process loan ${loanId}:`, error);
          errorCount++;
        }
      }

      setSuccess(`✅ Bulk action completed: ${successCount} successful, ${errorCount} failed`);
      setBulkAction("");
      setSelectedLoans([]);
      setTimeout(() => setSuccess(''), 5000);
      await fetchLoans();
      await fetchPendingLoans();
      await fetchLoanStats();

    } catch (e) {
      console.error('Bulk action failed:', e);
      setError('Bulk action failed 😔');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Toggle loan selection for bulk actions
  const toggleLoanSelection = (loanId) => {
    setSelectedLoans(prev => 
      prev.includes(loanId) 
        ? prev.filter(id => id !== loanId)
        : [...prev, loanId]
    );
  };

  // NEW: Select all filtered loans
  const selectAllLoans = () => {
    setSelectedLoans(filteredLoans.map(loan => loan.id));
  };

  // NEW: Clear all selections
  const clearSelections = () => {
    setSelectedLoans([]);
  };

  const handleApprove = async (loanId) => {
    try {
      setLoading(true);
      await approveLoan(loanId);
      setSuccess('Loan approved successfully! ✅');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
      await fetchPendingLoans();
      await fetchLoanStats();
    } catch (e) {
      console.error('Approval failed:', e);
      setError('Approval failed 😔');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePending = async (pendingTransactionId) => {
    try {
      setLoading(true);
      await approveLoan(pendingTransactionId);
      setSuccess('Pending loan approved! ✅');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
      await fetchPendingLoans();
      await fetchLoanStats();
    } catch (e) {
      console.error('Pending approval failed:', e);
      setError('Approval failed 😔');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (loanId) => {
    try {
      setLoading(true);
      await rejectLoan(loanId);
      setSuccess('Loan rejected! 👎');
      setTimeout(() => setSuccess(''), 3000);
      await fetchLoans();
      await fetchPendingLoans();
      await fetchLoanStats();
    } catch (e) {
      console.error('Rejection failed:', e);
      setError('Rejection failed 😔');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced stats calculation
  const filteredLoans = loans.filter(loan => {
    const matchesFilter = filter === "all" ? true : 
                         filter === "overdue" ? loan.isOverdue :
                         filter === "completed" ? loan.isFullyPaid :
                         loan.status === filter;
    
    const matchesSearch = searchTerm === "" || 
                         loan.member_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const userLoans = userRole === 'member' 
    ? loans.filter(loan => loan.member_code === currentUser?.member_code || loan.memberId === currentUser?.member_code)
    : loans;

  // Advanced statistics
  const stats = {
    total: userLoans.length,
    pending: userLoans.filter(l => l.status === "pending").length,
    approved: userLoans.filter(l => l.status === "approved" && !l.isFullyPaid).length,
    completed: userLoans.filter(l => l.isFullyPaid).length,
    rejected: userLoans.filter(l => l.status === "rejected").length,
    totalAmount: userLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0),
    totalInterest: userLoans.reduce((sum, l) => sum + Number(l.interest || 0), 0),
    totalPenalty: userLoans.reduce((sum, l) => sum + Number(l.penalty || 0), 0),
    totalOwed: userLoans.reduce((sum, l) => sum + Number(l.totalOwed || 0), 0),
    totalPaid: userLoans.reduce((sum, l) => sum + Number(l.paidAmount || 0), 0),
    overdue: userLoans.filter(l => l.isOverdue).length,
    pendingApprovals: pendingLoans.length
  };

  const getStatusColor = (status, isOverdue = false, isFullyPaid = false) => {
    if (isFullyPaid) return "text-green-600 bg-green-100 border border-green-200 dark:text-green-400 dark:bg-green-900/30";
    if (isOverdue) return "text-red-600 bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-900/30";
    
    switch (status) {
      case "approved": return "text-blue-600 bg-blue-100 border border-blue-200 dark:text-blue-400 dark:bg-blue-900/30";
      case "rejected": return "text-red-600 bg-red-100 border border-red-200 dark:text-red-400 dark:bg-red-900/30";
      case "pending": return "text-yellow-600 bg-yellow-100 border border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30";
      default: return "text-gray-600 bg-gray-100 border border-gray-200 dark:text-gray-400 dark:bg-gray-800";
    }
  };

  // NEW: Export loans data
  const exportLoansData = () => {
    const data = filteredLoans.map(loan => ({
      'Member Code': loan.member_code,
      'Amount': loan.amount,
      'Purpose': loan.purpose,
      'Status': loan.status,
      'Interest': loan.interest || 0,
      'Penalty': loan.penalty || 0,
      'Total Owed': loan.totalOwed,
      'Paid Amount': loan.paidAmount,
      'Remaining': loan.remainingAmount,
      'Days Active': loan.daysSinceLoan,
      'Overdue': loan.isOverdue ? 'Yes' : 'No',
      'Due Date': loan.dueDate.toLocaleDateString()
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setSuccess('📊 Loans data exported successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {userRole === 'member' ? 'My Loans' : 'Advanced Loan Management System'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            {userRole === 'member' 
              ? 'Manage your loan applications and repayments' 
              : 'Comprehensive loan management with automated interest, penalties, and bulk actions'
            }
          </p>
        </div>

        {/* Tab Navigation for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && (
          <div className="flex bg-white/50 dark:bg-gray-800/50 rounded-2xl p-1 mb-6 sm:mb-8 shadow-lg border border-white/60 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("loans")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "loans" 
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              📋 All Loans
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "pending" 
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              ⏳ Pending ({pendingLoans.length})
            </button>
            <button
              onClick={() => setActiveTab("automation")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === "automation" 
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              ⚡ Automation
            </button>
          </div>
        )}

        {/* Pending Approvals - Only for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && pendingLoans.length > 0 && activeTab === "pending" && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-3xl p-4 sm:p-6 shadow-xl border border-orange-200 dark:border-orange-700 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⏳</span> Pending Loan Approvals ({pendingLoans.length})
            </h3>
            <div className="space-y-3">
              {pendingLoans.map((loan) => (
                <div key={loan.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 rounded-2xl p-4 border border-orange-200 dark:border-orange-600">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-white">
                      Member #{loan.member_code} - Ksh {loan.amount}
                    </div>
                    <div className="text-orange-600 dark:text-orange-400 text-sm">{loan.purpose || 'General'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Submitted: {new Date(loan.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Reason: {loan.reason}
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-2 sm:mt-0">
                    <button 
                      onClick={() => handleApprovePending(loan.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-sm"
                    >
                      Approve ✅
                    </button>
                    <button 
                      onClick={() => handleReject(loan.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-red-500/25 text-sm"
                    >
                      Reject ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Automated Actions Card for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && activeTab === "automation" && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-3xl p-4 sm:p-6 shadow-xl border border-purple-200 dark:border-purple-700 mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-xl sm:text-2xl">⚡</span> Automated Loan Management
              </h3>
              <button 
                onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                className="text-sm bg-purple-500 text-white px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors"
              >
                {showAdvancedStats ? 'Hide Stats' : 'Show Stats'}
              </button>
            </div>
            
            {showAdvancedStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 text-center">
                  <div className="text-blue-500 text-sm">Active Loans</div>
                  <div className="font-bold text-lg">{stats.approved}</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 text-center">
                  <div className="text-orange-500 text-sm">Overdue</div>
                  <div className="font-bold text-lg">{stats.overdue}</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 text-center">
                  <div className="text-green-500 text-sm">Total Interest</div>
                  <div className="font-bold text-lg">Ksh {stats.totalInterest}</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-3 text-center">
                  <div className="text-red-500 text-sm">Total Penalties</div>
                  <div className="font-bold text-lg">Ksh {stats.totalPenalty}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <button 
                onClick={handleApplyInterest}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <span>📈</span> Apply 10% Interest
              </button>
              <button 
                onClick={handleApplyPenalty}
                disabled={loading}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <span>⚠️</span> Apply Weekly Penalties
              </button>
              <button 
                onClick={handleAutoApplyAll}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <span>🚀</span> Auto-Apply All
              </button>
            </div>
            
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>• 10% monthly interest on active loans</div>
              <div>• Ksh 50 weekly penalty for overdue loans</div>
              <div>• Automatic status updates</div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">💰</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-yellow-200 dark:border-yellow-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">⏳</div>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
            <div className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">Pending</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-blue-200 dark:border-blue-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">📊</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.approved}</div>
            <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">Active</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-green-200 dark:border-green-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">✅</div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            <div className="text-xs sm:text-sm text-green-600 dark:text-green-400">Paid</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-red-200 dark:border-red-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">❌</div>
            <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
            <div className="text-xs sm:text-sm text-red-600 dark:text-red-400">Rejected</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-orange-200 dark:border-orange-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">⚠️</div>
            <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.overdue}</div>
            <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">Overdue</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-3 sm:p-4 shadow-lg border border-purple-200 dark:border-purple-700 text-center">
            <div className="text-xl sm:text-2xl mb-1">💵</div>
            <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">Ksh {stats.totalOwed.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">Total Owed</div>
          </div>
        </div>

        {/* Payment Info for Members */}
        {userRole === 'member' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-3xl p-4 sm:p-6 shadow-xl border border-green-200 dark:border-green-700 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💳</span> Loan Payment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-600">
                <div className="font-semibold text-green-800 dark:text-green-400 mb-2">Bank Transfer</div>
                <div className="text-gray-700 dark:text-gray-300"><strong>Paybill:</strong> 522522</div>
                <div className="text-gray-700 dark:text-gray-300"><strong>Account:</strong> 1341299678</div>
                <div className="text-gray-700 dark:text-gray-300"><strong>Reference:</strong> LOAN-#{currentUser?.member_code}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-600">
                <div className="font-semibold text-green-800 dark:text-green-400 mb-2">After Payment</div>
                <div className="text-gray-700 dark:text-gray-300">1. Make payment using above details</div>
                <div className="text-gray-700 dark:text-gray-300">2. Submit your repayment here</div>
                <div className="text-gray-700 dark:text-gray-300">3. Wait for admin approval</div>
                <div className="text-gray-700 dark:text-gray-300">4. Receive confirmation email</div>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl text-center font-medium transition-all duration-300 text-sm sm:text-base ${
            success 
              ? "bg-green-500/20 text-green-700 dark:text-green-300 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Request Loan Card */}
        {(activeTab === "loans" || activeTab === "pending") && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📥</span> 
              {userRole === 'member' ? 'Apply for Loan' : 'Process New Loan'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {userRole !== 'member' && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Member Code</label>
                  <select 
                    value={newLoan.memberId}
                    onChange={e => setNewLoan({...newLoan, memberId: e.target.value})}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white"
                  >
                    <option value="">Select Member</option>
                    {members.map(member => (
                      <option key={member.member_code} value={member.member_code}>
                        {member.name} (#{member.member_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {userRole === 'member' && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Your Member Code</label>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                    #{currentUser?.member_code}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Amount (Ksh)</label>
                <input 
                  type="number" 
                  placeholder="Loan amount 💰" 
                  value={newLoan.amount}
                  onChange={e => setNewLoan({...newLoan, amount: e.target.value})}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Purpose</label>
                <select 
                  value={newLoan.purpose}
                  onChange={e => setNewLoan({...newLoan, purpose: e.target.value})}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white"
                >
                  <option value="General">General</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Business">Business</option>
                  <option value="Education">Education</option>
                  <option value="Medical">Medical</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>
              <div className={userRole === 'member' ? 'md:col-span-2' : ''}>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Reason</label>
                <input 
                  type="text" 
                  placeholder="Detailed reason 📋" 
                  value={newLoan.reason}
                  onChange={e => setNewLoan({...newLoan, reason: e.target.value})}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white"
                />
              </div>
              <button 
                onClick={handleRequest}
                disabled={loading}
                className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 text-sm sm:text-base disabled:opacity-50 ${
                  userRole === 'member' ? 'md:col-span-2' : 'md:col-span-4'
                }`}
              >
                {loading ? "Processing..." : userRole === 'member' ? "Submit Loan Application ⏳" : "Process Loan Request 🚀"}
              </button>
            </div>
            {userRole === 'member' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                💡 Your loan application will be reviewed by admin (1-2 business days)
              </p>
            )}
          </div>
        )}

        {/* Bulk Actions for Admins */}
        {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && selectedLoans.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-3xl p-4 sm:p-6 shadow-xl border border-orange-200 dark:border-orange-700 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">🔄</span> Bulk Actions ({selectedLoans.length} loans selected)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <select 
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto text-gray-800 dark:text-white"
              >
                <option value="">Select Action</option>
                <option value="approve">Approve Selected</option>
                <option value="reject">Reject Selected</option>
              </select>
              <button 
                onClick={handleBulkAction}
                disabled={loading || !bulkAction}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 text-sm sm:text-base disabled:opacity-50 w-full sm:w-auto"
              >
                {loading ? "Processing..." : "Execute Bulk Action 🚀"}
              </button>
              <button 
                onClick={clearSelections}
                className="bg-gray-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300 text-sm sm:text-base w-full sm:w-auto"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Loans Table */}
        {(activeTab === "loans" || activeTab === "pending") && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 gap-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="text-xl sm:text-2xl">📋</span> 
                {userRole === 'member' ? 'My Loan Applications' : 'Loan Applications'}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({filteredLoans.length} found)
                </span>
              </h3>
              
              <div className="flex gap-3 sm:gap-4 items-center w-full md:w-auto">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search loans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-64 text-gray-800 dark:text-white"
                />
                
                {/* Filter */}
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 w-full md:w-auto text-gray-800 dark:text-white"
                >
                  <option value="all">All Loans</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Active</option>
                  <option value="completed">Paid Off</option>
                  <option value="rejected">Rejected</option>
                  <option value="overdue">Overdue</option>
                </select>

                {/* Bulk Selection for Admins */}
                {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && (
                  <div className="flex gap-2">
                    <button 
                      onClick={selectAllLoans}
                      className="bg-blue-500 text-white px-3 py-2 rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm"
                    >
                      Select All
                    </button>
                    <button 
                      onClick={clearSelections}
                      className="bg-gray-500 text-white px-3 py-2 rounded-xl font-semibold hover:bg-gray-600 transition-colors text-sm"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={exportLoansData}
                      className="bg-green-500 text-white px-3 py-2 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm"
                    >
                      Export 📊
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading loans...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                      {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && (
                        <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base w-12">
                          <input
                            type="checkbox"
                            checked={selectedLoans.length === filteredLoans.length && filteredLoans.length > 0}
                            onChange={selectAllLoans}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                        </th>
                      )}
                      <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                        {userRole === 'member' ? 'My Loan' : 'Member'}
                      </th>
                      <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Amount</th>
                      <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Purpose</th>
                      <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Status</th>
                      <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.length > 0 ? (
                      filteredLoans.map((loan, idx) => (
                        <tr key={loan.id ?? idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                          {(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && (
                            <td className="p-3 sm:p-4">
                              <input
                                type="checkbox"
                                checked={selectedLoans.includes(loan.id)}
                                onChange={() => toggleLoanSelection(loan.id)}
                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                              />
                            </td>
                          )}
                          <td className="p-3 sm:p-4">
                            <div className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">
                              {userRole === 'member' ? 'My Application' : `#${loan.member_code || loan.memberId}`}
                            </div>
                            {loan.daysSinceLoan !== undefined && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {loan.daysSinceLoan} days ago
                                {loan.isOverdue && <span className="text-red-500 ml-1">(Overdue)</span>}
                              </div>
                            )}
                            <button 
                              onClick={() => fetchSingleLoan(loan.id)}
                              className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                            >
                              View Details 👁️
                            </button>
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="font-bold text-purple-600 dark:text-purple-400 text-sm sm:text-base">Ksh {loan.amount}</div>
                             <div className="text-xs font-bold text-blue-600 dark:text-blue-400"></div>
                            {loan.interest > 0 && (
                              <div className="text-xs text-green-600 dark:text-green-400">+{loan.interest} interest</div>
                            )}
                            {loan.penalty > 0 && (
                              <div className="text-xs text-red-500 dark:text-red-400">+{loan.penalty} penalty</div>
                            )}
                            {loan.remainingAmount > 0 && (
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                Remaining: Ksh {loan.remainingAmount}
                              </div>
                            )}
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
    Total: Ksh {loan.totalOwed}
  </div>
                          </td>
                          <td className="p-3 sm:p-4 text-gray-600 dark:text-gray-300 text-sm sm:text-base">{loan.purpose || loan.reason}</td>
                          <td className="p-3 sm:p-4">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(loan.status, loan.isOverdue, loan.isFullyPaid)}`}>
                              {loan.isFullyPaid ? 'Paid Off' : loan.status}
                              {loan.isOverdue && " ⚠️"}
                            </span>
                            {loan.daysOverdue > 0 && (
                              <div className="text-xs text-red-500 dark:text-red-400 mt-1">
                                {loan.daysOverdue} days overdue
                              </div>
                            )}
                          </td>
                          <td className="p-3 sm:p-4">
                            <div className="flex gap-2 flex-wrap">
                              {loan.status === "pending" && (userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') && (
                                <>
                                  <button 
                                    onClick={() => handleApprove(loan.id)}
                                    disabled={loading}
                                    className="bg-green-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                                  >
                                    Approve ✅
                                  </button>
                                  <button 
                                    onClick={() => handleReject(loan.id)}
                                    disabled={loading}
                                    className="bg-red-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                  >
                                    Reject ❌
                                  </button>
                                </>
                              )}
                              {loan.status === "approved" && !loan.isFullyPaid && (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="number"
                                    placeholder="Amount"
                                    value={repaymentAmount[loan.id] || ''}
                                    onChange={(e) => setRepaymentAmount(prev => ({
                                      ...prev,
                                      [loan.id]: e.target.value
                                    }))}
                                    className="w-20 sm:w-24 p-1 sm:p-2 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                                  />
                                  <button 
                                    onClick={() => handleRepay(loan.id, repaymentAmount[loan.id])}
                                    disabled={loading}
                                    className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm hover:bg-blue-600 transition-colors whitespace-nowrap disabled:opacity-50"
                                  >
                                    {userRole === 'member' ? 'Submit Repay ⏳' : 'Process Repay 💳'}
                                  </button>
                                </div>
                              )}
                              {loan.status === "pending" && userRole === 'member' && (
                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-2 py-1 rounded-full text-xs font-medium">
                                  Under Review
                                </span>
                              )}
                              {loan.isFullyPaid && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                                  Paid Off ✅
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={(userRole === 'Treasurer' || userRole === 'admin' || userRole === 'Chairperson') ? 6 : 5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                          <div className="text-3xl sm:text-4xl mb-2">📭</div>
                          <p className="text-sm sm:text-base">
                            {userRole === 'member' ? 'No loan applications found' : 'No loans found'}
                          </p>
                          {userRole === 'member' && filteredLoans.length === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You haven't applied for any loans yet</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Loan Details Modal */}
        {showLoanDetails && selectedLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Loan Details</h3>
                <button 
                  onClick={() => setShowLoanDetails(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Member Code:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">#{selectedLoan.member_code || selectedLoan.memberId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Principal Amount:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">Ksh {selectedLoan.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Interest:</span>
                    <span className="text-green-600 dark:text-green-400">Ksh {selectedLoan.interest || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Penalty:</span>
                    <span className="text-red-600 dark:text-red-400">Ksh {selectedLoan.penalty || '0'}</span>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Owed:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Ksh {((selectedLoan.total_amount || selectedLoan.amount) + (selectedLoan.interest || 0) + (selectedLoan.penalty || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                    <span className="text-green-600 dark:text-green-400">Ksh {selectedLoan.paid_amount || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      Ksh {selectedLoan.remaining_amount || ((selectedLoan.total_amount || selectedLoan.amount) + (selectedLoan.interest || 0) + (selectedLoan.penalty || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedLoan.status, selectedLoan.isOverdue, selectedLoan.isFullyPaid)}`}>
                      {selectedLoan.isFullyPaid ? 'Paid Off' : selectedLoan.status}
                      {selectedLoan.isOverdue && " ⚠️"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Information */}
              <div className="border-t pt-4 dark:border-gray-600">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-3">📅 Loan Timeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Loan Date:</span>
                    <span className="font-medium">{new Date(selectedLoan.created_at || selectedLoan.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <span className="font-medium">{new Date(selectedLoan.due_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Days Active:</span>
                    <span className="font-medium">{selectedLoan.daysSinceLoan} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Days Overdue:</span>
                    <span className={`font-medium ${selectedLoan.daysOverdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedLoan.daysOverdue} days
                    </span>
                  </div>
                  {selectedLoan.weeklyPenalties > 0 && (
                    <div className="flex justify-between md:col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Weekly Penalties Applied:</span>
                      <span className="font-medium text-red-600">{selectedLoan.weeklyPenalties}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Repayment History */}
              {selectedLoan.repayments && selectedLoan.repayments.length > 0 && (
                <div className="border-t pt-4 dark:border-gray-600 mt-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">💳 Repayment History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedLoan.repayments.map((repayment, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div>
                          <div className="text-sm font-medium">Ksh {repayment.amount}</div>
                          <div className="text-xs text-gray-500">{new Date(repayment.payment_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Balance: Ksh {repayment.remaining_balance}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 dark:border-gray-600 mt-4">
                <span className="text-gray-600 dark:text-gray-400">Purpose:</span>
                <p className="text-gray-800 dark:text-white mt-1">{selectedLoan.purpose || 'Not specified'}</p>
              </div>
              
              {selectedLoan.reason && (
                <div className="border-t pt-4 dark:border-gray-600 mt-4">
                  <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                  <p className="text-gray-800 dark:text-white mt-1">{selectedLoan.reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}