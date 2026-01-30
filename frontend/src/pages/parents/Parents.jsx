import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import "../../assets/css/students.css"; // reuse same visual system

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ======================
  // Load parents
  // ======================
  const load = async () => {
    setError("");
    try {
      const data = await api("/parents");
      setParents(data.parents || []);
    } catch (err) {
      setError(err.message || "Failed to load parents");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ======================
  // Search filter
  // ======================
  const filtered = parents.filter((p) => {
    const t = search.toLowerCase().trim();
    return (
      p.full_name?.toLowerCase().includes(t) ||
      p.phone?.includes(t) ||
      p.ghana_card_number?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="card">
      {/* ===== Header ===== */}
      <div className="students-head">
        <div>
          <h1 className="students-title">Parents</h1>
          <div className="students-subtitle">
            Registered parents and guardians in the system
          </div>
        </div>
      </div>

      {error && <div className="danger">{error}</div>}

      {/* ===== Search ===== */}
      <input
        className="input students-search"
        placeholder="Search by name, phone, or Ghana Card…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ===== Table ===== */}
      <div className="students-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Ghana Card</th>
              <th>Address</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.phone}</td>
                <td>{p.ghana_card_number || "-"}</td>
                <td>{p.address || "-"}</td>
                <td>
                  <button
                    className="btn btn-outline"
                    onClick={() => navigate(`/parents/${p.id}/edit`)}
                  >
                    Modify
                  </button>
                </td>
              </tr>
            ))}

            {!filtered.length && (
              <tr>
                <td colSpan="5" className="muted">
                  No parents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
