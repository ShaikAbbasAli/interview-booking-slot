// BookInterview.jsx — Updated: prevents loading desks for past date or time
import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

/* ------------------------------ *
 *         Helpers
 * ------------------------------ */
const pad = (n) => n.toString().padStart(2, "0");

// Local time builder
const buildLocal = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm, 0);

/* ------------------------------ *
 *     Static Dropdown Options
 * ------------------------------ */
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
  "Java",
  "MERN Stack",
  "DevOps",
  ".Net",
  "CyberArk",
  "Cyber Security",
  "SAP - FICO",
  "SAP - ABAP",
  "SAP - HANA",
  "SAP - BASIS",
  "AI & ML",
];

/* ------------------------------ *
 *   Neon Glow Modal Component
 * ------------------------------ */
function NeonModal({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div
      className="
      fixed inset-0 bg-black/70 backdrop-blur-md
      flex items-center justify-center z-50 animate-fadeIn
    "
    >
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
    const timePart = preStart.split("T")[1];
    const [hh, mm] = timePart.split(":");
    preHour = hh;
    preMinute = mm;
  }

  /* Today */
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;

  /* State */
  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "09");
  const [minute, setMinute] = useState(preMinute || "00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [technology, setTechnology] = useState("");
  const [loading, setLoading] = useState(false);

  /* NEW: desks */
  const [availableDesks, setAvailableDesks] = useState([]);
  const [desk, setDesk] = useState("");
  const [loadingDesks, setLoadingDesks] = useState(false);

  /* Modal */
  const [modal, setModal] = useState({ show: false, message: "" });
  const showModal = (message) => setModal({ show: true, message });

  const timeLocked = !!preStart;

  /* Options */
  const hours = Array.from({ length: 15 }, (_, i) => i + 9); // 9 to 23
  const minutesArr = ["00", "30"];

  /* ---------------------------------------------------------
     LOAD AVAILABLE DESKS — Prevent API call for past date/time
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadDesks() {
      setAvailableDesks([]);
      setDesk("");

      if (!date || !hour || !minute || !duration) return;

      // Prevent loading desks for past date/time
      const now = new Date();
      const [Y, M, D] = date.split("-").map(Number);
      const selectedStart = new Date(Y, M - 1, D, Number(hour), Number(minute));

      if (selectedStart < now) {
        // Past slots: do NOT load desks
        setAvailableDesks([]);
        return;
      }

      // Fetch desks only for valid future times
      setLoadingDesks(true);
      try {
        const start = `${pad(Number(hour))}:${pad(Number(minute))}`;
        const res = await API.get(
          `/bookings/available-desks?date=${date}&start=${start}&duration=${duration}`
        );
        setAvailableDesks(res.data.available || []);
      } catch (err) {
        setAvailableDesks([]);
      } finally {
        setLoadingDesks(false);
      }
    }

    loadDesks();
  }, [date, hour, minute, duration]);

  /* ------------------------------ *
   *        SUBMIT HANDLER
   * ------------------------------ */
  const submit = async (e) => {
    e.preventDefault();

    if (!company) return showModal("Please select Company type.");
    if (!round) return showModal("Please select Round.");
    if (!technology) return showModal("Please select Technology.");
    if (!desk) return showModal("Please select an available system.");

    setLoading(true);

    const [Y, M, D] = date.split("-").map(Number);

    const start = buildLocal(Y, M, D, Number(hour), Number(minute));
    const end = new Date(start.getTime() + duration * 60000);

    const now = new Date();

    // Date only objects
    const selectedDateObj = new Date(Y, M - 1, D);
    const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (selectedDateObj < todayDateObj) {
      setLoading(false);
      return showModal("Cannot book for past dates.");
    }

    if (selectedDateObj.getTime() === todayDateObj.getTime() && start < now) {
      setLoading(false);
      return showModal("Cannot book a past time.");
    }

    if (![0, 30].includes(start.getMinutes())) {
      setLoading(false);
      return showModal("Time must be at :00 or :30.");
    }

    // Crossing midnight handling
    let endDateString = date;
    if (end.getDate() !== start.getDate()) {
      const nextDay = new Date(Y, M - 1, D + 1);
      endDateString = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(
        nextDay.getDate()
      )}`;
    }

    const slotStart = `${date}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
    const slotEnd = `${endDateString}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

    try {
      await API.post("/bookings", {
        slotStart,
        slotEnd,
        company,
        round,
        technology,
        desk,
      });

      showModal(`Slot booked successfully! Desk: ${desk}`);
      setTimeout(() => navigate("/mybookings"), 800);
    } catch (err) {
      showModal(err.response?.data?.msg || "Booking failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ *
   *          JSX OUTPUT
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
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Book Interview</h2>

        {/* Date */}
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

          <div className="w-28">
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

        {/* Available Desks */}
        <label className="block mb-2">Available Systems</label>
        {loadingDesks ? (
          <div className="px-3 py-2 mb-4 rounded bg-slate-700 text-white">
            Checking…
          </div>
        ) : availableDesks.length === 0 ? (
          <div className="px-3 py-2 mb-4 rounded bg-red-800 text-white">
            No systems available for selected time.
          </div>
        ) : (
          <select
            value={desk}
            onChange={(e) => setDesk(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-slate-700"
          >
            <option value="">-- Select System --</option>
            {availableDesks.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}

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
