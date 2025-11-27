// BookInterview.jsx — Updated with Confirmation Popup
import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

/* ------------------------------ Helpers ------------------------------ */
const pad = (n) => n.toString().padStart(2, "0");
const buildLocal = (y, m, d, hh, mm) => new Date(y, m - 1, d, hh, mm, 0);

/* ------------------------------ Data Lists ------------------------------ */
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

/* ------------------------------ Neon Info Modal ------------------------------ */
function NeonModal({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-80 text-center shadow-lg animate-scaleIn">
        <div className="text-cyan-300 text-xl font-bold mb-3">✨ Aikya Info</div>
        <div className="text-slate-200 mb-5">{message}</div>

        <button
          onClick={onClose}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white shadow"
        >
          OK
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ NEW Confirmation Popup ------------------------------ */
function ConfirmModal({ show, details, onConfirm, onCancel }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-96 text-center shadow-lg animate-scaleIn">
        <div className="text-cyan-300 text-xl font-bold mb-3">⚠️ Confirm Booking</div>

        <div className="text-slate-200 mb-4 space-y-1 text-left">
          <p><b>Date:</b> {details.date}</p>
          <p><b>Time:</b> {details.time}</p>
          <p><b>Duration:</b> {details.duration}</p>
          <p><b>Desk:</b> {details.desk}</p>
          <p><b>Company:</b> {details.company}</p>
          <p><b>Round:</b> {details.round}</p>
          <p><b>Technology:</b> {details.technology}</p>
        </div>

        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-white"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ MAIN Component ------------------------------ */
export default function BookInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Prefill from FullDayView */
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
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;

  /* States */
  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "09");
  const [minute, setMinute] = useState(preMinute || "00");
  const [duration, setDuration] = useState(30);

  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [technology, setTechnology] = useState("");

  const [availableDesks, setAvailableDesks] = useState([]);
  const [desk, setDesk] = useState("");
  const [loadingDesks, setLoadingDesks] = useState(false);

  /* Info Modal */
  const [modal, setModal] = useState({ show: false, message: "" });
  const showModal = (message) => setModal({ show: true, message });

  /* Confirmation Modal */
  const [confirm, setConfirm] = useState({ show: false, details: null });

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];
  const timeLocked = !!preStart;

  /* ------------------ Load Available Desks ------------------ */
  useEffect(() => {
    async function loadDesks() {
      setAvailableDesks([]);
      setDesk("");

      if (!date || !hour || !minute) return;

      const now = new Date();
      const [Y, M, D] = date.split("-").map(Number);
      const selectedStart = new Date(Y, M - 1, D, hour, minute);

      if (selectedStart < now) return;

      setLoadingDesks(true);
      try {
        const start = `${hour}:${minute}`;
        const res = await API.get(
          `/bookings/available-desks?date=${date}&start=${start}&duration=${duration}`
        );
        setAvailableDesks(res.data.available || []);
      } catch {
        setAvailableDesks([]);
      } finally {
        setLoadingDesks(false);
      }
    }

    loadDesks();
  }, [date, hour, minute, duration]);

  /* ------------------ Submit → Trigger Confirm Popup ------------------ */
  const submit = (e) => {
    e.preventDefault();

    if (!company) return showModal("Please select Company.");
    if (!round) return showModal("Please select Round.");
    if (!technology) return showModal("Please select Technology.");
    if (!desk) return showModal("Please select a Desk.");

    const displayTime = `${hour}:${minute}`;
    const displayDuration = duration === 60 ? "1 Hour" : "30 Minutes";

    setConfirm({
      show: true,
      details: {
        date,
        time: displayTime,
        duration: displayDuration,
        desk,
        company,
        round,
        technology,
      },
    });
  };

  /* ------------------ Confirm Booking Handler ------------------ */
  const finalizeBooking = async () => {
    const [Y, M, D] = date.split("-").map(Number);

    const start = new Date(Y, M - 1, D, hour, minute);
    const end = new Date(start.getTime() + duration * 60000);

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

      setConfirm({ show: false });
      showModal(`Slot booked successfully!\nDesk: ${desk}`);

      setTimeout(() => navigate("/mybookings"), 800);
    } catch (err) {
      setConfirm({ show: false });
      showModal(err.response?.data?.msg || "Booking failed.");
    }
  };

  /* ------------------------------ JSX ------------------------------ */
  return (
    <>
      {/* Info Modal */}
      <NeonModal
        show={modal.show}
        message={modal.message}
        onClose={() => setModal({ show: false, message: "" })}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        show={confirm.show}
        details={confirm.details}
        onConfirm={finalizeBooking}
        onCancel={() => setConfirm({ show: false })}
      />

      {/* FORM */}
      <form
        className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl font-bold"
        onSubmit={submit}
      >
        <h2 className="text-2xl text-cyan-400 mb-4">Book Interview</h2>

        {/* DATE */}
        <label>Select Date</label>
        <input
          type="date"
          value={date}
          min={defaultDate}
          disabled={timeLocked}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
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
                <option key={h} value={pad(h)}>{pad(h)}</option>
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
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration */}
        <label>Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        >
          <option value={30}>30 Minutes</option>
          <option value={60}>1 Hour</option>
        </select>

        {/* Desks */}
        <label>Available Systems</label>
        {loadingDesks ? (
          <div className="p-2 mb-4 bg-slate-700 rounded">Checking...</div>
        ) : availableDesks.length === 0 ? (
          <div className="p-2 mb-4 bg-red-800 rounded text-white">
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
              <option key={d} value={d}>{d}</option>
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
            <option key={c} value={c}>{c}</option>
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
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Tech */}
        <label>Technology</label>
        <select
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="w-full p-2 mb-6 rounded bg-slate-700"
        >
          <option value="">-- Select Technology --</option>
          {TECH_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white">
          Book Slot
        </button>
      </form>
    </>
  );
}

/* Animations */
const styles = `
@keyframes fadeIn { from {opacity:0} to {opacity:1} }
@keyframes scaleIn { 0%{transform:scale(.7);opacity:0} 100%{transform:scale(1);opacity:1}}
.animate-fadeIn { animation: fadeIn .25s ease-out }
.animate-scaleIn { animation: scaleIn .25s ease-out }
`;
document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);
