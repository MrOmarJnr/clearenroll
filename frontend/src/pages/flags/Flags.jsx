import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";
import "../../assets/css/students.css"; 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Flags() {
  const [flags, setFlags] = useState([]);
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
  // Load flags
  // ===============================
  const load = async () => {
    setError("");
    try {
      const data = await api("/flags");
      setFlags(data.flags || []);
    } catch (err) {
      setError(err.message || "Failed to load flags");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ===============================
  // Clear flag
  // ===============================
  const clearFlag = async (flagId) => {
    const ok = window.confirm(
      "Are you sure you want to clear this flag?\nThis action will be logged."
    );
    if (!ok) return;

    try {
      await api(`/flags/${flagId}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message || "Failed to clear flag");
    }
  };

  // ===============================
  // Search
  // ===============================
  const filteredFlags = flags.filter((f) => {
    const term = search.toLowerCase();
    return (
      f.student?.toLowerCase().includes(term) ||
      f.parent?.toLowerCase().includes(term) ||
      f.reported_by?.toLowerCase().includes(term) ||
      f.school_location?.toLowerCase().includes(term) ||
      f.status?.toLowerCase().includes(term) ||
      String(f.amount_owed).includes(term)
    );
  });

  // ===============================
  // Photo helper
  // ===============================
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
        src={`${API_URL}/uploads/students/${photo}`}
        alt="Student"
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

  // RENDER
 
  return (
    <div className="card">
      {/* PAGE HEADER */}
       <div className="page-head">
          <div>
            <h1 className="page-title">Flags Registry</h1>
            <div className="page-subtitle">
              View all flagged students and their fee status
            </div>
          </div>
        </div>

      {error && <div className="danger">{error}</div>}

      {/* SEARCH */}
      <input
        className="input students-search"
        placeholder="Search by student, parent, school, status or amount…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <div className="students-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Student</th>
              <th>Parent</th>
              <th>Reported By</th>
              <th>Location</th>
              <th>Amount</th>
              <th>Status</th>
              <th className="td-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredFlags.map((f) => {
              const isFlagged = f.status === "FLAGGED";
              const isSuperAdmin = user?.role === "SUPER_ADMIN";

              const canClear =
                isFlagged &&
                user &&
                (isSuperAdmin ||
                  Number(f.created_by_user_id) === Number(user.id));

              return (
                <tr key={f.id}>
                  <td>{renderStudentPhoto(f.student_photo, f.student)}</td>
                  <td style={{ width: 250 }}>{f.student || "-"}</td>
                  <td>{f.parent || "-"}</td>
                  <td>{f.reported_by || "-"}</td>
                  <td>{f.school_location || "-"}</td>
                  <td>
                    {f.currency}{" "}
                    {Number(f.amount_owed || 0).toLocaleString()}
                  </td>
                  <td>
                    {isFlagged ? (
                      <span className="badge badge-danger">FLAGGED</span>
                    ) : (
                      <span className="badge badge-success">CLEARED</span>
                    )}
                  </td>

                  <td className="td-center" style={{ width: 100 }}>
                    {canClear && (
                      <button
                        className="btn btn-danger"
                        onClick={() => clearFlag(f.id)}
                      >
                        Clear
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!filteredFlags.length && (
              <tr>
                <td colSpan="8">No flags found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
