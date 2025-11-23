import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function FullDayView() {
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlot, setExpandedSlot] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  // ---------- Default date (Today) ----------
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const [selectedDate, setSelectedDate] = useState(defaultDate);

  // ---------- Load slots when date changes ----------
  useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate]);

  async function loadSlots(date) {
    try {
      setLoading(true);
      const res = await API.get(`/bookings/slots?date=${date}`);
      setSlots(res.data);
    } catch (err) {
      console.error("Slots load failed:", err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Colors for card background ----------
  function colorForCount(count) {
    if (count >= 6) return "bg-red-700";
    if (count >= 4) return "bg-yellow-600";
    return "bg-green-700";
  }

  function handleBook(startISO) {
    if (isAdmin) return; // admin cannot book
    navigate(`/book?date=${selectedDate}&start=${startISO}`);
  }

  function toggleExpand(key) {
    setExpandedSlot((prev) => (prev === key ? null : key));
  }

  return (
    <div className="pb-10">
      <h2 className="text-3xl mb-4 text-cyan-400">Interview Slots</h2>

      {/* ---------- Date Picker ---------- */}
      <div className="mb-4">
        <label className="text-sm text-slate-300 block mb-1">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 rounded bg-slate-800 text-white border border-slate-600"
        />
      </div>

      {/* ---------- Loading ---------- */}
      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {slots.map((slot) => {
            const start = new Date(slot.slotStart);
            const end = new Date(slot.slotEnd);
            const isFull = slot.bookingsCount >= 6;
            const slotKey = slot.slotStart;
            const isExpanded = expandedSlot === slotKey;

            return (
              <div
                key={slotKey}
                className={`p-4 rounded-xl shadow-xl transition-all duration-300 
                  ${colorForCount(slot.bookingsCount)}
                  ${isExpanded ? "border-4 border-cyan-400 scale-105" : ""}`}
              >
                {/* ---------- CLICKABLE HEADER ---------- */}
                <div
                  className="cursor-pointer select-none"
                  onClick={() => toggleExpand(slotKey)}
                >
                  <div className="text-lg font-semibold text-white">
                    {format(start, "hh:mm a")} – {format(end, "hh:mm a")}
                  </div>

                  <div className="text-sm mt-1 text-white">
                    Booked: {slot.bookingsCount} / 6
                  </div>

                  <div className="text-xs text-slate-300 mt-1">
                    {isExpanded ? "Click to collapse" : "Click to view details"}
                  </div>
                </div>

                {/* ---------- EXPANDED DETAILS ---------- */}
                {isExpanded && slot.bookingsCount > 0 && (
                  <div
                    className="mt-4 bg-slate-900 p-3 rounded border border-slate-700"
                    onClick={(e) => e.stopPropagation()} // Prevent collapse
                  >
                    <div className="font-semibold mb-2 text-white">
                      Booked Students:
                    </div>

                    {slot.bookings.map((b) => (
                      <div
                        key={b._id}
                        className="border-b border-slate-700 py-2"
                      >
                        <div className="font-semibold text-white">
                          {b.student?.name}
                        </div>

                        <div className="text-slate-400 text-xs mt-1">
                          Company:
                          <span className="text-slate-200"> {b.company}</span>
                          <br />
                          Round:
                          <span className="text-slate-200"> {b.round}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---------- BOOK BUTTON (STUDENT ONLY) ---------- */}
                {!isAdmin && (
                  <div className="mt-3">
                    {!isFull ? (
                      <button
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm w-full"
                        onClick={() => handleBook(slot.slotStart)}
                      >
                        Book Slot
                      </button>
                    ) : (
                      <div className="px-3 py-1 bg-red-900 text-center rounded text-sm text-white">
                        Slot Full
                      </div>
                    )}
                  </div>
                )}

                {/* ---------- ADMIN LABEL ---------- */}
                {isAdmin && (
                  <div className="mt-3 px-3 py-1 bg-slate-900 text-center rounded text-sm text-slate-300">
                    {isFull ? "Slot Full" : "Seats Available"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
