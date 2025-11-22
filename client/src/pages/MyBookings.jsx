import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function MyBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      setLoading(true);
      const res = await API.get("/bookings/me");
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  // DELETE BOOKING (student)
  async function deleteBooking(id) {
    if (!window.confirm("Are you sure you want to delete this booking?")) return;

    try {
      await API.delete(`/bookings/${id}/student`);
      alert("Booking removed successfully.");
      loadBookings();
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.msg || err.message));
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-3xl mb-4 text-cyan-400">My Bookings</h2>

      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="p-4 bg-slate-700 rounded">No bookings found.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const start = new Date(b.slotStart);
            const end = new Date(b.slotEnd);

            return (
              <div
                key={b._id}
                className="p-4 bg-slate-800 rounded-xl shadow border border-slate-700"
              >
                <div className="font-semibold text-lg text-cyan-300">
                  {format(start, "dd MMM yyyy")}
                </div>

                <div className="mt-1">
                  <span className="font-semibold">Time:</span>{" "}
                  {format(start, "hh:mm a")} – {format(end, "hh:mm a")}
                </div>

                <div className="mt-1">
                  <span className="font-semibold">Company:</span> {b.company}
                </div>

                <div className="mt-1">
                  <span className="font-semibold">Round:</span> {b.round}
                </div>

                {/* Removed approval status completely */}

                <div className="text-xs text-slate-500 mt-2">
                  * You can edit or delete this booking.
                </div>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => navigate(`/edit-booking/${b._id}`)}
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteBooking(b._id)}
                    className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
