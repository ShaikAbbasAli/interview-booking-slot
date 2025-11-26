// client/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Auth from "./pages/Auth";
import Dashboard from "./pages/StudentDashboard";
import BookInterview from "./pages/BookingInterviewSlot";
import MyBookings from "./pages/MyBookings";
import FullDayView from "./pages/FullDayView";
import TodayBookings from "./pages/TodayBookings";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import VerifyOTP from "./pages/VerifyOTP";
import AdminStudents from "./pages/AdminDashboard";
import EditBooking from "./pages/EditBooking";
import NotFound from "./pages/NotFound";

// NEW FILES (Forgot + Reset)
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const token = localStorage.getItem("token");
  const savedUser = token ? JSON.parse(localStorage.getItem("user")) : null;

  return (
    <div
      className="min-h-screen pt-24 px-6 
      bg-linear-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 
      text-white overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: "url('https://i.postimg.cc/vmXGMpr3/Aikya-AI.png')",
        backgroundBlendMode: "overlay",
      }}
    >
      <Navbar />

      <div className="max-w-4xl mx-auto">
        <Routes>
          {/* ---------------- AUTH PAGE ---------------- */}
          <Route
            path="/auth"
            element={
              token ? (
                savedUser?.role === "admin" ? (
                  <Navigate to="/admin/students" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Auth />
              )
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* ---------------- FORGOT PASSWORD ---------------- */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ---------------- STUDENT ROUTES ---------------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="student">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/book"
            element={
              <ProtectedRoute role="student">
                <BookInterview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/edit-booking/:id"
            element={
              <ProtectedRoute role="student">
                <EditBooking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mybookings"
            element={
              <ProtectedRoute role="student">
                <MyBookings />
              </ProtectedRoute>
            }
          />

          {/* ---------------- ADMIN ROUTES ---------------- */}
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute role="admin">
                <AdminStudents />
              </ProtectedRoute>
            }
          />

          {/* ---------------- SHARED ROUTES ---------------- */}
          <Route
            path="/fullday"
            element={
              <ProtectedRoute>
                <FullDayView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/today-bookings"
            element={
              <ProtectedRoute>
                <TodayBookings />
              </ProtectedRoute>
            }
          />

          {/* ---------------- OTP VERIFY ---------------- */}
          <Route path="/verify-otp" element={<VerifyOTP />} />

          {/* ---------------- NOT FOUND ---------------- */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}
