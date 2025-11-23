// client/src/pages/EditBooking.jsx
import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

function pad(n) {
  return n.toString().padStart(2, "0");
}

function buildLocal(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm, 0);
}

function toLocalString(dt) {
  return (
    dt.getFullYear() +
    "-" +
    pad(dt.getMonth() + 1) +
    "-" +
    pad(dt.getDate()) +
    "T" +
    pad(dt.getHours()) +
    ":" +
    pad(dt.getMinutes())
  );
}

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(60);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
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

        const s = new Date(found.slotStart);
        const e = new Date(found.slotEnd);

        setDate(format(s, "yyyy-MM-dd"));
        setHour(pad(s.getHours()));
        setMinute(pad(s.getMinutes()));
        setDuration((e - s) / 60000);

        setCompany(found.company);
        setRound(found.round);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  async function submit(e) {
    e.preventDefault();

    const [Y, M, D] = date.split("-").map(Number);
    const start = buildLocal(Y, M, D, Number(hour), Number(minute));
    const end = new Date(start.getTime() + duration * 60000);

    const slotStart = toLocalString(start);
    const slotEnd = toLocalString(end);

    try {
      await API.put(`/bookings/${id}`, {
        slotStart,
        slotEnd,
        company,
        round,
      });

      alert("Booking updated");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  async function remove() {
    if (!window.confirm("Delete?")) return;

    await API.delete(`/bookings/${id}/student`);
    navigate("/mybookings");
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded">
      <button onClick={() => navigate("/mybookings")} className="mb-4 px-3 py-1 bg-slate-700 rounded">
        ← Back
      </button>

      <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

      <form onSubmit={submit}>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700" />

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label>Hour</label>
            <select value={hour} onChange={(e) => setHour(e.target.value)} className="w-full p-2 rounded bg-slate-700">
              {hours.map((h) => (
                <option key={h} value={pad(h)}>
                  {pad(h)}
                </option>
              ))}
            </select>
          </div>

          <div className="w-24">
            <label>Minute</label>
            <select value={minute} onChange={(e) => setMinute(e.target.value)} className="w-full p-2 rounded bg-slate-700">
              {minutes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="w-32">
            <label>Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full p-2 rounded bg-slate-700">
              <option value={30}>30 Minutes</option>
              <option value={60}>1 Hour</option>
            </select>
          </div>
        </div>

        <label>Company</label>
        <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700" />

        <label>Round</label>
        <input value={round} onChange={(e) => setRound(e.target.value)} className="w-full p-2 mb-4 rounded bg-slate-700" />

        <div className="flex gap-3">
          <button className="px-3 py-1 bg-blue-600 rounded">Save</button>
          <button type="button" onClick={remove} className="px-3 py-1 bg-red-600 rounded">
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
