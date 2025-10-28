import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";
import { login as loginApi } from "../api";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [alert, setAlert] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert("");

    if (!formData.email || !formData.password) {
      setAlert("⚠️ Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Attempting login with:", formData.email);
      
      const res = await loginApi(formData);
      console.log("Login response:", res);
      
      if (res.data.success && res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        
        console.log("Login successful, stored data:", {
          token: res.data.token,
          role: res.data.role,
          user: res.data.user
        });
        
        setAlert("🎉 Login successful! Redirecting...");
        setTimeout(() => {
          console.log("Redirecting to dashboard...");
          navigate("/dashboard");
        }, 1200);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Login error details:", err);
      console.error("Error response:", err.response);
      
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      err.message || 
                      "Login failed. Please check your credentials.";
      
      setAlert(`❌ ${errorMsg}`);
      
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setAlert("🔗 Password reset feature coming soon!");
    setTimeout(() => setAlert(""), 3000);
  };

  const fillTestCredentials = () => {
    setFormData({
      email: "admin@mercury.com",
      password: "admin123"
    });
    setAlert("👆 Test credentials filled! You'll need to create this user first.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 font-['Inter']">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔐</span>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-300 text-sm">Sign in to your Mercure Account</p>
        </div>

        {alert && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            alert.includes("🎉") || alert.includes("👆")
              ? "bg-green-500/20 text-green-300 border border-green-500/30" 
              : alert.includes("❌")
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
          }`}>
            {alert}
          </div>
        )}

        <button
          onClick={fillTestCredentials}
          className="w-full mb-4 bg-white/10 border border-white/20 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
        >
          🚀 Fill Test Credentials
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email 📧"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password 🔒"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
                required
                minLength="6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isLoading 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/25"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing In...
              </div>
            ) : (
              "Sign In 🚀"
            )}
          </button>
        </form>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
          <button
            onClick={handleForgotPassword}
            className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors duration-200 text-sm"
            type="button"
          >
            🔑 Forgot Password?
          </button>

          <p className="text-gray-300 text-sm">
            New here?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors duration-200 hover:underline"
              type="button"
            >
              Join Us 👋
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
        
  


export default Login;
