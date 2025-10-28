import React, { useEffect, useState } from "react";
import { getAutomationStatus, triggerDaily, triggerWeekly, getAutoActivities } from "../api";

export default function AutomationDashboard() {
  const [status, setStatus] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchActivities();
    
    // Real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchStatus();
      fetchActivities();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await getAutomationStatus();
      setStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch automation status');
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await getAutoActivities();
      setActivities(res.data);
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  };

  const handleDailyTrigger = async () => {
    setLoading(true);
    try {
      await triggerDaily();
      setTimeout(() => {
        fetchStatus();
        fetchActivities();
        setLoading(false);
      }, 2000);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleWeeklyTrigger = async () => {
    setLoading(true);
    try {
      await triggerWeekly();
      setTimeout(() => {
        fetchStatus();
        fetchActivities();
        setLoading(false);
      }, 2000);
    } catch (error) {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'interest': return '📈';
      case 'penalty': return '⚠️';
      case 'inactivity': return '🚩';
      case 'savings': return '💰';
      default: return '🔔';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            🤖 Automation Center
          </h1>
          <p className="text-gray-600">Smart system managing your group automatically</p>
        </div>

        {/* Automation Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Daily Automation</h3>
              <span className="text-2xl">🌅</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Runs at 6:00 AM daily</p>
            <div className="flex gap-2">
              <button 
                onClick={handleDailyTrigger}
                disabled={loading}
                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm"
              >
                {loading ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Weekly Automation</h3>
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">Runs Monday 8:00 AM</p>
            <div className="flex gap-2">
              <button 
                onClick={handleWeeklyTrigger}
                disabled={loading}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors text-sm"
              >
                {loading ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Real-time Tracking</h3>
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Active monitoring:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• New loans → Auto due dates</li>
              <li>• Savings → Activity updates</li>
              <li>• Changes → Instant processing</li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">System Status</h3>
              <span className="text-2xl">🟢</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">All systems operational</p>
            <div className="text-xs text-gray-500">
              {status && (
                <>
                  <p>Last daily: {new Date(status.lastDailyRun).toLocaleTimeString()}</p>
                  <p>Next daily: {new Date(status.nextDailyRun).toLocaleTimeString()}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* What's Automated Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">⚡</span> Automated Processes
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💰</span>
                <h4 className="font-bold text-gray-800">Smart Interest</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 10% weekly on active loans</li>
                <li>• Auto-compounded</li>
                <li>• Real-time calculation</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-100 rounded-2xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-bold text-gray-800">Auto-Penalties</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Ksh 50/week for late loans</li>
                <li>• Missed savings fines</li>
                <li>• Inactivity penalties</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🚩</span>
                <h4 className="font-bold text-gray-800">Member Tracking</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 90-day inactivity flag</li>
                <li>• Auto-reactivation on activity</li>
                <li>• Participation monitoring</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 border border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📊</span>
                <h4 className="font-bold text-gray-800">Progress Tracking</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Savings growth analytics</li>
                <li>• Loan repayment progress</li>
                <li>• Group performance</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl p-4 border border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🔔</span>
                <h4 className="font-bold text-gray-800">Real-time Alerts</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Instant loan overdue alerts</li>
                <li>• Savings milestone notifications</li>
                <li>• System activity logs</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">📈</span>
                <h4 className="font-bold text-gray-800">Monthly Reports</h4>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Auto-generated summaries</li>
                <li>• Financial health reports</li>
                <li>• Performance analytics</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Automation Activities */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">📋</span> Recent Automated Activities
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-purple-300 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{activity.description}</p>
                      <p className="text-sm text-gray-500">
                        Member #{activity.memberId} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.amount && (
                      <p className="font-bold text-purple-600">Ksh {activity.amount}</p>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activity.type === 'penalty' ? 'bg-red-100 text-red-800' :
                      activity.type === 'interest' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-2 block">🤖</span>
                <p>No automated activities yet</p>
                <p className="text-sm text-gray-400 mt-1">System will log activities here automatically</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}