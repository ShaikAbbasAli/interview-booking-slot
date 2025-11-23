import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(60);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");

  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9..20
  const minutes = ["00", "30"];

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await API.get("/bookings/me");
        const found = res.data.find((b) => b._id === id);
        if (!found) {
          alert("Booking not found");
          navigate("/mybookings");
          return;
        }

        setBooking(found);
        setCompany(found.company);
        setRound(found.round);

        const s = new Date(found.slotStart);
        const e = new Date(found.slotEnd);

        setDate(format(s, "yyyy-MM-dd"));
        setHour(pad(s.getHours()));
        setMinute(pad(s.getMinutes()));

        const diff = (e - s) / 60000;
        setDuration(diff === 30 ? 30 : 60);
      } catch (error) {
        console.error(error);
        alert("Failed to load booking");
        navigate("/mybookings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, navigate]);

  async function submit(e) {
    e.preventDefault();

    try {
      const h = parseInt(hour, 10);
      const m = parseInt(minute, 10);

      // Build start time
      const startLocal = `${date}T${pad(h)}:${pad(m)}`;

      // Calculate END correctly
      let endHour = h;
      let endMin = m + duration;

      if (endMin >= 60) {
        endHour += Math.floor(endMin / 60);
        endMin = endMin % 60;
      }

      // final end local string
      const endLocal = `${date}T${pad(endHour)}:${pad(endMin)}`;

      // VALIDATION BEFORE SENDING
      if (endHour < h || (endHour === h && endMin <= m)) {
        alert("End must be after start");
        return;
      }

      if (endHour >= 21) {
        alert("End time must be before 9 PM");
        return;
      }

      if (![0, 30].includes(endMin)) {
        alert("End must align to :00 or :30");
        return;
      }

      // Send
      await API.put(`/bookings/${id}`, {
        slotStart: startLocal,
        slotEnd: endLocal,
        company,
        round,
      });

      alert("Booking updated");
      navigate("/mybookings");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  async function remove() {
    if (!window.confirm("Delete this booking?")) return;

    try {
      await API.delete(`/bookings/${id}/student`);
      alert("Booking deleted.");
      navigate("/mybookings");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.msg || "Delete failed");
    }
  }

  if (loading) return <div className="p-4 bg-slate-700 rounded">Loading…</div>;
  if (!booking) return null;

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded">
      <button
        className="mb-4 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm"
        onClick={() => navigate("/mybookings")}
      >
        ← Back to My Bookings
      </button>

      <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

      <form onSubmit={submit}>
        <label className="block text-sm mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

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

          <div className="w-32">
            <label className="block text-sm mb-1">Duration</label>
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

        <label className="block text-sm mb-1">Company</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

        <label className="block text-sm mb-1">Round</label>
        <input
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500"
          >
            Save
          </button>

          <button
            type="button"
            onClick={remove}
            className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
