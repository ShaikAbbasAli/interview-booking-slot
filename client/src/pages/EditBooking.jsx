import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Parse a LOCAL datetime string WITHOUT timezone shift
function parseLocal(dtString) {
  const [datePart, timePart] = dtString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// Build LOCAL datetime safely
function buildLocal(y, m, d, hh, mm) {
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// Convert LOCAL date to "YYYY-MM-DDTHH:mm"
function toLocalString(date) {
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

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(60);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");

  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 09–20
  const minutes = ["00", "30"];

  // ------------------ LOAD EXISTING BOOKING ------------------
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

        const s = parseLocal(found.slotStart);
        const e = parseLocal(found.slotEnd);

        setDate(format(s, "yyyy-MM-dd"));
        setHour(pad(s.getHours()));
        setMinute(pad(s.getMinutes()));
        setDuration((e - s) / 60000);

        setCompany(found.company);
        setRound(found.round);
      } catch {
        alert("Failed to load booking");
        navigate("/mybookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  // ------------------ SUBMIT UPDATE ------------------
  async function submit(e) {
    e.preventDefault();

    const [Y, M, D] = date.split("-").map(Number);

    // Build start in local time
    const start = buildLocal(Y, M, D, Number(hour), Number(minute));

    // Build end WITHOUT timezone problems
    let endHour = Number(hour);
    let endMinute = Number(minute) + duration;

    if (endMinute >= 60) {
      endHour += Math.floor(endMinute / 60);
      endMinute = endMinute % 60;
    }

    const end = buildLocal(Y, M, D, endHour, endMinute);

    // Validate
    if (end <= start) return alert("End must be after start");
    if (endHour >= 21) return alert("End must be before 9 PM");
    if (![0, 30].includes(start.getMinutes()))
      return alert("Start must align to :00/:30");
    if (![0, 30].includes(end.getMinutes()))
      return alert("End must align to :00/:30");

    const payload = {
      slotStart: toLocalString(start), // Always IST
      slotEnd: toLocalString(end),     // Always IST
      company,
      round,
    };

    try {
      await API.put(`/bookings/${id}`, payload);
      alert("Booking updated successfully");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  // ------------------ DELETE ------------------
  async function remove() {
    if (!window.confirm("Delete this booking?")) return;
    await API.delete(`/bookings/${id}/student`);
    navigate("/mybookings");
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded">
      <button
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 rounded"
      >
        ← Back
      </button>

      <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

      <form onSubmit={submit}>
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

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
              {minutes.map((m) => (
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

        <label>Company</label>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

        <label>Round</label>
        <input
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        />

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
