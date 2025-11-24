import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

function parseLocal(dtString) {
  const [datePart, timePart] = dtString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    const res = await API.get("/bookings/me");

    // ⭐ Sort latest first
    const sorted = res.data.sort((a, b) => {
      return new Date(b.slotStart) - new Date(a.slotStart);
    });

    setBookings(sorted);
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function deleteBooking(id) {
    if (!window.confirm("Cancel booking?")) return;

    await API.delete(`/bookings/${id}/student`);
    loadBookings();
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
            const start = parseLocal(b.slotStart);
            const end = parseLocal(b.slotEnd);

            const now = new Date();

            // ⛔ BLOCK EDIT ONLY IF DATE < TODAY (ignore time)
            const bookingDate = new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate()
            );
            const todayDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );

            const isPastDate = bookingDate < todayDate;

            return (
              <div key={b._id} className="p-4 bg-slate-800 rounded-xl">
                <div className="text-lg text-cyan-300">
                  {format(start, "dd MMM yyyy")}
                </div>

                <div className="mt-1">
                  <b>Time:</b> {format(start, "hh:mm a")} –{" "}
                  {format(end, "hh:mm a")}
                </div>

                <div className="mt-1">
                  <b>Company:</b> {b.company}
                </div>

                <div className="mt-1">
                  <b>Round:</b> {b.round}
                </div>

                <div className="flex gap-3 mt-3">
                  {!isPastDate ? (
                    <button
                      onClick={() => navigate(`/edit-booking/${b._id}`)}
                      className="px-3 py-1 bg-blue-600 rounded"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="px-3 py-1 bg-slate-700 rounded text-slate-400">
                      Past Date
                    </div>
                  )}

                  <button
                    onClick={() => deleteBooking(b._id)}
                    className="px-3 py-1 bg-red-600 rounded"
                  >
                    Cancel
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
