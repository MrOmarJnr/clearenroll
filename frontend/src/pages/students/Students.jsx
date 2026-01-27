import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
  // 🔑 CORE RULE
  // ONLY STUDENTS WITH ACTIVE FLAG ARE SHOWN
  // =====================================================
  const flaggedStudents = students.filter(
    (s) => s.active_flag_id
  );

  // =====================================================
  // SEARCH (APPLIED AFTER FLAG FILTER)
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

  const renderStudentPhoto = (photo, name) => {
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
            width: 90,
            height: 90,
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
          width: 90,
          height: 90,
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

  const clearBtnStyle = {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "4px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
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

            // ✅ FINAL PERMISSION RULE
            const canClear =
              isSuperAdmin ||
              (isSchoolAdmin &&
                Number(s.reported_by_school_id) ===
                  Number(user.school_id));

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
                  <Link className="link" to={`/students/${s.id}/edit`}>
                    View
                  </Link>

                  {canClear && (
                    <button
                      style={clearBtnStyle}
                      onClick={() =>
                        clearFlagForStudent(s.active_flag_id)
                      }
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
  );
}
