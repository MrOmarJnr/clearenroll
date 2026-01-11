import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link } from "react-router-dom";

export default function Parents() {
  const [parents, setParents] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await api("/parents");
      setParents(data.parents || []);
    })();
  }, []);

  return (
    <div className="card">
      <h2>Parents</h2>
      <div className="row-actions">
        <Link className="link" to="/parents/add">Add Parent</Link>
      </div>

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
          {parents.map(p => (
            <tr key={p.id}>
              <td>{p.full_name}</td>
              <td>{p.phone}</td>
              <td>{p.ghana_card_number || "-"}</td>
              <td>{p.address || "-"}</td>
            </tr>
          ))}
          {!parents.length && <tr><td colSpan="4">No parents yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
