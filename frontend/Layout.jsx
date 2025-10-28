import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Diagnostics from './Diagnostics';

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => navigate('/login');

  return (
    <div className="min-h-screen bg-genz dark:bg-genz">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 container mx-auto">
          <Outlet />
        </main>
      </div>
      <Diagnostics />
    </div>
  );
}

