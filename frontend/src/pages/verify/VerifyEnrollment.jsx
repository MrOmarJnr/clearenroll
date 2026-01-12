import { useState } from "react";
import { api } from "../../services/api";

export default function VerifyEnrollment() {
  const [mode, setMode] = useState("byId"); // byId | byBio
  const [studentId, setStudentId] = useState("");
  const [bio, setBio] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const payload =
        mode === "byId"
          ? { student_id: Number(studentId) }
          : {
              first_name: bio.first_name.trim(),
              last_name: bio.last_name.trim(),
              date_of_birth: bio.date_of_birth,
            };

      const data = await api("/verify/student", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Check Enrollment Status</h2>

      <div className="form-row">
        <select
          className="select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="byId">Verify by Student ID</option>
          <option value="byBio">Verify by Name + DOB</option>
        </select>
      </div>

      <form onSubmit={run}>
        {mode === "byId" ? (
          <div className="form-row">
            <input
              className="input"
              placeholder="Student ID (numeric)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div className="form-row">
              <input
                className="input"
                placeholder="First Name"
                value={bio.first_name}
                onChange={(e) =>
                  setBio({ ...bio, first_name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <input
                className="input"
                placeholder="Last Name"
                value={bio.last_name}
                onChange={(e) =>
                  setBio({ ...bio, last_name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <input
                className="input"
                type="date"
                value={bio.date_of_birth}
                onChange={(e) =>
                  setBio({ ...bio, date_of_birth: e.target.value })
                }
                required
              />
            </div>
          </>
        )}

        <button className="btn" type="submit">
          Check
        </button>
      </form>

      {error && <div className="danger">{error}</div>}

      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Result</h3>

          {result.status === "NOT_FOUND" && (
            <div>
               <b>NOT FOUND</b> — Student must be onboarded before enrollment.
            </div>
          )}

          {result.status === "MULTIPLE_MATCHES" && (
            <div className="danger">
               <b>MULTIPLE MATCHES</b> — Manual review required.
            </div>
          )}

          {/*  NEW: DUPLICATE PENDING */}
          {result.status === "DUPLICATE_PENDING" && (
            <div className="danger">
               <b>BLOCKED (Duplicate Pending)</b>
              <br />
              Student <b>{result.student?.name}</b> has a pending duplicate
              review.
              <br />
              Enrollment cannot proceed until an administrator resolves this.
            </div>
          )}
          {result.status === "DISPUTED" && (
  <div className="warning">
     <b>DISPUTE IN PROGRESS</b>
    <br />
    Enrollment is blocked until the dispute is resolved.
  </div>
)}


        {result.status === "FLAGGED" &&
  result.consent_status === "APPROVED" && (

            <div className="danger">
               <b>BLOCKED (Outstanding Fees)</b>
              <br />
              Student <b>{result.student?.name}</b>
              <br />
              Amount Owed: <b>GHS {result.amount_owed}</b>
            </div>
          )}
          {result.status === "FLAGGED" && result.consent_status !== "APPROVED" && (
  <div className="warning">
     <b>RECORD FOUND – CONSENT REQUIRED</b>
    <br />
    Fee clearance details cannot be viewed until parental consent is approved.
  </div>
)}


          {result.status === "CLEAR" && (
            <div>
               <b>CLEAR</b> — {result.student?.name} is eligible for enrollment.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
