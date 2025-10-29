import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import ErrorBoundary from "./ErrorBoundary";
import Layout from "./Layout";
import Dashboard from "./Dashboard.jsx";
import Leaderboard from "./Leaderboard.jsx";
import Members from "./Members.jsx";
import Savings from "./Savings.jsx";
import Loans from "./Loans.jsx";
import Fines from "./Fines.jsx";
import Announcements from "./Announcements.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import AdminDashboard from "./AdminDashboard.jsx";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

import { Navigate } from "react-router-dom";

// Simple theme initialization
function initializeApp() {
  try {
    document.documentElement.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
    
  } catch (error) {
    console.warn('Theme initialization error:', error);
  }
}

initializeApp();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Default route - Always go to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public routes - redirect to dashboard if authenticated */}
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

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="savings" element={<Savings />} />
            <Route path="loans" element={<Loans />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="fines" element={<Fines />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>

          {/* 404 route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-genz">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-xl text-white/80 mb-8">Page not found</p>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="bg-white/20 text-white px-6 py-3 rounded-xl backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all"
                >
                  Go to Login
                </button>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
