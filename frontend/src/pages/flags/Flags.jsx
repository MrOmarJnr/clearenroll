import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";

export default function Flags() {
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await api("/flags");
      setFlags(data.flags || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearFlag = async (id) => {
    setError("");
    try {
      await api(`/flags/${id}/clear`, { method: "PATCH" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Flags</h2>
      <div className="row-actions">
        <Link className="link" to="/flags/create">
          Create Flag
        </Link>
      </div>

      {error && <div className="danger">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Parent</th>
            <th>Reported By</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr key={f.id}>
              <td>{f.student || "-"}</td>
              <td>{f.parent || "-"}</td>
              <td>{f.reported_by || "-"}</td>
              <td>{f.amount_owed}</td>
              <td className={f.status === "FLAGGED" ? "danger" : ""}>{f.status}</td>
              <td>
                {f.status === "FLAGGED" && (
                  <button className="btn" onClick={() => clearFlag(f.id)}>
                    Clear
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!flags.length && (
            <tr>
              <td colSpan="6">No flags yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
