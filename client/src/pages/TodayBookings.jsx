import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format, parse } from "date-fns";

/* ------------------------------
   TRUE IST DATE
------------------------------ */
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

/* Parse yyyy-MM-ddTHH:mm safely */
function parseLocal(dtString) {
  if (!dtString) return new Date();
  return parse(dtString, "yyyy-MM-dd'T'HH:mm", new Date());
}

export default function TodayBookings() {
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function loadData(date) {
    try {
      setLoading(true);
      const res = await API.get(`/bookings/by-date?date=${date}`);

      const sorted = res.data.sort(
        (a, b) => parseLocal(a.slotStart) - parseLocal(b.slotStart)
      );

      setRows(sorted);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  /* ------------------------------
        FILTER BY SEARCH
  ------------------------------ */
  const filteredRows = rows.filter((r) =>
    r.studentName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-6">

      {/* HEADER + FILTER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">

        <h2 className="text-3xl font-bold text-cyan-400">
          Slot Book Details
        </h2>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">

          {/* Date Selector */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white w-full md:w-auto"
          />

          {/* Search Box */}
          <input
            type="text"
            value={search}
            placeholder="Search student name..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white w-full md:w-60"
          />
        </div>
      </div>

      {/* LOADING / NO DATA */}
      {loading ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center">Loading…</div>
      ) : filteredRows.length === 0 ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center">
          No slots found.
        </div>
      ) : (
        <>
          {/* Pagination Info */}
          <div className="flex justify-between mb-3 text-slate-300">
            Showing {startIndex + 1}–
            {Math.min(startIndex + pageSize, filteredRows.length)} of{" "}
            {filteredRows.length}
          </div>

          {/* TABLE */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-cyan-300 border-b border-slate-700">
                  <tr>
                    {[
                      "S.No",
                      "Student",
                      "Slot Time",
                      "Duration",
                      "Round",
                      "Company",
                      "Technology",
                      "Booked Time",
                    ].map((h) => (
                      <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((r, idx) => {
                    const s = parseLocal(r.slotStart);
                    const e = parseLocal(r.slotEnd);
                    const created = parseLocal(r.createdAt);

                    return (
                      <tr
                        key={r._id}
                        className={`${
                          idx % 2 === 0 ? "bg-slate-800" : "bg-slate-700"
                        } hover:bg-slate-600`}
                      >
                        <td className="px-4 py-3 border-b border-slate-700">
                          {startIndex + idx + 1}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700">
                          {r.studentName}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700 whitespace-nowrap">
                          <span className="text-cyan-300 font-semibold">
                            {format(s, "hh:mm a")}
                          </span>{" "}
                          – {format(e, "hh:mm a")}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700">
                          {r.duration === 60
                            ? "1 hour"
                            : r.duration === 30
                            ? "30 minutes"
                            : `${r.duration} min`}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700">
                          {r.round}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700">
                          {r.company}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700">
                          {r.technology}
                        </td>

                        <td className="px-4 py-3 border-b border-slate-700 whitespace-nowrap">
                          {format(created, "dd MMM yyyy, hh:mm a")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <button
              onClick={() => page > 1 && setPage(page - 1)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg"
            >
              Prev
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === i + 1
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => page < totalPages && setPage(page + 1)}
              className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
