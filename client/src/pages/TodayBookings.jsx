import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";

// SAFE PARSER
function parseLocal(dtString) {
  if (!dtString || typeof dtString !== "string" || !dtString.includes("T")) {
    return new Date();
  }
  const [d, t] = dtString.split("T");
  const [y, m, dd] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  return new Date(y, m - 1, dd, hh, mm);
}

export default function TodayBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⭐ CALENDAR DATE STATE
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ------------------------------------------
     LOAD BOOKINGS BASED ON DATE
  ------------------------------------------- */
  async function loadData(date) {
    try {
      setLoading(true);

      const res = await API.get(`/bookings/by-date?date=${date}`);

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
    loadData(selectedDate);
  }, [selectedDate]);

  /* ----------- PAGINATION ------------------ */
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + pageSize);

  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  return (
    <div className="p-6">

      {/* TITLE */}
      <h2 className="text-3xl mb-6 font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
        Slot Booking Details
      </h2>

      {/* ⭐ DATE PICKER */}
      <div className="mb-5">
        <label className="text-sm text-slate-300">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setPage(1);
            setSelectedDate(e.target.value);
          }}
          className="ml-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
        />
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-700 text-center shadow-lg">
          No booked slots for this date.
        </div>
      ) : (
        <>
          {/* Pagination + Page Size */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-3 gap-3">
            <div className="text-slate-300">
              Showing{" "}
              <span className="text-cyan-400 font-bold">{startIndex + 1}</span>–
              <span className="text-cyan-400 font-bold">
                {Math.min(startIndex + pageSize, rows.length)}
              </span>{" "}
              of{" "}
              <span className="text-cyan-400 font-bold">{rows.length}</span>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded-lg"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          <div
            className="
              bg-slate-900/60 backdrop-blur-lg border border-slate-700 
              rounded-xl shadow-xl overflow-hidden
            "
          >
            <div className="overflow-x-auto md:overflow-x-visible">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-900/80 sticky top-0">
                  <tr className="text-cyan-300 border-b border-slate-700">
                    {[
                      "S.No",
                      "Student",
                      "Slot Time",
                      "Duration",
                      "Round",
                      "Company",
                      "Technology",
                      "Booked Time",
                    ].map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((r, idx) => {
                    const s = parseLocal(r.slotStart);
                    const e = parseLocal(r.slotEnd);
                    const c = parseLocal(r.createdAt);

                    return (
                      <tr
                        key={r._id}
                        className={`${
                          idx % 2 === 0
                            ? "bg-slate-800/50"
                            : "bg-slate-700/40"
                        } hover:bg-slate-600/40 transition`}
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
                            ? "30 min"
                            : r.duration + " min"}
                        </TableCell>

                        <TableCell>{r.round}</TableCell>
                        <TableCell>{r.company}</TableCell>
                        <TableCell>{r.technology}</TableCell>

                        <TableCell>
                          {format(c, "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION */}
          <Pagination
            page={page}
            totalPages={totalPages}
            prevPage={prevPage}
            nextPage={nextPage}
            setPage={setPage}
          />
        </>
      )}
    </div>
  );
}

/* TABLE HEAD */
function TableHead({ children }) {
  return (
    <th className="px-4 py-3 text-sm font-semibold border-r border-slate-700 last:border-r-0">
      {children}
    </th>
  );
}

/* TABLE CELL */
function TableCell({ children }) {
  return (
    <td className="px-4 py-3 border-b border-slate-700/40 text-slate-200">
      {children}
    </td>
  );
}

/* PAGINATION */
function Pagination({ page, totalPages, prevPage, nextPage, setPage }) {
  return (
    <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
      <button
        onClick={prevPage}
        disabled={page === 1}
        className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40 hover:bg-slate-700"
      >
        Prev
      </button>

      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i}
          onClick={() => setPage(i + 1)}
          className={`px-4 py-2 rounded-lg border transition ${
            page === i + 1
              ? "bg-cyan-600 text-white border-cyan-400"
              : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
          }`}
        >
          {i + 1}
        </button>
      ))}

      <button
        onClick={nextPage}
        disabled={page === totalPages}
        className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg disabled:opacity-40 hover:bg-slate-700"
      >
        Next
      </button>
    </div>
  );
}
