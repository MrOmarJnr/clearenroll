import { useState } from "react";
import { api } from "../../services/api";
import "../../assets/css/verify.css";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal selection
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ======================
  // Search
  // ======================
  const run = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setSelectedStudent(null);

    const cleaned = query.trim();
    if (!cleaned) {
      setError("Please enter a student name, phone number or Ghana Card number.");
      return;
    }

    setLoading(true);

    try {
      const data = await api("/verify", {
        method: "POST",
        body: JSON.stringify({ query: cleaned }),
      });

      if (data.status === "NOT_FOUND") {
        setError("No record found for the provided identifier.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // Image helpers (same idea as Flags page)
  // ======================
  const buildPhotoUrl = (photo) => {
    if (!photo) return null;

    // If already a full URL
    if (typeof photo === "string" && (photo.startsWith("http://") || photo.startsWith("https://"))) {
      return photo;
    }

    // If already absolute path
    if (typeof photo === "string" && photo.startsWith("/")) {
      return `${API_URL}${photo}`;
    }

    // Your DB currently stores something like: uploads/students/name.jpg OR just name.jpg
    if (typeof photo === "string" && photo.startsWith("uploads/")) {
      return `${API_URL}/${photo}`;
    }

    // Fallback to your standard student upload folder
    return `${API_URL}/uploads/students/${photo}`;
  };

  const renderStudentPhoto = (photo, size = 45) => {
    const url = buildPhotoUrl(photo);

    if (!url) {
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
            fontSize: 12,
          }}
        >
          N/A
        </div>
      );
    }

    return (
      <img
        src={url}
        alt="Student"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #ddd",
        }}
      />
    );
  };

  // ======================
  // CRITICAL FIX:
  // Modal must show ONLY selected student's flags
  // ======================
  const getSelectedRowFlags = () => {
    if (!result || !selectedStudent) return [];

    const sid = Number(selectedStudent.id);
    const pid = selectedStudent.parent_id != null ? Number(selectedStudent.parent_id) : null;

    return (result.flags || []).filter((f) => {
      const fSid = Number(f.student_id);
      const fPid = f.parent_id != null ? Number(f.parent_id) : null;

      // Must match student
      if (fSid !== sid) return false;

      // If row has a parent_id, must match that exact parent
      if (pid !== null) return fPid === pid;

      // If row has no parent_id, fallback to student-only
      return true;
    });
  };

  const selectedFlags = getSelectedRowFlags();

  const closeModal = () => setSelectedStudent(null);

  // Helper: format DOB a bit cleaner (keeps your UI intact)
  const formatDob = (dob) => {
    if (!dob) return "-";
    // Works for "YYYY-MM-DD" and ISO strings
    const s = String(dob);
    if (s.includes("T")) return s.split("T")[0];
    return s;
  };

  // Breakdown: group by Parent, then list each flag
  const flagsByParent = selectedFlags.reduce((acc, f) => {
    const key = f.parent || "Unknown Parent";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});


  return (
    <>
          <div className="verify-page">
    
      {/* SEARCH */}
      <div className="card">
        <h2>Registry Lookup</h2>

        <form onSubmit={run}>
          <div className="form-row">
            <input
              placeholder="Search by student name, parent name, phone, or Ghana Card"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 800 }}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}  style={{ width: 200 }}>
              {loading ? "Searching..." : "Search Registry"}
            </button>
          </div>
        </form>

        {error && <div className="danger" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* RESULTS */}
      {result && (
        <>
          {/* STATUS */}
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Registry Status</h3>
            <span
              className={
                result.status === "FLAGGED"
                  ? "badge badge-danger"
                  : "badge badge-success"
              }
              style={{ maxWidth: 800, height: 40, fontSize: 25 }}
            >
              {result.status}
            </span>
          </div>

          {/* PARENTS */}
          <div className="card">
            <h3>Parent(s)</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Ghana Card</th>
                </tr>
              </thead>
              <tbody>
                {result.parents && result.parents.length ? (
                  result.parents.map((p) => (
                    <tr key={p.id}>
                      <td>{p.full_name}</td>
                      <td>{p.phone}</td>
                      <td>{p.ghana_card_number || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No parent record found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* STUDENTS */}
          <div className="card">
            <h3>Students</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Parent</th>
                  <th>School</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.students && result.students.length ? (
                  result.students.map((s) => (
                    <tr key={s.id}>
                      <td>{renderStudentPhoto(s.student_photo, 90)}</td>
                      <td>{s.name}</td>
                      <td>{s.parent_name || "-"}</td>
                      <td>{s.school}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn" type="button" onClick={() => setSelectedStudent(s)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* OUTSTANDING */}
          <div className="card">
            <h3>Outstanding Fees / Flags</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>School</th>
                  <th>Amount Owed (GHS)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.flags && result.flags.length ? (
                  result.flags.map((f) => (
                    <tr key={f.id}>
                      <td>{f.student}</td>
                      <td>{f.parent || "-"}</td>
                      <td>{f.reported_by}</td>
                      <td>{Number(f.amount_owed || 0).toLocaleString()}</td>
                      <td>
                        <span className="badge badge-danger">FLAGGED</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No outstanding fees</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =========================
          MODAL (FULL, NOT REDUCED)
          Fix: ONLY selected student totals/breakdown
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
                <div style={{ opacity: 0.75 }}>
                  Registry view (student-first)
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {renderStudentPhoto(selectedStudent.student_photo, 150)}
              </div>
            </div>

            <hr style={{ margin: "14px 0" }} />

                {/* Student Info */}
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
                    <td>{formatDob(selectedStudent.date_of_birth)}</td>
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
                    <td>{selectedStudent.parent_name || "-"}</td>
                  </tr>
                  <tr>
                    <td><strong>Parent Phone</strong></td>
                    <td>{selectedStudent.parent_phone || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Outstanding Fees (ONLY for selected row: student + parent) */}
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Outstanding Fees / Flags (Selected Student)</h3>

              {selectedFlags.length ? (
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
                    {selectedFlags.map((f) => (
                      <tr key={f.id}>
                        <td>{f.reported_by}</td>
                        <td>{f.reason || "-"}</td>
                        <td>
                          {f.currency || "GHS"} {Number(f.amount_owed || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-danger">FLAGGED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div>No outstanding fees for this selected student/parent.</div>
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
    </div>


    </>
  );
}
