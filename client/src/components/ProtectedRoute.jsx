import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../services/api";
import { socket } from "../socket";

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [liveUser, setLiveUser] = useState(null);

  /* ---------------------------------------------------------
     1️⃣ Initial load of user
  --------------------------------------------------------- */
  useEffect(() => {
    async function fetchUser() {
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await API.get("/auth/me");

        localStorage.setItem("user", JSON.stringify(res.data));
        setLiveUser(res.data);

      } catch (err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  /* ---------------------------------------------------------
     2️⃣ REAL-TIME APPROVAL VIA WEBSOCKET
  --------------------------------------------------------- */
  useEffect(() => {
    if (!liveUser) return;

    const handler = async (data) => {
      if (data.studentId === liveUser._id) {
        const res = await API.get("/auth/me");

        localStorage.setItem("user", JSON.stringify(res.data));
        setLiveUser(res.data);
      }
    };

    socket.on("student-approved", handler);

    return () => socket.off("student-approved", handler);
  }, [liveUser]);

  /* ---------------------------------------------------------
     3️⃣ AUTH CHECKS
  --------------------------------------------------------- */
  if (!token) return <Navigate to="/auth" replace />;

  if (loading)
    return <div className="text-center p-6 text-cyan-400">Validating account...</div>;

  if (!liveUser) return <Navigate to="/auth" replace />;

  if (role && liveUser.role !== role) return <Navigate to="/auth" replace />;

  // ⭐ This was causing issue before (status not updating live)
  if (liveUser.role === "student" && liveUser.status !== "approved") {
    return (
      <div className="p-6 text-center text-yellow-400">
        <h2 className="text-2xl mb-4">Account Pending Approval</h2>
        <p>You cannot book or view slots until admin approves your account.</p>
      </div>
    );
  }

  return children;
}
