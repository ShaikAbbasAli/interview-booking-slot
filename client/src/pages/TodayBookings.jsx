import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format } from "date-fns";

// SAFE PARSER
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

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadToday() {
    try {
      setLoading(true);

      const res = await API.get("/bookings/today");

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

  // Pagination logic
  const totalPages = Math.ceil(rows.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleRows = rows.slice(startIndex, startIndex + pageSize);

  const nextPage = () => page < totalPages && setPage(page + 1);
  const prevPage = () => page > 1 && setPage(page - 1);

  return (
    <div className="p-6">
      <h2 className="text-3xl mb-6 font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
        Today Slot Book Details
      </h2>

      {/* LOADING */}
      {loading ? (
        <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-700 text-center shadow-lg animate-pulse">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 bg-slate-800/60 rounded-xl border border-slate-700 text-center shadow-lg">
          No slots booked for today.
        </div>
      ) : (
        <>
          {/* Pagination + Page Size */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-3 gap-3">
            <div className="text-slate-300">
              Showing{" "}
              <span className="text-cyan-400 font-bold">{startIndex + 1}</span>–{" "}
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

          {/* TABLE WRAPPER */}
          <div
            className="
              bg-slate-900/60 backdrop-blur-lg border border-slate-700 
              rounded-xl shadow-xl overflow-hidden
            "
          >
            {/* Desktop = full table | Mobile = scroll */}
            <div className="overflow-x-auto md:overflow-x-visible">
              <table className="min-w-full text-sm text-left table-auto md:table-fixed">
                <thead className="bg-slate-900/80 sticky top-0">
                  <tr className="text-cyan-300 border-b border-slate-700">
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
                          idx % 2 === 0
                            ? "bg-slate-800/50"
                            : "bg-slate-700/40"
                        } hover:bg-slate-600/40 transition duration-200`}
                      >
                        <TableCell>{startIndex + idx + 1}</TableCell>
                        <TableCell className="whitespace-nowrap md:whitespace-normal">
                          {r.studentName}
                        </TableCell>

                        <TableCell className="whitespace-nowrap md:whitespace-normal">
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
                            : r.duration + " minutes"}
                        </TableCell>

                        <TableCell>{r.round}</TableCell>
                        <TableCell>{r.company}</TableCell>
                        <TableCell>{r.technology}</TableCell>

                        <TableCell className="whitespace-nowrap md:whitespace-normal">
                          {format(created, "dd MMM yyyy, hh:mm a")}
                        </TableCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION BUTTONS */}
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

/* -------------------------- */
/* REUSABLE TABLE COMPONENTS  */
/* -------------------------- */

function TableHead({ children }) {
  return (
    <th className="px-4 py-3 text-sm font-semibold tracking-wide border-r border-slate-700 last:border-r-0">
      {children}
    </th>
  );
}

function TableCell({ children, className = "" }) {
  return (
    <td
      className={`
        px-4 py-3 border-b border-slate-700/40 text-slate-200 
        ${className}
      `}
    >
      {children}
    </td>
  );
}

/* -------------------------- */
/*     BEAUTIFUL PAGINATION   */
/* -------------------------- */

function Pagination({ page, totalPages, prevPage, nextPage, setPage }) {
  const pages = [];

  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
      <button
        onClick={prevPage}
        disabled={page === 1}
        className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-600 disabled:opacity-40 hover:bg-slate-700 transition"
      >
        Prev
      </button>

      {/* Page numbers */}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`px-4 py-2 rounded-lg border transition ${
            page === p
              ? "bg-cyan-600 text-white border-cyan-400"
              : "bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={nextPage}
        disabled={page === totalPages}
        className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-600 disabled:opacity-40 hover:bg-slate-700 transition"
      >
        Next
      </button>
    </div>
  );
}
