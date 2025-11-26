import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    try {
      const res = await API.post("/auth/forgot-password", { email });
      setMsg("OTP sent to email.");
      navigate(`/reset-password?userId=${res.data.userId}`);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed");
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-3xl text-cyan-400 mb-4">Forgot Password</h2>

      {msg && <div className="p-2 bg-green-600 mb-3">{msg}</div>}
      {error && <div className="p-2 bg-red-600 mb-3">{error}</div>}

      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Enter Gmail"
          className="w-full p-3 bg-slate-800 rounded mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="w-full py-2 bg-cyan-600 rounded cursor-pointer">Send OTP</button>
      </form>
    </div>
  );
}
