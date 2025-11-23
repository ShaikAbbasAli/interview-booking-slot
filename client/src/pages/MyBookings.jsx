import React, { useState, useEffect } from "react";
import API from "../services/api";
import { useParams, useNavigate } from "react-router-dom";

function pad(n) {
  return n.toString().padStart(2, "0");
}

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [duration, setDuration] = useState(30);
  const [company, setCompany] = useState("");
  const [round, setRound] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await API.get(`/bookings/me`);
      const booking = res.data.find((x) => x._id === id);

      if (!booking) {
        alert("Booking not found");
        navigate("/mybookings");
        return;
      }

      const start = new Date(booking.slotStart);

      setDate(start.toISOString().split("T")[0]);
      setHour(pad(start.getHours()));
      setMinute(pad(start.getMinutes()));
      setCompany(booking.company);
      setRound(booking.round);

      const diff = (new Date(booking.slotEnd) - new Date(booking.slotStart)) / 60000;
      setDuration(diff);

      setLoading(false);
    } catch (err) {
      alert("Failed to load booking");
      navigate("/mybookings");
    }
  }

  async function save(e) {
    e.preventDefault();

    try {
      const start = new Date(`${date}T${hour}:${minute}:00`);
      const end = new Date(start.getTime() + duration * 60000);

      await API.put(`/bookings/${id}`, {
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        company,
        round,
      });

      alert("Booking updated.");
      navigate("/mybookings");
    } catch (err) {
      alert(err.response?.data?.msg || "Update failed");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-slate-800 p-6 rounded">

      {/* 🔙 BACK BUTTON */}
      <button
        onClick={() => navigate("/mybookings")}
        className="mb-4 px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600"
      >
        ← Back to My Bookings
      </button>

      <h2 className="text-xl mb-4">Edit Booking</h2>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <form onSubmit={save}>
          {/* SAME FIELDS AS BEFORE */}
        </form>
      )}
    </div>
  );
}
