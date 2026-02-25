import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import "../../assets/css/create-records.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function EditTeacher() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [existingEvidence, setExistingEvidence] = useState([]);
  const [newEvidence, setNewEvidence] = useState([]);
  const [existingPhoto, setExistingPhoto] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    reason: "",
    status: "ENGAGED",
    teacher_photo: null,
  });

  const isFlagged = form.status === "FLAGGED";

  // ===============================
  // LOAD TEACHER
  // ===============================
  useEffect(() => {
    loadTeacher();
  }, []);

  const loadTeacher = async () => {
    try {
      const data = await api(`/teachers/${id}`);
      const t = data.teacher;

      setForm({
        first_name: t.first_name || "",
        last_name: t.last_name || "",
        phone: t.phone || "",
        reason: t.reason || "",
        status: t.status || "ENGAGED",
        teacher_photo: null,
      });

      setExistingPhoto(t.teacher_photo || null);
      setExistingEvidence(data.evidence || []);
    } catch (err) {
      setError(err.message || "Failed to load teacher");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // DELETE EVIDENCE
  // ===============================
  const deleteEvidence = async (evidenceId) => {
    const ok = window.confirm("Delete this evidence?");
    if (!ok) return;

    try {
      await api(`/teachers/${id}/evidence/${evidenceId}`, {
        method: "DELETE",
      });

      setExistingEvidence((prev) =>
        prev.filter((e) => e.id !== evidenceId)
      );
    } catch (err) {
      setError(err.message || "Failed to delete evidence");
    }
  };

  // ===============================
  // SUBMIT UPDATE
  // ===============================
  const submitUpdate = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const fd = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          fd.append(key, value);
        }
      });

      newEvidence.forEach((file) => {
        fd.append("evidence_files[]", file);
      });

      await api(`/teachers/${id}`, {
        method: "PUT",
        body: fd,
      });

      navigate("/teachersflag");
    } catch (err) {
      setError(err.message || "Failed to update teacher");
    }
  };

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div className="card create-records">
      <h1>Edit Teacher</h1>

      {error && <div className="danger">{error}</div>}

      <form onSubmit={submitUpdate} className="form-section">
        <div className="form-grid">

          {/* First Name */}
          <input
            className="input"
            placeholder="First Name"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
          />

          {/* Last Name */}
          <input
            className="input"
            placeholder="Last Name"
            value={form.last_name}
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
          />

          {/* Phone */}
          <input
            className="input"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          {/* Status */}
          <select
            className="select"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value })
            }
          >
            <option value="ENGAGED">ENGAGED</option>
            <option value="FLAGGED">FLAGGED</option>
            <option value="CLEARED">CLEARED</option>
          </select>

          {/* Show when FLAGGED */}
          {isFlagged && (
            <>
              <textarea
                className="input"
                placeholder="Reason"
                value={form.reason}
                onChange={(e) =>
                  setForm({ ...form, reason: e.target.value })
                }
              />

              <div>
                <h4>Existing Evidence</h4>

                {existingEvidence.length === 0 && (
                  <div>No evidence uploaded.</div>
                )}

                {existingEvidence.map((ev) => (
                  <div key={ev.id} style={{ marginBottom: 8 }}>
                    <a
                      href={`${API_URL}/${ev.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ev.file_name}
                    </a>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginLeft: 10 }}
                      onClick={() => deleteEvidence(ev.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}

                <input
                  type="file"
                  multiple
                  className="input"
                  onChange={(e) =>
                    setNewEvidence(
                      Array.from(e.target.files).slice(0, 10)
                    )
                  }
                />
              </div>
            </>
          )}

          {/* Existing Photo Preview */}
          {existingPhoto && (
            <div style={{ marginTop: 10 }}>
              <h4>Current Photo</h4>
              <img
                src={`${API_URL}/uploads/teachers/${existingPhoto}`}
                alt="Teacher"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}

          {/* Upload New Photo */}
       <h6></h6>

          <input
            type="file"
            className="input"
          
            onChange={(e) =>
              setForm({
                ...form,
                teacher_photo: e.target.files?.[0] || null,
              })
            }
          />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="submit" className="btn btn-primary">
            Update Teacher
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/teachersflag")}
              style={{
                            backgroundColor: "#9e2608",  
                            padding: "8px 16px",
                            borderRadius: "6px",
                            color: "#fff",
                     
                            cursor: "pointer",
                            marginRight: 8,
                            }}  
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}