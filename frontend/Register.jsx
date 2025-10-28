import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";
import { register } from "../api";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    role: "",
    phone: "",
    id: "",
    email: "",
    password: "",
    username: "",
  });
  const [alert, setAlert] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "id" && value.length > 8) return; // Changed to 8 digits
    if (name === "phone" && value.length > 9) return;
    setFormData({ ...formData, [name]: value });
  };

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const validateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { name, dob, role, phone, id, email, password, username } = formData;

    if (!name || !dob || !role || !phone || !id || !email || !password || !username) {
      setAlert("⚠️ Please fill all fields.");
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setAlert("📧 Invalid email format.");
      setIsLoading(false);
      return;
    }

    if (!validateAge(dob)) {
      setAlert("📅 You must be at least 18 years old.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setAlert("🔐 Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name,
        dob,
        role,
        phone: `+254${phone}`,
        id,
        email,
        password,
        username
      });
      setAlert("✨ Registration successful! Redirecting...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setAlert(error.response?.data?.message || "❌ Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 font-['Inter']">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Join the Squad
          </h2>
          <p className="text-gray-300 text-sm">Create your account and get started</p>
        </div>

        {alert && (
          <div className={`text-center mb-6 p-3 rounded-2xl font-medium text-sm transition-all duration-300 ${
            alert.includes("✅") || alert.includes("✨") 
              ? "bg-green-500/20 text-green-300 border border-green-500/30" 
              : alert.includes("❌") 
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
          }`}>
            {alert}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              name="name"
              placeholder="Full Name ✨"
              value={formData.name}
              onChange={handleChange}
              className="col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
            />
            
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
            />

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
            >
              <option value="" className="text-gray-700">Select Role 🎭</option>
              <option value="chairperson" className="text-gray-700">Chairperson</option>
              <option value="deputy-secretary" className="text-gray-700">Deputy Secretary</option>
              <option value="secretary" className="text-gray-700">Secretary</option>
              <option value="treasurer" className="text-gray-700">Treasurer</option>
              <option value="organizer" className="text-gray-700">Organizer</option>
              <option value="head-of-security" className="text-gray-700">Head of Security</option>
              <option value="editor-publisher" className="text-gray-700">Editor/Publisher</option>
              <option value="member" className="text-gray-700">Member</option>
              <option value="guest" className="text-gray-700">Guest</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-xl p-4 focus-within:ring-2 focus-within:ring-cyan-400 focus-within:border-transparent transition-all duration-300">
            <span className="text-gray-300 font-semibold text-sm">+254</span>
            <input
              type="tel"
              name="phone"
              placeholder="Phone 📱"
              value={formData.phone}
              onChange={handleChange}
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
          </div>

          <input
            type="number"
            name="id"
            placeholder="ID Number 🔢"
            value={formData.id}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address 📧"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
          />

          <input
            name="username"
            placeholder="Username 💫"
            value={formData.username}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
          />

          <input
            type="password"
            name="password"
            placeholder="Password 🔒"
            value={formData.password}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300"
          />

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isLoading 
                ? "bg-gray-600 cursor-not-allowed" 
                : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg shadow-cyan-500/25"
            }`}
          >
            {isLoading ? "Creating Account... ⏳" : "Join Now 🚀"}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-white/10">
          <p className="text-gray-300 text-sm">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-cyan-400 font-semibold cursor-pointer hover:text-cyan-300 transition-colors duration-200 hover:underline"
            >
              Sign In 👋
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
