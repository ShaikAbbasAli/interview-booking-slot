import React, { useEffect, useState } from "react";
import API from "../services/api";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      const res = await API.get("/bookings/me");
      setMyBookings(res.data);  // still used for today's count
    } catch (err) {
      console.error(err);
      setMyBookings([]);
    } finally {
      setLoading(false);
    }
  }

  const todayCount = myBookings.length;

  return (
    <div className="p-4">
      <h2 className="text-3xl mb-2 text-cyan-400">Welcome, {user?.name}</h2>
      <div className="text-slate-300 mb-4">{user?.course} Student</div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

        {/* Today’s Booking Count */}
        <div className="p-4 bg-slate-800 rounded-xl shadow">
          <div className="text-sm text-slate-400">Today's Bookings</div>
          <div className="text-3xl font-bold text-cyan-400">
            {todayCount} / 5
          </div>
        </div>

        {/* Status */}
        <div className="p-4 bg-slate-800 rounded-xl shadow">
          <div className="text-sm text-slate-400">Status</div>
          <div
            className={`text-xl font-semibold ${
              user.status === "approved" ? "text-green-400" : "text-yellow-400"
            }`}
          >
            {user.status === "approved" ? "Approved" : "Pending Approval"}
          </div>
        </div>

        {/* Book Interview */}
        <div className="p-4 bg-slate-800 rounded-xl shadow flex items-center justify-center">
          <a
            href="/book"
            className="block text-center text-lg bg-cyan-600 p-3 rounded-xl font-semibold"
          >
            + Book Interview
          </a>
        </div>
      </div>

    </div>
  );
}
