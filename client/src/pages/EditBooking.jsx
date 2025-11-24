import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

function pad(n) {
  return n.toString().padStart(2, "0");
}

// Convert Date → "YYYY-MM-DDTHH:mm"
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

  const [isPastSlot, setIsPastSlot] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
  const minutes = ["00", "30"];

  /* -------------------------------------------------------
     LOAD BOOKING (Backend sends IST string already)
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

        // -----------------------------
        //  CHECK IF SLOT IS IN THE PAST
        // -----------------------------
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const bookingDay = new Date(
          sIST.getFullYear(),
          sIST.getMonth(),
          sIST.getDate()
        );

        // past date → block
        if (bookingDay < today) {
          setIsPastSlot(true);
        }

        // same date but time passed → block
        if (bookingDay.getTime() === today.getTime() && sIST < now) {
          setIsPastSlot(true);
        }
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
     SUBMIT — Only if not past slot
  --------------------------------------------------------- */
  async function submit(e) {
    e.preventDefault();

    if (isPastSlot) {
      alert("Past slot cannot be edited.");
      return;
    }

    const [Y, M, D] = date.split("-").map(Number);

    const startIST = new Date(Y, M - 1, D, Number(hour), Number(minute));
    const endIST = new Date(startIST.getTime() + duration * 60000);

    if (endIST <= startIST) return alert("End must be after start");
    if (endIST.getHours() >= 21) return alert("End must be before 9 PM IST");

    if (![0, 30].includes(startIST.getMinutes()))
      return alert("Start minutes must be :00 or :30");
    if (![0, 30].includes(endIST.getMinutes()))
      return alert("End minutes must be :00 or :30");

    const payload = {
      slotStart: toPureISTString(startIST),
      slotEnd: toPureISTString(endIST),
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

      {isPastSlot && (
        <div className="mb-4 px-3 py-2 bg-red-700 text-white rounded text-center">
          Past Slot – Cannot Edit
        </div>
      )}

      <form onSubmit={submit}>
        <label>Date</label>
        <input
          type="date"
          value={date}
          disabled={isPastSlot}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label>Hour</label>
            <select
              value={hour}
              disabled={isPastSlot}
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
              disabled={isPastSlot}
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
              disabled={isPastSlot}
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
          disabled={isPastSlot}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        />

        <label>Round</label>
        <input
          value={round}
          disabled={isPastSlot}
          onChange={(e) => setRound(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        />

        <div className="flex gap-3">
          {!isPastSlot && (
            <button className="px-3 py-1 bg-blue-600 rounded">Save</button>
          )}

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
