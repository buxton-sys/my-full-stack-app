import React, { useState, useEffect } from "react";
import { sendManualPrompt, getAutomationMembers, triggerMorningPrompts, triggerEveningPrompts, getAutomationStatus } from "../api";

export default function SuperAdmin() {
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("afterschool");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [automationStatus, setAutomationStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("manual");

  const paymentTypes = [
    { value: "afterschool", label: "🎓 After School Program", amount: 150, defaultDescription: "After-school program fee" },
    { value: "fine", label: "⚡ Fine Payment", amount: "", defaultDescription: "Fine payment" },
    { value: "loan", label: "💸 Loan Repayment", amount: "", defaultDescription: "Loan repayment" },
    { value: "contribution", label: "💰 Special Contribution", amount: "", defaultDescription: "Special group contribution" },
    { value: "event", label: "🎉 Event Fee", amount: "", defaultDescription: "Event participation fee" }
  ];

  useEffect(() => {
    fetchMembers();
    fetchAutomationStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchAutomationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await getAutomationMembers();
      if (res.data.success) {
        setMembers(res.data.members);
      }
    } catch (error) {
      console.error("Failed to fetch members");
      setMessage("❌ Failed to load members");
    }
  };

  const fetchAutomationStatus = async () => {
    try {
      const res = await getAutomationStatus();
      if (res.data.success) {
        setAutomationStatus(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch automation status");
    }
  };

  const handleMemberSelect = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    const selected = paymentTypes.find(pt => pt.value === type);
    if (selected && selected.amount) {
      setAmount(selected.amount.toString());
      setDescription(selected.defaultDescription);
    } else {
      setAmount("");
      setDescription(selected.defaultDescription);
    }
  };

  const handleSendManualPrompt = async () => {
    if (selectedMembers.length === 0) {
      setMessage("❌ Please select at least one member!");
      return;
    }

    if (!amount || amount <= 0) {
      setMessage("❌ Please enter a valid amount!");
      return;
    }

    // Block Ksh 30 savings manual prompts
    if (amount == 30 && paymentType === "savings") {
      setMessage("❌ Ksh 30 savings are automated. Use manual prompts for other amounts.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const selectedPhones = members
        .filter(member => selectedMembers.includes(member.id))
        .map(member => member.phone);

      const res = await sendManualPrompt({
        userPhones: selectedPhones,
        amount: Number(amount),
        paymentType,
        description: description || paymentTypes.find(pt => pt.value === paymentType)?.defaultDescription
      });

      if (res.data.success) {
        const successCount = res.data.results.filter(r => r.status === 'success').length;
        setMessage(`✅ STK Push sent to ${successCount} members! They will receive M-PESA prompts.`);
        
        // Show detailed results
        if (res.data.results) {
          const failed = res.data.results.filter(r => r.status === 'failed');
          if (failed.length > 0) {
            setMessage(prev => prev + ` ${failed.length} failed.`);
          }
        }

        // Reset form
        setSelectedMembers([]);
        setAmount("");
        setDescription("");
      } else {
        setMessage(`❌ Failed: ${res.data.error}`);
      }
    } catch (error) {
      setMessage("❌ Failed to send prompts. Please try again.");
      console.error("Manual prompt error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutomated = async (type) => {
    setLoading(true);
    setMessage(`🔄 Triggering ${type} automated prompts...`);

    try {
      const res = type === 'morning' 
        ? await triggerMorningPrompts()
        : await triggerEveningPrompts();

      if (res.data.success) {
        setMessage(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} STK Push prompts triggered! Members will receive M-PESA prompts.`);
        fetchAutomationStatus();
      } else {
        setMessage(`❌ Failed to trigger ${type} prompts`);
      }
    } catch (error) {
      setMessage(`❌ Failed to trigger ${type} prompts`);
      console.error("Trigger error:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectAllMembers = () => {
    setSelectedMembers(members.map(member => member.id));
  };

  const clearSelection = () => {
    setSelectedMembers([]);
  };

  const getSelectedMembersCount = () => {
    return selectedMembers.length;
  };

  const getSelectedMembersNames = () => {
    return members
      .filter(member => selectedMembers.includes(member.id))
      .map(member => member.name)
      .join(", ");
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            👑 Super Admin Panel
          </h1>
          <p className="text-gray-600">Manage automated and manual payment prompts</p>
        </div>

        {/* Automation Status */}
        {automationStatus && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-200 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🤖</span> Automation System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                <div className="text-2xl mb-2">🟢</div>
                <div className="font-bold text-green-700">System Active</div>
                <div className="text-sm text-green-600">STK Push Automation</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="text-2xl mb-2">⏰</div>
                <div className="font-bold text-blue-700">Next Auto-run</div>
                <div className="text-sm text-blue-600">
                  {automationStatus.nextDailyRunFormatted || "8:00 AM Tomorrow"}
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-bold text-purple-700">Last Run</div>
                <div className="text-sm text-purple-600">
                  {automationStatus.lastDailyRun 
                    ? new Date(automationStatus.lastDailyRun).toLocaleString() 
                    : "Not run yet"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-white/50 rounded-2xl p-1 mb-8 shadow-lg border border-white/60">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "manual" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            📱 Manual STK Push
          </button>
          <button
            onClick={() => setActiveTab("automated")}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === "automated" 
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🤖 Automated Controls
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            message.includes("✅") || message.includes("🔄")
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          }`}>
            {message}
          </div>
        )}

        {/* Manual STK Push Tab */}
        {activeTab === "manual" && (
          <div className="space-y-8">
            {/* Payment Configuration */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">⚡</span> Payment Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {paymentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (Ksh)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Manual prompts are for amounts other than Ksh 30 savings
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Monthly after-school fee, Fine for late payment..."
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Member Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">👥</span> Select Members
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllMembers}
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="bg-gray-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-600 transition-colors text-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-800">
                    {getSelectedMembersCount()} members selected
                  </span>
                  <span className="text-sm text-blue-600">
                    {getSelectedMembersCount() > 0 ? getSelectedMembersNames() : "No members selected"}
                  </span>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-2xl p-4 bg-gray-50">
                {members.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Loading members...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map(member => (
                      <div 
                        key={member.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                          selectedMembers.includes(member.id)
                            ? "bg-purple-100 border-purple-300 shadow-md"
                            : "bg-white border-gray-200 hover:border-purple-300"
                        }`}
                        onClick={() => handleMemberSelect(member.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => handleMemberSelect(member.id)}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{member.name}</p>
                          <p className="text-sm text-gray-600 truncate">{member.phone}</p>
                          <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <button
                onClick={handleSendManualPrompt}
                disabled={loading || selectedMembers.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/25 text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending STK Push Prompts...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <span className="text-xl">📱</span>
                    Send STK Push to {getSelectedMembersCount()} Members
                  </span>
                )}
              </button>
              
              <div className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">What happens next:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Selected members will receive <strong>M-PESA STK Push prompts</strong></li>
                  <li>• They'll see: "Pay Ksh {amount} to Mercure? Enter PIN"</li>
                  <li>• Payments are automatically recorded when completed</li>
                  <li>• Confirmations sent via SMS & Email</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Automated Controls Tab */}
        {activeTab === "automated" && (
          <div className="space-y-6">
            {/* Automated System Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">⏰</span> Automated Ksh 30 Savings
              </h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
                <p className="text-yellow-800 font-semibold">
                  🚫 Manual control disabled for Ksh 30 savings - They are fully automated!
                </p>
                <p className="text-yellow-700 text-sm mt-2">
                  System automatically sends STK Push prompts at <strong>8:00 AM</strong> and <strong>8:00 PM</strong> 
                  to all members who haven't paid their daily Ksh 30 savings.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🌅 Morning Run (8:00 AM)</h4>
                  <p className="text-green-700 text-sm">Automatic STK Push for daily savings</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">🌙 Evening Run (8:00 PM)</h4>
                  <p className="text-blue-700 text-sm">Reminder STK Push for unpaid members</p>
                </div>
              </div>
            </div>

            {/* Manual Triggers for Testing */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-2xl">🧪</span> Testing & Manual Triggers
              </h3>
              <p className="text-gray-600 mb-4">
                Use these buttons to manually trigger the automated system for testing purposes.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleTriggerAutomated('morning')}
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all duration-300"
                >
                  {loading ? "Triggering..." : "🌅 Trigger Morning Prompts"}
                </button>
                
                <button
                  onClick={() => handleTriggerAutomated('evening')}
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-300"
                >
                  {loading ? "Triggering..." : "🌙 Trigger Evening Prompts"}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                💡 These will send STK Push prompts to all members who haven't paid today.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}