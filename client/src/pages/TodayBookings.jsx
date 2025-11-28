// TodayBookings.jsx — Updated with Visible Scrollbar
import React, { useEffect, useState } from "react";
import API from "../services/api";
import { format, parse } from "date-fns";

/* ------------------ TRUE IST DATE ------------------ */
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().split("T")[0];
}

function parseLocal(dtString) {
  if (!dtString) return new Date();
  return parse(dtString, "yyyy-MM-dd'T'HH:mm", new Date());
}

export default function TodayBookings() {
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* ------------------ Load Data ------------------ */
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

  /* ------------------ Search Filters ------------------ */
  const filteredRows = rows.filter(
    (r) =>
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleRows = filteredRows.slice(startIndex, startIndex + pageSize);

  /* ------------------ CSV Download ------------------ */
  function downloadCSV() {
    if (filteredRows.length === 0) {
      alert("No data to download!");
      return;
    }

    const header = [
      "S.No",
      "Student",
      "Employee ID",
      "Start Time",
      "End Time",
      "Duration",
      "Round",
      "Company",
      "Technology",
      "Desk",
      "Booked Time",
    ];

    const csvRows = filteredRows.map((r, index) => {
      const s = parseLocal(r.slotStart);
      const e = parseLocal(r.slotEnd);
      const created = parseLocal(r.createdAt);

      return [
        index + 1,
        r.studentName,
        r.employee_id,
        format(s, "hh:mm a"),
        format(e, "hh:mm a"),
        r.duration,
        r.round,
        r.company,
        r.technology,
        r.desk || "-",
        format(created, "dd MMM yyyy, hh:mm a"),
      ].join(",");
    });

    const csv = [header.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    link.download = `bookings-${selectedDate}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /* ------------------ UI ------------------ */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-cyan-400">Slot Book Details</h2>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPage(1);
            }}
            className="w-full p-2 rounded bg-slate-700"
          />

          <input
            type="text"
            value={search}
            placeholder="Search student or ID..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white w-full md:w-60"
          />

          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-semibold shadow-[0_0_10px_rgba(0,255,255,0.6)]"
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center">Loading…</div>
      ) : filteredRows.length === 0 ? (
        <div className="p-6 bg-slate-800 rounded-xl text-center">No slots found.</div>
      ) : (
        <>
          <div className="flex justify-between mb-3 text-slate-300">
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filteredRows.length)} of{" "}
            {filteredRows.length}
          </div>

          {/* Scrollable Table */}
          <div
            className="bg-slate-900/70 border border-slate-700 rounded-xl overflow-x-auto custom-scrollbar"
            style={{ maxHeight: "450px", overflowY: "auto" }}
          >
            <table className="min-w-max w-full text-sm table-auto">
              <thead className="bg-slate-900 text-cyan-300 border-b border-slate-700">
                <tr className="text-center">
                  {[
                    "S.No",
                    "Student",
                    "Employee ID",
                    "Time",
                    "Duration",
                    "Round",
                    "Company",
                    "Tech",
                    "Desk",
                    "Booked",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3 whitespace-nowrap text-sm font-semibold">
                      {h}
                    </th>
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
                      className={`text-center ${
                        idx % 2 === 0 ? "bg-slate-800" : "bg-slate-700"
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {startIndex + idx + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.studentName}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-cyan-300">
                        {r.employee_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(s, "hh:mm a")} – {format(e, "hh:mm a")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.duration} min</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.round}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.company}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.technology}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">{r.desk}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(created, "dd MMM, hh:mm a")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Custom Scrollbar CSS */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #06b6d4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0891b2;
        }
      `}</style>
    </div>
  );
}
