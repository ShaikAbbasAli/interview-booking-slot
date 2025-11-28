// client/src/pages/BookInterview.jsx
import React, { useEffect, useState, useRef } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { parse } from "date-fns";

/* ------------------------------ Helpers ------------------------------ */
const pad = (n) => n.toString().padStart(2, "0");

/* parse IST string (YYYY-MM-DDTHH:mm) */
function parseIST(str) {
  if (!str) return null;
  return parse(str, "yyyy-MM-dd'T'HH:mm", new Date());
}

/* Overlap ranges */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/* NEW — Past date check */
function isPastSelected(dateStr, hh, mm) {
  if (!dateStr || hh === "" || mm === "") return false;

  const slotStr = `${dateStr}T${pad(hh)}:${pad(mm)}`;
  const selected = parseIST(slotStr);
  const now = new Date();

  return selected < now;
}

/* ------------------------------ Data Lists ------------------------------ */
const ROUND_OPTIONS = ["L1","L2","L3","Manager","Client","HR","Assessment","Screening"];
const COMPANY_OPTIONS = ["MNC", "Mid Range", "Startup"];
const TECH_OPTIONS = ["Python","Java","MERN Stack","DevOps",".Net","CyberArk","Cyber Security","SAP - FICO","SAP - ABAP","SAP - HANA","SAP - BASIS","AI & ML"];

/* ------------------------------ Neon Info Modal ------------------------------ */
function NeonModal({ show, message, onClose, redirect }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-80 text-center shadow-lg animate-scaleIn">
        <div className="text-cyan-300 text-xl font-bold mb-3">✨ Aikya Info</div>

        <div className="text-slate-200 mb-5" style={{ whiteSpace: "pre-line" }}>
          {message}
        </div>

        <button
          onClick={redirect ? redirect : onClose}
          className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white shadow cursor-pointer"
        >
          OK
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Confirm Modal ------------------------------ */
function ConfirmModal({ show, details, onConfirm, onCancel }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-96 text-center shadow-lg animate-scaleIn">

        <div className="text-cyan-300 text-xl font-bold mb-3">⚠️ Confirm Booking</div>

        <div className="text-slate-200 mb-4 space-y-1 text-left">
          <p><b>Date:</b> {details?.date}</p>
          <p><b>Time:</b> {details?.time}</p>
          <p><b>Duration:</b> {details?.duration}</p>
          <p><b>Desk:</b> {details?.desk}</p>
          <p><b>Company:</b> {details?.company}</p>
          <p><b>Round:</b> {details?.round}</p>
          <p><b>Technology:</b> {details?.technology}</p>
        </div>

        <div className="flex justify-center gap-3 mt-4">
          <button onClick={onConfirm} className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-white cursor-pointer">Confirm</button>
          <button onClick={onCancel} className="px-5 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white cursor-pointer">Cancel</button>
        </div>

      </div>
    </div>
  );
}

/* ------------------------------ MAIN COMPONENT ------------------------------ */
export default function BookInterview() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Prefill for rescheduled case */
  const params = new URLSearchParams(location.search);
  const preDate = params.get("date");
  const preStart = params.get("start");

  let preHour = "", preMinute = "";
  if (preStart) {
    const [, time] = preStart.split("T");
    const [h, m] = time.split(":");
    preHour = h;
    preMinute = m;
  }

  /* Today */
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;

  /* States */
  const [date, setDate] = useState(preDate || defaultDate);
  const [hour, setHour] = useState(preHour || "");
  const [minute, setMinute] = useState(preMinute || "");
  const [duration, setDuration] = useState(30);

  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [technology, setTechnology] = useState("");

  const [availableDesks, setAvailableDesks] = useState([]);
  const [desk, setDesk] = useState("");
  const [loadingDesks, setLoadingDesks] = useState(false);

  const [overlapError, setOverlapError] = useState("");
  const bookingsCacheRef = useRef(null);

  const [modal, setModal] = useState({ show: false, message: "" });
  const [redirectAfterOK, setRedirectAfterOK] = useState(false);

  const showModal = (msg, redirect = false) => {
    setRedirectAfterOK(redirect);
    setModal({ show: true, message: msg });
  };

  const [confirm, setConfirm] = useState({ show: false, details: null });

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];
  const timeLocked = !!preStart;

  /* -------- Load student bookings once -------- */
  async function loadStudentBookingsCache() {
    try {
      const res = await API.get("/bookings/me");
      bookingsCacheRef.current = res.data || [];
    } catch {
      bookingsCacheRef.current = [];
    }
  }

  useEffect(() => {
    loadStudentBookingsCache();
  }, []);

  /* ----------- Overlap Check ----------- */
  async function checkOverlap(dateStr, hh, mm, dur) {
    setOverlapError("");

    if (!dateStr || hh === "" || mm === "" || !dur) return false;
    if (!bookingsCacheRef.current) await loadStudentBookingsCache();

    const selectedStart = parseIST(`${dateStr}T${pad(hh)}:${pad(mm)}`);
    const selectedEnd = new Date(selectedStart.getTime() + dur * 60000);

    for (const b of bookingsCacheRef.current) {
      const bStart = parseIST(b.slotStart);
      const bEnd = parseIST(b.slotEnd);

      if (rangesOverlap(selectedStart, selectedEnd, bStart, bEnd)) {
        const msg = "You already have a booking in this time window.";
        setOverlapError(msg);
        showModal(msg);
        return true;
      }
    }

    return false;
  }

  /* ---------- MAIN CHECK: past-time + overlap + load desks ---------- */
  useEffect(() => {
    let stop = false;

    async function validate() {
      setAvailableDesks([]);
      setDesk("");
      setLoadingDesks(false);
      setOverlapError("");

      if (hour === "" || minute === "") return;

      /* ---- 1. NEW: Past-Time Block ---- */
      if (isPastSelected(date, hour, minute)) {
        const msg = "Past time slot booking is not allowed.";
        setOverlapError(msg);
        showModal(msg);
        return;
      }

      /* ---- 2. Overlap block ---- */
      const hasOverlap = await checkOverlap(date, hour, minute, duration);
      if (hasOverlap) return;

      /* ---- 3. Load available desks ---- */
      setLoadingDesks(true);
      try {
        const res = await API.get(
          `/bookings/available-desks?date=${date}&start=${pad(hour)}:${pad(minute)}&duration=${duration}`
        );
        if (!stop) setAvailableDesks(res.data.available || []);
      } catch {
        if (!stop) setAvailableDesks([]);
      } finally {
        if (!stop) setLoadingDesks(false);
      }
    }

    validate();
    return () => { stop = true; };
  }, [date, hour, minute, duration]);

  /* ---------- Submit ---------- */
  const submit = (e) => {
    e.preventDefault();

    if (!hour || !minute) return showModal("Select Hour and Minute first.");
    if (isPastSelected(date, hour, minute))
      return showModal("Past time slot booking is not allowed.");

    if (!company) return showModal("Please select Company.");
    if (!round) return showModal("Please select Round.");
    if (!technology) return showModal("Please select Technology.");
    if (!desk) return showModal("Please select a Desk.");

    if (overlapError) return showModal(overlapError);

    setConfirm({
      show: true,
      details: {
        date,
        time: `${pad(hour)}:${pad(minute)}`,
        duration: duration === 60 ? "1 Hour" : "30 Minutes",
        desk,
        company,
        round,
        technology,
      },
    });
  };

  /* ---------- Finalize Booking ---------- */
  const finalizeBooking = async () => {
    try {
      const startStr = `${date}T${pad(hour)}:${pad(minute)}`;
      const start = parseIST(startStr);
      const end = new Date(start.getTime() + duration * 60000);

      const endStr =
        `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`
        + `T${pad(end.getHours())}:${pad(end.getMinutes())}`;

      await API.post("/bookings", {
        slotStart: startStr,
        slotEnd: endStr,
        company,
        round,
        technology,
        desk,
      });

      setConfirm({ show: false });
      await loadStudentBookingsCache();
      showModal(`Slot booked successfully!\nDesk: ${desk}`, true);

    } catch (err) {
      setConfirm({ show: false });
      showModal(err?.response?.data?.msg || "Booking failed.");
    }
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <>
      <NeonModal
        show={modal.show}
        message={modal.message}
        onClose={() => setModal({ show: false, message: "" })}
        redirect={redirectAfterOK ? () => navigate("/mybookings") : null}
      />

      <ConfirmModal
        show={confirm.show}
        details={confirm.details}
        onConfirm={finalizeBooking}
        onCancel={() => setConfirm({ show: false })}
      />

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
              <option value="">Select Hour</option>
              {hours.map((h) => <option key={h} value={pad(h)}>{pad(h)}</option>)}
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
              <option value="">Select Minute</option>
              {minutesArr.map(m => <option key={m} value={m}>{m}</option>)}
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
        {hour === "" || minute === "" ? (
          <div className="p-2 mb-4 bg-slate-700 rounded">Select Hour & Minute...</div>
        ) : loadingDesks ? (
          <div className="p-2 mb-4 bg-slate-700 rounded">Checking...</div>
        ) : availableDesks.length === 0 ? (
          <div className="p-2 mb-4 bg-red-700 text-white rounded">No systems available</div>
        ) : (
          <select
            value={desk}
            onChange={(e) => setDesk(e.target.value)}
            className="w-full p-2 mb-4 rounded bg-slate-700"
          >
            <option value="">-- Select System --</option>
            {availableDesks.map(d => <option key={d} value={d}>{d}</option>)}
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
          {COMPANY_OPTIONS.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Round */}
        <label>Round</label>
        <select
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-slate-700"
        >
          <option value="">-- Select Round --</option>
          {ROUND_OPTIONS.map(r => <option key={r}>{r}</option>)}
        </select>

        {/* Technology */}
        <label>Technology</label>
        <select
          value={technology}
          onChange={(e) => setTechnology(e.target.value)}
          className="w-full p-2 mb-6 rounded bg-slate-700"
        >
          <option value="">-- Select Technology --</option>
          {TECH_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Show overlap or past-time msg */}
        {overlapError && (
          <div className="text-yellow-300 font-medium mb-4">{overlapError}</div>
        )}

        <button
          type="submit"
          disabled={!!overlapError}
          className={`w-full py-2 rounded-xl text-white ${
            overlapError ? "bg-slate-600" : "bg-cyan-600 hover:bg-cyan-500"
          }`}
        >
          Book Slot
        </button>

      </form>

      <style>{`
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
        @keyframes scaleIn { from {transform:scale(.7);opacity:0} to {transform:scale(1);opacity:1} }
        .animate-fadeIn { animation: fadeIn .25s }
        .animate-scaleIn { animation: scaleIn .25s }
      `}</style>
    </>
  );
}
