import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";

export default function Parents() {
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const data = await api("/parents");
      setParents(data.parents || []);
    })();
  }, []);

  // ======================
  // Filter logic
  // ======================
  const filteredParents = parents.filter((p) => {
    const term = search.toLowerCase();

    return (
      p.full_name?.toLowerCase().includes(term) ||
      p.phone?.toLowerCase().includes(term) ||
      p.ghana_card_number?.toLowerCase().includes(term) ||
      p.address?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="card">
      <h2>Parents</h2>

      <div className="row-actions">
        <Link className="link" to="/parents/add">
          Add Parent
        </Link>
      </div>

      {/* ======================
          SEARCH BOX
         ====================== */}
      <input
        className="input"
        placeholder="Search by name, phone, Ghana Card or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: "12px" }}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Phone</th>
            <th>Ghana Card</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          {filteredParents.map((p) => (
            <tr key={p.id}>
              <td>{p.full_name}</td>
              <td>{p.phone}</td>
              <td>{p.ghana_card_number || "-"}</td>
              <td>{p.address || "-"}</td>
            </tr>
          ))}

          {!filteredParents.length && (
            <tr>
              <td colSpan="4">No matching parents found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
