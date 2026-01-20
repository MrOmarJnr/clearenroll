import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    const data = await api("/parents");
    setParents(data.parents || []);
  };

  useEffect(() => {
    load();
  }, []);

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
      <h2>Parents</h2>

      <input
        className="input"
        placeholder="Search parents…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 600, marginBottom: 14 }}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Phone</th>
            <th>Ghana Card</th>
            <th>Address</th>
            <th></th>
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
              <td colSpan="5">No parents found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
