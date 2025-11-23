// client/src/pages/BookInterview.jsx
import React, { useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function BookInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read URL params (?date=YYYY-MM-DD&start=YYYY-MM-DDTHH:mm)
  const params = new URLSearchParams(location.search);
  const preDate = params.get("date");
  const preStart = params.get("start");

  // If start parameter is provided → convert to hour/min for form
  let preHour = null;
  let preMinute = null;
  if (preStart) {
    const d = new Date(preStart);
    preHour = pad(d.getHours());
    preMinute = pad(d.getMinutes());
  }

  // Default date → today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = pad(today.getMonth() + 1);
  const dd = pad(today.getDate());
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "09");
  const [minute, setMinute] = useState(preMinute || "00");
  const [duration, setDuration] = useState(30); // minutes
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [loading, setLoading] = useState(false);

  // 9:00 → 20:30
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
  const minutes = ["00", "30"];

  // If user opens via FullDayView (Book Slot button), lock date/time
  const timeLocked = !!preStart;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Build local start time without Z
      const startLocal = `${date}T${hour}:${minute}`;
      const startDateObj = new Date(startLocal);

      // Calculate end time
      const endDateObj = new Date(startDateObj.getTime() + duration * 60000);
      const endLocal = `${date}T${pad(endDateObj.getHours())}:${pad(
        endDateObj.getMinutes()
      )}`;

      if (!company.trim() || !round.trim()) {
        alert("Company and Round are required.");
        setLoading(false);
        return;
      }

      const payload = {
        slotStart: startLocal, // <--- NO toISOString()
        slotEnd: endLocal,     // <--- NO toISOString()
        company,
        round,
      };

      await API.post("/bookings", payload);

      alert("Slot booked successfully!");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="max-w-md mx-auto bg-slate-800 p-6 rounded"
      onSubmit={submit}
    >
      <h2 className="text-xl mb-4">Book Interview</h2>

      {/* DATE */}
      <label className="block text-sm mb-1">Date</label>
      <input
        type="date"
        value={date}
        disabled={timeLocked}
        onChange={(e) => setDate(e.target.value)}
        className={`w-full p-2 mb-3 rounded bg-slate-700 ${
          timeLocked ? "opacity-60" : ""
        }`}
      />

      {/* TIME SELECTION */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-sm mb-1">Hour</label>
          <select
            value={hour}
            disabled={timeLocked}
            onChange={(e) => setHour(e.target.value)}
            className={`w-full p-2 rounded bg-slate-700 ${
              timeLocked ? "opacity-60" : ""
            }`}
          >
            {hours.map((h) => (
              <option key={h} value={pad(h)}>
                {pad(h)}
              </option>
            ))}
          </select>
        </div>

        <div className="w-28">
          <label className="block text-sm mb-1">Minute</label>
          <select
            value={minute}
            disabled={timeLocked}
            onChange={(e) => setMinute(e.target.value)}
            className={`w-full p-2 rounded bg-slate-700 ${
              timeLocked ? "opacity-60" : ""
            }`}
          >
            {minutes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DURATION */}
      <label className="block text-sm mb-1">Duration</label>
      <select
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        className="w-full p-2 rounded bg-slate-700 mb-3"
      >
        <option value={30}>30 Minutes</option>
        <option value={60}>1 Hour</option>
      </select>

      {/* COMPANY */}
      <label className="block text-sm mb-1">Company Name</label>
      <input
        type="text"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full p-2 mb-3 rounded bg-slate-700"
        placeholder="e.g. TCS"
      />

      {/* ROUND */}
      <label className="block text-sm mb-1">Round</label>
      <input
        type="text"
        value={round}
        onChange={(e) => setRound(e.target.value)}
        className="w-full p-2 mb-4 rounded bg-slate-700"
        placeholder="e.g. L1"
      />

      <button
        className="px-4 py-2 bg-cyan-600 rounded w-full"
        disabled={loading}
      >
        {loading ? "Booking…" : "Book Slot"}
      </button>

      <div className="text-xs text-slate-400 mt-2">
        You may book up to 5 slots per day. All interviews must be between 9:00
        AM and 9:00 PM.
      </div>
    </form>
  );
}
