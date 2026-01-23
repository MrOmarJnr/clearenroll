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
  // SAFE USER EXTRACTION (MATCHES DashboardLayout)
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

      // 🔒 NORMALIZE ID ONCE (THIS IS THE FIX)
      return {
        ...payload,
        id: payload.user_id, // <-- critical
      };
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  };

  const user = getUserSafe();



  // =====================================================
  // LOAD STUDENTS (backend already filters by school)
  // =====================================================
  const load = async () => {
    setError("");
    try {
      const data = await api("/students");
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =====================================================
  // CLEAR FLAG
  // =====================================================
  const clearFlagForStudent = async (flagId) => {
    setError("");
    try {
      await api(`/flags/${flagId}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  // =====================================================
  // SEARCH FILTER
  // =====================================================
  const filteredStudents = students.filter((s) => {
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

  return (
    <div className="card">
      <h2>Students</h2>

      <div className="row-actions" style={{ justifyContent: "flex-end" }}>
        <Link className="link" to="/students/add">
          + Add Student
        </Link>
      </div>

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
         const isFlagged = !!s.active_flag_id;

          const isSuperAdmin = user?.role === "SUPER_ADMIN";
          const isSchoolAdmin = user?.role === "SCHOOL_ADMIN";

          const canClear =
            isFlagged &&
            user &&
            (
              isSuperAdmin ||
              (
                isSchoolAdmin &&
                Number(s.reported_by_school_id) === Number(user.school_id)
              )
            );

            return (
              <tr key={s.id}>
                <td>{renderStudentPhoto(s.student_photo, s.name)}</td>
                <td>{s.name}</td>
                <td>{s.id}</td>
                <td>{formatDateDMY(s.date_of_birth)}</td>
                <td>{s.gender}</td>
                <td>{s.school}</td>
                <td>{s.parent || "-"}</td>
                <td className={isFlagged ? "danger" : ""}>
                  {isFlagged ? "FLAGGED" : "OK"}
                </td>
                <td style={{ display: "flex", gap: "10px" }}>
                  <Link className="link" to={`/students/${s.id}/edit`}>
                    View
                  </Link>

                  {canClear && (
                    <button
                      style={clearBtnStyle}
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
              <td colSpan="9">No students found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
