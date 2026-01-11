import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function Schools() {
  const [schools, setSchools] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const data = await api("/schools");
    setSchools(data.schools || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addSchool = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api("/schools", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h2>Schools</h2>

      <form onSubmit={addSchool} className="row-actions">
        <input className="input" placeholder="New school name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" type="submit">Add</button>
      </form>

      {error && <div className="danger">{error}</div>}

      <table className="table">
        <thead>
          <tr><th>ID</th><th>Name</th></tr>
        </thead>
        <tbody>
          {schools.map(s => (
            <tr key={s.id}><td>{s.id}</td><td>{s.name}</td></tr>
          ))}
          {!schools.length && <tr><td colSpan="2">No schools yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
