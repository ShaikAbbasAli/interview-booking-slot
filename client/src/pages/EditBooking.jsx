// EditBooking.jsx — With Desk Selection + Confirmation Popup
import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

/* Utility */
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

/* Dropdown choices */
const ROUND_OPTIONS = ["L1", "L2", "L3", "Manager", "Client", "HR", "Assessment", "Screening"];
const COMPANY_OPTIONS = ["MNC", "Mid Range", "Startup"];
const TECH_OPTIONS = ["Python", "DevOps", "CyberArk", "Cyber Security", ".Net", "Java", "MERN Stack"];

/* ================================================================
   🔥 CONFIRMATION MODAL (YES / NO)
================================================================ */
function ConfirmModal({ show, message, onYes, onNo }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center backdrop-blur-md z-50 animate-fadeIn">
      <div className="bg-slate-900 p-6 rounded-2xl w-80 border border-cyan-400/40 shadow-[0_0_25px_rgba(0,255,255,0.7)] animate-scaleIn">

        <div className="text-cyan-300 text-xl font-bold mb-4 drop-shadow-lg">⚠️ Confirmation</div>

        <div className="text-slate-200 mb-6">{message}</div>

        <div className="flex justify-between">
          <button
            onClick={onYes}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-[0_0_12px_rgba(255,0,0,0.5)]"
          >
            Yes
          </button>

          <button
            onClick={onNo}
            className="px-5 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl"
          >
            No
          </button>
        </div>

      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
================================================================ */
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

  const [desk, setDesk] = useState("");
  const [availableDesks, setAvailableDesks] = useState([]);
  const [loadingDesks, setLoadingDesks] = useState(false);

  /* Confirmation Modal */
  const [confirm, setConfirm] = useState({
    show: false,
    action: null,
    message: "",
  });

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  /* Load Booking Details */
  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/bookings/me");
        const found = res.data.find((b) => b._id === id);

        if (!found) {
          return alert("Booking not found");
        }

        const s = new Date(found.slotStart);
        const e = new Date(found.slotEnd);

        setDate(format(s, "yyyy-MM-dd"));
        setHour(pad(s.getHours()));
        setMinute(pad(s.getMinutes()));
        setDuration((e - s) / 60000);

        setCompany(found.company);
        setRound(found.round);
        setTechnology(found.technology);
        setDesk(found.desk);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  /* Load Available Desks */
  useEffect(() => {
    async function loadDesks() {
      setAvailableDesks([]);

      if (!date || !hour || !minute) return;

      const now = new Date();
      const [Y, M, D] = date.split("-").map(Number);
      const selected = new Date(Y, M - 1, D, Number(hour), Number(minute));

      if (selected < now) return;

      setLoadingDesks(true);
      try {
        const res = await API.get(
          `/bookings/available-desks?date=${date}&start=${hour}:${minute}&duration=${duration}`
        );
        setAvailableDesks(res.data.available);
      } finally {
        setLoadingDesks(false);
      }
    }
    loadDesks();
  }, [date, hour, minute, duration]);

  /* ================================================================
     HANDLE SAVE
  ================================================================ */
  async function doUpdate() {
    const [Y, M, D] = date.split("-").map(Number);
    const startIST = new Date(Y, M - 1, D, Number(hour), Number(minute));
    const endIST = new Date(startIST.getTime() + duration * 60000);

    let endDateString = date;
    if (endIST.getDate() !== startIST.getDate()) {
      const next = new Date(Y, M - 1, D + 1);
      endDateString = format(next, "yyyy-MM-dd");
    }

    const payload = {
      slotStart: toPureISTString(startIST),
      slotEnd: `${endDateString}T${pad(endIST.getHours())}:${pad(endIST.getMinutes())}`,
      company,
      round,
      technology,
      desk,
    };

    await API.put(`/bookings/${id}`, payload);
    navigate("/mybookings");
  }

  function submit(e) {
    e.preventDefault();

    if (!company || !round || !technology || !desk)
      return alert("All fields are required.");

    setConfirm({
      show: true,
      action: "update",
      message: "Are you sure you want to update this booking?",
    });
  }

  /* ================================================================
     HANDLE DELETE
  ================================================================ */
  async function doDelete() {
    await API.delete(`/bookings/${id}/student`);
    navigate("/mybookings");
  }

  function remove() {
    setConfirm({
      show: true,
      action: "delete",
      message: "Are you sure you want to delete this booking?",
    });
  }

  /* ================================================================
     CONFIRMATION MODAL ACTION
  ================================================================ */
  function modalYes() {
    if (confirm.action === "update") doUpdate();
    if (confirm.action === "delete") doDelete();

    setConfirm({ show: false, action: null, message: "" });
  }

  function modalNo() {
    setConfirm({ show: false, action: null, message: "" });
  }

  /* Loading State */
  if (loading) return <div className="text-white p-5">Loading…</div>;

  return (
    <>
      {/* 🔥 Confirmation Modal */}
      <ConfirmModal
        show={confirm.show}
        message={confirm.message}
        onYes={modalYes}
        onNo={modalNo}
      />

      <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-xl">
        <button
          onClick={() => navigate("/mybookings")}
          className="mb-4 px-3 py-1 bg-slate-700 rounded font-bold cursor-pointer"
        >
          ← Back
        </button>

        <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

        <form onSubmit={submit}>
          {/* DATE */}
          <label>Date</label>
          <input
            type="date"
            value={date}
            min={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-slate-700"
          />

          {/* Time Selectors */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label>Hour</label>
              <select value={hour} onChange={(e) => setHour(e.target.value)} className="w-full p-2 rounded bg-slate-700">
                {hours.map((h) => (
                  <option key={h} value={pad(h)}>{pad(h)}</option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label>Minute</label>
              <select value={minute} onChange={(e) => setMinute(e.target.value)} className="w-full p-2 rounded bg-slate-700">
                {minutesArr.map((m) => (
                  <option key={m} value={m}>{m}</option>
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

          {/* DESK SELECT */}
          <label>Desk</label>
          {loadingDesks ? (
            <div className="p-2 bg-slate-700 mb-3 rounded">Checking…</div>
          ) : availableDesks.length === 0 ? (
            <div className="p-2 bg-red-800 text-white mb-3 rounded">No desks available.</div>
          ) : (
            <select value={desk} onChange={(e) => setDesk(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700">
              <option value="">-- Select Desk --</option>
              {availableDesks.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          {/* Normal fields */}
          <label>Company</label>
          <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700">
            {COMPANY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>

          <label>Round</label>
          <select value={round} onChange={(e) => setRound(e.target.value)} className="w-full p-2 mb-3 rounded bg-slate-700">
            {ROUND_OPTIONS.map((r) => <option key={r}>{r}</option>)}
          </select>

          <label>Technology</label>
          <select value={technology} onChange={(e) => setTechnology(e.target.value)} className="w-full p-2 mb-4 rounded bg-slate-700">
            {TECH_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>

          {/* BUTTONS */}
          <div className="flex gap-3">
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded cursor-pointer">
              Save
            </button>

            <button type="button" onClick={remove} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded cursor-pointer">
              Delete
            </button>
          </div>

        </form>
      </div>
    </>
  );
}

/* Animations */
const styles = `
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes scaleIn { 0%{transform:scale(.7);opacity:0} 100%{transform:scale(1);opacity:1} }
.animate-fadeIn { animation: fadeIn .2s ease-out }
.animate-scaleIn { animation: scaleIn .25s ease-out }
`;
document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);
