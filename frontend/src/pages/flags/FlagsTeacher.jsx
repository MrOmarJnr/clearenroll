import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";
import "../../assets/css/students.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function FlagsTeacher() {
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ===============================
  // Logged-in user (SAFE)
  // ===============================
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

  // ===============================
  // Load teachers
  // ===============================
  const load = async () => {
    setError("");
    try {
      const data = await api("/teachers");
      setTeachers(data.teachers || []);
    } catch (err) {
      setError(err.message || "Failed to load teachers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ===============================
  // Search
  // ===============================
  const filteredTeachers = teachers.filter((t) => {
    const term = search.toLowerCase();
    return (
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
      t.qualification?.toLowerCase().includes(term) ||
      t.school?.toLowerCase().includes(term) ||
      t.status?.toLowerCase().includes(term) ||
      t.phone?.includes(term)
    );
  });

  // ===============================
  // Photo helper
  // ===============================
  const renderTeacherPhoto = (photo, name) => {
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
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {initials}
        </div>
      );
    }

    return (
      <img
        src={`${API_URL}/uploads/teachers/${photo}`}
        alt="Teacher"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #ddd",
        }}
      />
    );
  };

  // ===============================
  // RENDER
  // ===============================
  return (
    <div className="card">
      <div className="page-head">
        <div>
          <h1 className="page-title">Teachers Registry</h1>
          <div className="page-subtitle">
            View all registered teachers.
          </div>
        </div>
      </div>

      {error && <div className="danger">{error}</div>}

      <input
        className="input students-search"
        placeholder="Search by name, qualification, school, status or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="students-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Address</th>
              <th>School</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredTeachers.map((t) => (
              <tr key={t.id}>
                <td>
                  {renderTeacherPhoto(
                    t.teacher_photo,
                    `${t.first_name} ${t.last_name}`
                  )}
                </td>

                <td style={{ width: 250 }}>
                  {t.first_name} {t.last_name}
                </td>

                <td>{t.address || "-"}</td>

                <td>{t.school || "-"}</td>

                <td>{t.phone || "-"}</td>

                <td>
                  {t.status === "ACTIVE" ? (
                    <span className="badge badge-success">ACTIVE</span>
                  ) : (
                    <span className="badge badge-danger">
                      {t.status || "INACTIVE"}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {!filteredTeachers.length && (
              <tr>
                <td colSpan="6">No teachers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}