import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Convert Date → "YYYY-MM-DDTHH:mm" (IST WITHOUT timezone)
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

  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 09–20
  const minutes = ["00", "30"];

  /* -------------------------------------------------------
     LOAD BOOKING (Backend sends plain IST string already)
  --------------------------------------------------------- */
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

        const sIST = new Date(found.slotStart);
        const eIST = new Date(found.slotEnd);

        setDate(format(sIST, "yyyy-MM-dd"));
        setHour(pad(sIST.getHours()));
        setMinute(pad(sIST.getMinutes()));
        setDuration((eIST - sIST) / 60000);

        setCompany(found.company);
        setRound(found.round);
      } catch (err) {
        alert("Failed to load booking");
        navigate("/mybookings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, navigate]);

  /* -------------------------------------------------------
     SUBMIT — slotEnd = slotStart + duration (IST only)
  --------------------------------------------------------- */
  async function submit(e) {
    e.preventDefault();

    const [Y, M, D] = date.split("-").map(Number);

    // Build slotStart in IST
    const startIST = new Date(Y, M - 1, D, Number(hour), Number(minute));

    // slotEnd = slotStart + duration minutes
    const endIST = new Date(startIST.getTime() + duration * 60000);

    // Validations
    if (endIST <= startIST) return alert("End must be after start");
    if (endIST.getHours() >= 21) return alert("End must be before 9 PM IST");
    if (![0, 30].includes(startIST.getMinutes()))
      return alert("Start minutes must be :00 or :30");
    if (![0, 30].includes(endIST.getMinutes()))
      return alert("End minutes must be :00 or :30");

    const payload = {
      slotStart: toPureISTString(startIST), // "2025-11-23T11:00"
      slotEnd: toPureISTString(endIST),     // "2025-11-23T12:00"
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

  /* -------------------------------------------------------
     DELETE BOOKING
  --------------------------------------------------------- */
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
