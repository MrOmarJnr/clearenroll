import { useState } from "react";
import { api } from "../../services/api";

export default function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const run = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const data = await api("/verify", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const isFlagged = result?.status === "FLAGGED";
  const hasConsent = result?.consent_status === "APPROVED";

  return (
    <>
      {/* SEARCH CARD */}
      <div className="card">
        <h2>Registry Lookup</h2>

        <form onSubmit={run}>
          <div className="form-row">
            <input
              className="input"
              placeholder="Phone / Ghana Card / Student Name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        {error && <div className="danger">{error}</div>}
      </div>

      {/* RESULT */}
      {result && (
        <>
          {/* STATUS */}
          <div className="card">
            <h3>Result</h3>
            <div className={isFlagged ? "danger" : ""}>
              {result.status}
            </div>
          </div>

          {/* CONSENT WARNING */}
          {!hasConsent && (
            <div className="card warning">
              🔒 <b>Consent Required</b>
              <br />
              Detailed financial and parent information is hidden until parental
              consent is approved.
            </div>
          )}

          {/* PARENTS — ONLY WITH CONSENT */}
          {hasConsent && (
            <div className="card">
              <h3>Matched Parents</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Ghana Card</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.parents || []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.full_name}</td>
                      <td>{p.phone}</td>
                      <td>{p.ghana_card_number || "-"}</td>
                    </tr>
                  ))}
                  {!result.parents?.length && (
                    <tr>
                      <td colSpan="3">No matches.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STUDENTS — ALWAYS VISIBLE */}
          <div className="card">
            <h3>Matched Students</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                </tr>
              </thead>
              <tbody>
                {(result.students || []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.school}</td>
                  </tr>
                ))}
                {!result.students?.length && (
                  <tr>
                    <td colSpan="2">No matches.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FLAGS — ONLY WITH CONSENT */}
          {hasConsent && (
            <div className="card">
              <h3>Active Flags</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Parent</th>
                    <th>School</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.flags || []).map((f) => (
                    <tr key={f.id}>
                      <td>{f.student || "-"}</td>
                      <td>{f.parent || "-"}</td>
                      <td>{f.reported_by || "-"}</td>
                      <td>{f.amount_owed}</td>
                    </tr>
                  ))}
                  {!result.flags?.length && (
                    <tr>
                      <td colSpan="4">No active flags.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
