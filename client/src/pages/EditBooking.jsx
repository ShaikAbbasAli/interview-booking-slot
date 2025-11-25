// EditBooking.jsx — Neon Glow Cyber Modal Version
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

/* 🔥 Neon Modal Component */
function NeonModal({ show, message, onClose }) {
  if (!show) return null;

  return (
    <div className="
      fixed inset-0 bg-black/70 backdrop-blur-md 
      flex items-center justify-center z-50
      animate-fadeIn
    ">
      <div
        className="
          bg-slate-900 border border-cyan-400/40 rounded-2xl 
          p-6 w-80 text-center shadow-[0_0_25px_rgba(0,255,255,0.7)]
          animate-scaleIn
        "
      >
        <div className="text-cyan-300 text-xl font-bold mb-2 drop-shadow-lg">
          ✨ SUCCESS
        </div>

        <div className="text-slate-200 mb-5">{message}</div>

        <button
          onClick={onClose}
          className="
            px-5 py-2 rounded-xl 
            bg-cyan-600 hover:bg-cyan-500 
            text-white font-semibold 
            shadow-[0_0_15px_rgba(0,255,255,0.6)]
          "
        >
          OK
        </button>
      </div>
    </div>
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
  const [technology, setTechnology] = useState("");

  const hours = Array.from({ length: 15 }, (_, i) => i + 9);
  const minutesArr = ["00", "30"];

  /* Modal State */
  const [modal, setModal] = useState({ show: false, message: "" });

  const showModal = (msg, cb) => {
    setModal({ show: true, message: msg });
    setTimeout(() => cb && cb(), 700);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await API.get("/bookings/me");
        const found = res.data.find((b) => b._id === id);

        if (!found) {
          showModal("Booking not found.", () => navigate("/mybookings"));
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
        showModal("Failed to load booking.", () => navigate("/mybookings"));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, navigate]);

  /* ---- SUBMIT ---- */
  async function submit(e) {
    e.preventDefault();

    if (!company) return showModal("Select a Company Type.");
    if (!round) return showModal("Select a Round.");
    if (!technology) return showModal("Select a Technology.");

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

    if (bookingDay < todayDate)
      return showModal("Cannot edit past dates.");

    if (bookingDay.getTime() === todayDate.getTime() && startIST < now)
      return showModal("Cannot edit a past time slot.");

    if (![0, 30].includes(startIST.getMinutes()))
      return showModal("Time must be at :00 or :30.");

    if (
      endIST.getDate() !== startIST.getDate() &&
      (endIST.getHours() !== 0 || endIST.getMinutes() !== 0)
    ) {
      return showModal("End time cannot go beyond midnight.");
    }

    let endDateString = date;
    if (endIST.getDate() !== startIST.getDate()) {
      const nextDay = new Date(Y, M - 1, D + 1);
      endDateString = `${nextDay.getFullYear()}-${pad(
        nextDay.getMonth() + 1
      )}-${pad(nextDay.getDate())}`;
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
      showModal("Booking Updated Successfully!", () =>
        navigate("/mybookings")
      );
    } catch (err) {
      showModal(err.response?.data?.msg || "Update failed.");
    }
  }

  /* ---- DELETE ---- */
  async function remove() {
    showModal("Deleting booking...", null);

    setTimeout(async () => {
      await API.delete(`/bookings/${id}/student`);
      showModal("Booking Deleted!", () => navigate("/mybookings"));
    }, 600);
  }

  if (loading) return <div>Loading…</div>;

  return (
    <>
      <NeonModal
        show={modal.show}
        message={modal.message}
        onClose={() => setModal({ show: false, message: "" })}
      />

      <div className="max-w-md mx-auto bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-xl">
        <button
          onClick={() => navigate("/mybookings")}
          className="mb-4 px-3 py-1 bg-slate-700 rounded"
        >
          ← Back
        </button>

        <h2 className="text-xl mb-4 text-cyan-400">Edit Booking</h2>

        <form onSubmit={submit}>
          {/* DATE (past disabled) */}
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

          {/* Dropdowns */}
          <label>Company Type</label>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full p-2 mb-3 rounded bg-slate-700"
          >
            <option value="">-- Select Company Type --</option>
            {COMPANY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
              <option key={r} value={r}>
                {r}
              </option>
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
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Buttons */}
          <div className="flex gap-3">
            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded">
              Save
            </button>

            <button
              type="button"
              onClick={remove}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded"
            >
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
@keyframes fadeIn {
  from { opacity: 0 } 
  to { opacity: 1 }
}
@keyframes scaleIn {
  0% { transform: scale(0.6); opacity: 0 }
  100% { transform: scale(1); opacity: 1 }
}

.animate-fadeIn {
  animation: fadeIn .3s ease-out;
}
.animate-scaleIn {
  animation: scaleIn .25s ease-out;
}
`;
document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);
