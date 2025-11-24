import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from "./pages/Auth";
import Dashboard from './pages/StudentDashboard';
import BookInterview from './pages/BookingInterviewSlot';
import MyBookings from './pages/MyBookings';
import FullDayView from './pages/FullDayView';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import VerifyOTP from "./pages/VerifyOTP";
import AdminStudents from "./pages/AdminDashboard";
import EditBooking from "./pages/EditBooking";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div
  className="min-h-screen pt-24 px-6 bg-linear-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 text-white overflow-hidden bg-cover bg-center"
  style={{
    backgroundImage:
      "url('https://i.postimg.cc/vmXGMpr3/Aikya-AI.png')",
    backgroundBlendMode: "overlay"
  }}
>
      <Navbar />
      <div className="max-w-4xl mx-auto">
        <Routes>

          {/* AUTH PAGE */}
          <Route
            path="/auth"
            element={
              localStorage.getItem("token")
                ? (
                  JSON.parse(localStorage.getItem("user")).role === "admin"
                    ? <Navigate to="/admin/students" replace />
                    : <Navigate to="/dashboard" replace />
                )
                : <Auth />
            }
          />

          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* STUDENT ROUTES */}
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

          {/* ADMIN ROUTES */}
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute role="admin">
                <AdminStudents />
              </ProtectedRoute>
            }
          />

          {/* SHARED */}
          <Route
            path="/fullday"
            element={
              <ProtectedRoute>
                <FullDayView />
              </ProtectedRoute>
            }
          />

          {/* NOT FOUND */}
          <Route path="*" element={<NotFound />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />

        </Routes>
      </div>
    </div>
  );
}
