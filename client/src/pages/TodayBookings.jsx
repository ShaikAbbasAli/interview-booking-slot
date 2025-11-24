import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";

// SAFE PARSER FOR "YYYY-MM-DDTHH:mm"
function parseLocal(dtString) {
  if (!dtString || typeof dtString !== "string" || !dtString.includes("T")) {
    return new Date();
  }

  const [datePart, timePart] = dtString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);

  return new Date(y, m - 1, d, hh, mm);
}

export default function TodayBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadToday() {
    try {
      setLoading(true);
      const res = await API.get("/bookings/today");
      // backend already sorted by slotStart, but safe to sort again
      const sorted = res.data.sort(
        (a, b) => new Date(a.slotStart) - new Date(b.slotStart)
      );
      setRows(sorted);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadToday();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-3xl mb-4 text-cyan-400">
        Today Slot Book Details
      </h2>

      {loading ? (
        <div className="p-4 bg-slate-800 rounded">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-4 bg-slate-800 rounded">
          No slots booked for today.
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-800 rounded-lg shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-900 text-slate-200">
              <tr>
                <th className="px-3 py-2">S.No</th>
                <th className="px-3 py-2">Student Name</th>
                <th className="px-3 py-2">Slot Time</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Round</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Technology</th>
                <th className="px-3 py-2">Booked Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const s = parseLocal(r.slotStart);
                const e = parseLocal(r.slotEnd);
                const created = parseLocal(r.createdAt);

                return (
                  <tr
                    key={r._id}
                    className={idx % 2 === 0 ? "bg-slate-800" : "bg-slate-700"}
                  >
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{r.studentName}</td>
                    <td className="px-3 py-2">
                      {format(s, "hh:mm a")} – {format(e, "hh:mm a")}
                    </td>
                    <td className="px-3 py-2">
                      {r.duration === 60
                        ? "1 hour"
                        : r.duration === 30
                        ? "30 minutes"
                        : r.duration + " minutes"}
                    </td>
                    <td className="px-3 py-2">{r.round}</td>
                    <td className="px-3 py-2">{r.company}</td>
                    <td className="px-3 py-2">{r.technology}</td>
                    <td className="px-3 py-2">
                      {format(created, "dd MMM yyyy, hh:mm a")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
