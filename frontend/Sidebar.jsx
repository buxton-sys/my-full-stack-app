import { Link } from "react-router-dom";

export default function Sidebar() {
  // Get current user role from localStorage
  const userRole = localStorage.getItem('role')?.toLowerCase();
  
  // Check if user is super admin (treasurer or chairperson)
  const isSuperAdmin = userRole === 'treasurer' || userRole === 'chairperson';

  return (
    <aside id="app-sidebar" className="w-64 bg-white/60 dark:bg-gray-900/70 backdrop-blur-md min-h-screen p-5 font-sans border-r border-gray-100 dark:border-gray-800">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Mercure</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Admin dashboard</p>
      </div>

      <nav className="flex flex-col gap-2">
        <Link to="/" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">📊</span>
          Dashboard
        </Link>
        <Link to="/members" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">👥</span>
          Members
        </Link>
        <Link to="/savings" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">💰</span>
          Savings
        </Link>
        <Link to="/loans" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">📈</span>
          Loans
        </Link>
        <Link to="/fines" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">⚡</span>
          Fines
        </Link>
        <Link to="/announcements" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">📢</span>
          Announcements
        </Link>
        <Link to="/leaderboard" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">🏆</span>
          Leaderboard
        </Link>
        <Link to="/admin" className="flex items-center p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-300 transition-all duration-200">
          <span className="mr-3">🛡️</span>
          Admin Panel
        </Link>
        
        {/* SUPER ADMIN LINK - Only show to treasurers & chairpersons */}
        {isSuperAdmin && (
          <Link 
            to="/super-admin" 
            className="flex items-center p-3 rounded-md bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:from-purple-500/20 hover:to-blue-500/20 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 group"
          >
            <span className="mr-3 text-lg">👑</span>
            <div>
              <div className="font-semibold">Super Admin</div>
              <div className="text-xs text-purple-600 dark:text-purple-400 opacity-80">
                STK Push Manager
              </div>
            </div>
            <span className="ml-auto text-xs bg-purple-500 text-white px-2 py-1 rounded-full animate-pulse">
              NEW
            </span>
          </Link>
        )}
      </nav>

      {/* User Role Badge */}
      <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Logged in as:</div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
            {userRole || 'member'}
          </div>
          {isSuperAdmin && (
            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
              Super Admin
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto pt-6">
        <div className="text-xs text-gray-500 dark:text-gray-400">v0.1.0</div>
      </div>
    </aside>
  );
}