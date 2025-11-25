import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAuthPage = location.pathname === "/auth";

  const [menuOpen, setMenuOpen] = useState(false);

  /* ---------------------------------------------------------
      FIXED LOGOUT — No freeze, no stalling, no re-render loop
  --------------------------------------------------------- */
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = () => {
    if (loggingOut) return;
    setLoggingOut(true);

    toast.success("Logged out successfully");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Hard redirect → Prevent ProtectedRoute from re-running
    window.location.href = "/auth";
  };

  return (
    <div className="
      fixed top-0 left-0 w-full z-50 
      bg-slate-900/90 backdrop-blur-xl
      border-b border-slate-700/60 
      shadow-[0_4px_20px_rgba(0,255,255,0.10)]
    ">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">

        {/* ---------------- LOGO + TITLE ---------------- */}
        <Link
          to={user?.role === "admin" ? "/admin/students" : "/dashboard"}
          className="flex items-center gap-4"
        >
          {/* Glowing Logo */}
          <div className="
            w-14 h-14 rounded-full overflow-hidden
            shadow-[0_0_12px_rgba(0,255,255,0.6)]
            ring-2 ring-cyan-400/50 hover:ring-cyan-300
            transition-all duration-300 cursor-pointer
          ">
            <img
              src="https://i.postimg.cc/vmXGMpr3/Aikya-AI.png"
              alt="logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="leading-tight">
            <div className="
              text-3xl font-extrabold
              bg-gradient-to-r from-cyan-300 to-blue-400 
              bg-clip-text text-transparent
              tracking-wide drop-shadow-[0_2px_8px_rgba(0,255,255,0.6)]
            ">
              Aikya Interview
            </div>
            <div className="text-xs text-slate-400 tracking-wide">
              Smart Booking System
            </div>
          </div>
        </Link>

        {/* ---------------- DESKTOP MENU ---------------- */}
        {!isAuthPage && user && (
          <nav className="hidden md:flex items-center gap-3 ml-4">

            {/* STUDENT TABS */}
            {user.role === "student" && (
              <>
                <NavItem to="/dashboard" label="Dashboard" active={location.pathname === "/dashboard"} />
                <NavItem to="/book" label="Book Slot" active={location.pathname === "/book"} />
                <NavItem to="/mybookings" label="My Bookings" active={location.pathname === "/mybookings"} />
                <NavItem to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />
                <NavItem to="/today-bookings" label="Today Slot Details" active={location.pathname === "/today-bookings"} />
              </>
            )}

            {/* ADMIN TABS */}
            {user.role === "admin" && (
              <>
                <NavItem to="/admin/students" label="Students" active={location.pathname === "/admin/students"} />
                <NavItem to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />
                <NavItem to="/today-bookings" label="Today Slot Details" active={location.pathname === "/today-bookings"} />
              </>
            )}
          </nav>
        )}

        {/* ---------------- DESKTOP USER PANEL ---------------- */}
        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-4">
            <div className="text-sm font-medium text-slate-200">
              {user.name}
              <span className="text-xs text-slate-400"> ({user.role})</span>
            </div>

            <button
              onClick={logout}
              className="
                px-4 py-2 rounded-xl bg-red-600
                text-white font-semibold shadow-lg
                shadow-red-700/40 hover:bg-red-500 
                transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer
              "
            >
              Logout
            </button>
          </div>
        )}

        {/* ---------------- MOBILE TOGGLE ---------------- */}
        {user && !isAuthPage && (
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}
      </div>

      {/* ---------------- MOBILE MENU ---------------- */}
      {menuOpen && user && !isAuthPage && (
        <div className="
          md:hidden px-6 pb-5 pt-3 
          bg-slate-800/80 backdrop-blur-xl
          border-t border-slate-700/40
          space-y-3 animate-fadeIn
        ">

          {user.role === "student" && (
            <>
              <MobileItem icon={<LayoutDashboard />} to="/dashboard" label="Dashboard" close={setMenuOpen} />
              <MobileItem icon={<BookOpen />} to="/book" label="Book Slot" close={setMenuOpen} />
              <MobileItem icon={<Calendar />} to="/mybookings" label="My Bookings" close={setMenuOpen} />
              <MobileItem icon={<Calendar />} to="/fullday" label="Full Day View" close={setMenuOpen} />
              <MobileItem icon={<Calendar />} to="/today-bookings" label="Today Slot Details" close={setMenuOpen} />
            </>
          )}

          {user.role === "admin" && (
            <>
              <MobileItem icon={<Users />} to="/admin/students" label="Students" close={setMenuOpen} />
              <MobileItem icon={<Calendar />} to="/fullday" label="Full Day View" close={setMenuOpen} />
              <MobileItem icon={<Calendar />} to="/today-bookings" label="Today Slot Details" close={setMenuOpen} />
            </>
          )}

          {/* FIXED Logout for Mobile */}
          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="
              w-full py-3 rounded-xl bg-red-600 
              text-white font-semibold shadow-lg
              shadow-red-900/50 hover:bg-red-500 
              transition-all duration-200
            "
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- DESKTOP NAV ITEM ---------------- */
function NavItem({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-xl font-medium text-sm
        tracking-wide transition-all duration-200
        ${
          active
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(0,255,255,0.35)]"
            : "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-300"
        }
      `}
    >
      {label}
    </Link>
  );
}

/* ---------------- MOBILE NAV ITEM ---------------- */
function MobileItem({ to, label, icon, close }) {
  return (
    <Link
      to={to}
      onClick={() => close(false)}
      className="
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-white/5 text-slate-200 border border-white/10
        hover:bg-cyan-500/20 hover:text-cyan-200
        transition-all duration-200
      "
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
