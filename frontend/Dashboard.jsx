
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";


// Component for circular savings progress

function SavingsProgress({ total, target }) {
  const percentage = Math.round((total / target) * 100);
  return (
    <div style={{ width: 120, height: 120 }}>
      <CircularProgressbar
        value={percentage}
        text={`${percentage}%`}
        styles={buildStyles({
          textColor: "#2575fc",
          pathColor: "#6a11cb",
          trailColor: "#eee",
        })}
      />
      <p className="text-center mt-2 text-sm text-gray-700">
        Saved: {total.toLocaleString()} / {target.toLocaleString()}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [loans, setLoans] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [target] = useState(60000);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    activeLoans: 0,
    progress: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel with error handling
      const [membersRes, savingsRes, loansRes, statsRes] = await Promise.allSettled([
        getMembers(),
        getTotalSavings(),
        getLoans(),
        getDashboardStats()
      ]);

      // Handle members response
      let membersData = [];
      if (membersRes.status === 'fulfilled') {
        membersData = Array.isArray(membersRes.value?.data) ? membersRes.value.data : [];
      }
      setMembers(membersData);

      // Handle savings response
      let savingsAmount = 0;
      if (savingsRes.status === 'fulfilled') {
        const savingsData = savingsRes.value?.data;
        savingsAmount = savingsData?.total_savings || savingsData?.total || 0;
      }
      setTotalSavings(savingsAmount);

      // Handle loans response
      let loansData = [];
      if (loansRes.status === 'fulfilled') {
        loansData = Array.isArray(loansRes.value?.data) ? loansRes.value.data : [];
      }
      setLoans(loansData);

      // Handle leaderboard response
      let leaderboardData = [];
      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value?.data;
        leaderboardData = statsData?.topSavers || statsData?.leaderboard || [];
      }
      setLeaderboard(leaderboardData);

      // Calculate progress
      const progress = Math.min((savingsAmount / target) * 100, 100);

      setStats({
        totalMembers: membersData.length,
        totalSavings: savingsAmount,
        activeLoans: loansData.length,
        progress: progress
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe data access
  const safeTotalSavings = totalSavings || 0;
  const safeProgress = Math.min((safeTotalSavings / target) * 100, 100);
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-2">Welcome to your Mercure management dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Members Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Members</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.totalMembers}</h3>
              <p className="text-green-500 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Active community
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              👥
            </div>
          </div>
        </div>

        {/* Total Savings Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Savings</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                Ksh {safeTotalSavings.toLocaleString()}
              </h3>
              <p className="text-blue-500 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Group savings
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
              💰
            </div>
          </div>
        </div>

        {/* Total Loans Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Loans</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{stats.activeLoans}</h3>
              <p className="text-orange-500 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Current loans
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
              📊
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Savings Goal</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">{safeProgress.toFixed(0)}%</h3>
              <p className="text-purple-500 text-sm mt-1 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Target: Ksh {target.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
              🎯
            </div>
          </div>
        </div>
      </div>

      {/* Progress and Leaderboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Savings Progress */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Savings Progress</h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
              {safeProgress.toFixed(1)}% Complete
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Circular Progress */}
            <div className="flex-shrink-0">
              <div style={{ width: 140, height: 140 }}>
                <CircularProgressbar
                  value={safeProgress}
                  text={`${safeProgress.toFixed(0)}%`}
                  styles={buildStyles({
                    textColor: "#7c3aed",
                    pathColor: "#7c3aed",
                    trailColor: "#e5e7eb",
                    textSize: '16px',
                    pathTransitionDuration: 1,
                  })}
                />
              </div>
            </div>

            {/* Progress Details */}
            <div className="flex-1">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Current Savings</span>
                    <span className="font-semibold">Ksh {safeTotalSavings.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${safeProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Target Goal</span>
                    <span className="font-semibold">Ksh {target.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {target - safeTotalSavings > 0 
                      ? `Ksh ${(target - safeTotalSavings).toLocaleString()} needed to reach goal`
                      : '🎉 Goal achieved!'
                    }
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-purple-600 font-bold text-lg">{stats.totalMembers}</div>
                    <div className="text-purple-500 text-xs">Members</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-bold text-lg">{stats.activeLoans}</div>
                    <div className="text-blue-500 text-xs">Active Loans</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Top Savers</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-sm font-medium">
              🏆 Leaderboard
            </span>
          </div>

          <div className="space-y-4">
            {safeLeaderboard.length > 0 ? (
              safeLeaderboard.slice(0, 5).map((member, index) => (
                <div 
                  key={member.id || index} 
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {member.name || `Member ${index + 1}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.role || 'Member'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      Ksh {(member.total_savings || member.savings || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Savings</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No leaderboard data yet</p>
                <p className="text-sm mt-1">Start saving to appear here!</p>
              </div>
            )}
          </div>

          {safeLeaderboard.length > 5 && (
            <button className="w-full mt-4 text-center text-purple-600 hover:text-purple-700 text-sm font-medium py-2">
              View All {safeLeaderboard.length} Members →
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-white/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.totalMembers}</div>
          <div className="text-gray-500 text-sm">Total Members</div>
        </div>
        <div className="bg-white/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">Ksh {safeTotalSavings.toLocaleString()}</div>
          <div className="text-gray-500 text-sm">Group Savings</div>
        </div>
        <div className="bg-white/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.activeLoans}</div>
          <div className="text-gray-500 text-sm">Active Loans</div>
        </div>
        <div className="bg-white/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{safeProgress.toFixed(0)}%</div>
          <div className="text-gray-500 text-sm">Goal Progress</div>
        </div>
      </div>
    </div>
  );

}
