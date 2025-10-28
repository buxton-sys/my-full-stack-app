import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '...';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto flex items-center justify-between p-4 font-sans">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">Mercure</h1>
          <span className="text-sm text-gray-500 dark:text-gray-300">Automation System</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <input
              placeholder="Search members, loans..."
              className="px-4 py-2 rounded-md border w-64 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-300"
            />
          </div>
          

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <button 
                  onClick={handleLogout} 
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300"
                >
                  Logout
                </button>
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200" title={user?.name}>
                  {userInitials}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-300">Login</Link>
                <Link to="/register" className="text-sm text-white bg-primary-600 dark:bg-primary-500 px-3 py-1 rounded-md hover:bg-primary-700 dark:hover:bg-primary-400">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
