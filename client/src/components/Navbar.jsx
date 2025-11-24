import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, Calendar, BookOpen, Users } from "lucide-react";
import toast from "react-hot-toast";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAuthPage = location.pathname === "/auth";

  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    toast.success("Logged out successfully");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/auth", { replace: true });
    setTimeout(() => (window.location.href = "/auth"), 50);
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 p-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">

        {/* Logo */}
        <Link to={user?.role === "admin" ? "/admin/students" : "/dashboard"}>
          <div className="flex items-center gap-4 cursor-pointer group transition-transform duration-300 hover:scale-105">

            <div className="relative w-14 h-14 rounded-full overflow-hidden shadow-lg group-hover:shadow-cyan-400/60 group-hover:ring-2 group-hover:ring-cyan-400/60">
              <img 
                src="https://i.postimg.cc/vmXGMpr3/Aikya-AI.png"
                alt="logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Aikya Interview
              </span>
              <span className="text-sm text-slate-300">Smart Booking System</span>
            </div>

          </div>
        </Link>

        {/* Desktop Menu */}
        {!isAuthPage && user && (
          <nav className="hidden md:flex gap-4 ml-6">
            
            {/* STUDENT LINKS */}
            {user.role === "student" && (
              <>
                <NavButton to="/dashboard" label="Dashboard" active={location.pathname === "/dashboard"} />
                <NavButton to="/book" label="Book Slot" active={location.pathname === "/book"} />
                <NavButton to="/mybookings" label="My Bookings" active={location.pathname === "/mybookings"} />
                <NavButton to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />

                {/* ⭐ NEW — Today Slot Details */}
                <NavButton to="/today-bookings" label="Today Slot Details" active={location.pathname === "/today-bookings"} />
              </>
            )}

            {/* ADMIN LINKS */}
            {user.role === "admin" && (
              <>
                <NavButton to="/admin/students" label="Students" active={location.pathname === "/admin/students"} />
                <NavButton to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />

                {/* ⭐ NEW — Today Slot Details */}
                <NavButton to="/today-bookings" label="Today Slot Details" active={location.pathname === "/today-bookings"} />
              </>
            )}
          </nav>
        )}

        {/* Desktop User & Logout */}
        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <div className="text-sm">
              {user.name} <span className="text-xs text-slate-400">({user.role})</span>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 transition-all hover:scale-105"
            >
              Logout
            </button>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        {user && !isAuthPage && (
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}

      </div>

      {/* Mobile Menu */}
      {menuOpen && user && !isAuthPage && (
        <div className="md:hidden mt-4 rounded-xl p-4 bg-slate-800/60 backdrop-blur-xl border border-white/10 space-y-4">

          {/* STUDENT Mobile */}
          {user.role === "student" && (
            <>
              <MobileNavItem icon={<LayoutDashboard size={18} />} to="/dashboard" label="Dashboard" setMenuOpen={setMenuOpen} />
              <MobileNavItem icon={<BookOpen size={18} />} to="/book" label="Book Slot" setMenuOpen={setMenuOpen} />
              <MobileNavItem icon={<Calendar size={18} />} to="/mybookings" label="My Bookings" setMenuOpen={setMenuOpen} />
              <MobileNavItem icon={<Calendar size={18} />} to="/fullday" label="Full Day View" setMenuOpen={setMenuOpen} />

              {/* ⭐ NEW */}
              <MobileNavItem icon={<Calendar size={18} />} to="/today-bookings" label="Today Slot Details" setMenuOpen={setMenuOpen} />
            </>
          )}

          {/* ADMIN Mobile */}
          {user.role === "admin" && (
            <>
              <MobileNavItem icon={<Users size={18} />} to="/admin/students" label="Students" setMenuOpen={setMenuOpen} />
              <MobileNavItem icon={<Calendar size={18} />} to="/fullday" label="Full Day View" setMenuOpen={setMenuOpen} />

              {/* ⭐ NEW */}
              <MobileNavItem icon={<Calendar size={18} />} to="/today-bookings" label="Today Slot Details" setMenuOpen={setMenuOpen} />
            </>
          )}

          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500"
          >
            Logout
          </button>

        </div>
      )}
    </div>
  );
}

/* Desktop Button */
function NavButton({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-xl text-slate-200 bg-white/5 border border-white/10 
      hover:bg-cyan-500/20 hover:text-cyan-300 transition-all 
      ${active ? "text-cyan-400 border-cyan-400" : ""}`}
    >
      {label}
    </Link>
  );
}

/* Mobile Button */
function MobileNavItem({ to, label, icon, setMenuOpen }) {
  return (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-cyan-500/20"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
