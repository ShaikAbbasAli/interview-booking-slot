import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useParams } from "react-router-dom";

// Parse local datetime without UTC shift
function parseLocal(dtString) {
  const [datePart, timePart] = dtString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

// Format yyyy-mm-dd for input
function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

// Pad numbers
function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function EditBooking() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");

  // Load the existing booking details
  async function loadBooking() {
    try {
      const res = await API.get("/bookings/me");
      const booking = res.data.find((b) => b._id === id);
      if (!booking) {
        alert("Booking not found.");
        navigate("/mybookings");
        return;
      }

      const start = parseLocal(booking.slotStart);
      const end = parseLocal(booking.slotEnd);

      setDate(formatDateInput(start));
      setHour(pad(start.getHours()));
      setMinute(pad(start.getMinutes()));

      const diff = (end - start) / 60000; // minutes
      setDuration(diff);

      setCompany(booking.company);
      setRound(booking.round);
    } catch (err) {
      alert("Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooking();
  }, []);

  // Save updated booking
  async function submit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const start = new Date(`${date}T${hour}:${minute}:00`);
      const end = new Date(start.getTime() + duration * 60000);

      const payload = {
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        company,
        round,
      };

      await API.put(`/bookings/${id}`, payload);

      alert("Booking updated successfully!");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9..20
  const minutes = ["00", "30"];

  if (loading) {
    return (
      <div className="p-4 bg-slate-700 rounded inline-block mx-auto mt-10">
        Loading booking…
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-md mx-auto bg-slate-800 p-6 rounded mt-6"
    >
      {/* BACK BUTTON */}
      <button
        type="button"
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
      >
        ← Back to My Bookings
      </button>

      <h2 className="text-xl mb-4 text-cyan-300">Edit Booking</h2>

      {/* DATE */}
      <label className="block text-sm mb-1">Date</label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full p-2 rounded bg-slate-700 mb-3"
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
        className="w-full p-2 rounded bg-slate-700 mb-3"
      />

      {/* ROUND */}
      <label className="block text-sm mb-1">Round</label>
      <input
        type="text"
        value={round}
        onChange={(e) => setRound(e.target.value)}
        className="w-full p-2 rounded bg-slate-700 mb-4"
      />

      {/* SAVE BUTTON */}
      <button
        className="px-4 py-2 bg-cyan-600 rounded w-full hover:bg-cyan-500"
        disabled={saving}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
