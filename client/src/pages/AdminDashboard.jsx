import React, { useEffect, useState } from "react";
import API from "../services/api";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Load Students
  async function loadStudents() {
    try {
      setLoading(true);
      const res = await API.get("/admin/students");
      setStudents(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error(err);
      setStudents([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  // SEARCH filter
  useEffect(() => {
    const s = search.toLowerCase();
    const result = students.filter(
      (st) =>
        st.name.toLowerCase().includes(s) ||
        st.course?.toLowerCase().includes(s)
    );
    setFiltered(result);
    setPage(1);
  }, [search, students]);

  // PAGINATION
  const pageCount = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Approve student
  async function approveStudent(id) {
    try {
      await API.put(`/admin/students/${id}/approve`);
      alert("Student Approved");
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.msg || "Error approving student");
    }
  }

  // Delete student
  async function deleteStudent(id) {
    if (!window.confirm("Remove this student and all their bookings?")) return;

    try {
      await API.delete(`/admin/students/${id}`);
      alert("Student removed");
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.msg || "Error removing student");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl mb-4 text-cyan-400">Student Management</h2>

      {/* SEARCH BAR */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 bg-slate-800 border border-slate-600 rounded text-white"
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="p-4 bg-slate-700 rounded">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-slate-800 text-left rounded-xl">
            <thead className="bg-slate-700 text-slate-300">
              <tr>
                <th className="p-3 w-20 text-center">S.No</th>
                <th className="p-3">Student Name</th>
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
                        onClick={() => approveStudent(s._id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded"
                      >
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => deleteStudent(s._id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-slate-400">
                    No matching students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION BUTTONS */}
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
  );
}
