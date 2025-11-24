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

        {/* Logo + Title */}
        <Link to={user?.role === "admin" ? "/admin/students" : "/dashboard"}>
          <div className="flex items-center gap-4 cursor-pointer group transition-transform duration-300 hover:scale-105">
            
            <div className="relative w-14 h-14 rounded-full overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-cyan-400/60 group-hover:shadow-xl group-hover:ring-2 group-hover:ring-cyan-400/60">
              <img 
                src="https://i.postimg.cc/vmXGMpr3/Aikya-AI.png"
                alt="logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
                Aikya Interview
              </span>
              <span className="text-sm text-slate-300 tracking-wide">
                Smart Booking System
              </span>
            </div>

          </div>
        </Link>

        {/* Desktop Nav */}
        {!isAuthPage && user && (
          <nav className="hidden md:flex gap-4 ml-6">
            {user.role === "student" && (
              <>
                <NavButton to="/dashboard" label="Dashboard" active={location.pathname === "/dashboard"} />
                <NavButton to="/book" label="Book Slot" active={location.pathname === "/book"} />
                <NavButton to="/mybookings" label="My Bookings" active={location.pathname === "/mybookings"} />
                <NavButton to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />
              </>
            )}

            {user.role === "admin" && (
              <>
                <NavButton to="/admin/students" label="Students" active={location.pathname === "/admin/students"} />
                <NavButton to="/fullday" label="Full Day View" active={location.pathname === "/fullday"} />
              </>
            )}
          </nav>
        )}

        {/* Desktop User + Logout */}
        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <div className="text-sm">
              {user.name}
              <span className="text-xs text-slate-400"> ({user.role})</span>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-all duration-300 hover:scale-105 active:scale-95"
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
        <div className="
          md:hidden mt-4 rounded-xl p-4 
          bg-slate-800/60 backdrop-blur-xl border border-white/10
          shadow-lg shadow-slate-900/50 space-y-4
          animate-slideDown
        ">

          {/* Student Routes */}
          {user.role === "student" && (
            <>
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<LayoutDashboard size={18} />} to="/dashboard" label="Dashboard" />
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<BookOpen size={18} />} to="/book" label="Book Slot" />
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<Calendar size={18} />} to="/mybookings" label="My Bookings" />
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<Calendar size={18} />} to="/fullday" label="Full Day View" />
            </>
          )}

          {/* Admin Routes */}
          {user.role === "admin" && (
            <>
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<Users size={18} />} to="/admin/students" label="Students" />
              <MobileNavItem setMenuOpen={setMenuOpen} icon={<Calendar size={18} />} to="/fullday" label="Full Day View" />
            </>
          )}

          {/* Logout Button */}
          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="
              w-full py-3 mt-3 rounded-xl text-white font-semibold 
              bg-red-600 hover:bg-red-500 
              transition-all duration-300 hover:scale-105 active:scale-95
            "
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------
   Reusable Desktop Button
--------------------------*/
function NavButton({ to, label, active }) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-xl text-slate-200 font-medium 
        bg-white/5 backdrop-blur-md border border-white/10 shadow-sm 
        hover:bg-cyan-500/20 hover:text-cyan-300 hover:shadow-cyan-400/30 
        transition-all duration-300 hover:scale-105 active:scale-95
        ${active ? "text-cyan-400 border-cyan-400/40 shadow-cyan-400/40" : ""}
      `}
    >
      {label}
    </Link>
  );
}

/* -------------------------
   Reusable Mobile Button
--------------------------*/
function MobileNavItem({ to, label, icon, setMenuOpen }) {
  return (
    <Link
      to={to}
      onClick={() => {
        setMenuOpen(false);   // AUTO-CLOSE MOBILE MENU
        window.scrollTo(0, 0);
      }}
      className="
        w-full flex items-center gap-3 
        px-4 py-3 rounded-xl 
        bg-white/5 backdrop-blur-lg border border-white/10
        text-slate-200 
        hover:bg-cyan-500/20 hover:text-cyan-300 
        hover:shadow-cyan-400/40 
        transition-all duration-300 
        hover:scale-[1.02] active:scale-95
      "
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
