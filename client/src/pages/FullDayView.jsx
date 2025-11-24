import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

/* ----------------------------------------------------------
   SAFE LOCAL PARSER (Prevents crash if dtString is undefined)
----------------------------------------------------------- */
function parseLocal(dtString) {
  if (
    !dtString ||
    typeof dtString !== "string" ||
    !dtString.includes("T")
  ) {
    console.warn("Invalid datetime received:", dtString);
    return new Date(); // fallback to avoid crash
  }

  const [datePart, timePart] = dtString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

export default function FullDayView() {
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user?.role === "admin";

  // Today's date
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(defaultDate);

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

  function colorForCount(count) {
    if (count >= 6) return "bg-red-700";
    if (count >= 4) return "bg-yellow-600";
    return "bg-green-700";
  }

  function book(startLocal) {
    if (isAdmin) return;
    navigate(`/book?date=${selectedDate}&start=${startLocal}`);
  }

  return (
    <div className="pb-14">
      <h2 className="text-3xl mb-4 text-cyan-400">Interview Slots</h2>

      {/* DATE PICKER */}
      <div className="mb-4">
        <label className="text-sm text-slate-300 block mb-1">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 rounded bg-slate-800 border border-slate-600 text-white"
        />
      </div>

      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          
          {slots.map((s) => {

            /** SAFETY CHECK: Skip corrupted slots */
            if (!s.slotStart || !s.slotEnd) {
              console.warn("Skipping invalid slot:", s);
              return null;
            }

            const start = parseLocal(s.slotStart);
            const end = parseLocal(s.slotEnd);

            const isExpanded = expanded === s.slotStart;
            const isSlotFull = s.bookingsCount >= 6;

            const slotDurationMin = (end - start) / 60000;
            const slotDurationText =
              slotDurationMin === 60 ? "1 Hour" : "30 Minutes";

            return (
              <div
                key={s.slotStart}
                className={`p-4 rounded-xl shadow-xl transition-all duration-300 ${
                  isSlotFull ? "bg-red-700" : colorForCount(s.bookingsCount)
                } ${isExpanded ? "border-4 border-cyan-400 scale-105" : ""}`}
              >

                {/* SLOT HEADER */}
                <div
                  className="cursor-pointer select-none"
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

                  <div className="text-sm text-white mt-1">
                    Slot Duration: {slotDurationText}
                  </div>

                  <div className="text-xs text-slate-200 mt-1">
                    {isExpanded ? "Click to collapse" : "Click to view details"}
                  </div>
                </div>

                {/* EXPANDED LIST */}
                {isExpanded && s.bookingsCount > 0 && (
                  <div className="mt-3 bg-slate-900 p-3 rounded border border-slate-700">
                    <div className="font-semibold mb-2 text-white">
                      Booked Students:
                    </div>

                    {s.bookings.map((b) => {

                      /** SAFETY CHECK FOR EACH BOOKING */
                      if (!b.slotStart || !b.slotEnd) {
                        console.warn("Skipping invalid booking:", b);
                        return null;
                      }

                      const bs = parseLocal(b.slotStart);
                      const be = parseLocal(b.slotEnd);
                      const durMin = (be - bs) / 60000;
                      const durText = durMin === 60 ? "1 Hour" : "30 Minutes";

                      return (
                        <div
                          key={b._id}
                          className="py-2 border-b border-slate-600"
                        >
                          <div className="font-semibold text-white">
                            {b.student?.name}
                          </div>

                          <div className="text-xs text-slate-400 mt-1">
                            Company:{" "}
                            <span className="text-white">{b.company}</span>
                            <br />
                            Round:{" "}
                            <span className="text-white">{b.round}</span>
                            <br />
                            Duration:{" "}
                            <span className="text-white">{durText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BOOK SLOT BUTTON */}
                {!isAdmin && !isSlotFull && (
                  <button
                    className="mt-3 px-3 py-1 w-full bg-cyan-600 rounded hover:bg-cyan-500"
                    onClick={() => book(s.slotStart)}
                  >
                    Book Slot
                  </button>
                )}

                {/* SLOT FULL LABEL */}
                {!isAdmin && isSlotFull && (
                  <div className="mt-3 px-3 py-1 w-full bg-slate-700 rounded text-center text-slate-300">
                    Slot Full
                  </div>
                )}

                {/* ADMIN LABEL */}
                {isAdmin && (
                  <div className="mt-3 px-3 py-1 bg-slate-900 text-center rounded text-sm text-slate-200">
                    {isSlotFull ? "Slot Full" : "Seats Available"}
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
