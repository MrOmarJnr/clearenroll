import { useEffect, useState } from "react";
import { api } from "../../services/api";
import "../../assets/css/dashboard.css"; // ✅ ensures shared styles

export default function FlagAudit() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  // ======================
  // Load audit logs
  // ======================
  const load = async () => {
    const data = await api("/flags/audit");
    setLogs(data.logs || []);
  };

  useEffect(() => {
    load();
  }, []);

  // ======================
  // Filter (same UX as Parents)
  // ======================
  const filtered = logs.filter((l) => {
    const t = search.toLowerCase().trim();
    return (
      l.student?.toLowerCase().includes(t) ||
      l.parent?.toLowerCase().includes(t) ||
      l.school?.toLowerCase().includes(t) ||
      l.action?.toLowerCase().includes(t) ||
      l.performed_by?.toLowerCase().includes(t)
    );
  });

  // ======================
  // Export CSV
  // ======================
  const exportCSV = () => {
    if (!filtered.length) return;

    const headers = [
      "Student",
      "Parent",
      "School",
      "Amount",
      "Currency",
      "Action",
      "By",
      "Date",
    ];

    const rows = filtered.map((l) => [
      l.student,
      l.parent || "",
      l.school,
      l.amount_owed,
      l.currency,
      l.action,
      l.performed_by,
      new Date(l.created_at).toLocaleString(),
    ]);

    const csv =
      [headers, ...rows]
        .map((r) =>
          r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "flag_audit_log.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  // ======================
  // Render
  // ======================
  return (
    <div className="card">
      {/* HEADER */}
      <div className="card-head">
        <div>
          <h2 className="card-title">Flag Audit Log</h2>
          <div className="hint">
            Read-only system trail of all flag actions (last 92 days)
          </div>
        </div>

        <div className="card-actions">
          <button
            className="btn btn-outline"
            onClick={exportCSV}
            disabled={!filtered.length}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <input
        className="input"
        placeholder="Search student, parent, school or action..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 600, marginBottom: 14 }}
      />

      {/* TABLE */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Parent</th>
              <th>School</th>
              <th>Amount</th>
              <th>Action</th>
              <th>Performed By</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l, i) => (
              <tr key={i}>
                <td>{l.student}</td>
                <td>{l.parent || "-"}</td>
                <td>{l.school}</td>
                <td>
                  {l.currency} {Number(l.amount_owed).toLocaleString()}
                </td>
                <td>
                  <span
                    className={`badge ${
                      l.action === "CLEARED"
                        ? "badge-success"
                        : "badge-danger"
                    }`}
                  >
                    {l.action}
                  </span>
                </td>
                <td>{l.performed_by}</td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}

            {!filtered.length && (
              <tr>
                <td colSpan="7">No audit records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
