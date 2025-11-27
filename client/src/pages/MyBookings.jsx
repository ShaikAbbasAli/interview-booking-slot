import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";

/* ---------------------------- Helpers ---------------------------- */
function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

function parseLocal(dt) {
  if (!dt || !dt.includes("T")) return new Date();
  const [d, t] = dt.split("T");
  const [y, m, dd] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm);
}

/* ---------------------------- Modal ---------------------------- */
function NeonModal({ show, message, onAction }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-80 text-center shadow-[0_0_25px_rgba(0,255,255,0.7)] animate-scaleIn">
        <div className="text-cyan-300 text-xl font-bold mb-3">⚠️ Confirmation</div>

        <div className="text-slate-200 mb-6">{message}</div>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => onAction(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 shadow-[0_0_12px_rgba(255,0,0,0.5)] cursor-pointer"
          >
            Yes
          </button>

          <button
            onClick={() => onAction(false)}
            className="px-4 py-2 bg-slate-600 text-white rounded-xl hover:bg-slate-500 cursor-pointer"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Main ---------------------------- */
export default function MyBookings() {
  const [allBookings, setAllBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({ show: false, bookingId: null });

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

  // Filter by date
  useEffect(() => {
    const list = allBookings.filter((b) =>
      b.slotStart.startsWith(selectedDate)
    );
    setFiltered(list);
  }, [selectedDate, allBookings]);

  /* ------------------ Confirm Delete Handler ------------------ */
  async function confirmDelete(yes) {
    if (!yes) {
      setModal({ show: false, bookingId: null });
      return;
    }

    const id = modal.bookingId;
    if (!id) return;

    await API.delete(`/bookings/${id}/student`);

    setModal({ show: false, bookingId: null });
    loadBookings();
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <>
      {/* Confirmation Modal */}
      <NeonModal
        show={modal.show}
        message="Are you sure you want to cancel this booking?"
        onAction={confirmDelete}
      />

      <div className="p-6">
        <h2 className="text-3xl mb-4 text-cyan-400 font-bold">My Bookings</h2>

        {/* DATE PICKER */}
        <div className="mb-4">
          <label className="text-sm text-slate-300 block mb-1 font-bold">
            Select Date
          </label>

          <div className="relative w-60">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 mb-3 rounded bg-slate-700"
            />
          </div>
        </div>

        {/* BOOKINGS LIST */}
        {loading ? (
          <div className="p-4 bg-slate-700 rounded">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 bg-slate-700 rounded">
            No bookings for the selected date.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const start = parseLocal(b.slotStart);
              const end = parseLocal(b.slotEnd);

              const bookingDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              const isPast = bookingDate < today;

              return (
                <div
                  key={b._id}
                  className="p-4 bg-slate-800 rounded-xl border border-slate-600 shadow-lg"
                >
                  <div className="text-lg text-cyan-300 font-semibold">
                    {format(start, "dd MMM yyyy")}
                  </div>

                  <div className="mt-1">
                    <b>Time:</b> {format(start, "hh:mm a")} – {format(end, "hh:mm a")}
                  </div>

                  <div className="mt-1">
                    <b>Company:</b> {b.company}
                  </div>

                  <div className="mt-1">
                    <b>Round:</b> {b.round}
                  </div>

                  <div className="mt-1">
                    <b>Technology:</b> {b.technology}
                  </div>

                  {/* ✅ NEW: SHOW DESK */}
                  <div className="mt-1">
                    <b>Desk:</b> {b.desk || "N/A"}
                  </div>

                  <div className="flex gap-3 mt-3">
                    {!isPast ? (
                      <>
                        <button
                          onClick={() =>
                            (window.location.href = `/edit-booking/${b._id}`)
                          }
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded shadow-[0_0_8px_rgba(0,150,255,0.5)] cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            setModal({ show: true, bookingId: b._id })
                          }
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded shadow-[0_0_10px_rgba(255,0,0,0.5)] cursor-pointer"
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

      {/* Animations */}
      <style>
        {`
        @keyframes fadeIn { 0%{opacity:0} 100%{opacity:1} }
        @keyframes scaleIn { 0%{transform:scale(.7);opacity:0;} 100%{transform:scale(1);opacity:1;} }

        .animate-fadeIn { animation: fadeIn .25s ease-out }
        .animate-scaleIn { animation: scaleIn .25s ease-out }
      `}
      </style>
    </>
  );
}
