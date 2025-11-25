import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

/* True IST date */
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

function parseLocal(dtString) {
  if (!dtString || !dtString.includes("T")) return new Date();
  const [d, t] = dtString.split("T");
  const [y, m, dd] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm);
}

export default function FullDayView() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  async function loadSlots(date) {
    try {
      setLoading(true);
      const res = await API.get(`/bookings/slots?date=${date}`);
      setSlots(res.data);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate]);

  function colorForCount(count) {
    if (count >= 6) return "bg-red-700";
    if (count >= 4) return "bg-yellow-600";
    return "bg-green-700";
  }

  function book(startLocal) {
    if (!isAdmin) {
      navigate(`/book?date=${selectedDate}&start=${startLocal}`);
    }
  }

  return (
    <div className="pb-14">
      <h2 className="text-3xl mb-4 font-bold text-cyan-400">Interview Slots</h2>

      <div className="mb-4">
        <label className="text-sm text-slate-300 block mb-1">Select Date</label>

        <div className="relative w-60">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 border border-slate-600 text-white pr-10"
          />
          <span className="
            absolute right-3 top-1/2 -translate-y-1/2 text-2xl 
            text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.9)]
          ">
            📅
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {slots.map((s) => {
            const start = parseLocal(s.slotStart);
            const end = parseLocal(s.slotEnd);

            const isExpanded = expanded === s.slotStart;
            const now = new Date();
            const isPastSlot = start < now;
            const isFull = s.bookingsCount >= 6;

            const disabledCard =
              isAdmin && isPastSlot
                ? "opacity-40 grayscale pointer-events-none"
                : "";

            return (
              <div
                key={s.slotStart}
                className={`p-4 rounded-xl shadow-xl transition-all duration-300 
                  ${colorForCount(s.bookingsCount)} 
                  ${isExpanded ? "border-4 border-cyan-400 scale-105" : ""}
                  ${disabledCard}
                `}
              >
                {/* HEADER */}
                <div
                  className={`cursor-pointer select-none ${
                    isAdmin && isPastSlot ? "pointer-events-none" : ""
                  }`}
                  onClick={() =>
                    setExpanded((prev) =>
                      prev === s.slotStart ? null : s.slotStart
                    )
                  }
                >
                  <div className="text-lg font-semibold text-white">
                    {format(start, "hh:mm a")} – {format(end, "hh:mm a")}
                  </div>

                  <div className="text-sm mt-1 text-white">
                    Booked: {s.bookingsCount} / 6
                  </div>

                  {isAdmin && isPastSlot && (
                    <div className="text-xs mt-1 text-red-300 font-semibold">
                      Past Slot (Admin View)
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && s.bookingsCount > 0 && !isPastSlot && (
                  <div className="mt-3 bg-slate-900 p-3 rounded border border-slate-700">
                    <div className="font-semibold mb-2 text-white">
                      Booked Students:
                    </div>

                    {s.bookings.map((b) => (
                      <div key={b._id} className="py-2 border-b border-slate-600">
                        <div className="font-semibold text-white">
                          {b.student?.name}
                        </div>

                        <div className="text-xs text-slate-400 mt-1">
                          Company: <span className="text-white">{b.company}</span>
                          <br />
                          Round: <span className="text-white">{b.round}</span>
                          <br />
                          Technology:{" "}
                          <span className="text-white">{b.technology}</span>
                          <br />
                          Duration:{" "}
                          <span className="text-white">
                            {b.duration === 60
                              ? "1 hour"
                              : b.duration === 30
                              ? "30 minutes"
                              : `${b.duration} minutes`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Student Buttons */}
                {!isAdmin && !isPastSlot && !isFull && (
                  <button
                    className="mt-3 px-3 py-1 w-full bg-cyan-600 rounded hover:bg-cyan-500"
                    onClick={() => book(s.slotStart)}
                  >
                    Book Slot
                  </button>
                )}

                {!isAdmin && isFull && (
                  <div className="mt-3 px-3 py-1 bg-red-800 rounded text-center text-white">
                    Slot Full
                  </div>
                )}

                {!isAdmin && isPastSlot && (
                  <div className="mt-3 px-3 py-1 bg-slate-700 rounded text-center text-slate-400">
                    Past Slot
                  </div>
                )}

                {/* ADMIN Footer */}
                {isAdmin && !isPastSlot && (
                  <div className="mt-3 px-3 py-1 bg-slate-900 text-center rounded text-slate-200">
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
