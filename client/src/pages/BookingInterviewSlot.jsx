// BookInterview.jsx — Neon Glow Modal Version
import React, { useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

/* ------------------------------ *
 *         Helpers
 * ------------------------------ */
function pad(n) {
  return n.toString().padStart(2, "0");
}

// Build LOCAL date without timezone shift
const buildLocal = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm, 0);

// Options
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

/* ------------------------------ *
 *   Neon Glow Modal Component
 * ------------------------------ */
function NeonModal({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div className="
      fixed inset-0 bg-black/70 backdrop-blur-md
      flex items-center justify-center z-50 animate-fadeIn
    ">
      <div
        className="
        bg-slate-900 border border-cyan-400/40 rounded-2xl
        p-6 w-80 text-center
        shadow-[0_0_25px_rgba(0,255,255,0.7)]
        animate-scaleIn
      "
      >
        <div className="text-cyan-300 text-xl font-bold mb-2 drop-shadow-lg">
          ✨ Aikya Info
        </div>

        <div className="text-slate-200 mb-5">{message}</div>

        <button
          onClick={onClose}
          className="
            px-5 py-2 rounded-xl bg-cyan-600
            hover:bg-cyan-500 text-white font-semibold
            shadow-[0_0_15px_rgba(0,255,255,0.6)]
          "
        >
          OK
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ *
 *            MAIN
 * ------------------------------ */
export default function BookInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Pre-filled params from FullDayView */
  const params = new URLSearchParams(location.search);
  const preDate = params.get("date");
  const preStart = params.get("start");

  let preHour = null;
  let preMinute = null;

  if (preStart) {
    const [, timePart] = preStart.split("T");
    const [h, m] = timePart.split(":").map(Number);
    preHour = pad(h);
    preMinute = pad(m);
  }

  /* Date default (today) */
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${pad(
    today.getMonth() + 1
  )}-${pad(today.getDate())}`;

  /* States */
  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "09");
  const [minute, setMinute] = useState(preMinute || "00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [technology, setTechnology] = useState("");
  const [loading, setLoading] = useState(false);

  /* Modal */
  const [modal, setModal] = useState({ show: false, message: "" });
  const showModal = (msg, cb) => {
    setModal({ show: true, message: msg });

    // Allow callback (like navigation) after a delay
    if (cb) setTimeout(cb, 650);
  };

  /* Time options */
  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  const timeLocked = !!preStart;

  /* ------------------------------ *
   *             SUBMIT
   * ------------------------------ */
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!company) return showModal("Please select Company type.", () => setLoading(false));
    if (!round) return showModal("Please select Round.", () => setLoading(false));
    if (!technology) return showModal("Please select Technology.", () => setLoading(false));

    const [Y, M, D] = date.split("-").map(Number);

    const start = buildLocal(Y, M, D, Number(hour), Number(minute));
    const end = new Date(start.getTime() + duration * 60000);

    const now = new Date();

    const selectedDateObj = new Date(Y, M - 1, D);
    const todayDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    if (selectedDateObj < todayDateOnly)
      return showModal("Cannot book slots for past dates.", () =>
        setLoading(false)
      );

    if (selectedDateObj.getTime() === todayDateOnly.getTime() && start < now)
      return showModal("Cannot book a past time.", () => setLoading(false));

    if (![0, 30].includes(start.getMinutes()))
      return showModal("Time must be at :00 or :30.", () => setLoading(false));

    if (
      end.getDate() !== start.getDate() &&
      (end.getHours() !== 0 || end.getMinutes() !== 0)
    ) {
      return showModal("End time cannot exceed midnight.", () =>
        setLoading(false)
      );
    }

    /* Build slotEnd */
    let endDateString = date;
    if (end.getDate() !== start.getDate()) {
      const nextDay = new Date(Y, M - 1, D + 1);
      endDateString = `${nextDay.getFullYear()}-${pad(
        nextDay.getMonth() + 1
      )}-${pad(nextDay.getDate())}`;
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
        company,
        round,
        technology,
      });

      showModal("Slot booked successfully!", () => navigate("/mybookings"));
    } catch (err) {
      showModal(err.response?.data?.msg || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ *
   *          UI OUTPUT
   * ------------------------------ */
  return (
    <>
      <NeonModal
        show={modal.show}
        message={modal.message}
        onClose={() => setModal({ show: false, message: "" })}
      />

      <form
        className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl font-bold"
        onSubmit={submit}
      >
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">
          Book Interview
        </h2>

        {/* DATE */}
        <label className="text-slate-300 font-bold">Select Date</label>
        <input
          type="date"
          value={date}
          min={defaultDate}
          disabled={timeLocked}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700 text-white"
        />

        {/* TIME */}
        <div className="flex gap-2 mb-4">
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

        {/* Duration */}
        <label>Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full p-2 rounded bg-slate-700 mb-4"
        >
          <option value={30}>30 Minutes</option>
          <option value={60}>1 Hour</option>
        </select>

        {/* Company */}
        <label>Company Type</label>
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
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
          className="w-full p-2 mb-4 rounded bg-slate-700"
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
          className="w-full p-2 mb-6 rounded bg-slate-700"
        >
          <option value="">-- Select Technology --</option>
          {TECH_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Submit */}
        <button
          className="
            px-4 py-2 w-full rounded-xl
            bg-cyan-600 hover:bg-cyan-500 text-white
            font-semibold shadow-[0_0_12px_rgba(0,255,255,0.5)]
          "
          disabled={loading}
        >
          {loading ? "Booking…" : "Book Slot"}
        </button>
      </form>
    </>
  );
}

/* Animations */
const styles = `
@keyframes fadeIn { from {opacity:0} to {opacity:1} }
@keyframes scaleIn { 0%{transform:scale(.7);opacity:0} 100%{transform:scale(1);opacity:1}}
.animate-fadeIn { animation: fadeIn .2s ease-out }
.animate-scaleIn { animation: scaleIn .25s ease-out }
`;
document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);
