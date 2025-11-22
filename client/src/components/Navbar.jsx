import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
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

    // Router reset
    navigate("/auth", { replace: true });

    // Hard fix for stale UI
    setTimeout(() => window.location.href = "/auth", 50);
  };

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 p-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-cyan-400">Interview Booking</h1>

        {!isAuthPage && user && (
          <nav className="hidden md:flex gap-3 ml-6">
            {user.role === "student" && (
              <>
                <Link to="/dashboard" className="nav-btn">Dashboard</Link>
                <Link to="/book" className="nav-btn">Book Slot</Link>
                <Link to="/mybookings" className="nav-btn">My Bookings</Link>
                <Link to="/fullday" className="nav-btn">Full Day View</Link>
              </>
            )}
            {user.role === "admin" && (
              <>
                <Link to="/admin/students" className="nav-btn">Students</Link>
                <Link to="/fullday" className="nav-btn">Full Day View</Link>
              </>
            )}
          </nav>
        )}

        {!isAuthPage && user && (
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <div className="text-sm">
              {user.name}
              <span className="text-xs text-slate-400"> ({user.role})</span>
            </div>
            <button onClick={logout} className="px-3 py-1 rounded bg-red-600 hover:bg-red-500">
              Logout
            </button>
          </div>
        )}

        {user && !isAuthPage && (
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        )}
      </div>

      {menuOpen && user && !isAuthPage && (
        <div className="md:hidden mt-4 bg-slate-800/90 rounded-lg p-4 space-y-3">
          {user.role === "student" && (
            <>
              <Link className="mobile-link" to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link className="mobile-link" to="/book" onClick={() => setMenuOpen(false)}>Book Slot</Link>
              <Link className="mobile-link" to="/mybookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>
              <Link className="mobile-link" to="/fullday" onClick={() => setMenuOpen(false)}>Full Day View</Link>
            </>
          )}

          {user.role === "admin" && (
            <>
              <Link className="mobile-link" to="/admin/students" onClick={() => setMenuOpen(false)}>Students</Link>
              <Link className="mobile-link" to="/fullday" onClick={() => setMenuOpen(false)}>Full Day View</Link>
            </>
          )}

          <button
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
            className="w-full bg-red-600 py-2 rounded text-white mt-2"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
