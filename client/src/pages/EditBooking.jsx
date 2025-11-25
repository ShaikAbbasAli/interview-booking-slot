// EditBooking.jsx (Updated with react-hot-toast UI popups)

import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast"; // ⭐ NEW

function pad(n) {
  return n.toString().padStart(2, "0");
}

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

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  // -------------------- LOAD BOOKING --------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/bookings/me");
        const found = res.data.find((b) => b._id === id);

        if (!found) {
          toast.error("Booking not found");
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
      } catch (err) {
        toast.error("Failed to load booking");
        navigate("/mybookings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  // -------------------- SUBMIT UPDATE --------------------
  async function submit(e) {
    e.preventDefault();

    if (!company) return toast.error("Please select Company type");
    if (!round) return toast.error("Please select Round");
    if (!technology) return toast.error("Please select Technology");

    const [Y, M, D] = date.split("-").map(Number);
    const startIST = new Date(Y, M - 1, D, Number(hour), Number(minute));
    const endIST = new Date(startIST.getTime() + duration * 60000);

    const now = new Date();

    const bookingDay = new Date(Y, M - 1, D);
    const todayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    if (bookingDay < todayDate) {
      return toast.error("Cannot edit past dates");
    }

    if (bookingDay.getTime() === todayDate.getTime() && startIST < now) {
      return toast.error("Cannot edit past time slots today");
    }

    if (![0, 30].includes(startIST.getMinutes())) {
      return toast.error("Start time must be at :00 or :30");
    }

    if (
      endIST.getDate() !== startIST.getDate() &&
      (endIST.getHours() !== 0 || endIST.getMinutes() !== 0)
    ) {
      return toast.error("End time cannot exceed 12:00 AM midnight");
    }

    // Handle next-day midnight
    let endDateString = date;
    if (endIST.getDate() !== startIST.getDate()) {
      const next = new Date(Y, M - 1, D + 1);
      endDateString =
        next.getFullYear() +
        "-" +
        pad(next.getMonth() + 1) +
        "-" +
        pad(next.getDate());
    }

    const payload = {
      slotStart: toPureISTString(startIST),
      slotEnd: `${endDateString}T${pad(endIST.getHours())}:${pad(
        endIST.getMinutes()
      )}`,
      company,
      round,
      technology,
    };

    try {
      await API.put(`/bookings/${id}`, payload);
      toast.success("Booking updated!");
      navigate("/mybookings");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Update failed");
    }
  }

  // -------------------- DELETE BOOKING --------------------
  async function remove() {
    try {
      await API.delete(`/bookings/${id}/student`);
      toast.success("Booking deleted");
      navigate("/mybookings");
    } catch {
      toast.error("Failed to delete booking");
    }
  }

  if (loading) return <div className="text-slate-300">Loading…</div>;

  // -------------------- UI --------------------
  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl shadow-lg">
      <button
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
      >
        ← Back
      </button>

      <h2 className="text-xl mb-4 text-cyan-400 font-bold">Edit Booking</h2>

      <form onSubmit={submit}>
        {/* DATE + ICON */}
        <label className="text-slate-300">Date</label>
        <div className="relative">
          <input
            type="date"
            min={format(new Date(), "yyyy-MM-dd")} // disable past dates
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-slate-700 text-white pr-10"
          />

          {/* bright calendar icon */}
          <span
            className="
              absolute right-3 top-1/2 -translate-y-1/2 text-2xl
              text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.9)]
              pointer-events-none
            "
          >
            📅
          </span>
        </div>

        {/* TIME FIELDS */}
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

        {/* DROPDOWNS */}
        <label>Company Type</label>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        >
          <option value="">-- Select Company Type --</option>
          {COMPANY_OPTIONS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <label>Round</label>
        <select
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-slate-700"
        >
          <option value="">-- Select Round --</option>
          {ROUND_OPTIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label>Technology</label>
        <select
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        >
          <option value="">-- Select Technology --</option>
          {TECH_OPTIONS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* BUTTONS */}
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
            Save
          </button>

          <button
            type="button"
            onClick={remove}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
