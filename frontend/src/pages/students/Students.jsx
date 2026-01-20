import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Link, useNavigate } from "react-router-dom";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setError("");
    try {
      const data = await api("/students");
      setStudents(data.students || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase().trim();
    return (
      s.name?.toLowerCase().includes(term) ||
      String(s.id).includes(term) ||
      s.school?.toLowerCase().includes(term) ||
      s.parent?.toLowerCase().includes(term) ||
      s.gender?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="card">
      <h2>Students</h2>

      <div className="row-actions">
        <Link className="link" to="/students/add">
          Add Student
        </Link>
      </div>

      {error && <div className="danger">{error}</div>}

      <input
        className="input"
        placeholder="Search by name, ID, school, parent or gender..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 600, marginBottom: 12 }}
      />

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Student ID</th>
            <th>DOB</th>
            <th>Gender</th>
            <th>School</th>
            <th>Parent</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.id}</td>
              <td>{String(s.date_of_birth).slice(0, 10)}</td>
              <td>{s.gender}</td>
              <td>{s.school}</td>
              <td>{s.parent}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate(`/students/${s.id}/edit`)}
                >
                  Modify
                </button>
              </td>
            </tr>
          ))}

          {!filteredStudents.length && (
            <tr>
              <td colSpan="7">No matching students found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
