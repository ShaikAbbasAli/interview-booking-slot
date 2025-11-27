import React, { useEffect, useState } from "react";
import API from "../services/api";

/* ---------------------------- Reusable Neon Modal ---------------------------- */
function NeonModal({ show, message, yesText, noText, onAction }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-400/40 rounded-2xl p-6 w-96 text-center shadow-[0_0_25px_rgba(0,255,255,0.7)] animate-scaleIn">

        <div className="text-cyan-300 text-xl font-bold mb-4">⚠️ Confirmation</div>

        <p className="text-slate-200 mb-6">{message}</p>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => onAction(true)}
            className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-500 shadow-[0_0_12px_rgba(0,255,0,0.4)] cursor-pointer"
          >
            {yesText}
          </button>

          <button
            onClick={() => onAction(false)}
            className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 shadow-[0_0_12px_rgba(255,0,0,0.4)] cursor-pointer"
          >
            {noText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- MAIN COMPONENT ---------------------------- */
export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* Modal State */
  const [modal, setModal] = useState({
    show: false,
    type: null,
    studentId: null,
  });

  async function loadStudents() {
    try {
      setLoading(true);
      const res = await API.get("/admin/students");
      setStudents(res.data);
      setFiltered(res.data);
    } catch (err) {
      setStudents([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  /* SEARCH LOGIC */
  useEffect(() => {
    const s = search.toLowerCase();

    setFiltered(
      students.filter(
        (st) =>
          st.name.toLowerCase().includes(s) ||
          st.employee_id?.toLowerCase().includes(s) ||
          st.course?.toLowerCase().includes(s)
      )
    );

    setPage(1);
  }, [search, students]);

  /* PAGINATION */
  const pageCount = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* Handle Approve or Delete */
  async function handleModalAction(yes) {
    if (!yes) {
      setModal({ show: false, type: null, studentId: null });
      return;
    }

    const id = modal.studentId;

    try {
      if (modal.type === "approve") {
        await API.put(`/admin/students/${id}/approve`);
      } else if (modal.type === "remove") {
        await API.delete(`/admin/students/${id}`);
      }
      loadStudents();
    } catch (err) {
      console.error(err);
    }

    setModal({ show: false, type: null, studentId: null });
  }

  return (
    <>
      <NeonModal
        show={modal.show}
        message={
          modal.type === "approve"
            ? "Approve this student?"
            : "Remove this student and all their bookings?"
        }
        yesText={modal.type === "approve" ? "Approve" : "Remove"}
        noText="Cancel"
        onAction={handleModalAction}
      />

      <div className="p-6">
        <h2 className="text-3xl mb-4 text-cyan-400 font-bold">Student Management</h2>

        {/* SEARCH BAR */}
        <input
          type="text"
          placeholder="Search by name, employee ID or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 mb-4 bg-slate-800 border border-slate-600 rounded text-white"
        />

        {/* TABLE */}
        {loading ? (
          <div className="p-4 bg-slate-700 rounded">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-slate-800 text-left rounded-xl">
              <thead className="bg-slate-700 text-slate-300">
                <tr>
                  <th className="p-3 w-20 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((s, index) => (
                  <tr key={s._id} className="border-b border-slate-600">
                    <td className="p-3 text-center">
                      {(page - 1) * pageSize + index + 1}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-slate-400 text-xs">{s.email}</div>
                    </td>

                    <td className="p-3 font-mono text-cyan-300">
                      {s.employee_id || "-"}
                    </td>

                    <td className="p-3">{s.course || "-"}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          s.status === "approved"
                            ? "bg-green-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td className="p-3 text-center space-x-2">
                      {s.status === "pending" && (
                        <button
                          onClick={() =>
                            setModal({
                              show: true,
                              type: "approve",
                              studentId: s._id,
                            })
                          }
                          className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded cursor-pointer"
                        >
                          Approve
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setModal({
                            show: true,
                            type: "remove",
                            studentId: s._id,
                          })
                        }
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center p-4 text-slate-400">
                      No matching students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {pageCount > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
            >
              Prev
            </button>

            {[...Array(pageCount)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded ${
                  page === i + 1 ? "bg-cyan-600" : "bg-slate-700"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal Animations */}
      <style>{`
        @keyframes fadeIn { 0%{opacity:0} 100%{opacity:1} }
        @keyframes scaleIn { 0%{transform:scale(.7);opacity:0;} 100%{transform:scale(1);opacity:1;} }

        .animate-fadeIn { animation: fadeIn .25s ease-out }
        .animate-scaleIn { animation: scaleIn .25s ease-out }
      `}</style>
    </>
  );
}
