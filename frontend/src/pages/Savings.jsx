import React, { useEffect, useState } from "react";
import { 
  getSavingsWithMembers, 
  addSaving, 
  getAfterschool, 
  addAfterschool, 
  payAfterschool, 
  getTotalSavings, 
  getFinancialSummary, 
  getUserRole,
  getGroupProgress,
  getMembersDropdown,
  addPendingTransaction,
  approveTransaction,
  getPendingTransactions
} from "../api"; // Assuming deleteSaving and updateSaving are in api.js

import { deleteSaving, updateSaving } from '../api';

export default function Savings() {
  const [savings, setSavings] = useState([]);
  const [total, setTotal] = useState(0);
  const [afterschool, setAfterschool] = useState([]);
  const [newSaving, setNewSaving] = useState({ member_code: "", amount: "" });
  const [newAfterSchool, setNewAfterSchool] = useState({ member_code: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [financialSummary, setFinancialSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("savings");
  const [userRole, setUserRole] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [membersDropdown, setMembersDropdown] = useState([]);
  const [groupProgress, setGroupProgress] = useState(null);

  useEffect(() => {
    const role = getUserRole();
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(role);
    setCurrentUser(user);
    
    fetchSavings();
    fetchAfterschool();
    fetchFinancialSummary();
    fetchPendingTransactions();
    fetchMembersDropdown();
    fetchGroupProgress();
  }, []);

  const fetchSavings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSavingsWithMembers();
      const savingsData = Array.isArray(res?.data) ? res.data : [];
      
      // Filter savings based on user role
      let filteredSavings = savingsData;
      if (userRole === 'member') {
        const userMemberCode = currentUser?.member_code;
        filteredSavings = savingsData.filter(s => s.member_code === userMemberCode);
      }
      
      setSavings(filteredSavings);
      
      // Calculate total from REAL data
      const totalAmount = filteredSavings.reduce((sum, saving) => sum + Number(saving.amount || 0), 0);
      setTotal(totalAmount);
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
      const afterschoolData = Array.isArray(res?.data) ? res.data : [];
      
      // Filter afterschool based on user role
      let filteredAfterschool = afterschoolData;
      if (userRole === 'member') {
        const userMemberCode = currentUser?.member_code;
        filteredAfterschool = afterschoolData.filter(a => a.member_code === userMemberCode);
      }
      
      setAfterschool(filteredAfterschool);
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

  const fetchPendingTransactions = async () => {
    try {
      if (userRole === 'admin' || userRole === 'treasurer') {
        const res = await getPendingTransactions();
        setPendingTransactions(res.data || []);
      }
    } catch (e) {
      console.error('fetchPendingTransactions failed', e);
      setPendingTransactions([]);
    }
  };

  const fetchMembersDropdown = async () => {
    try {
      const res = await getMembersDropdown();
      setMembersDropdown(res.data || []);
    } catch (e) {
      console.error('fetchMembersDropdown failed', e);
      setMembersDropdown([]);
    }
  };

  const fetchGroupProgress = async () => {
    try {
      const res = await getGroupProgress();
      setGroupProgress(res.data || {});
    } catch (e) {
      console.error('fetchGroupProgress failed', e);
    }
  };

  const handleAddSaving = async () => {
    if (!newSaving.amount) {
      setError('Please enter amount! 💰');
      return;
    }
    
    if (Number(newSaving.amount) <= 0) {
      setError('Please enter a valid amount! 💰');
      return;
    }
    
    try {
      // For members, automatically use their member code
      const memberCodeToUse = userRole === 'member' ? currentUser.member_code : newSaving.member_code;
      
      if (!memberCodeToUse) {
        setError('Member code is required!');
        return;
      }

      if (userRole === 'member') {
        // Members submit for approval
        const pendingData = {
          member_code: memberCodeToUse,
          amount: Number(newSaving.amount),
          type: 'savings',
          proof_image: '' // You can add file upload later
        };
        
        await addPendingTransaction(pendingData);
        
        setNewSaving({ member_code: "", amount: "" });
        setSuccess('Savings submitted for admin approval! ⏳ We will notify you once approved.');
        
      } else {
        // Admins can add directly
        await addSaving({ member_code: memberCodeToUse, amount: Number(newSaving.amount) });
        setNewSaving({ member_code: "", amount: "" });
        setSuccess(`Savings of Ksh ${newSaving.amount} added successfully! 💰`);
      }
      
      setTimeout(() => setSuccess(''), 5000);
      await fetchSavings();
      await fetchFinancialSummary();
      await fetchPendingTransactions();
      
    } catch (e) {
      setError('Failed to process savings request 😔');
    }
  };

  
const handleEditSaving = async (saving) => {
  const newAmount = prompt('Enter new amount:', saving.amount);
  if (newAmount && !isNaN(newAmount)) {
    try {
      await updateSaving(saving.id, { amount: parseFloat(newAmount) });
      setSuccess('Savings updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchSavings();
      await fetchFinancialSummary();
    } catch (error) {
      console.error('Error updating savings:', error);
      setError('Error updating savings');
    }
  }
};

const handleDeleteSaving = async (savingId) => {
  if (window.confirm('Are you sure you want to delete this savings record?')) {
    try {
      await deleteSaving(savingId);
      setSuccess('Savings record deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      await fetchSavings();
      await fetchFinancialSummary();
    } catch (error) {
      console.error('Error deleting savings:', error);
      setError('Error deleting savings');
    }
  }
};

  const handleAddAfterSchool = async () => {
    if (!newAfterSchool.amount) {
      setError('Please enter amount! 💰');
      return;
    }
    
    if (Number(newAfterSchool.amount) <= 0) {
      setError('Please enter a valid amount! 💰');
      return;
    }
    
    try {
      // For members, automatically use their member code
      const memberCodeToUse = userRole === 'member' ? currentUser.member_code : newAfterSchool.member_code;
      
      if (!memberCodeToUse) {
        setError('Member code is required!');
        return;
      }

      if (userRole === 'member') {
        // Members submit for approval
        const pendingData = {
          member_code: memberCodeToUse,
          amount: Number(newAfterSchool.amount),
          type: 'afterschool',
          proof_image: ''
        };
        
        await addPendingTransaction(pendingData);
        
        setNewAfterSchool({ member_code: "", amount: "" });
        setSuccess('After-school contribution submitted for approval! ⏳');
        
      } else {
        // Admins can add directly
        await addAfterschool({ member_code: memberCodeToUse, amount: Number(newAfterSchool.amount) });
        setNewAfterSchool({ member_code: "", amount: "" });
        setSuccess(`After-school contribution of Ksh ${newAfterSchool.amount} added successfully! 🎓`);
      }
      
      setTimeout(() => setSuccess(''), 3000);
      await fetchAfterschool();
      await fetchFinancialSummary();
      await fetchPendingTransactions();
      
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

  // REAL Admin approval function
  const handleApproveTransaction = async (transactionId) => {
    try {
      await approveTransaction(transactionId);
      
      setSuccess('Transaction approved and balance updated! ✅');
      setTimeout(() => setSuccess(''), 3000);
      
      await fetchSavings();
      await fetchAfterschool();
      await fetchFinancialSummary();
      await fetchPendingTransactions();
      
    } catch (e) {
      setError('Approval failed 😔');
    }
  };

  // Calculate stats from REAL data
  const stats = {
    totalSavings: total,
    totalAfterSchool: afterschool.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    pendingAfterSchool: afterschool.filter(a => !a.paid).length,
    totalAfterSchoolAmount: afterschool.filter(a => !a.paid).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  };

  // Filter data based on user role
  const userSavings = userRole === 'member' 
    ? savings.filter(s => s.member_code === currentUser?.member_code)
    : savings;

  const userAfterschool = userRole === 'member'
    ? afterschool.filter(a => a.member_code === currentUser?.member_code)
    : afterschool;

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 min-h-screen font-['Inter']">
      <div className="max-w-7xl mx-auto">
        
<div className="text-center mb-6 sm:mb-8">
  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
    {userRole === 'member' ? 'My Savings' : 'Finance Dashboard'}
  </h1>
  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
    {userRole === 'member' 
      ? 'Manage your personal savings and contributions' 
      : 'Manage savings and after-school payments'
    }
  </p>
  
  {/* Add Refresh Button */}
  <button
    onClick={() => {
      fetchSavings();
      fetchAfterschool();
      fetchFinancialSummary();
      fetchPendingTransactions();
      setSuccess('Data refreshed!');
      setTimeout(() => setSuccess(''), 2000);
    }}
    className="mt-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
  >
    <span>🔄</span> Refresh Data
  </button>
</div>

        {/* Group Progress - REAL DATA */}
        {groupProgress && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-4 sm:p-6 text-white shadow-xl mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">🎯</span> 
              Group Savings Progress
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  Ksh {groupProgress.current_total?.toLocaleString() || '0'}
                </div>
                <div className="text-xs sm:text-sm text-green-100">
                  Current Total
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  Ksh {groupProgress.yearly_target?.toLocaleString() || '0'}
                </div>
                <div className="text-xs sm:text-sm text-green-100">
                  Yearly Target
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  {groupProgress.progress_percentage || '0'}%
                </div>
                <div className="text-xs sm:text-sm text-green-100">
                  Progress
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  {groupProgress.total_members || '11'}
                </div>
                <div className="text-xs sm:text-sm text-green-100">
                  Members
                </div>
              </div>
            </div>
            <div className="mt-4 bg-white/20 rounded-2xl p-3">
              <div className="text-sm text-green-100">
                {groupProgress.message || 'Track your group savings progress'}
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals - REAL DATA - Only for Admins */}
        {(userRole === 'treasurer' || userRole === 'admin') && pendingTransactions.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/50 dark:to-amber-900/50 rounded-3xl p-4 sm:p-6 shadow-xl border border-orange-200 dark:border-orange-800 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⏳</span> Pending Approvals ({pendingTransactions.length})
            </h3>
            <div className="space-y-3">
              {pendingTransactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-800 rounded-2xl p-4 border border-orange-200 dark:border-orange-700">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-100">
                      Member #{transaction.member_code} - {transaction.type === 'savings' ? 'Savings' : 'After-school'}
                    </div>
                    <div className="text-orange-600 dark:text-orange-400 font-bold">Ksh {transaction.amount}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Submitted: {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleApproveTransaction(transaction.id)}
                    className="mt-2 sm:mt-0 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-sm"
                  >
                    Approve ✅
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Summary - REAL DATA */}
        {financialSummary && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-4 sm:p-6 text-white shadow-xl mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📊</span> 
              {userRole === 'member' ? 'My Financial Summary' : 'Financial Summary'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  Ksh {userRole === 'member' ? (currentUser?.balance || '0') : (financialSummary.total_savings?.toLocaleString() || '0')}
                </div>
                <div className="text-xs sm:text-sm text-blue-100">
                  {userRole === 'member' ? 'My Balance' : 'Total Savings'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  Ksh {userRole === 'member' ? (userSavings.reduce((sum, s) => sum + Number(s.amount || 0), 0).toLocaleString()) : (financialSummary.total_loans?.toLocaleString() || '0')}
                </div>
                <div className="text-xs sm:text-sm text-blue-100">
                  {userRole === 'member' ? 'My Contributions' : 'Total Loans'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  {userRole === 'member' ? userAfterschool.filter(a => !a.paid).length : (financialSummary.total_fines?.toLocaleString() || '0')}
                </div>
                <div className="text-xs sm:text-sm text-blue-100">
                  {userRole === 'member' ? 'Pending' : 'Total Fines'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold">
                  Ksh {userRole === 'member' ? (currentUser?.balance || '0') : ((financialSummary.total_savings || 0) + (financialSummary.total_loans || 0)).toLocaleString()}
                </div>
                <div className="text-xs sm:text-sm text-blue-100">
                  {userRole === 'member' ? 'Available' : 'Grand Total'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info for Members */}
        {userRole === 'member' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/50 dark:to-emerald-900/50 rounded-3xl p-4 sm:p-6 shadow-xl border border-green-200 dark:border-green-800 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💳</span> Payment Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200">
                <div className="font-semibold text-green-800 dark:text-green-300 mb-2">Bank Transfer</div>
                <div><strong>Paybill:</strong> 522522</div>
                <div><strong>Account:</strong> 1341299678</div>
                <div><strong>Reference:</strong> #{currentUser?.member_code}</div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 border border-green-200 dark:border-green-700 text-gray-800 dark:text-gray-200">
                <div className="font-semibold text-green-800 dark:text-green-300 mb-2">After Payment</div>
                <div>1. Make payment using above details</div>
                <div>2. Submit your payment here</div>
                <div>3. Wait for admin approval (1-2 hours)</div>
                <div>4. Receive confirmation email</div>
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
        <div className="flex bg-white/50 dark:bg-gray-800/50 rounded-2xl p-1 mb-6 sm:mb-8 shadow-lg border border-white/60 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("savings")}
            className={`flex-1 py-2 sm:py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === "savings" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            💰 {userRole === 'member' ? 'My Savings' : 'Regular Savings'}
          </button>
          <button
            onClick={() => setActiveTab("afterschool")}
            className={`flex-1 py-2 sm:py-3 px-4 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
              activeTab === "afterschool" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            🎓 {userRole === 'member' ? 'My Contributions' : 'After-school'}
          </button>
        </div>

        {/* Savings Tab */}
        {activeTab === "savings" && (
          <>
            {/* Add Savings Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">
                  {userRole === 'member' ? '💸' : '➕'}
                </span> 
                {userRole === 'member' ? 'Add New Savings' : 'Add New Savings'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                {userRole !== 'member' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Member</label>
                    <select 
                      value={newSaving.member_code}
                      onChange={e => setNewSaving({...newSaving, member_code: e.target.value})}
                      className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="">Select Member</option>
                      {membersDropdown.map(member => (
                        <option key={member.member_code} value={member.member_code}>
                          {member.name} ({member.member_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {userRole === 'member' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Your Member Code</label>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400">
                      #{currentUser?.member_code} - {currentUser?.name}
                    </div>
                  </div>
                )}
                <div className={userRole === 'member' ? 'md:col-span-1' : ''}>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Amount (Ksh)</label>
                  <input 
                    type="number" 
                    placeholder="Amount 💰" 
                    value={newSaving.amount}
                    onChange={e => setNewSaving({...newSaving, amount: e.target.value})}
                    className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button 
                  onClick={handleAddSaving}
                  disabled={loading}
                  className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 text-sm sm:text-base ${
                    userRole === 'member' ? 'md:col-span-1' : ''
                  }`}
                >
                  {loading ? "Processing..." : userRole === 'member' ? "Submit for Approval ⏳" : "Add Saving 🚀"}
                </button>
              </div>
              {userRole === 'member' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  💡 Your savings will be added after admin verification (1-2 hours)
                </p>
              )}
            </div>

            {/* Savings Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Total Savings Card */}
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl p-4 sm:p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold">
                    {userRole === 'member' ? 'My Total Savings' : 'Total Savings'}
                  </h3>
                  <span className="text-xl sm:text-2xl">🏦</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-4">
                  Ksh {userRole === 'member' ? (currentUser?.balance?.toLocaleString() || '0') : stats.totalSavings.toLocaleString()}
                </p>
                
                <div className="bg-white/20 rounded-2xl p-3 sm:p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <span>📊</span> Recent {userRole === 'member' ? 'My ' : ''}Transactions
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userSavings.length > 0 ? (
                      userSavings.slice(0, 5).map((s, idx) => (
                        <div key={s.id || idx} className="flex justify-between items-center bg-white/10 rounded-xl p-2 sm:p-3">
                          <span className="font-medium text-xs sm:text-sm">
                            {userRole === 'member' ? 'Savings' : `${s.name} (${s.member_code})`}
                          </span>
                          <span className="font-bold text-xs sm:text-sm">Ksh {s.amount}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/70 text-center py-2 text-sm">
                        {userRole === 'member' ? 'No savings yet 📭' : 'No savings yet 📭'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📈</span> 
                  {userRole === 'member' ? 'My Savings Overview' : 'Savings Overview'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/50 rounded-2xl border border-green-200 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-300 font-semibold text-sm sm:text-base">
                      {userRole === 'member' ? 'My Total Saved' : 'Total Members Saved'}
                    </span>
                    <span className="text-green-700 dark:text-green-300 font-bold text-sm sm:text-base">
                      {userRole === 'member' ? userSavings.length : new Set(userSavings.map(s => s.member_code)).size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/50 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm sm:text-base">
                      {userRole === 'member' ? 'My Transactions' : 'Total Transactions'}
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 font-bold text-sm sm:text-base">{userSavings.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/50 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-700 dark:text-purple-300 font-semibold text-sm sm:text-base">
                      {userRole === 'member' ? 'My Average' : 'Average Saving'}
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 font-bold text-sm sm:text-base">
                      Ksh {userSavings.length > 0 ? Math.round(stats.totalSavings / userSavings.length).toLocaleString() : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Savings Records Table - ADD THIS NEW SECTION */}
{(userRole === 'admin' || userRole === 'treasurer') && userSavings.length > 0 && (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700 mt-6">
    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
      <span className="text-xl sm:text-2xl">📋</span> 
      All Savings Records
    </h3>
    
    <div className="overflow-x-auto">
      <table className="w-full text-gray-800 dark:text-gray-200">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Member</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Amount</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Date</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {userSavings.map((saving) => (
            <tr key={saving.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="py-3 px-4 text-sm">
                <div className="font-medium text-gray-800 dark:text-gray-100">{saving.name}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">#{saving.member_code}</div>
              </td>
              <td className="py-3 px-4 text-sm font-semibold text-green-600 dark:text-green-400">
                Ksh {saving.amount?.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {saving.date ? new Date(saving.date).toLocaleDateString() : 'N/A'}
              </td>
              <td className="py-3 px-4 text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSaving(saving)}
                    className="text-blue-500 hover:text-blue-700 text-xs font-medium px-3 py-1 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSaving(saving.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

        {/* After-school Tab */}
        {activeTab === "afterschool" && (
          <>
            {/* Add After-school Contribution */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700 mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">
                  {userRole === 'member' ? '🎓' : '➕'}
                </span> 
                {userRole === 'member' ? 'Add My Contribution' : 'Add After-school Contribution'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end">
                {userRole !== 'member' && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Member</label>
                    <select 
                      value={newAfterSchool.member_code}
                      onChange={e => setNewAfterSchool({...newAfterSchool, member_code: e.target.value})}
                      className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="">Select Member</option>
                      {membersDropdown.map(member => (
                        <option key={member.member_code} value={member.member_code}>
                          {member.name} ({member.member_code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {userRole === 'member' && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Your Member Code</label>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400">
                      #{currentUser?.member_code} - {currentUser?.name}
                    </div>
                  </div>
                )}
                <div className={userRole === 'member' ? 'md:col-span-1' : ''}>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">Amount (Ksh)</label>
                  <input 
                    type="number" 
                    placeholder="Amount 💰" 
                    value={newAfterSchool.amount}
                    onChange={e => setNewAfterSchool({...newAfterSchool, amount: e.target.value})}
                    className="w-full bg-white dark:bg-gray-700 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button 
                  onClick={handleAddAfterSchool}
                  disabled={loading}
                  className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25 text-sm sm:text-base ${
                    userRole === 'member' ? 'md:col-span-1' : ''
                  }`}
                >
                  {loading ? "Processing..." : userRole === 'member' ? "Submit for Approval ⏳" : "Add Contribution 🚀"}
                </button>
              </div>
              {userRole === 'member' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  💡 Your contribution will be added after admin verification
                </p>
              )}
            </div>

            {/* After-school Payments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* After-school Stats */}
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-3xl p-4 sm:p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-bold">
                    {userRole === 'member' ? 'My Contributions' : 'After-school Fund'}
                  </h3>
                  <span className="text-xl sm:text-2xl">🎓</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mb-4">
                  Ksh {userRole === 'member' 
                    ? userAfterschool.reduce((sum, a) => sum + Number(a.amount || 0), 0).toLocaleString()
                    : stats.totalAfterSchool.toLocaleString()
                  }
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white/20 rounded-xl p-3">
                    <span className="text-cyan-100 text-sm sm:text-base">
                      {userRole === 'member' ? 'My Pending' : 'Pending Payments'}
                    </span>
                    <span className="font-bold text-sm sm:text-base">
                      {userRole === 'member' 
                        ? userAfterschool.filter(a => !a.paid).length
                        : stats.pendingAfterSchool
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/20 rounded-xl p-3">
                    <span className="text-cyan-100 text-sm sm:text-base">
                      {userRole === 'member' ? 'My Pending Amount' : 'Pending Amount'}
                    </span>
                    <span className="font-bold text-sm sm:text-base">
                      Ksh {userRole === 'member'
                        ? userAfterschool.filter(a => !a.paid).reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()
                        : stats.totalAfterSchoolAmount.toLocaleString()
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* After-school Payments List */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-xl border border-white/60 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📋</span> 
                  {userRole === 'member' ? 'My Payments' : 'Pending Payments'}
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {userAfterschool.filter(a => !a.paid).length > 0 ? (
                    userAfterschool.filter(a => !a.paid).map((a) => (
                      <div key={a.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
                        <div className="flex-1 mb-2 sm:mb-0">
                          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                            {userRole === 'member' ? 'My Contribution' : `${a.name} (${a.member_code})`}
                          </span>
                          <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">Ksh {a.amount}</p>
                          {a.date && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Added: {new Date(a.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {(userRole === 'treasurer' || userRole === 'admin') && (
                          <button 
                            onClick={() => handlePayAfterschool(a.id, a.amount)}
                            className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold hover:bg-green-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/25 text-xs sm:text-sm w-full sm:w-auto"
                          >
                            Mark Paid ✅
                          </button>
                        )}
                        {userRole === 'member' && (
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <span className="text-4xl mb-2 block">🎉</span>
                      <p className="text-sm sm:text-base">
                        {userRole === 'member' ? 'No pending payments' : 'No pending payments'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {userRole === 'member' 
                          ? 'All your payments are completed!' 
                          : 'All after-school payments are completed!'
                        }
                      </p>
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