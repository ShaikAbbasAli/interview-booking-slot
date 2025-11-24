import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format, parse } from "date-fns";

/* Parse IST without timezone shift */
function parseLocal(dtString) {
  if (!dtString) return new Date();
  return parse(dtString, "yyyy-MM-dd'T'HH:mm", new Date());
}

export default function TodayBookings() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const [selectedDate, setSelectedDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadData(date) {
    try {
      setLoading(true);

      const res = await API.get(`/bookings/by-date?date=${date}`);

      const sorted = res.data.sort(
        (a, b) => parseLocal(a.slotStart) - parseLocal(b.slotStart)
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
    loadData(selectedDate);
  }, [selectedDate]);

  // Pagination
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
          Slot Book Details
        </h2>

        {/* Calendar Selector */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
        />
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center animate-pulse">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center">
          No slots booked for this date.
        </div>
      ) : (
        <>
          {/* Pagination Info */}
          <div className="flex justify-between mb-3 text-slate-300">
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, rows.length)} of{" "}
            {rows.length}
          </div>

          {/* Table Wrapper */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto md:overflow-x-visible">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-900 text-cyan-300 border-b border-slate-700">
                  <tr>
                    <TableHead>S.No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Slot Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Technology</TableHead>
                    <TableHead>Booked Time</TableHead>
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
                        } hover:bg-slate-600 transition`}
                      >
                        <TableCell>{startIndex + idx + 1}</TableCell>
                        <TableCell>{r.studentName}</TableCell>

                        <TableCell>
                          <span className="text-cyan-300 font-semibold">
                            {format(s, "hh:mm a")}
                          </span>{" "}
                          – {format(e, "hh:mm a")}
                        </TableCell>

                        <TableCell>
                          {r.duration === 60
                            ? "1 hour"
                            : r.duration === 30
                            ? "30 minutes"
                            : `${r.duration} min`}
                        </TableCell>

                        <TableCell>{r.round}</TableCell>
                        <TableCell>{r.company}</TableCell>
                        <TableCell>{r.technology}</TableCell>

                        <TableCell>
                          {format(created, "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            setPage={setPage}
          />
        </>
      )}
    </div>
  );
}

function TableHead({ children }) {
  return <th className="px-4 py-3">{children}</th>;
}

function TableCell({ children }) {
  return <td className="px-4 py-3 border-b border-slate-700">{children}</td>;
}

function Pagination({ page, totalPages, setPage }) {
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button
        onClick={() => page > 1 && setPage(page - 1)}
        className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-600"
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
        className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-600"
      >
        Next
      </button>
    </div>
  );
}
