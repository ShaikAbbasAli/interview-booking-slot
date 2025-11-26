import React, { useState } from "react";
import API from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const query = new URLSearchParams(useLocation().search);
  const userId = query.get("userId");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 NEW

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    try {
      await API.post("/auth/reset-password", {
        userId,
        otp,
        newPassword,
      });

      setMsg("Password reset successfully");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-3xl text-cyan-400 mb-4">Reset Password</h2>

      {msg && <div className="p-2 bg-green-600 mb-3">{msg}</div>}
      {error && <div className="p-2 bg-red-600 mb-3">{error}</div>}

      <form onSubmit={submit}>
        <input
          type="text"
          placeholder="Enter OTP"
          required
          className="w-full p-3 bg-slate-800 rounded mb-3"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
        />

        {/* Password Input with Show/Hide */}
        <div className="relative mb-3">
          <input
            type={showPassword ? "text" : "password"} // 👈 Toggle
            placeholder="New Password"
            required
            className="w-full p-3 bg-slate-800 rounded"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-gray-300"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button className="w-full py-2 bg-cyan-600 rounded cursor-pointer">
          Reset Password
        </button>
      </form>
    </div>
  );
}
