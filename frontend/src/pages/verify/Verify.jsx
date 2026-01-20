import { useState } from "react";
import { api } from "../../services/api";

export default function Verify() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const cleaned = query.trim();

    if (!cleaned) {
      setError("Please enter a phone number or Ghana Card number.");
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

  return (
    <>
      {/* SEARCH */}
      <div className="card">
        <h2>Registry Lookup</h2>

        <form onSubmit={run}>
          <div className="form-row">
            <input
              placeholder="Parent Phone or Ghana Card Number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ maxWidth: 800}}
            />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search Registry"}
            </button>
          </div>
        </form>

        {error && <div className="danger" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {/* RESULTS */}
      {result && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Registry Status</h3>
            <span
              className={
                result.status === "FLAGGED"
                  ? "badge badge-danger"
                  : "badge badge-success"
              }
               style={{ maxWidth: 800, height: 40, fontSize: 25}}
            >
              {result.status}
            </span>
          </div>

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
                {result.parents.length ? (
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

          <div className="card">
            <h3>Students</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>School</th>
                </tr>
              </thead>
              <tbody>
                {result.students.length ? (
                  result.students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.school}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Outstanding Fees / Flags</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>School</th>
                  <th>Amount Owed (GHS)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.flags.length ? (
                  result.flags.map((f) => (
                    <tr key={f.id}>
                      <td>{f.student}</td>
                      <td>{f.reported_by}</td>
                      <td>{f.amount_owed}</td>
                      <td>
                        <span className="badge badge-danger">FLAGGED</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No outstanding fees</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
