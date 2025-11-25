import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAuthPage = location.pathname === "/auth";

  const logout = () => {
    toast.success("Logged out successfully");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth", { replace: true });
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl shadow-xl border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* ---------------- LOGO & TITLE ---------------- */}
        <Link
          to={user?.role === "admin" ? "/admin/students" : "/dashboard"}
          className="flex items-center gap-4"
        >
          {/* GLOWING PROFILE IMAGE */}
          <div className="relative w-14 h-14">
            <div className="
              absolute inset-0 rounded-full
              bg-cyan-400/30 blur-xl
              animate-pulse
            "></div>

            <img
              src="https://i.postimg.cc/vmXGMpr3/Aikya-AI.png"
              alt="logo"
              className="
                relative w-14 h-14 rounded-full object-cover 
                ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/40
              "
            />
          </div>

          <div className="leading-tight select-none">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-lg tracking-wide">
              Aikya Interview
            </h1>
            <p className="text-xs text-slate-400 tracking-wide">
              Smart Booking System
            </p>
          </div>
        </Link>

        {/* ---------------- DESKTOP MENU ---------------- */}
        {!isAuthPage && user && (
          <nav className="hidden md:flex items-center gap-3 ml-10">

            {user.role === "student" && (
              <>
                <DesktopNav to="/dashboard" label="Dashboard" activePath={location.pathname} />
                <DesktopNav to="/book" label="Book Slot" activePath={location.pathname} />
                <DesktopNav to="/mybookings" label="My Bookings" activePath={location.pathname} />
                <DesktopNav to="/fullday" label="Full Day View" activePath={location.pathname} />
                <DesktopNav to="/today-bookings" label="Today Slot Details" activePath={location.pathname} />
              </>
            )}

            {user.role === "admin" && (
              <>
                <DesktopNav to="/admin/students" label="Students" activePath={location.pathname} />
                <DesktopNav to="/fullday" label="Full Day View" activePath={location.pathname} />
                <DesktopNav to="/today-bookings" label="Today Slot Details" activePath={location.pathname} />
              </>
            )}
          </nav>
        )}

        {/* ---------------- DESKTOP USER PANEL ---------------- */}
        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-5">

            <div className="text-sm font-medium text-cyan-200">
              {user.name}
              <span className="text-slate-400 text-xs"> ({user.role})</span>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold
              shadow-md shadow-red-800/40 hover:bg-red-500 transition-all
              hover:scale-105 active:scale-95"
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
        <div className="md:hidden px-6 pb-5 pt-3 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 space-y-3 animate-slideDown">

          {user.role === "student" && (
            <>
              <MobileNav icon={<LayoutDashboard />} to="/dashboard" label="Dashboard" close={setMenuOpen} />
              <MobileNav icon={<BookOpen />} to="/book" label="Book Slot" close={setMenuOpen} />
              <MobileNav icon={<CalendarDays />} to="/mybookings" label="My Bookings" close={setMenuOpen} />
              <MobileNav icon={<CalendarDays />} to="/fullday" label="Full Day View" close={setMenuOpen} />
              <MobileNav icon={<CalendarDays />} to="/today-bookings" label="Today Slot Details" close={setMenuOpen} />
            </>
          )}

          {user.role === "admin" && (
            <>
              <MobileNav icon={<Users />} to="/admin/students" label="Students" close={setMenuOpen} />
              <MobileNav icon={<CalendarDays />} to="/fullday" label="Full Day View" close={setMenuOpen} />
              <MobileNav icon={<CalendarDays />} to="/today-bookings" label="Today Slot Details" close={setMenuOpen} />
            </>
          )}

          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold shadow-md hover:bg-red-500 transition-all"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- DESKTOP NAV ITEM ---------------- */
function DesktopNav({ to, label, activePath }) {
  const active = activePath === to;

  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-xl font-medium text-sm
        transition-all duration-200 select-none
        ${active
          ? "bg-cyan-600/30 text-cyan-300 border border-cyan-400/40 shadow shadow-cyan-200/20"
          : "text-slate-300 hover:bg-white/10 hover:text-cyan-300"
        }
      `}
    >
      {label}
    </Link>
  );
}

/* ---------------- MOBILE NAV ITEM ---------------- */
function MobileNav({ to, label, icon, close }) {
  return (
    <Link
      to={to}
      onClick={() => close(false)}
      className="
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-white/5 text-slate-200 border border-slate-700/30
        hover:bg-cyan-600/20 hover:text-cyan-300
        transition-all duration-200
      "
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
