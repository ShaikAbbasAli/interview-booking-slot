import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

/* ---------- HELPERS ---------- */

function pad(n) {
  return n.toString().padStart(2, "0");
}

// IST Today (min date)
function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

// Convert Date → yyyy-MM-ddTHH:mm (pure local)
function toPureISTString(date) {
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
}

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

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [technology, setTechnology] = useState("");

  // Hours allowed 9 → 23
  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  /* ----------------------
      LOAD BOOKING DATA
  ------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/bookings/me");
        const found = res.data.find((b) => b._id === id);

        if (!found) {
          alert("Booking not found");
          navigate("/mybookings");
          return;
        }

        const s = new Date(found.slotStart);
        const e = new Date(found.slotEnd);

        setDate(format(s, "yyyy-MM-dd"));
        setHour(pad(s.getHours()));
        setMinute(pad(s.getMinutes()));
        setDuration((e - s) / 60000);

        setCompany(found.company || "");
        setRound(found.round || "");
        setTechnology(found.technology || "");
      } catch {
        alert("Failed to load booking");
        navigate("/mybookings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, navigate]);

  /* ----------------------
      SUBMIT UPDATED DATA
  ------------------------- */
  async function submit(e) {
    e.preventDefault();

    if (!company) return alert("Please select Company type.");
    if (!round) return alert("Please select Round.");
    if (!technology) return alert("Please select Technology.");

    const [Y, M, D] = date.split("-").map(Number);

    const startIST = new Date(Y, M - 1, D, Number(hour), Number(minute));
    const endIST = new Date(startIST.getTime() + duration * 60000);

    const now = new Date();

    // Past date validation
    const bookingDay = new Date(Y, M - 1, D);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (bookingDay < today) {
      alert("Cannot edit past dates.");
      return;
    }

    // Same-day past time check
    if (bookingDay.getTime() === today.getTime() && startIST < now) {
      alert("Cannot edit a slot already passed today.");
      return;
    }

    // Time alignment
    if (![0, 30].includes(startIST.getMinutes())) {
      alert("Start time must be aligned to :00 or :30.");
      return;
    }

    // Midnight handling (end cannot exceed 24:00)
    if (
      endIST.getDate() !== startIST.getDate() &&
      (endIST.getHours() !== 0 || endIST.getMinutes() !== 0)
    ) {
      alert("End time cannot exceed 12:00 AM (midnight).");
      return;
    }

    // Build end date string (may be next day)
    let endDateStr = date;
    if (endIST.getDate() !== startIST.getDate()) {
      const nextDay = new Date(Y, M - 1, D + 1);
      endDateStr = format(nextDay, "yyyy-MM-dd");
    }

    const payload = {
      slotStart: toPureISTString(startIST),
      slotEnd: `${endDateStr}T${pad(endIST.getHours())}:${pad(
        endIST.getMinutes()
      )}`,
      company,
      round,
      technology,
    };

    try {
      await API.put(`/bookings/${id}`, payload);
      alert("Booking updated successfully");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  /* ----------------------
          DELETE
  ------------------------- */
  async function remove() {
    if (!window.confirm("Delete this booking?")) return;
    await API.delete(`/bookings/${id}/student`);
    navigate("/mybookings");
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl border border-slate-600">

      <button
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
      >
        ← Back
      </button>

      <h2 className="text-xl mb-4 text-cyan-400 font-bold">Edit Booking</h2>

      <form onSubmit={submit}>

        {/* DATE PICKER WITH BRIGHT ICON */}
        <label className="text-sm text-slate-300">Date</label>

        <div className="relative w-full mb-3">
          <input
            type="date"
            min={todayIST()}   // 🔥 DISABLE past days
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 pr-10 rounded bg-slate-700 text-white border border-slate-600"
          />

          <span
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              text-2xl text-cyan-400 
              drop-shadow-[0_0_8px_rgba(0,255,255,0.9)]
              pointer-events-none
            "
          >
            📅
          </span>
        </div>

        {/* TIME ROW */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label>Hour</label>
            <select
              value={hour}
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

          <div className="w-32">
            <label>Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 rounded bg-slate-700"
            >
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
            </select>
          </div>
        </div>

        {/* Company */}
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

        {/* Round */}
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

        {/* Technology */}
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

        {/* ACTION BUTTONS */}
        <div className="flex gap-3">
          <button className="px-3 py-1 bg-blue-600 rounded">Save</button>

          <button
            type="button"
            onClick={remove}
            className="px-3 py-1 bg-red-600 rounded"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
