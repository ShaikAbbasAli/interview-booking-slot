import React, { useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Build LOCAL date without timezone shift
const buildLocal = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm, 0);

const ROUND_OPTIONS = [
  "L1",
  "L2",
  "L3",
  "Manager",
  "Client",
  "HR",
  "Assessment",
  "Screening",
];
const COMPANY_OPTIONS = ["MNC", "Mid Range", "Startup"];
const TECH_OPTIONS = [
  "Python",
  "DevOps",
  "CyberArk",
  "Cyber Security",
  ".Net",
  "Java",
  "MERN Stack",
];

export default function BookInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const preDate = params.get("date");
  const preStart = params.get("start");

  let preHour = null;
  let preMinute = null;

  if (preStart) {
    const [datePart, timePart] = preStart.split("T");
    const [h, m] = timePart.split(":").map(Number);
    preHour = pad(h);
    preMinute = pad(m);
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = pad(today.getMonth() + 1);
  const dd = pad(today.getDate());
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "09");
  const [minute, setMinute] = useState(preMinute || "00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");       // dropdown
  const [round, setRound] = useState("");           // dropdown
  const [technology, setTechnology] = useState(""); // new dropdown
  const [loading, setLoading] = useState(false);

  // 9 → 23 (9AM–11PM start times)
  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  const timeLocked = !!preStart;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 🚫 ensure dropdowns selected
    if (!company) {
      alert("Please select Company type (MNC / Mid Range / Startup).");
      setLoading(false);
      return;
    }
    if (!round) {
      alert("Please select Round.");
      setLoading(false);
      return;
    }
    if (!technology) {
      alert("Please select Technology.");
      setLoading(false);
      return;
    }

    const [Y, M, D] = date.split("-").map(Number);

    // Build local start & end
    const start = buildLocal(Y, M, D, Number(hour), Number(minute));
    const end = new Date(start.getTime() + duration * 60000);

    const now = new Date();

    const selectedDateObj = new Date(Y, M - 1, D);
    const todayDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // ❌ Block booking for past DATE
    if (selectedDateObj < todayDateOnly) {
      alert("Cannot book slots for past dates.");
      setLoading(false);
      return;
    }

    // ❌ Block booking for past TIME (only if selected date is today)
    if (selectedDateObj.getTime() === todayDateOnly.getTime() && start < now) {
      alert("Cannot book a slot in the past.");
      setLoading(false);
      return;
    }

    // ✅ Enforce alignment :00 or :30
    if (![0, 30].includes(start.getMinutes())) {
      alert("Start time must be at :00 or :30.");
      setLoading(false);
      return;
    }

    // ❌ Ensure we do NOT go beyond 24:00 (midnight)
    if (
      end.getDate() !== start.getDate() &&
      (end.getHours() !== 0 || end.getMinutes() !== 0)
    ) {
      alert("End time cannot go beyond 12:00 AM (midnight).");
      setLoading(false);
      return;
    }

    // Build date string for end (might be next day at 00:00)
    let endDateString = date;
    if (end.getDate() !== start.getDate()) {
      const nextDay = new Date(Y, M - 1, D + 1);
      const ny = nextDay.getFullYear();
      const nm = pad(nextDay.getMonth() + 1);
      const nd = pad(nextDay.getDate());
      endDateString = `${ny}-${nm}-${nd}`;
    }

    const slotStart = `${date}T${pad(start.getHours())}:${pad(
      start.getMinutes()
    )}`;
    const slotEnd = `${endDateString}T${pad(end.getHours())}:${pad(
      end.getMinutes()
    )}`;

    try {
      await API.post("/bookings", {
        slotStart,
        slotEnd,
        company,     // dropdown string
        round,       // dropdown string
        technology,  // new field
      });

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

      <label>Date</label>
      <input
        type="date"
        value={date}
        disabled={timeLocked}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-2 mb-3 rounded bg-slate-700"
      />

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label>Hour</label>
          <select
            value={hour}
            disabled={timeLocked}
            onChange={(e) => setHour(e.target.value)}
            className="w-full p-2 rounded bg-slate-700"
          >
            {hours.map((h) => (
              <option key={h} value={pad(h)}>
                {pad(h)}
              </option>
            ))}
          </select>
        </div>

        <div className="w-24">
          <label>Minute</label>
          <select
            value={minute}
            disabled={timeLocked}
            onChange={(e) => setMinute(e.target.value)}
            className="w-full p-2 rounded bg-slate-700"
          >
            {minutesArr.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label>Duration</label>
      <select
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        className="w-full p-2 rounded bg-slate-700 mb-3"
      >
        <option value={30}>30 Minutes</option>
        <option value={60}>1 Hour</option>
      </select>

      {/* Company dropdown */}
      <label>Company Type</label>
      <select
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full p-2 mb-3 rounded bg-slate-700"
      >
        <option value="">-- Select Company Type --</option>
        {COMPANY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Round dropdown */}
      <label>Round</label>
      <select
        value={round}
        onChange={(e) => setRound(e.target.value)}
        className="w-full p-2 mb-3 rounded bg-slate-700"
      >
        <option value="">-- Select Round --</option>
        {ROUND_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {/* Technology dropdown */}
      <label>Technology</label>
      <select
        value={technology}
        onChange={(e) => setTechnology(e.target.value)}
        className="w-full p-2 mb-4 rounded bg-slate-700"
      >
        <option value="">-- Select Technology --</option>
        {TECH_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <button
        className="px-4 py-2 bg-cyan-600 rounded w-full"
        disabled={loading}
      >
        {loading ? "Booking…" : "Book Slot"}
      </button>
    </form>
  );
}
