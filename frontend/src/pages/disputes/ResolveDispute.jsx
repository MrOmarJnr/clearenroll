import { useState } from "react";
import { api } from "../../services/api";

export default function ResolveDispute({ dispute, onResolved }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const resolve = async (status) => {
    setError("");
    try {
      await api(`/disputes/${dispute.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          status,
          resolution_note: note,
        }),
      });

      onResolved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <textarea
        className="input"
        placeholder="Resolution note (required)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={() => resolve("RESOLVED_ACCEPTED")}>
          Accept
        </button>
        &nbsp;
        <button
          className="btn danger"
          onClick={() => resolve("RESOLVED_REJECTED")}
        >
          Reject
        </button>
      </div>

      {error && <div className="danger">{error}</div>}
    </div>
  );
}
