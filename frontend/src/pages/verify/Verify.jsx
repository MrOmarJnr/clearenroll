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
      setError(err.message || "Lookup failed");
    }
  };

  const isFlagged = result?.status === "FLAGGED";

  return (
    <>
      {/* SEARCH */}
      <div className="card">
        <h2>Registry Lookup</h2>

        <form onSubmit={run}>
          <div className="form-row">
            <input
              className="input"
              placeholder="Parent Phone or Ghana Card Number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit">
            Search Registry
          </button>
        </form>

        {error && <div className="danger">{error}</div>}
      </div>

      {/* RESULT */}
      {result && (
        <>
          {/* STATUS */}
          <div className="card">
            <h3>Registry Status</h3>
            <div className={isFlagged ? "danger" : "success"}>
              {result.status}
            </div>
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
                {(result.parents || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.full_name}</td>
                    <td>{p.phone}</td>
                    <td>{p.ghana_card_number || "-"}</td>
                  </tr>
                ))}
                {!result.parents?.length && (
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
                    <td colSpan="2">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FLAGS */}
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
                {(result.flags || []).map((f) => (
                  <tr key={f.id}>
                    <td>{f.student}</td>
                    <td>{f.reported_by}</td>
                    <td>{f.amount_owed}</td>
                    <td className="danger">FLAGGED</td>
                  </tr>
                ))}
                {!result.flags?.length && (
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
