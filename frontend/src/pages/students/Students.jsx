import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ✅ Modal states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // =====================================================
  // SAFE USER EXTRACTION (NO SIDE EFFECTS)
  // =====================================================
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

  // =====================================================
  // LOAD STUDENTS
  // =====================================================
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

  // =====================================================
  // CLEAR FLAG (BACKEND IS SOURCE OF TRUTH)
  // =====================================================
  const clearFlagForStudent = async (flagId) => {
    if (!flagId) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear this student's flag?\n\nThis action will be logged and cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    try {
      await api(`/flags/${flagId}/clear`, { method: "PATCH" });
      await load(); // ⬅ cleared student leaves list
    } catch (err) {
      setError(err.message || "Failed to clear flag");
    }
  };

  // =====================================================
  // 🔑 CORE RULE: ONLY FLAGGED STUDENTS
  // =====================================================
  const flaggedStudents = students.filter((s) => s.active_flag_id);

  // =====================================================
  // SEARCH
  // =====================================================
  const filteredStudents = flaggedStudents.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.school?.toLowerCase().includes(term) ||
      s.parent?.toLowerCase().includes(term) ||
      String(s.id).includes(term)
    );
  });

  // =====================================================
  // HELPERS
  // =====================================================
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return `${String(d.getDate()).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const renderStudentPhoto = (photo, name, size = 90) => {
    if (!photo) {
      const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
        : "NA";

      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {initials}
        </div>
      );
    }

    return (
      <img
        src={`${API_URL}/uploads/students/${photo}`}
        alt="Student"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #ddd",
        }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.style.display = "none";
        }}
      />
    );
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setSelectedFlag(null);
    setViewLoading(false);
  };

  // =====================================================
  // ✅ VIEW: load exact flag data (same fields Verify uses)
  // =====================================================
  const openViewModal = async (studentRow) => {
    setError("");
    setSelectedStudent(studentRow);
    setSelectedFlag(null);
    setViewLoading(true);

    try {
      // ✅ This endpoint we'll add in backend (below)
      const data = await api(`/flags/${studentRow.active_flag_id}`);
      setSelectedFlag(data.flag || null);
    } catch (err) {
      setError(err.message || "Failed to load flag details");
    } finally {
      setViewLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <>
      <div className="card">
        <h2>Flagged Students</h2>

        {error && <div className="danger">{error}</div>}

        <input
          className="input"
          placeholder="Search by name, school, parent or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "12px" }}
        />

        <table className="table">
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
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((s) => {
              const isSuperAdmin = user?.role === "SUPER_ADMIN";
              const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";

              // ✅ FINAL PERMISSION RULE (UNCHANGED)
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
                  <td className="danger">FLAGGED</td>

                  <td style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="btn btn-outline"
                      type="button"
                      onClick={() => openViewModal(s)}
                    >
                      View
                    </button>

                    <Link className="link" to={`/students/${s.id}/edit`}>
                      Edit Record
                    </Link>

                    {canClear && (
                      <button
                        className="btn danger"
                        onClick={() => clearFlagForStudent(s.active_flag_id)}
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!filteredStudents.length && (
              <tr>
                <td colSpan="9">No flagged students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================
          MODAL (use real flag values)
         ========================= */}
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
              borderRadius: 10,
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
              <div>
                <h2 style={{ marginBottom: 6 }}>Student Details</h2>
                <div style={{ opacity: 0.75 }}>Record view</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {renderStudentPhoto(selectedStudent.student_photo, selectedStudent.name, 120)}
              </div>
            </div>

            <hr style={{ margin: "14px 0" }} />

            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 10 }}>Personal Information</h3>
              <table className="table">
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
              <h3 style={{ marginBottom: 10 }}>Outstanding Fees / Flag (Active)</h3>

              {viewLoading ? (
                <div className="muted">Loading flag details...</div>
              ) : !selectedFlag ? (
                <div className="muted">No flag details found.</div>
              ) : (
                <table className="table">
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
                        <span className="badge badge-danger">{selectedFlag.status || "FLAGGED"}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
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
