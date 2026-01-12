import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Consents() {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConsents = async () => {
    try {
      const data = await api("/consents/pending");
      setConsents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsents();
  }, []);

  const approve = async (id) => {
    if (!window.confirm("Approve this consent request?")) return;

    try {
      await api(`/consents/${id}/approve`, { method: "POST" });
      await loadConsents();
    } catch (err) {
      alert(err.message);
    }
  };

  const reject = async (id) => {
    const reason = prompt("Reason for rejection?");
    if (!reason) return;

    try {
      await api(`/consents/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await loadConsents();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Consent Requests</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="danger">{error}</p>}

      {!loading && consents.length === 0 && (
        <p>No pending consent requests </p>
      )}

      {consents.map((c) => (
        <div key={c.id} className="card mb-3">
          <strong>
            {c.first_name} {c.last_name}
          </strong>
          <p>
            Requesting School: <b>{c.requesting_school}</b>
          </p>
          <small>
            Requested on: {new Date(c.created_at).toLocaleString()}
          </small>

          <div className="row-actions mt-2">
            <button className="btn-success" onClick={() => approve(c.id)}>
              Approve
            </button>
            <button className="btn-danger" onClick={() => reject(c.id)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
