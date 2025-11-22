import React, { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const userId = params.get("userId");
  const email = params.get("email");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

  const [shake, setShake] = useState(false);

  // ⏳ OTP expiry countdown (60 sec)
  const [expiryTimer, setExpiryTimer] = useState(60);

  // Allow resend only after expiry
  const [allowResend, setAllowResend] = useState(false);

  const [shouldSubmit, setShouldSubmit] = useState(false);

  // =============================
  // VERIFY OTP + AUTO LOGIN
  // =============================
  const verifyOtp = useCallback(async () => {
    try {
      const code = otp.join("");

      const res = await API.post("/auth/verify-otp", { userId, otp: code });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      toast.success("OTP Verified! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1200);

    } catch (err) {
      setShake(true);
      toast.error(err.response?.data?.msg || "Incorrect OTP!");

      setTimeout(() => setShake(false), 500);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0].focus();
    }
  }, [otp, userId, navigate]);

  // =============================
  // AUTO SUBMIT WHEN ALL DIGITS ENTERED
  // =============================
  useEffect(() => {
    if (otp.every((v) => v !== "")) {
      setShouldSubmit(true);
    }
  }, [otp]);

  useEffect(() => {
    if (shouldSubmit) {
      verifyOtp();
      setShouldSubmit(false);
    }
  }, [shouldSubmit, verifyOtp]);

  // =============================
  // HANDLE OTP INPUT
  // =============================
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // =============================
  // RESEND OTP
  // =============================
  async function resendOtp() {
    if (!allowResend) return;

    try {
      await API.post("/auth/resend-otp", { userId });
      toast.success("OTP resent to your email!");

      // Reset everything
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0].focus();
      setExpiryTimer(60);
      setAllowResend(false);

    } catch {
      toast.error("Failed to resend OTP");
    }
  }

  // =============================
  // OTP EXPIRY TIMER
  // =============================
  useEffect(() => {
    if (expiryTimer === 0) {
      setAllowResend(true); // enable resend
      return;
    }

    const id = setInterval(() => setExpiryTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [expiryTimer]);

  return (
    <div className="max-w-md mx-auto p-6 bg-slate-800 rounded-xl text-center">
      <h2 className="text-2xl mb-2 text-cyan-400 font-bold">Verify Email</h2>
      <p className="text-slate-300 text-sm mb-6">
        Enter the 6-digit OTP sent to:
        <br />
        <span className="text-white font-semibold">{email}</span>
      </p>

      {/* OTP BOXES */}
      <div className={`flex justify-between mb-4 ${shake ? "shake" : ""}`}>
        {otp.map((val, index) => (
          <input
            key={index}
            maxLength="1"
            ref={(el) => (inputsRef.current[index] = el)}
            value={val}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleBackspace(e, index)}
            className="w-12 h-12 text-center text-xl rounded bg-slate-700 text-white border border-slate-500 focus:ring-2 focus:ring-cyan-400"
          />
        ))}
      </div>

      {/* EXPIRY TIMER */}
      {!allowResend ? (
        <p className="text-sm text-slate-300 mb-3">
          OTP Expires in: <span className="text-cyan-400">{expiryTimer}s</span>
        </p>
      ) : (
        <p className="text-sm text-red-400 mb-3">OTP Expired</p>
      )}

      {/* RESEND BUTTON */}
      <button
        onClick={resendOtp}
        disabled={!allowResend}
        className={`w-full py-2 rounded text-white ${
          allowResend
            ? "bg-cyan-600 hover:bg-cyan-500"
            : "bg-slate-600 opacity-50 cursor-not-allowed"
        }`}
      >
        {allowResend ? "Resend OTP" : "Resend Disabled"}
      </button>
    </div>
  );
}
