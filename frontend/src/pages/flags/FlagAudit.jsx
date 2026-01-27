import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function FlagAudit() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ======================================
  // Load audit logs
  // ======================================
  const loadLogs = async (query = "") => {
    try {
      setLoading(true);
      setError("");

      const res = await api(`/flags/audit${query ? `?q=${query}` : ""}`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error("AUDIT LOAD ERROR:", err);
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // ======================================
  // Search handler
  // ======================================
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    loadLogs(value);
  };

  // ======================================
  // CSV Export (NO BACKEND DEPENDENCY)
  // ======================================
  const exportCSV = () => {
    if (!logs.length) return;

    const headers = [
      "Student",
      "Parent",
      "School",
      "Action",
      "Amount",
      "Currency",
      "Performed By",
      "Date",
    ];

    const rows = logs.map((l) => [
      l.student,
      l.parent || "",
      l.school,
      l.action,
      l.amount_owed,
      l.currency,
      l.performed_by,
      new Date(l.created_at).toLocaleString(),
    ]);

    const csv =
      [headers, ...rows]
        .map((row) =>
          row
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `flag_audit_logs_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card">
      <div className="row-between">
        <div>
          <h2>Flag Audit Log</h2>
          <p className="muted">
            System audit trail (last 92 days). Read-only.
          </p>
        </div>

        <button className="btn secondary" onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <input
        className="input"
        placeholder="Search student, school, parent or action..."
        value={search}
        onChange={handleSearch}
        style={{ marginTop: 12 }}
      />

      {loading && <p style={{ marginTop: 20 }}>Loading...</p>}
      {error && <p className="danger">{error}</p>}

      {!loading && !logs.length && (
        <p style={{ marginTop: 20 }}>No audit logs found</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>School</th>
                <th>Action</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Performed By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.student}</td>
                  <td>{l.parent || "-"}</td>
                  <td>{l.school}</td>
                  <td>
                    <span
                      className={`badge ${
                        l.action === "CLEARED" ? "success" : "danger"
                      }`}
                    >
                      {l.action}
                    </span>
                  </td>
                  <td>{l.amount_owed}</td>
                  <td>{l.currency}</td>
                  <td>{l.performed_by}</td>
                  <td>
                    {new Date(l.created_at).toLocaleDateString()}{" "}
                    {new Date(l.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
