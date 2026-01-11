import { useEffect, useState } from "react";
import { api } from "../../services/api";
import ResolveDispute from "./ResolveDispute";

export default function DisputesList() {
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api("/disputes?student_id=0"); 
      // NOTE: backend currently needs student_id
      // For MVP, we load per student; bulk list comes later
      setDisputes(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2>Disputes</h2>

      {error && <div className="danger">{error}</div>}

      {!disputes.length && <div>No disputes found.</div>}

      {disputes.map((d) => (
        <div key={d.id} className="card" style={{ marginTop: 10 }}>
          <b>Student ID:</b> {d.student_id} <br />
          <b>Status:</b> {d.status} <br />
          <b>Reason:</b> {d.reason} <br />

          {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
            <ResolveDispute dispute={d} onResolved={load} />
          ) : (
            <i>Resolved</i>
          )}
        </div>
      ))}
    </div>
  );
}
