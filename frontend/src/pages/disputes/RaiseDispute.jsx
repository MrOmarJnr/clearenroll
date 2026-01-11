import { useState } from "react";
import { api } from "../../services/api";

export default function RaiseDispute() {
  const [studentId, setStudentId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api("/disputes", {
        method: "POST",
        body: JSON.stringify({
          student_id: Number(studentId),
          reason,
          description,
          raised_by: "PARENT",
        }),
      });

      setMessage("✅ Dispute raised successfully.");
      setStudentId("");
      setReason("");
      setDescription("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Raise Dispute</h2>

      <form onSubmit={submit}>
        <div className="form-row">
          <input
            className="input"
            placeholder="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <input
            className="input"
            placeholder="Reason (e.g. I already paid)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="form-row">
          <textarea
            className="input"
            placeholder="Optional explanation"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button className="btn">Submit Dispute</button>
      </form>

      {message && <div className="success">{message}</div>}
      {error && <div className="danger">{error}</div>}
    </div>
  );
}
