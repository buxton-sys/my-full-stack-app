import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Members from "./pages/Members";
import Savings from "./pages/Savings";
import Loans from "./pages/Loans";
import Fines from "./pages/Fines";
import Announcements from "./pages/Announcements";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import SuperAdminPanel from "./pages/SuperAdminPanel";


// Enhanced authentication check
const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  
  if (!token || !user) {
    return false;
  }
  
  try {
    // Basic token validation (you can add JWT decode validation here)
    return true;
  } catch (error) {
    // Clear invalid tokens
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    return false;
  }
};

const getUserRole = () => {
  return localStorage.getItem("role")?.toLowerCase() || "member";
};

// Enhanced Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  if (!isAuthenticated()) {
    // Clear any stale data and redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  const userRole = getUserRole();
  
  // Check role-based access if specific roles are required
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-4">
            Your role <span className="font-bold capitalize">{userRole}</span> doesn't have access to this page.
          </p>
          <p className="text-gray-400 text-sm mb-6">
            Required roles: {allowedRoles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}
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

  return children;
}

// Public Route Component (redirect to dashboard if already authenticated)
function PublicRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Only accessible when NOT logged in */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected Routes with Layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="savings" element={<Savings />} />
          <Route path="loans" element={<Loans />} />
          <Route path="fines" element={<Fines />} />
          <Route path="announcements" element={<Announcements />} />
          
          {/* Super Admin-only routes */}
          <Route path="super-admin" element={
         <ProtectedRoute allowedRoles={["treasurer", "chairperson"]}>
          <SuperAdminPanel />
          </ProtectedRoute>
          } />

          {/* Admin-only routes */}
          <Route path="members" element={
            <ProtectedRoute allowedRoles={["admin", "chairperson", "treasurer", "secretary"]}>
              <Members />
            </ProtectedRoute>
          } />
          
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={["treasurer", "chairperson"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;