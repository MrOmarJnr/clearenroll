import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { jwtDecode } from "jwt-decode";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import "../../assets/css/students.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function FlagsTeacher() {
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagFiles, setFlagFiles] = useState([]);

  // ===============================
  // AUTH SAFE
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
  // LOAD
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
  // SEARCH
  // ===============================
  const filteredTeachers = teachers.filter((t) => {
    const term = search.toLowerCase();
    return (
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(term) ||
      (t.school || "").toLowerCase().includes(term) ||
      (t.status || "").toLowerCase().includes(term) ||
      (t.phone || "").includes(term)
    );
  });

  // ===============================
  // PHOTO
  // ===============================
  const renderTeacherPhoto = (photo, name) => {
    if (!photo) {
      const initials = name
        ? name.split(" ").map((n) => n[0]).join("").slice(0, 2)
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
  // PERMISSION
  // ===============================
  const canModify = (teacher) => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;

    if (
      user.role === "SCHOOL_ADMIN" &&
      Number(user.school_id) === Number(teacher.current_school_id)
    ) {
      return true;
    }

    return false;
  };

  // ===============================
  // FLAG
  // ===============================
  const openFlagModal = (teacher) => {
    setSelectedTeacher(teacher);
    setFlagReason("");
    setFlagFiles([]);
  };

  const closeModal = () => {
    setSelectedTeacher(null);
    setFlagReason("");
    setFlagFiles([]);
  };

  const submitFlag = async () => {
    try {
      if (!selectedTeacher) return;

      if (!flagReason.trim()) {
        alert("Reason is required");
        return;
      }

      const fd = new FormData();
      fd.append("reason", flagReason);

      flagFiles.forEach((file) => {
        fd.append("evidence_files[]", file);
      });

      await api(`/teachers/${selectedTeacher.id}/flag`, {
        method: "PATCH",
        body: fd,
      });

      closeModal();
      await load();
    } catch (err) {
      setError(err.message || "Failed to flag teacher");
    }
  };

  // ===============================
  // CLEAR
  // ===============================
  const handleClear = async (id) => {
    try {
      const ok = window.confirm(
        "Are you sure you want to clear this teacher?\nEvidence will be deleted."
      );
      if (!ok) return;

      await api(`/teachers/${id}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message || "Failed to clear teacher");
    }
  };
console.log("Actual pathname:", location.pathname);
  // ===============================
  // RENDER
  // ===============================
  return (
    <>
      <div className="card">
        <div className="page-head">
          <div>
            <h1 className="page-title">Teachers Registry</h1>
            <div className="page-subtitle">
              Manage teacher engagement and flag status.
            </div>
          </div>
        </div>

        {error && <div className="danger">{error}</div>}

        <input
          className="input students-search"
          placeholder="Search by name, school, status or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="students-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Teacher ID</th>
                <th>Name</th>
                <th>School</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="td-center">Actions</th>
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
                  <td>
                    {t.id}
                  </td>

                  <td>
                    {t.first_name} {t.last_name}
                  </td>

                  <td>{t.school || "-"}</td>

                  <td>{t.phone || "-"}</td>

                  <td>
                    {t.status === "FLAGGED" && (
                      <span className="badge badge-danger">FLAGGED</span>
                    )}

                    {t.status === "ENGAGED" && (
                      <span className="badge badge-success">ENGAGED</span>
                    )}

                    {t.status === "CLEARED" && (
                      <span className="badge">CLEARED</span>
                    )}
                  </td>

                 <td className="td-left">
  {canModify(t) && (
    <>
      {/* ENGAGED → Show Flag + Clear */}
      {t.status === "ENGAGED" && (
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => openFlagModal(t)}
            style={{
              backgroundColor: "#dc2626",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Flag
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleClear(t.id)}
            style={{
              backgroundColor: "#079613",
              padding: "8px 16px",
              borderRadius: "6px",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Clear
          </button>
        </>
      )}

      {/* FLAGGED → Show Clear */}
      {t.status === "FLAGGED" && (
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => handleClear(t.id)}
          style={{
            backgroundColor: "#079613",
            padding: "8px 16px",
            borderRadius: "6px",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            marginRight: 8,
          }}
        >
          Clear
        </button>
      )}

      {/* EDIT always available */}
      <Link
     className="btn btn-outline"

        to={`/teachers/${t.id}/edit`}
        style={{
          backgroundColor: "#2684dc",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: "6px",
          textDecoration: "none",
          marginRight: 8,
          display: "inline-block",
        }}
      >
        Edit
      </Link>
    </>
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

      {/* MODAL — SAME STYLE AS VERIFY PAGE */}
      {selectedTeacher && (
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
              width: "min(600px, 96vw)",
              borderRadius: 10,
              padding: 22,
              maxHeight: "90vh",
              overflowY: "auto",
                width: "600px",
            height: "400px"
            }}
          >
            <h2>
              Flag {selectedTeacher.first_name} {selectedTeacher.last_name}
            </h2>

            <textarea
              className="input"
              placeholder="Reason for flagging"
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              style={{ marginTop: 12,width: "100%", height: 100, resize: "vertical" }}
            />

            <input
              type="file"
              multiple
              className="input"
              style={{ marginTop: 12 }}
              onChange={(e) =>
                setFlagFiles(Array.from(e.target.files).slice(0, 10))
              }
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginTop: 18,
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-danger"
                onClick={submitFlag}
                 style={{
                backgroundColor: "#169206",
              }}
              >
                Confirm Flag
              </button>

              <button type="button" className="btn" onClick={closeModal}
               style={{
                backgroundColor: "#cf340d",
                width: "200px",
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}