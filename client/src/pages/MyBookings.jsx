import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";

/* IST Today */
function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

/* Safe Local Parser */
function parseLocal(dtString) {
  if (!dtString || !dtString.includes("T")) return new Date();
  const [d, t] = dtString.split("T");
  const [y, m, dd] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm);
}

export default function MyBookings() {
  const [allBookings, setAllBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      const res = await API.get("/bookings/me");

      const sorted = res.data.sort(
        (a, b) => parseLocal(b.slotStart) - parseLocal(a.slotStart)
      );

      setAllBookings(sorted);
    } catch {
      setAllBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  // Filter by Selected Date
  useEffect(() => {
    const list = allBookings.filter((b) =>
      b.slotStart.startsWith(selectedDate)
    );
    setFiltered(list);
  }, [selectedDate, allBookings]);

  async function deleteBooking(id) {
    if (!window.confirm("Cancel this booking?")) return;
    await API.delete(`/bookings/${id}/student`);
    loadBookings();
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  return (
    <div className="p-6">
      <h2 className="text-3xl mb-4 text-cyan-400 font-bold">My Bookings</h2>

      {/* DATE PICKER */}
      <div className="mb-4">
        <label className="text-sm text-slate-300 block mb-1">Select Date</label>

        <div className="relative w-60">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white pr-10"
          />

          {/* 🔥 glowing calendar icon */}
          <span className="
            absolute right-3 top-1/2 -translate-y-1/2 
            text-2xl text-cyan-400 
            drop-shadow-[0_0_8px_rgba(0,255,255,0.9)]
            pointer-events-none
          ">
            📅
          </span>
        </div>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="p-4 bg-slate-700 rounded">
          No bookings found for selected date.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const start = parseLocal(b.slotStart);
            const end = parseLocal(b.slotEnd);

            const bookingDate = new Date(
              start.getFullYear(),
              start.getMonth(),
              start.getDate()
            );

            const isPast = bookingDate < today;

            return (
              <div
                key={b._id}
                className="p-4 bg-slate-800 rounded-xl border border-slate-600"
              >
                <div className="text-lg text-cyan-300 font-semibold">
                  {format(start, "dd MMM yyyy")}
                </div>

                <div className="mt-1">
                  <b>Time:</b> {format(start, "hh:mm a")} –{" "}
                  {format(end, "hh:mm a")}
                </div>

                <div className="mt-1"><b>Company:</b> {b.company}</div>
                <div className="mt-1"><b>Round:</b> {b.round}</div>
                <div className="mt-1"><b>Technology:</b> {b.technology}</div>

                <div className="flex gap-3 mt-3">
                  {!isPast ? (
                    <>
                      <button
                        onClick={() =>
                          (window.location.href = `/edit-booking/${b._id}`)
                        }
                        className="px-3 py-1 bg-blue-600 rounded"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteBooking(b._id)}
                        className="px-3 py-1 bg-red-600 rounded"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <div className="px-3 py-1 bg-slate-700 rounded text-slate-400">
                      Past Booking
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
