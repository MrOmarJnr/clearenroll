import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";
import "../../assets/css/students.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Safe user extraction
  const token = localStorage.getItem("token");

  const getUserSafe = () => {
    try {
      if (!token) return null;

      const payload = jwtDecode(token);

      if (payload?.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        return null;
      }

      return payload;
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  };

  const user = getUserSafe();

  // Load students
  const load = async () => {
    setError("");
    try {
      const res = await api("/students");
      setStudents(res.students || []);
    } catch (err) {
      setError(err.message || "Failed to load students");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Clear flag
  const clearFlagForStudent = async (flagId) => {
    if (!flagId) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear this student's flag?\n\nThis action will be logged and cannot be undone."
    );
    if (!confirmed) return;

    setError("");
    try {
      await api(`/flags/${flagId}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message || "Failed to clear flag");
    }
  };

  // ONLY flagged students
  const flaggedStudents = students.filter((s) => s.active_flag_id);

  // Search
  const filteredStudents = flaggedStudents.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return (
      s.name?.toLowerCase().includes(term) ||
      s.school?.toLowerCase().includes(term) ||
      s.parent?.toLowerCase().includes(term) ||
      String(s.id).includes(term)
    );
  });

  // Helpers
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const renderStudentPhoto = (photo, name) => {
    if (!photo) {
      const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
        : "NA";

      return <div className="student-avatar">{initials}</div>;
    }

    return (
      <img
        className="student-photo"
        src={`${API_URL}/uploads/students/${photo}`}
        alt={name || "Student"}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setSelectedFlag(null);
    setViewLoading(false);
  };

  // View modal (load flag details)
  const openViewModal = async (studentRow) => {
    setError("");
    setSelectedStudent(studentRow);
    setSelectedFlag(null);
    setViewLoading(true);

    try {
      const data = await api(`/flags/${studentRow.active_flag_id}`);
      setSelectedFlag(data.flag || null);
    } catch (err) {
      setError(err.message || "Failed to load flag details");
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <>
      <div className="card">
        <div className="students-head">
          <div>
            <h1 className="students-title">Flagged Students</h1>
            <div className="students-subtitle">
              Only students with active fee flags appear here
            </div>
          </div>
        </div>

        {error && <div className="students-error">{error}</div>}

        <input
          className="students-search"
          placeholder="Search by name, school, parent or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="students-table-wrap">
          <table className="students-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Student ID</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>School</th>
                <th>Guardian</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((s) => {
                const isSuperAdmin = user?.role === "SUPER_ADMIN";
                const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";

                // Permission rule (unchanged)
                const canClear =
                  isSuperAdmin ||
                  (isSchoolAdmin &&
                    Number(s.reported_by_school_id) === Number(user.school_id));

                return (
                  <tr key={s.id}>
                    <td>{renderStudentPhoto(s.student_photo, s.name)}</td>
                    <td>{s.name}</td>
                    <td>{s.id}</td>
                    <td>{formatDateDMY(s.date_of_birth)}</td>
                    <td>{s.gender}</td>
                    <td>{s.school}</td>
                    <td>{s.parent || "-"}</td>
                    <td>
                      <span className="badge badge-danger">FLAGGED</span>
                    </td>

                    <td>
                      <div className="students-actions">
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={() => openViewModal(s)}
                        >
                          View
                        </button>

                        <Link className="students-link" to={`/students/${s.id}/edit`}>
                          Edit
                        </Link>

                        {canClear && (
                          <button
                            className="btn btn-danger"
                            onClick={() => clearFlagForStudent(s.active_flag_id)}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredStudents.length && (
                <tr>
                  <td colSpan="9" className="students-empty">
                    No flagged students found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (kept same logic, just cleaner class usage) */}
      {selectedStudent && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "min(980px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 12,
              padding: 22,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
              <div>
                <h2 style={{ margin: 0 }}>Student Details</h2>
                <div style={{ opacity: 0.7, marginTop: 4 }}>Record view</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {renderStudentPhoto(selectedStudent.student_photo, selectedStudent.name)}
              </div>
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginTop: 0 }}>Personal Information</h3>
              <table className="students-table">
                <tbody>
                  <tr>
                    <td style={{ width: 220 }}><strong>Name</strong></td>
                    <td>{selectedStudent.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Date of Birth</strong></td>
                    <td>{selectedStudent.date_of_birth || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Gender</strong></td>
                    <td>{selectedStudent.gender || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>School</strong></td>
                    <td>{selectedStudent.school || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Parent</strong></td>
                    <td>{selectedStudent.parent || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ marginTop: 0 }}>Outstanding Fees / Flag (Active)</h3>

              {viewLoading ? (
                <div style={{ color: "#6b7280", fontWeight: 700 }}>
                  Loading flag details...
                </div>
              ) : !selectedFlag ? (
                <div style={{ color: "#6b7280", fontWeight: 700 }}>
                  No flag details found.
                </div>
              ) : (
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>School</th>
                      <th>Reason</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedFlag.reported_by || "-"}</td>
                      <td>{selectedFlag.reason || "-"}</td>
                      <td>
                        {selectedFlag.currency || "GHS"}{" "}
                        {Number(selectedFlag.amount_owed || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className="badge badge-danger">
                          {selectedFlag.status || "FLAGGED"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn" type="button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
