import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

// ---- PARSE LOCAL ISO WITHOUT CHANGING TIME ----
function parseLocalISO(iso) {
  const [date, time] = iso.split("T");
  const [hour, minute] = time.split(":").map((x) => parseInt(x, 10));
  return { date, hour, minute };
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function EditBooking() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [loading, setLoading] = useState(true);

  // 9AM – 8PM
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
  const minutes = ["00", "30"];

  // ---------- LOAD BOOKING ----------
  useEffect(() => {
    loadBooking();
  }, []);

  async function loadBooking() {
    try {
      const res = await API.get("/bookings/me");
      const found = res.data.find((b) => b._id === id);

      if (!found) {
        alert("Booking not found.");
        navigate("/mybookings");
        return;
      }

      const start = parseLocalISO(found.slotStart);
      const end = parseLocalISO(found.slotEnd);

      const startDate = start.date;

      // Duration in minutes
      const d =
        (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute);

      setDate(startDate);
      setHour(pad(start.hour));
      setMinute(pad(start.minute));
      setDuration(d);
      setCompany(found.company);
      setRound(found.round);
    } catch (err) {
      alert("Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }

  // ---------- SAVE ----------
  async function saveBooking() {
    try {
      const startISO = `${date}T${hour}:${minute}`;
      const endISO = new Date(
        new Date(`${startISO}:00`).getTime() + duration * 60000
      )
        .toISOString()
        .slice(0, 16);

      await API.put(`/bookings/${id}`, {
        slotStart: startISO,
        slotEnd: endISO,
        company,
        round,
      });

      alert("Booking updated successfully!");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  // ---------- DELETE ----------
  async function deleteBooking() {
    if (!window.confirm("Delete this booking?")) return;

    try {
      await API.delete(`/bookings/${id}/student`);
      alert("Booking deleted.");
      navigate("/mybookings");
    } catch (err) {
      alert("Delete failed.");
    }
  }

  if (loading)
    return <div className="p-4 bg-slate-700 rounded">Loading…</div>;

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded mt-4">
      <button
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 rounded"
      >
        ← Back to My Bookings
      </button>

      <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

      {/* DATE */}
      <label className="block text-sm mb-1">Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-2 mb-3 bg-slate-700 rounded"
      />

      {/* TIME */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-sm mb-1">Hour</label>
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

        <div className="w-28">
          <label className="block text-sm mb-1">Minute</label>
          <select
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
            className="w-full p-2 rounded bg-slate-700"
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
        className="w-full p-2 mb-3 bg-slate-700 rounded"
      >
        <option value={30}>30 Minutes</option>
        <option value={60}>1 Hour</option>
      </select>

      {/* COMPANY */}
      <label className="block text-sm mb-1">Company</label>
      <input
        type="text"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full p-2 mb-3 bg-slate-700 rounded"
      />

      {/* ROUND */}
      <label className="block text-sm mb-1">Round</label>
      <input
        type="text"
        value={round}
        onChange={(e) => setRound(e.target.value)}
        className="w-full p-2 mb-4 bg-slate-700 rounded"
      />

      <div className="flex gap-3">
        <button
          onClick={saveBooking}
          className="px-3 py-2 bg-blue-600 rounded hover:bg-blue-500"
        >
          Save
        </button>

        <button
          onClick={deleteBooking}
          className="px-3 py-2 bg-red-600 rounded hover:bg-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
