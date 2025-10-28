import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  // If no token, redirect to login
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const user = localStorage.getItem("user");
  if (!token || !user) {
    // Clear any invalid data
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them
  if (allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-gray-300 mb-4">
              Your role <span className="font-bold capitalize">{role || 'none'}</span> doesn't have access to this page.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Required roles: {allowedRoles.join(', ')}
            </p>
            <button
              onClick={() => window.history.back()}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-cyan-600 hover:to-purple-600 transition-all duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
}
