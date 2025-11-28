// client/src/pages/Auth.jsx
import React, { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

// ------------------------------
// Floating Input Component
// ------------------------------
function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  autoComplete = "off",
  showTogglePassword = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const finalType = type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={finalType}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        placeholder={label}
        className="peer w-full rounded-xl bg-slate-700 px-4 pt-6 pb-2
                   text-white placeholder-transparent focus:outline-none
                   focus:ring-2 focus:ring-cyan-400 transition"
      />

      <label
        htmlFor={id}
        className="absolute left-4 top-3 text-slate-300 text-sm transition-all
                   peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                   peer-placeholder-shown:text-slate-400 peer-focus:top-2 
                   peer-focus:text-xs peer-focus:text-cyan-300"
      >
        {label}
      </label>

      {showTogglePassword && type === "password" && (
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-3 text-xs bg-slate-600/50 px-2 py-1
                     rounded text-slate-200 hover:bg-slate-600"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      )}
    </div>
  );
}

// ------------------------------
// MAIN AUTH COMPONENT
// ------------------------------
export default function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    password: "",
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const switchMode = (m) => {
    setError("");
    setMode(m);
  };

  // ------------------------------
  // SIGNUP VALIDATION
  // ------------------------------
  const validateSignup = () => {
    if (!/^[A-Za-z ]+$/.test(form.name)) {
      setError("Full Name must contain only letters.");
      return false;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      setError("Phone must be 10 digits.");
      return false;
    }

    if (!/^[A-Za-z ]+$/.test(form.course)) {
      setError("Course must contain only letters.");
      return false;
    }

    return true;
  };

  // ------------------------------
  // SUBMIT HANDLER
  // ------------------------------
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await API.post("/auth/login", {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        navigate(res.data.user.role === "admin" ? "/admin/students" : "/dashboard");
        return;
      }

      // SIGNUP VALIDATION
      if (!validateSignup()) {
        setLoading(false);
        return;
      }

      const res = await API.post("/auth/signup", form);

      navigate(
        `/verify-otp?userId=${res.data.userId}&email=${encodeURIComponent(
          res.data.email
        )}`
      );

    } catch (err) {
      setError(err.response?.data?.msg || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-start justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-slate-900/60 rounded-2xl p-8 shadow-2xl border border-slate-700">

          {/* Toggle Buttons */}
          <div className="flex mb-6">
            <button
              onClick={() => switchMode("login")}
              className={`flex-1 py-2 text-lg font-bold rounded-l-xl ${mode === "login"
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300"
                }`}
            >
              Login
            </button>

            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 text-lg font-bold rounded-r-xl ${mode === "signup"
                ? "bg-cyan-600 text-white"
                : "bg-slate-700 text-slate-300"
                }`}
            >
              Signup
            </button>
          </div>

          <h2 className="text-3xl font-bold mb-6 text-cyan-400 text-center">
            {mode === "login" ? "Login" : "Create Account"}
          </h2>

          {error && (
            <div className="bg-red-600 text-white p-2 rounded mb-4 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">

            {/* Signup Extra Fields */}
            {mode === "signup" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput
                  id="name"
                  label="Full Name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
                <FloatingInput
                  id="phone"
                  label="Phone Number"
                  type="tel"
                  value={form.phone}
                  maxLength={10}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, ""); // remove non-digits
                    if (v.length <= 10) update("phone", v);
                  }}
                  required
                />
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">Course</label>
                  <select
                    id="course"
                    value={form.course}
                    onChange={(e) => update("course", e.target.value)}
                    required
                    className="w-full rounded-xl bg-slate-700 px-4 py-3 text-white 
               focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">-- Select Course --</option>
                    <option>Python</option>
                    <option>Java</option>
                    <option>MERN Stack</option>
                    <option>DevOps</option>
                    <option>.Net</option>
                    <option>CyberArk</option>
                    <option>Cyber Security</option>
                    <option>SAP - FICO</option>
                    <option>SAP - ABAP</option>
                    <option>SAP - HANA</option>
                    <option>SAP - BASIS</option>
                    <option>AI & ML</option>
                  </select>
                </div>
              </div>
            )}

            {/* Email + Password */}
            <FloatingInput
              id="email"
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />

            <FloatingInput
              id="password"
              label="New Password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              showTogglePassword
            />

            {/* Forgot Password Link */}
            {mode === "login" && (
              <p
                className="text-cyan-400 text-sm text-center cursor-pointer mt-2 hover:underline"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot Password?
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 
                         text-white font-semibold transition disabled:opacity-60"
            >
              {loading
                ? mode === "login"
                  ? "Logging in..."
                  : "Verifying..."
                : mode === "login"
                  ? "Login"
                  : "Sign Up"}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-slate-400 text-sm">
          Need help? Contact your admin.
        </p>
      </div>
    </div>
  );
}
