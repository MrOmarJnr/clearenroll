import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function LoginLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");


  // Load login / logout logs

  const load = async () => {
    const data = await api("/audit/login-logs");
    setLogs(data.logs || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((l) => {
    const t = search.toLowerCase().trim();
    return (
      l.email?.toLowerCase().includes(t) ||
      l.full_name?.toLowerCase().includes(t) ||
      l.role?.toLowerCase().includes(t) ||
      l.action?.toLowerCase().includes(t) ||
      l.ip_address?.toLowerCase().includes(t)
    );
  });


  // Export CSV

  const exportCSV = () => {
    if (!filtered.length) return;

    const headers = [
      "User",
      "Email",
      "Role",
      "Action",
      "IP Address",
      "Device",
      "Date",
    ];

    const rows = filtered.map((l) => [
      l.full_name || "",
      l.email,
      l.role,
      l.action,
      l.ip_address,
      l.user_agent,
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
    a.download = "login_audit_log.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  // Render

  return (
    <div className="card">
      {/* HEADER */}
      <div className="card-head">
        <div>
          <h2 className="card-title">Login & Logout Audit</h2>
          <div className="hint">
            Read-only system trail of all authentication activity
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
        placeholder="Search user, email, role, IP or action..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 600, marginBottom: 14 }}
      />

      {/* TABLE */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Device</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{l.full_name || "-"}</strong>
                  <br />
                  <small>{l.email}</small>
                </td>

                <td>{l.role}</td>

                <td>
                  <span
                    className={`badge ${
                      l.action === "LOGIN"
                        ? "badge-success"
                        : "badge-danger"
                    }`}
                  >
                    {l.action}
                  </span>
                </td>

                <td style={{ maxWidth: 260 }}>
                  <small>{l.user_agent || "-"}</small>
                </td>

                <td>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}

            {!filtered.length && (
              <tr>
                <td colSpan="6">No login records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
