import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Flags() {
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =====================================================
  // Get logged-in user from JWT (SAME AS DashboardLayout)
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
  console.log("cccc" + user)
  // =====================================================
  // Load all flags
  // =====================================================
  const load = async () => {
    setError("");
    try {
      const data = await api("/flags");
      setFlags(data.flags || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =====================================================
  // Clear flag
  // =====================================================
  const clearFlag = async (flagId) => {
    setError("");
    try {
      await api(`/flags/${flagId}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  // =====================================================
  // Search filter (keeps existing UX)
  // =====================================================
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

  // =====================================================
  // Photo renderer (unchanged behaviour)
  // =====================================================
  const renderStudentPhoto = (photo, name) => {
    if (!photo) {
      const initials = name
        ? name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
        : "N/A";

      return (
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
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
          width: 60,
          height: 60,
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

  // =====================================================
  // Styles
  // =====================================================
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
      <h2>Flags</h2>

      {/* ACTION BAR */}
      <div
        className="row-actions"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "8px",
        }}
      >
        <Link className="link" to="/flags/create">
          + Add Flag
        </Link>
      </div>

      {error && <div className="danger">{error}</div>}

      {/* SEARCH */}
      <input
        className="input"
        placeholder="Search by student, parent, school, status or amount..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "12px" }}
      />

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
            <th>Actions</th>
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
                <td>{f.student || "-"}</td>
                <td>{f.parent || "-"}</td>
                <td>{f.reported_by || "-"}</td>
                <td>{f.school_location || "-"}</td>
                <td>
                  {f.currency} {Number(f.amount_owed).toLocaleString()}
                </td>
                <td className={isFlagged ? "danger" : ""}>
                  {f.status}
                </td>

                <td>
                  {canClear && (
                    <button
                      style={clearBtnStyle}
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
  );
}
